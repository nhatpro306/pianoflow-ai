# 🎹 PianoFlow AI

[![CI](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/nhatpro306/pianoflow-ai/actions/workflows/ci.yml)

Turn any piano MIDI into a **tutorial video**, **sheet music**, and a **beginner-friendly version**.

> **Status: MIDI → sheet pipeline live + minimal tutorial video streaming + Beginner Mode + Audio → MIDI Beta.**
> Working: 2-phase MIDI upload → parse → MusicXML/PDF sheet outputs;
> rule-based **Beginner Mode** (easy / very easy) — simplified MIDI download,
> A/B piano-roll comparison, render jobs auto-chain simplification;
> audio upload (rights attestation required) → editable **draft MIDI** via
> placeholder transcription engine on `q_audio`.
> Simplification is rule-based (melody preserved, density capped) — not an arrangement.
> Audio → MIDI is **Beta / MVP+** — output is an editable draft, never "perfect MIDI".
> Tutorial videos are streaming-only — no MP4 download, max 1080p.
> Multi-user: Supabase Auth (email + Google), per-user project history,
> ownership-scoped API (cross-user 404s test-proven), daily usage limits (429s).
> Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## What it will do

- 🎬 Falling-note tutorial video (MP4) — 720p / 1080p / vertical, dark & light themes, adjustable speed
- 🎼 Sheet music (PDF + MusicXML)
- 🎵 Processed + beginner-simplified MIDI (rule-based, honestly labeled)

## Architecture

```
User → Next.js (Vercel) → FastAPI → Queue (Redis→SQS) → Worker → Storage (Supabase→S3)
                                          ↘ PostgreSQL (metadata only) ↙
```

Core rule: **the API never renders** — it validates, persists, and enqueues; workers do all heavy work.
Storage/queue/DB sit behind adapters so the MVP stack migrates to AWS with config changes, not rewrites.
Full design: [docs/DESIGN.md](docs/DESIGN.md)

## Run it locally

```bash
cp .env.example .env
docker compose up --build -d      # postgres + redis + api + worker
pnpm install && pnpm dev:web      # Next.js with HMR at http://localhost:3000
```

API: http://localhost:8000/healthz · http://localhost:8000/readyz · http://localhost:8000/docs

## Monorepo map

```
apps/web              Next.js + TypeScript + Tailwind (+ shadcn/ui from Phase 4)
apps/api              FastAPI — thin: validate, persist, enqueue
apps/worker           Python worker — parse, render video/sheet, simplify
packages/music-core   Pure music logic (pretty_midi/mido/music21) — zero I/O
packages/shared-types JSON Schemas + TS types + shared limit constants
infra/                Dockerfiles · Terraform (Phase 11) · Supabase · AWS assets
docs/                 Full design document set (10 docs)
```

## Docs

| Doc | What |
|---|---|
| [PRODUCT.md](docs/PRODUCT.md) | Vision, scope, metrics |
| [DESIGN.md](docs/DESIGN.md) | Architecture, job system, rendering pipelines |
| [DATABASE.md](docs/DATABASE.md) | Schema + storage strategy |
| [API.md](docs/API.md) | REST v1 contract |
| [UI_UX.md](docs/UI_UX.md) | Pages, components, flows |
| [CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md) | Monorepo + clean architecture |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 4 stages: local → MVP → AWS hybrid → full AWS |
| [ROADMAP.md](docs/ROADMAP.md) | 12 phases |
| [RISKS.md](docs/RISKS.md) | Risks, cost controls, limits |

## Development

```bash
uv sync --all-packages   # Python workspace (api, worker, music-core)
uv run pytest -q         # Python tests
uv run ruff check .      # Lint
pnpm -r typecheck        # TS
```
