# PianoFlow AI — Deployment Status & Handoff

> Written for a developer new to the project. Explains what it is, how it's
> wired, what's live, and the few non-obvious gotchas that bit us.

## What the product is

Upload a piano **MIDI** → get a **tutorial video** (Synthesia-style falling
notes + audio), **sheet music PDF/MusicXML**, and a **beginner-simplified**
version. Plus a beta **audio→MIDI** transcription. Portfolio project showing
Cloud/DevOps/AI skills.

## Architecture (the one rule)

```
Browser (Next.js/Vercel) → FastAPI (Render) → Redis queue → Worker (Render) → Storage (Supabase)
                                  ↘ Postgres (Supabase, metadata only) ↙
```

**The API never renders.** It validates, persists metadata, and enqueues a
job. The worker does all heavy work (parse, video, sheet, simplify). Storage,
queue, and DB sit behind adapter interfaces so the stack can move to AWS
(S3/SQS/Lambda) with config changes, not rewrites — see `infra/terraform/`.

Monorepo: `apps/web` (Next.js), `apps/api` (FastAPI), `apps/worker` (Python),
`packages/music-core` (pure music logic, zero I/O), `packages/shared-types`.

## What is LIVE right now ($0/month, free tiers)

| Piece | Where | URL / id |
|---|---|---|
| Web | Vercel | https://pianoflow-jet.vercel.app |
| API | Render (free, Docker) | https://pianoflow-api.onrender.com |
| Worker | Render (free, Docker, web service w/ stub /healthz) | pianoflow-worker |
| Redis | Render Key Value (free) | pianoflow-redis (REDIS_URL auto-injected) |
| DB + Auth + Storage | Supabase (free) | project `kcznjjnhtajwumhvbasq` (ap-southeast-1) |

Health: `GET /healthz` (liveness), `GET /readyz` (DB+queue), both 200/ready.

## How config/secrets work

- API + worker read env vars (12-factor, `app/core/config.py` /
  `app/config.py`). `AUTH_MODE=supabase`, `STORAGE_BACKEND=supabase`,
  `QUEUE_BACKEND=redis`.
- `render.yaml` is the Render blueprint (infra-as-code). Non-secret values
  (host URLs, CORS origin) are committed there; secrets are `sync: false`
  (set by hand in the Render dashboard) or `generateValue: true`.
- **No secret is ever committed.** Verified by grep.

### The DB password gotcha (important)

Supabase-generated DB passwords contain `/ @ +`. Putting them raw into a
`DATABASE_URL` breaks URL parsing (a stray `/` empties the port →
`ValueError: invalid literal for int() with base 10: ''`). Fix:
- `DATABASE_URL` holds only the **passwordless** URL (host/user/db) — not secret.
- `DB_PASSWORD` is its **own env var** (secret). `config.py` injects it and
  `quote_plus`-encodes it. A generated password can never corrupt the URL.
- Connection uses the **Supabase session pooler** (IPv4): host
  `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user
  `postgres.kcznjjnhtajwumhvbasq`, driver prefix `postgresql+psycopg://`.

### Auth gotcha

New Supabase projects sign JWTs with **ES256** (asymmetric), not the legacy
HS256 shared secret. `app/core/security.py` verifies via the project's **JWKS**
endpoint when the token alg is ES256/RS256, falling back to HS256 +
`SUPABASE_JWT_SECRET` for legacy/tests. So `SUPABASE_JWT_SECRET` is NOT needed
in prod.

## DB schema

Owned by Alembic (`apps/api/alembic`, migrations 0001–0007). For this Supabase
project the schema was applied via the Supabase MCP and the `alembic_version`
row set to `0007`, so a future `alembic upgrade head` continues correctly.
RLS policies + storage buckets: `infra/supabase/migrations/*.sql`.

## Security posture (audited, all green)

- Auth enforced on every mutating endpoint; cross-user access returns 404 (tested).
- RLS on all tables. `alembic_version` is RLS-on/no-policy = deny-all (intended).
- CORS allows only localhost + the Vercel origin; foreign origins blocked.
- `/docs`, `/openapi.json`, `/redoc` disabled outside dev (API surface hidden).
- `/internal/metrics` requires `X-Internal-Token` (value: Render-generated
  `INTERNAL_METRICS_TOKEN`); returns 404 without it.
- Rate limits via `daily_usage` table (uploads/jobs/transcriptions per day → 429).
- Video outputs are streaming-only (no MP4 download); access via short-lived signed URLs.

## Tests

Run per project (api/worker are uv virtual projects — can't install together):
```
uv run --directory apps/api pytest -q       # 100 tests
uv run --directory apps/worker pytest -q     # 27 tests
uv run --directory packages/music-core pytest -q
uv run ruff check . && uv run ruff format --check .
pnpm -r typecheck
```

## Remaining / next

1. **Verify worker has `DB_PASSWORD` set** (Render → pianoflow-worker →
   Environment). Without it, jobs fail though /healthz still answers.
2. **UptimeRobot** free monitors on both `/healthz` URLs (free tier sleeps
   after 15 min; pinger keeps warm).
3. **End-to-end smoke**: sign up on the live site → upload a MIDI → confirm a
   `parse_midi` job completes and the piano roll renders. (`scripts/load_test.py`
   drives N concurrent upload→parse flows once you have a JWT.)
4. **Phase 12** (engine implemented, opt-in): a real Basic Pitch (ONNX) engine
   lives behind the `TranscriptionEngine` interface. The placeholder remains the
   default. To enable: install `pianoflow-music[basic-pitch]` on a dedicated
   audio worker (Python ≤3.11) and set `TRANSCRIPTION_ENGINE=basic_pitch` in
   its environment. The worker code already reads this env var.
5. **Stage 3** (portfolio showcase): `terraform apply` the AWS free-tier stack
   in `infra/terraform/` (Lambda+SQS+EC2+S3). Code adapters + IaC already exist;
   needs an AWS account + the GitHub OIDC role. See `infra/aws/README.md`.

## Roadmap

Phases 1–12 code complete (Phase 12 Basic Pitch engine is implemented but
off-by-default — opt in via `TRANSCRIPTION_ENGINE=basic_pitch` + the
`basic-pitch` extra on a dedicated audio worker). Full roadmap: `docs/ROADMAP.md`.
Deployment stages: `docs/DEPLOYMENT.md`.
