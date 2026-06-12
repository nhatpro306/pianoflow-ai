# 🎹 PianoFlow AI

[![CI](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml)

Turn any piano MIDI into a **tutorial video**, **sheet music**, and a **beginner-friendly version**.

## Features

- 🎬 **Tutorial Videos** — Synthesia-style falling-note MP4 with real piano audio. Customizable colors, speed, 720p/1080p.
- 🎼 **Sheet Music** — Readable PDF + MusicXML export, auto-generated from MIDI.
- 🎯 **Beginner Mode** — Rule-based simplified arrangements (easy / very-easy) that preserve the melody.
- 🎙️ **Audio → MIDI** (Beta) — Upload MP3/WAV, get a draft MIDI transcription. Honestly labeled.
- 🔐 **Auth & Rate Limits** — Supabase Auth (email + Google), daily usage caps, per-user ownership isolation.
- 📊 **Streaming-only Video** — No MP4 download. Output access via short-lived signed URLs.

## Architecture

```
User → Next.js (Vercel) → FastAPI → Queue (Redis→SQS) → Worker → Storage (Supabase→S3)
                                          ↘ PostgreSQL (metadata only) ↙
```

Core rule: **the API never renders** — it validates, persists, and enqueues; workers do all heavy work.
Storage/queue/DB sit behind adapters so the MVP stack migrates to AWS with config changes, not rewrites.

Full design: [docs/DESIGN.md](docs/DESIGN.md) · Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Run Locally

```bash
cp .env.example .env
docker compose up --build -d      # postgres + redis + api + worker
pnpm install && pnpm dev:web      # Next.js with HMR at http://localhost:3000
```

API: http://localhost:8000/docs · `/healthz` · `/readyz` · `/internal/metrics`

## Deploy (Free Tier — $0/month)

**Stage 2** — all services are "forever free", no 12-month expiry:

| Component | Host | Free Tier |
|---|---|---|
| Frontend | **Vercel** Hobby | Unlimited deploys |
| API | **Render** Free | 512MB, sleeps after 15min |
| Worker | **Render** Free | Background service, 512MB |
| Database | **Supabase** Free | 500MB Postgres |
| Storage | **Supabase Storage** | 1GB, 3 private buckets |
| Queue | **Upstash Redis** Free | 10k commands/day |
| Auth | **Supabase Auth** Free | Email + Google, 50k MAU |

**Stage 3** (AWS portfolio showcase, $0 for 12 months):

| Component | Host | Free Tier |
|---|---|---|
| API | **AWS Lambda** | Always free, 1M req/month |
| Queue | **AWS SQS** | Always free, 1M req/month |
| Worker | **AWS EC2** t2.micro | 12 months free, 1GB RAM |
| Storage | **AWS S3** | 12 months free, 5GB |
| Monitoring | **CloudWatch** | Always free, 10 metrics |

Blueprint: [`render.yaml`](render.yaml) · CI/CD: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · Full plan: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

Set secrets in GitHub: `DATABASE_URL`, `RENDER_DEPLOY_HOOK_API`, `RENDER_DEPLOY_HOOK_WORKER`.
Set env vars in Vercel: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Monorepo Map

```
apps/web              Next.js + TypeScript + Tailwind
apps/api              FastAPI — validate, persist, enqueue
apps/worker           Python worker — parse, render video/sheet, simplify, cleanup
packages/music-core   Pure music logic (pretty_midi/mido/music21) — zero I/O
packages/shared-types JSON Schemas + TS types + shared limit constants
infra/                Dockerfiles · Supabase migrations · Terraform (Phase 11)
docs/                 Full design document set
```

## Docs

| Doc | What |
|---|---|
| [PRODUCT.md](docs/PRODUCT.md) | Vision, scope, metrics |
| [DESIGN.md](docs/DESIGN.md) | Architecture, job system, rendering pipelines |
| [DATABASE.md](docs/DATABASE.md) | Schema + storage strategy |
| [API.md](docs/API.md) | REST v1 contract |
| [VIDEO_TUTORIAL_SPEC.md](docs/VIDEO_TUTORIAL_SPEC.md) | Video rendering spec |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 4 stages: local → free MVP → AWS free tier → full AWS |
| [ROADMAP.md](docs/ROADMAP.md) | 12 phases |
| [RISKS.md](docs/RISKS.md) | Risks, cost controls, limits |

## Development

```bash
uv sync --all-packages            # Python workspace (api, worker, music-core)
uv run --directory apps/api pytest -q    # API tests
uv run --directory apps/worker pytest -q # Worker tests
uv run ruff check .               # Lint
pnpm -r typecheck                 # TypeScript
make test                         # All tests
```

Load test (10 concurrent upload→parse flows against any deployment):

```bash
uv run --directory apps/api python ../../scripts/load_test.py \
  --base-url http://localhost:8000 --concurrency 10 \
  --midi packages/music-core/pianoflow_music/tests/fixtures/simple.mid
```

## Roadmap

Phases 1–11 code complete (auth, $0 deploy stack, AWS free-tier IaC). Live deploys pending. Stages 1–3 run at $0/month.
Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

---

Built as a portfolio project demonstrating Cloud/DevOps/AI engineering.
