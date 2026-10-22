# 🎹 PianoFlow AI

[![CI](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml)

Turn any piano MIDI into a **tutorial video**, **sheet music**, and a **beginner-friendly version**.

**Demo:** [PianoFlow](https://pianoflow-jet.vercel.app). Deployment notes are recorded in [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md); service availability and end-to-end processing must be checked on the target environment.

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

Prerequisites: Docker Compose, Node.js 22 (as used in CI), pnpm **10.34.2** (pinned in `package.json`), and Python **3.12+** with uv for native Python checks. Docker images provide the API/worker Python environment and rendering dependencies.

```powershell
git clone https://github.com/nhatpro306/pianoflow-ai.git
cd pianoflow-ai
Copy-Item .env.example .env
docker compose up --build -d postgres redis
docker compose run --rm api /repo/.venv/bin/alembic upgrade head
docker compose up --build -d api worker
pnpm install --frozen-lockfile
```

Configure the browser app separately: Next.js reads its environment from `apps/web`, not the repository root.

```powershell
Set-Content apps/web/.env.local 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000'
pnpm dev:web
```

Use that `Set-Content` command on a fresh checkout; edit an existing `.env.local` instead of overwriting it. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` there when using Supabase auth.

Compose sets local API `AUTH_MODE=dev`, local storage and Redis explicitly. This is a development configuration. Production uses the configured Supabase auth and backend adapters; root `.env.example` documents their fields. Keep service-role keys and database credentials out of `NEXT_PUBLIC_*` values.

API: http://localhost:8000/docs · `/healthz` · `/readyz` · `/internal/metrics`

## Deployment

The repository includes a Render blueprint, Vercel configuration and AWS infrastructure templates. Their presence describes supported deployment paths, not proof that services are healthy or that a deployment is free.

| Path | Repository configuration |
| --- | --- |
| Local | `docker-compose.yml`: PostgreSQL, Redis, API and worker; optional web profile |
| Vercel + Render | `vercel.json`, `render.yaml` and CI deployment hooks |
| AWS | `infra/terraform/` and the adapter configuration described in the deployment guide |

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) for setup and recorded handoff details. Hosting plans, quotas and billing depend on the provider and account; the README makes no fixed-cost guarantee.

Before publishing, configure authentication, database migrations, storage, queue and server secrets, then verify a complete upload → queued job → output flow. Health endpoints alone do not establish that rendering succeeds.

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
make test                         # Python tests for api, worker and music-core
```

The commands above come from the Makefile and CI. Web browser tests are separate (`pnpm --filter @pianoflow/web test:e2e`) and need the services and auth configuration specified by their Playwright setup. See `scripts/load_test.py` for deployment load-test options; run those only against your configured test environment.

## Roadmap

Track implementation milestones in [docs/ROADMAP.md](docs/ROADMAP.md), recorded deployment work in [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md), and operational limits in [docs/RISKS.md](docs/RISKS.md). Audio transcription is beta and depends on the selected engine and worker configuration; a placeholder engine is not evidence of real transcription quality.

---

Built as a portfolio project demonstrating Cloud/DevOps/AI engineering.
