# PianoFlow AI — Project Analysis

> Reference this document for a high-level orientation. All detail lives in the
> linked docs listed at the end.

---

## Purpose

PianoFlow AI converts a piano MIDI file (and, in beta, an audio file) into a
complete set of learning materials: a falling-note tutorial video (MP4), printable
sheet music (PDF + MusicXML), a cleaned MIDI, and a beginner-simplified MIDI. The
core promise is "Upload a MIDI. Get everything a piano learner needs." in one
click.

The project is simultaneously a working product for piano learners/teachers/content
creators and a portfolio piece demonstrating async job-queue architecture, hexagonal
ports/adapters, and a documented migration path from free-tier hosting to AWS.

---

## Tech Stack

### Web (TypeScript)

| Technology | Role |
|---|---|
| Next.js 15 (App Router) | Frontend framework |
| React 19 | UI rendering |
| Tailwind CSS v4 | Styling |
| TanStack Query v5 | Server-state / polling |
| Supabase SSR client | Auth (JWT), Supabase Storage signed URLs |
| smplr | In-browser MIDI playback / piano-roll preview |
| pnpm 10 + pnpm workspaces | Package management |
| TypeScript strict mode | Type safety |
| ESLint | Linting |

### Python (API + Worker + Music Core)

| Technology | Role |
|---|---|
| FastAPI | REST API (thin: validate, persist, enqueue only) |
| Mangum | ASGI adapter for AWS Lambda |
| SQLAlchemy 2 | ORM |
| Alembic | DB migrations |
| pydantic-settings | Env-driven config (fail-fast at startup) |
| mido / pretty_midi | MIDI parsing (in `packages/music-core`) |
| music21 | Sheet-music generation (MusicXML) |
| FFmpeg (subprocess) | Video encoding |
| MuseScore CLI | PDF engraving |
| boto3 | AWS S3 + SQS clients |
| ruff | Lint + format (line-length 100) |
| pytest | Unit + integration tests |
| uv (workspaces) | Python package management |
| Python 3.12 | Runtime |

---

## Architecture

PianoFlow uses a **monorepo** with four runnable services (web, api, worker, plus
the music-core library) and a strict **hexagonal ports/adapters** design: the API
and worker never import vendor SDKs directly — all I/O goes through
`StorageService`, `QueueService`, and `DatabaseRepository` interfaces whose concrete
implementations are swapped via environment variables.

See [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) for the full layout and
dependency rules, and [docs/architecture.md](architecture.md) for the concise
component overview.

---

## Build Tools

### Web

```bash
# Development
pnpm --filter @pianoflow/web dev

# Production build
pnpm --filter @pianoflow/web build

# Lint
pnpm --filter @pianoflow/web lint

# Type-check (all workspaces)
pnpm -r typecheck
```

### Python

```bash
# Run tests (from repo root; substitute 'worker' or 'music-core' as needed)
uv run --directory apps/api pytest
uv run --directory apps/worker pytest
uv run --directory packages/music-core pytest

# Lint + format check
ruff check .
ruff format --check .

# DB migrations
uv run --directory apps/api alembic upgrade head
```

---

## Deployment Methods

PianoFlow has four deployment stages (full details in [docs/DEPLOYMENT.md](DEPLOYMENT.md)):

| Stage | Web | API | Worker | Queue | Storage | DB | Cost |
|---|---|---|---|---|---|---|---|
| 1 — Local | Next.js dev | uvicorn | Docker | Redis | Local FS | Postgres | $0 |
| 2 — Free-tier MVP | Vercel | Render | Render | Upstash Redis | Supabase Storage | Supabase | $0 |
| 3 — AWS free tier | Vercel | Lambda + API Gateway | EC2 t2.micro | SQS + DLQ | S3 | Supabase | $0/12mo |
| 4 — AWS production | Vercel | ECS Fargate | ECS Fargate (autoscaled) | SQS | S3 | RDS Postgres | ~$30–60/mo |

**Current live deployment (Stage 3 — AWS ap-southeast-1):**
- API: `https://fszwcr0te3.execute-api.ap-southeast-1.amazonaws.com`
- Worker: EC2 t2.micro (always-on, draining SQS)
- IaC: `infra/terraform/`
- CI: GitHub Actions OIDC deploy (`.github/workflows/aws-deploy.yml`)

The Stage 3 deployment fixed the core reliability issue from Stage 2: Render's free
worker service suspended when idle, silently losing queued jobs from non-persistent
Redis. AWS EC2 (always-on) + SQS (durable) resolved this.

See [docs/DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md) for the full AWS runbook.

---

## Testing Framework

### Python

pytest with two test categories per service:

- **Unit tests** — domain logic with in-memory fake adapters (`MemoryStorage`,
  `MemoryQueue`). No vendor SDKs required.
- **Integration tests** — routers via FastAPI `TestClient` + testcontainers
  (Postgres); worker handlers against real FFmpeg/MuseScore in CI.

Adapter contract tests run parametrized across all backends to ensure backend parity.

### Web (gap)

The web app currently has **no unit tests and no end-to-end tests**. This is a
known gap. The architecture document (`docs/CODE_ARCHITECTURE.md` §7) specifies the
intended test plan (Vitest + React Testing Library + MSW for unit; Playwright for
e2e smoke nightly), but these have not been implemented. Contributions that add web
test coverage are welcome.

---

## Further Reading

| Document | Contents |
|---|---|
| [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) | Full monorepo layout, dependency rules, adapter interfaces, conventions |
| [docs/architecture.md](architecture.md) | Concise component diagram and request/job lifecycle |
| [docs/DATABASE.md](DATABASE.md) | Full schema, ER diagram, storage key layout, lifecycle/retention |
| [docs/API.md](API.md) | REST API v1 specification |
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | Four-stage deployment plan |
| [docs/DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md) | AWS free-tier runbook (step-by-step) |
| [docs/DESIGN.md](DESIGN.md) | System design: job system, rendering pipelines, security, observability |
| [docs/PRODUCT.md](PRODUCT.md) | Product vision, personas, MVP scope |
| [docs/ROADMAP.md](ROADMAP.md) | Phased development roadmap |
