# PianoFlow AI — Deployment Plan

> Four stages, each a working system. Adapters (`DESIGN.md` §2) make every stage transition a config change plus infrastructure work — never an application rewrite. **Stages 1–3 run at $0/month.**

---

## Stage 1 — Local Development (Docker Compose)

**Goal:** the whole system on one laptop with `docker compose up`.

```
docker-compose.yml services:
  web        Next.js dev server (or run natively for HMR; compose profile)
  api        FastAPI (uvicorn --reload), mounts ./apps/api
  worker     worker loop, image includes FFmpeg + FluidSynth (headless)
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
- Worker Dockerfile is the heavyweight image (FFmpeg + FluidSynth ≈ adds ~400 MB); API image stays slim — separate Dockerfiles from day one so stage 3 images are already right.
- Alembic migrations run automatically on `api` start in dev only.

---

## Stage 2 — Public MVP (free tiers, $0/month)

**Goal:** publicly usable product at $0/month using free tiers only.

| Component | Host | Free Tier | Limit |
|---|---|---|---|
| Frontend | **Vercel** Hobby | Forever free | Unlimited deploys, 100GB bandwidth |
| API | **Render** Free | Forever free | 512MB RAM, sleeps after 15min |
| Worker | **Render** Free | Forever free | Background service, 512MB RAM |
| Database | **Supabase** Free | Forever free | 500MB, 50k MAU auth |
| Storage | **Supabase Storage** | Forever free | 1GB across 3 private buckets |
| Queue | **Upstash Redis** Free | Forever free | 10k commands/day, 256MB |
| Auth | **Supabase Auth** | Forever free | Email + Google OAuth |

**Cost: $0/month.** All services are "forever free" — no 12-month expiry.

Env switch from stage 1: `STORAGE_BACKEND=supabase`, `AUTH_MODE=supabase`, real `DATABASE_URL`, `SUPABASE_JWT_SECRET`. Nothing else changes.

### Limitations & Mitigations

| Limitation | Mitigation |
|---|---|
| Render API sleeps after 15min | Free UptimeRobot pinger on `/healthz` keeps it warm |
| 512MB worker RAM | Limit video to 720p; short songs (<5 min); add swap if self-hosting |
| 1GB storage | Aggressive cleanup: 7-day output expiry (not 30); `cleanup_expired` job |
| 10k Redis commands/day | Sufficient for ~50-100 jobs/day at low traffic |
| Cold start ~30s on first request | UptimeRobot pinger prevents this for API |

### What Works on Free Tier

| Feature | Status |
|---|---|
| Upload + parse + piano roll preview | ✅ works |
| Auth (email + Google) + project history | ✅ works |
| Sheet PDF + MusicXML generation | ✅ works |
| Simplified MIDI (beginner mode) | ✅ works |
| Video tutorial 720p, <5min songs | ⚠️ works, tight on RAM |
| Video tutorial 1080p, long songs | ❌ likely OOM on 512MB |
| Audio → MIDI (placeholder engine) | ✅ works |
| Rate limiting + daily usage caps | ✅ works |

### CI/CD (GitHub Actions)

1. **PR:** lint + tests (no external services needed — SQLite + memory queue in tests).
2. **Merge to `main`:** run Alembic migration against Supabase DB → trigger Render deploy hooks for API + Worker → Vercel auto-deploys web.

### Deployment Steps

1. **Supabase:** create project → get `DATABASE_URL` (connection pooler, transaction mode), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` → run `alembic upgrade head` → run `infra/supabase/migrations/*.sql` in SQL editor.
2. **Upstash:** create Redis database → get `REDIS_URL`.
3. **Render:** "New Blueprint" → point to repo → `render.yaml` creates API + Worker → set env vars from step 1-2.
4. **Vercel:** import repo → set `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. **GitHub Secrets:** `DATABASE_URL`, `RENDER_DEPLOY_HOOK_API`, `RENDER_DEPLOY_HOOK_WORKER`.
6. **UptimeRobot:** free monitor on `https://<api>.onrender.com/healthz` every 5 min.

---

## Stage 3 — AWS Free Tier (portfolio showcase, $0 for 12 months)

**Goal:** demonstrate AWS cloud engineering skills — the interview centerpiece. Runs at $0/month within AWS free tier limits (EC2/S3 are 12-month free; Lambda/SQS are always free).

| Component | Host | Free Tier |
|---|---|---|
| Frontend | **Vercel** (unchanged) | Forever free |
| API | **AWS Lambda** + API Gateway | Always free (1M req/month) |
| Queue | **AWS SQS** (+ DLQ per queue) | Always free (1M req/month) |
| Worker | **AWS EC2 t2.micro** | 12 months free (1 vCPU, 1GB RAM) |
| Storage | **AWS S3** | 12 months free (5GB) |
| Database | **Supabase** (kept) | Forever free |
| Auth | **Supabase Auth** (kept) | Forever free |
| Container Registry | **AWS ECR** | Always free (500MB) |
| Monitoring | **AWS CloudWatch** | Always free (10 metrics, 5GB logs) |

**Cost: $0/month** for 12 months. After that, EC2 (~$8/mo) + S3 (pennies) — everything else stays free.

### Architecture

```
Vercel (web) → API Gateway → Lambda (FastAPI via Mangum)
                                  ↓
                              SQS (q_default, q_audio + DLQs)
                                  ↓
                           EC2 t2.micro (worker, Docker)
                                  ↓
                  S3 (sources/analysis/outputs buckets)
                  Supabase (Postgres + Auth)
```

### Migration from Stage 2

| Change | What |
|---|---|
| App code | Add `mangum` handler wrapper in `app/main.py` (3 lines) |
| Env vars | `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`, AWS creds via IAM role |
| New adapter code | SQS adapter + S3 adapter (both exist in adapter pattern) |
| Infra | Lambda function + API Gateway + SQS queues + EC2 + S3 buckets |
| Data migration | `supabase storage → s3 sync`; DB stays on Supabase |

### EC2 Worker Constraints (1GB RAM)

- Video rendering limited to 720p, songs <5 min
- Add 2GB swap file for safety: `fallocate -l 2G /swapfile`
- Queue separation: `q_default` (parse/sheet/simplify) + `q_render` (video) — worker polls both
- Single worker instance (no autoscaling on free tier)

### IaC (Terraform)

```
infra/terraform/
  modules/
    lambda-api/     # Lambda + API Gateway + IAM role
    sqs/            # q_default + q_render + DLQs
    ec2-worker/     # t2.micro + security group + IAM instance profile
    s3/             # 3 buckets + lifecycle rules
    ecr/            # container registry
    cloudwatch/     # log groups + basic alarms
  envs/
    free-tier/      # tfvars for free-tier deployment
    prod/           # tfvars for production (Stage 4)
  main.tf
  variables.tf
  outputs.tf
```

### Deployment Steps

1. **Terraform:** `cd infra/terraform && cp envs/free-tier/terraform.tfvars.example terraform.tfvars` → fill secrets → `terraform init && terraform apply -target=module.ecr` (registries first).
2. **Images:** build + push `pianoflow-api` and `pianoflow-worker` to ECR (locally or via the `aws-deploy.yml` workflow).
3. **Apply:** `terraform apply` — Lambda, API Gateway, SQS, EC2, S3, CloudWatch.
4. **Storage migration:** `infra/aws/migrate_storage.py` (idempotent, `--dry-run` first).
5. **Vercel:** point `NEXT_PUBLIC_API_BASE_URL` at the `api_url` Terraform output.
6. **CI/CD:** create GitHub OIDC IAM role → set `AWS_OIDC_ROLE_ARN` secret → PRs touching `infra/terraform/**` get `terraform plan`; manual dispatch builds + applies.
7. **Budget alarm:** AWS Budgets, $5/month threshold (manual — one-time).

Full first-deploy walkthrough: `infra/aws/README.md`.

### Portfolio Artifacts

- Architecture diagram (README)
- `terraform apply` from clean account — documented (`infra/aws/README.md`)
- CloudWatch dashboard screenshot
- Cost report showing $0/month
- Load test: 10 concurrent uploads → all complete successfully

---

## Stage 4 — Full AWS Production (paid, scalable)

**Goal:** production-grade, autoscaled, fully Terraform-managed. Upgrade from Stage 3 when traffic justifies cost.

```
Route53 → CloudFront ─┬─ Vercel (web)
                       └─ ALB → ECS Fargate (api, 2+ tasks, multi-AZ)
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
| IaC | Terraform modules: `network`, `ecs-api`, `ecs-worker`, `sqs`, `s3`, `rds`, `cloudfront`, `observability`; envs `staging`/`prod` via tfvars; remote state S3 + DynamoDB lock |
| DB migration | Supabase → RDS: pg_dump/restore during maintenance window |
| Auth | Keep Supabase Auth (cheap, works) — migrating auth is high-risk/low-reward |
| Worker scaling | SQS depth-based autoscaling: 1→4 Fargate tasks |
| CD | GitHub Actions OIDC → AWS: build → ECR → `terraform plan` (PR comment) → manual approve → `apply` + ECS deploy |

Estimated cost: $30–60/month at moderate traffic.

---

## Stage Transition Checklist

| Change | 1→2 | 2→3 | 3→4 |
|---|---|---|---|
| App code | none | `mangum` wrapper (3 lines) | none |
| Env vars | storage/auth/db URLs | `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3` | DB URL → RDS |
| New adapter code | (already written: supabase) | SQS + S3 adapters | none |
| Infra work | Render/Vercel/Supabase dashboards | Terraform free-tier modules | Full Terraform + ECS |
| Data migration | none | S3 sync of storage objects | pg_dump → RDS |
| Cost | $0/month | $0/month (12mo) | $30–60/month |

---

## Secrets & Config Management per Stage

| Stage | Mechanism |
|---|---|
| 1 | `.env` files (gitignored), `.env.example` committed |
| 2 | Provider dashboards (Render env groups, Vercel env, Supabase, Upstash) |
| 3 | SSM Parameter Store for EC2; Lambda env vars; Vercel env for web |
| 4 | Secrets Manager + Terraform-injected task definitions; rotation documented |

Hard rule at every stage: no secret in the repo, ever; CI uses OIDC or scoped deploy tokens.

---

## Cost & Lifecycle Controls

- Supabase Storage / S3 lifecycle rules: `tmp/` expire 1 day; outputs expire 7 days (free tier) or 30 days (paid).
- `cleanup_expired` worker job runs daily — primary cleanup mechanism. Lifecycle rules are backstop.
- MVP caps (duration ≤ 10 min, ≤ 720p on free tier, daily job limits) are the primary cost control at every stage.
- AWS Budget alarm at $5 (Stage 3) to catch free-tier overages.
