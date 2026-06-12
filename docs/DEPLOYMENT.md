# PianoFlow AI — Deployment

> Four stages, each a working system. Adapters (`DESIGN.md` §2) make every stage transition a config change plus infrastructure work — never an application rewrite.

## Cost summary

| Path | $/mo | When to use |
|---|---|---|
| **Stage 1 — Local dev** | $0 | development |
| **Stage 2a — VPS (recommended)** | ~$4-5 | cheapest live product |
| **Stage 2b — Render single service** | ~$7 | no VPS management |
| Stage 3 — AWS Hybrid | ~$20-40 | traffic > 1k users |
| Stage 4 — Full AWS | ~$50-100 | scale + HA |

---

## Stage 1 — Local Development (Docker Compose)

**Goal:** the whole system on one laptop with `docker compose up`.

```bash
cp .env.example .env
docker compose up --build -d
pnpm install && pnpm dev:web      # Next.js with HMR at http://localhost:3000
```

Services started by `docker-compose.yml`:

```
web        Next.js dev server  (or run natively; profile=full to include)
api        FastAPI (uvicorn), mounts ./apps/api
worker     worker loop with FFmpeg + FluidSynth
postgres   postgres:15
redis      redis:7
# Storage: LocalStorage writes to ./data/storage (bind-mounted)
```

Config:

```
DATABASE_URL=postgresql://pianoflow:pianoflow@postgres:5432/pianoflow
QUEUE_BACKEND=redis     REDIS_URL=redis://redis:6379/0
STORAGE_BACKEND=local   STORAGE_LOCAL_ROOT=/data/storage
AUTH_MODE=dev           # static dev user, no Supabase needed
```

Notes:
- Alembic migrations run automatically on API start in dev.
- Worker Dockerfile is heavyweight (FFmpeg + FluidSynth ≈ +300 MB); API stays slim — separate Dockerfiles so Stage 3 images are already right.

---

## Stage 2a — VPS (cheapest live product, ~$4-5/mo)

**Goal:** publicly reachable product on one VPS — API + worker merged into a single container, Caddy for free automatic HTTPS.

### What runs where

| Component | Service | Cost |
|---|---|---|
| API + Worker | Combined container (VPS) | included in VPS |
| Frontend | **Vercel** free tier | $0 |
| Database | **Supabase** free tier (500 MB) | $0 |
| Storage | **Supabase Storage** free tier (1 GB) | $0 |
| Auth | **Supabase Auth** | $0 |
| Queue | **Redis** in-container (VPS) | included |
| Reverse proxy / TLS | **Caddy** (auto Let's Encrypt) | included |
| VPS | Hetzner CAX11 (2 ARM vCPU, 4 GB RAM) | ~€4/mo |

**Total: ~$4-5/mo** (just the VPS; everything else free tier).

### Quick start

```bash
# 1. Clone on the VPS
git clone https://github.com/nhatpro306/pianoflow-ai.git && cd pianoflow-ai

# 2. Fill in secrets
cp .env.example .env.prod
# Edit .env.prod — set DATABASE_URL (Supabase), SUPABASE_* keys,
# DOMAIN=api.example.com, CADDY_EMAIL, POSTGRES_PASSWORD, AUTH_MODE=supabase

# 3. Deploy (builds combined image, starts caddy + app + postgres + redis)
docker compose -f docker-compose.prod.yml up -d --build

# 4. Run Alembic migrations once
docker compose -f docker-compose.prod.yml exec app \
    bash -c "cd /repo/apps/api && uv run --no-sync alembic upgrade head"
```

Health checks:

```
https://api.example.com/healthz  → {"status":"ok"}
https://api.example.com/readyz   → {"status":"ok"}
```

### Combined image (`infra/docker/combined.Dockerfile`)

One image includes FFmpeg/FluidSynth (for the worker) plus all API deps. `infra/entrypoint.sh` starts the worker in the background then `exec`s uvicorn as PID 1, so `docker stop` cleanly shuts both processes.

```
SIGTERM → uvicorn exits → trap → worker killed → container exits
```

### Env vars for `.env.prod`

```
# Supabase (get from project dashboard)
DATABASE_URL=postgresql+psycopg://postgres.<ref>:<pass>@<host>:6543/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
SUPABASE_ANON_KEY=<anon-key>

# App
AUTH_MODE=supabase
STORAGE_BACKEND=supabase
QUEUE_BACKEND=redis
REDIS_URL=redis://redis:6379/0
ENV=prod
LOG_LEVEL=INFO

# Postgres (in-container, only needed if using local pg instead of Supabase)
POSTGRES_USER=pianoflow
POSTGRES_PASSWORD=<strong-random>
POSTGRES_DB=pianoflow

# Caddy
DOMAIN=api.example.com
CADDY_EMAIL=you@example.com

# Internal metrics token (optional but recommended in prod)
INTERNAL_METRICS_TOKEN=<long-random>
```

> **If you're using Supabase Postgres** (recommended — free tier, managed backups): set `DATABASE_URL` to the Supabase connection string and remove the `postgres` service from `docker-compose.prod.yml` to save ~150 MB RAM.

### Updates

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app \
    bash -c "cd /repo/apps/api && uv run --no-sync alembic upgrade head"
```

---

## Stage 2b — Render Single Service (~$7/mo)

**Goal:** same as 2a but on Render — no VPS to maintain, but costs slightly more.

Uses `render.yaml` (Render blueprint) + `infra/docker/combined.Dockerfile`:

- 1 Render Starter service ($7/mo) running API + worker merged
- Supabase for DB + storage + auth (free tier)
- Upstash Redis free tier (10k commands/day, enough for MVP)
- Vercel for web (free)

**Total: ~$7/mo** (just the Render service).

Setup:
1. Connect repo to Render; it picks up `render.yaml` automatically.
2. Set secrets in the Render dashboard (mark as secret):
   `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `INTERNAL_METRICS_TOKEN`.
3. Render runs `/healthz` as the health check path.

CI/CD: GitHub Actions builds and tests on every PR; Render auto-deploys on merge to `main`.

---

## Stage 3 — AWS Hybrid (~$20-40/mo)

**Goal:** move compute to AWS while keeping Vercel DX for the frontend.

| Component | Host | Migration action |
|---|---|---|
| Frontend | Vercel (unchanged) | — |
| API | **ECS Fargate** behind ALB | Push image to ECR; 2 tasks, 0.5 vCPU/1 GB |
| Worker | **ECS Fargate** (no ALB) | 1-4 tasks, 1-2 vCPU/4 GB; autoscale on SQS depth |
| Queue | **SQS** (+ DLQ per queue) | `QUEUE_BACKEND=sqs` — adapter swap only |
| Storage | **S3** (private buckets, lifecycle rules) | `STORAGE_BACKEND=s3`; `aws s3 sync` existing objects |
| Database | Supabase Postgres (kept) or RDS | Defer RDS to Stage 4 unless latency hurts |
| Auth | Supabase Auth (kept) | — |

Adapter swaps are the only app changes: set `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`, add AWS creds via ECS task role. No code rewrites.

IAM: task roles with least privilege — API: SQS SendMessage + S3 presign; worker: SQS Receive/Delete + S3 Read/Write on its prefixes.

---

## Stage 4 — Full AWS (~$50-100/mo)

**Goal:** everything on AWS, fully IaC, production observability.

```
Route53 ─ CloudFront ─┬─ S3 (static export or keep Vercel)
                       └─ ALB ─ ECS Fargate (api, 2+ tasks, multi-AZ)
                                    │
                                   SQS (q_fast, q_render, + DLQs)
                                    │
                                 ECS Fargate (worker; autoscaled)
                                    │
                        S3 (uploads/outputs/notes; lifecycle rules)
                        RDS PostgreSQL (Multi-AZ optional; RDS Proxy)
                        CloudWatch (logs, metrics, dashboards, alarms)
                        Secrets Manager / Parameter Store
                        ECR (api, worker, combined images)
```

IaC: **Terraform** in `infra/terraform`: modules `network`, `ecs-api`, `ecs-worker`, `sqs`, `s3`, `rds`, `cloudfront`, `observability`; envs `staging`/`prod` via tfvars; remote state S3 + DynamoDB lock.

CD: GitHub Actions OIDC → AWS (no long-lived keys): build → ECR → `terraform plan` (PR comment) → manual approve → `apply` + ECS rolling deploy.

---

## Stage Transition Checklist

| Change | 1→2a/2b | 2→3 | 3→4 |
|---|---|---|---|
| App code | none | none | none |
| Env vars | storage/auth/db URLs | `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`, AWS creds | DB URL → RDS |
| New adapter code | (Supabase: already written) | (SQS + S3: Phase 11, both small) | none |
| Infra work | VPS or Render dashboard | ECR/ECS/SQS/S3 setup | full Terraform |
| Data migration | none | `aws s3 sync` objects | pg_dump → RDS |

---

## Secrets & Config Management

| Stage | Mechanism |
|---|---|
| 1 | `.env` file (gitignored); `.env.example` committed |
| 2a | `.env.prod` file on VPS (gitignored, backed up separately) |
| 2b | Render dashboard env groups |
| 3/4 | SSM Parameter Store / Secrets Manager; Vercel env for web |

Hard rule: no secret in the repo, ever.

---

## Cost & Lifecycle Controls

- Supabase/S3 lifecycle rules: `tmp/` expire 1 day; `outputs/` expire 30 days (`OUTPUT_RETENTION_DAYS`).
- Worker cleanup sweep runs every `CLEANUP_INTERVAL_SECONDS` (default 900 s) — deletes expired `OutputFile` rows and their storage objects.
- Budget alarms: AWS Budgets at $30 (Stage 3) / $60 (Stage 4) with email alert.
- MVP caps (≤10 min songs, ≤1080p, daily job limits) are the primary cost control — see `RISKS.md`.
