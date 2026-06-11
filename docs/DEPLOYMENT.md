# PianoFlow AI — Deployment Plan

> Four stages, each a working system. Adapters (`DESIGN.md` §2) make every stage transition a config change plus infrastructure work — never an application rewrite.

---

## Stage 1 — Local Development (Docker Compose)

**Goal:** the whole system on one laptop with `docker compose up`.

```
docker-compose.yml services:
  web        Next.js dev server (or run natively for HMR; compose profile)
  api        FastAPI (uvicorn --reload), mounts ./apps/api
  worker     worker loop, image includes FFmpeg + MuseScore (headless)
  postgres   postgres:15, volume-backed
  redis      redis:7
  # storage: LocalStorage adapter writes to a bind-mounted ./data/storage dir;
  # optional minio service (S3-compatible) to exercise the s3 adapter locally
```

Config (env per service):

```
DATABASE_URL=postgresql://pianoflow:pianoflow@postgres:5432/pianoflow
QUEUE_BACKEND=redis        REDIS_URL=redis://redis:6379/0
STORAGE_BACKEND=local      STORAGE_LOCAL_ROOT=/data/storage
AUTH_MODE=dev              # static dev user, no Supabase needed locally
```

Notes:
- `make dev` / `make test` / `make seed` targets; seed loads fixture MIDIs into a demo project.
- Worker Dockerfile is the heavyweight image (FFmpeg + MuseScore ≈ adds ~400 MB); API image stays slim — separate Dockerfiles from day one so stage 3 images are already right.
- Alembic migrations run automatically on `api` start in dev only.

---

## Stage 2 — Public MVP (free/cheap tiers)

**Goal:** publicly usable product at < $20/month.

| Component | Host | Notes |
|---|---|---|
| Frontend | **Vercel** | Next.js native; preview deployments per PR |
| API | **Render / Railway / Fly.io** (pick one; design assumes Render) | Docker deploy of `api.Dockerfile`; health check `/readyz` |
| Worker | Same provider, **background worker service** (no HTTP) | `worker.Dockerfile`; 1 instance; manual scale knob |
| Database | **Supabase Postgres** | Use connection pooler (transaction mode); Alembic via CI step |
| Storage | **Supabase Storage** (private buckets: `uploads`, `outputs`) | Signed URLs; or S3 directly if preferred — adapter supports both |
| Queue | **Redis** (Upstash free tier, or provider Redis add-on) | `QUEUE_BACKEND=redis` |
| Auth | **Supabase Auth** | JWT verified by API |

Env switch from stage 1: `STORAGE_BACKEND=supabase`, real `DATABASE_URL`, `AUTH_MODE=supabase`. Nothing else changes.

CI/CD (GitHub Actions):
1. PR: lint + tests (Stage-1 services via docker in CI).
2. Merge to `main`: build/push API + worker images → deploy to Render → run Alembic migration job → Vercel auto-deploys web.

Operational notes:
- Render free/starter instances sleep — keep API on a paid starter ($7) to avoid cold starts; worker can be starter too.
- Worker CPU on these tiers is weak: this is fine for the MVP caps (≤10 min songs, ≤1080p) but is the first scaling pain point → triggers Stage 3.
- Logs: provider log streams; structured JSON makes them grep-able. Uptime: free healthcheck pinger on `/healthz`.

---

## Stage 3 — AWS Hybrid

**Goal:** move compute to AWS (the part that needs to scale) while keeping Vercel DX for the frontend. This stage exists to de-risk the migration by moving one tier at a time.

| Component | Host | Migration action |
|---|---|---|
| Frontend | Vercel (unchanged) | — |
| API | **ECS Fargate service** behind ALB | Push image to ECR; service: 2 tasks, 0.5 vCPU/1 GB |
| Worker | **ECS Fargate service** (no ALB) | render queue workers: 1–4 tasks, 1–2 vCPU/4 GB; autoscale on SQS depth |
| Queue | **SQS** (+ DLQ per queue) | `QUEUE_BACKEND=sqs` — adapter swap, the headline migration |
| Storage | **S3** (private buckets, lifecycle rules on `tmp/`, `outputs/`) | `STORAGE_BACKEND=s3`; one-time `aws s3 sync` of existing objects; DB `storage_key`s unchanged (keys are backend-relative) |
| Database | Supabase Postgres (kept) **or** RDS now | Defer RDS to stage 4 unless latency API↔DB hurts |
| Auth | Supabase Auth (kept) | — |

Queue separation activates here: `q_fast` and `q_render` SQS queues, two worker services (see `DESIGN.md` §3.7). Worker autoscaling policy: target tracking on `ApproximateNumberOfMessagesVisible / running tasks`.

IAM: task roles with least privilege — API role: SQS SendMessage + S3 presign-scoped access; worker role: SQS Receive/Delete + S3 Read/Write on its prefixes.

---

## Stage 4 — Full AWS (Terraform-managed)

**Goal:** everything on AWS, fully IaC, production observability. This is the "portfolio money shot" stage.

```
Route53 ─ CloudFront ─┬─ S3 (static export / or keep Vercel — decision point)
                       └─ ALB ─ ECS Fargate (api, 2+ tasks, multi-AZ)
                                   │
                                  SQS (q_fast, q_render, + DLQs)
                                   │
                                ECS Fargate (worker-fast, worker-render; autoscaled)
                                   │
                       S3 (uploads/outputs/notes; lifecycle rules)
                       RDS PostgreSQL (Multi-AZ optional; RDS Proxy)
                       CloudWatch (logs, metrics, dashboards, alarms)
                       Secrets Manager (DB creds, JWT keys)
                       ECR (api, worker images)
```

| Concern | Implementation |
|---|---|
| IaC | **Terraform** in `infra/terraform`: modules `network` (VPC, subnets, endpoints for S3/ECR — keep NAT cost down), `ecs-api`, `ecs-worker`, `sqs`, `s3`, `rds`, `cloudfront`, `observability`; envs `staging`/`prod` via tfvars; remote state S3 + DynamoDB lock |
| DB migration | Supabase → RDS: pg_dump/restore during maintenance window; RLS policies dropped (API-layer ownership checks were always authoritative — `DATABASE.md` §7) |
| Auth | Keep Supabase Auth (cheap, works) or Cognito; `AuthProvider` adapter decides — recommend keeping Supabase Auth, migrating auth is high-risk/low-reward |
| Frontend | Either stay on Vercel (recommended; CloudFront fronts only API/assets) or full static-export to S3+CloudFront if app can drop server components |
| Logs | CloudWatch Logs, JSON structured → Logs Insights queries saved in repo |
| Metrics | CloudWatch custom metrics (job durations, failure counts, queue delay) emitted via EMF from API/worker |
| Alarms | failure-rate > 10%/15 min, DLQ depth > 0, queue delay p95 > 2 min, RDS CPU/storage, ALB 5xx |
| Dashboards | one CloudWatch dashboard: uploads/day, jobs by status, render p50/p95, queue depth, storage bytes |
| CD | GitHub Actions OIDC → AWS (no long-lived keys): build → ECR → `terraform plan` (PR comment) → manual approve → `apply` + ECS deploy |

---

## Stage Transition Checklist (what actually changes)

| Change | 1→2 | 2→3 | 3→4 |
|---|---|---|---|
| App code | none | none | none |
| Env vars | storage/auth/db URLs | `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`, AWS creds via task role | DB URL → RDS |
| New adapter code | (written in phase 2: supabase storage) | (written in phase 11: sqs + s3 — both small) | none |
| Infra work | provider dashboards | ECR/ECS/SQS/S3 setup (scripted in `infra/aws`) | full Terraform |
| Data migration | none | S3 sync of objects | pg_dump → RDS |

---

## Secrets & Config Management per Stage

| Stage | Mechanism |
|---|---|
| 1 | `.env` files (gitignored), `.env.example` committed |
| 2 | Provider dashboards (Render env groups, Vercel env, Supabase) |
| 3 | SSM Parameter Store / Secrets Manager for ECS tasks; Vercel env for web |
| 4 | Secrets Manager + Terraform-injected task definitions; rotation documented |

Hard rule at every stage: no secret in the repo, ever; CI uses OIDC or scoped deploy tokens.

---

## Cost & Lifecycle Controls (deployment-level)

- S3/Supabase lifecycle rules: `tmp/` expire 1 day; `outputs/` expire 30 days (DB cleanup job is primary, lifecycle is backstop — `DATABASE.md` §6).
- ECS worker scale-to-zero overnight option (scheduled scaling) at stage 3/4 if traffic allows; SQS retains messages.
- Budget alarms: AWS Budgets at $20 (stage 3) / $50 (stage 4) with email alert.
- MVP caps (duration ≤ 10 min, ≤ 1080p, daily job limits) are the primary cost control at every stage — see `RISKS.md`.
