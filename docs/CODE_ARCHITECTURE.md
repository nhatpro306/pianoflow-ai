# PianoFlow AI — Code Architecture

> Monorepo, clean architecture, adapter pattern. The structure below is the contract; coding phases (`ROADMAP.md`) fill it in.

---

## 1. Monorepo Layout

```
pianoflow-ai/
  apps/
    web/                 # Next.js frontend
    api/                 # FastAPI service (thin: validate, persist, enqueue)
    worker/              # Python background worker (all heavy work)

  packages/
    music-core/          # Pure-Python music logic (no I/O, no vendor SDKs)
    shared-types/        # Cross-language contracts (TS types + JSON Schemas)

  infra/
    docker/              # Dockerfiles per service + compose fragments
    terraform/           # AWS IaC (stage 3/4)
    supabase/            # SQL migrations mirror, RLS policies, seed
    aws/                 # task definitions, SQS/IAM policy docs, scripts

  docs/                  # this document set

  docker-compose.yml     # full local stack (stage 1)
  README.md
```

### What goes in each folder

| Folder | Contents | Must NOT contain |
|---|---|---|
| `apps/web` | Next.js App Router app: routes, components, TanStack Query hooks, API client generated/typed from `shared-types` | Business logic about music; direct storage/DB access |
| `apps/api` | FastAPI app (layout §2): routers, domain services, adapters, Alembic migrations | Rendering, MIDI parsing of file bodies, anything slow |
| `apps/worker` | Queue consumer loop, job handlers, renderer orchestration (layout §3) | HTTP endpoints, business rules that belong in music-core |
| `packages/music-core` | `pianoflow_music`: MIDI parse/normalize, note model, simplify rules, sheet conversion, video frame drawing (layout §4) | Network/storage/DB calls — pure functions over bytes/arrays/paths |
| `packages/shared-types` | JSON Schemas for notes JSON, job payloads, API DTOs; generated TS types (`json-schema-to-typescript`) + Pydantic models referencing the same schemas; shared constants (key layout, limits, enums) | Runtime logic |
| `infra/docker` | `api.Dockerfile`, `worker.Dockerfile` (includes FFmpeg + MuseScore), `web.Dockerfile` (local only; Vercel builds web in prod) | Secrets |
| `infra/terraform` | Modules: `network`, `ecs-api`, `ecs-worker`, `sqs`, `s3`, `rds`, `observability`; envs: `staging`, `prod` | Hand-edited state |
| `infra/supabase` | `migrations/` (RLS, storage policies), `seed.sql` | App schema source of truth (Alembic owns that; these mirror it) |
| `infra/aws` | ECS task def templates, IAM policy JSON, deploy scripts referenced by CI | — |

**Python packaging:** `uv` workspaces (or Poetry) — `apps/api` and `apps/worker` both depend on `packages/music-core` as a path dependency; one lockfile per app. **Node:** pnpm workspace for `apps/web` + `packages/shared-types`.

---

## 2. API Service Layout (`apps/api`)

```
apps/api/app/
  main.py                      # app factory, middleware (request_id, auth, rate limit), router mount
  core/
    config.py                  # pydantic-settings: env-driven config (STORAGE_BACKEND, QUEUE_BACKEND, limits)
    logging.py                 # structured JSON logger setup
    errors.py                  # AppError hierarchy → error envelope (API.md §0)
    security.py                # JWT verification, current_user dependency
  api/v1/routers/
    projects.py                # /projects CRUD
    uploads.py                 # /projects/{id}/upload-midi
    notes.py                   # /projects/{id}/notes
    settings.py                # /projects/{id}/settings
    jobs.py                    # job creation + GET /jobs/{id}
    outputs.py                 # /projects/{id}/outputs
    health.py                  # /healthz /readyz /internal/metrics
  domains/
    projects/                  # service.py, schemas.py (Pydantic DTOs), repository.py (interface)
    jobs/                      # job creation rules: dedup, snapshot, rate-limit checks, enqueue
    files/                     # upload validation, signed URL issuance, output listing
    music/                     # thin: notes retrieval, summary shaping (heavy logic = music-core, run by worker)
  infrastructure/
    database/                  # SQLAlchemy models, session, concrete repositories, alembic/
    storage/                   # StorageService impls: local.py, supabase.py, s3.py + factory
    queue/                     # QueueService impls: redis_queue.py, sqs.py + factory
    auth/                      # Supabase JWT verifier (Cognito impl later)
  tests/
    unit/                      # domain services with fake adapters
    integration/               # routers via TestClient + test Postgres + fake storage/queue
```

**Dependency rule (enforced by import-linter):**

```
api/v1/routers ──▶ domains ──▶ (interfaces defined in domains/*)
                                     ▲
infrastructure/* implements ─────────┘     main.py wires concrete impls (composition root)
```

Routers never import `infrastructure`. Domains never import vendor SDKs. Only `main.py`/factories know which backend is configured.

---

## 3. Worker Layout (`apps/worker`)

```
apps/worker/app/
  main.py                      # consume loop: poll queue → dispatch → ack/nack; graceful shutdown (SIGTERM)
  jobs/
    registry.py                # job_type → handler map
    base.py                    # JobContext (job row, settings snapshot, logger, progress reporter),
                               # idempotency check, retry/backoff, TransientError/PermanentError
    parse_midi.py              # download MIDI → music-core parse → upload notes JSON → update summary
    render_sheet.py            # notes → music-core sheet → MuseScore CLI → upload PDF/MusicXML
    render_video.py            # notes → music-core video frames → FFmpeg pipe → upload MP4
    simplify_midi.py           # notes → music-core simplify → upload simplified MIDI + notes
    generate_preview.py        # notes → thumbnail PNG → upload
  processors/                  # I/O orchestration shared by jobs:
    midi_io.py                 # fetch/store MIDI + notes JSON via StorageService
    progress.py                # throttled DB progress writer (max 1 update / 2 s)
    tmp.py                     # scratch dir per job, guaranteed cleanup (finally)
  renderers/                   # subprocess adapters (RendererService implementations):
    ffmpeg.py                  # frame-pipe encoder; timeout, stderr capture
    musescore.py               # mscore CLI wrapper; LilyPond fallback
  tests/
    unit/                      # handlers with fake storage/queue/db
    integration/               # real ffmpeg/musescore in CI container against fixtures
```

Worker reuses `apps/api`'s `infrastructure/` adapters via a small shared install (or duplicated thin factories reading the same env vars — decision: **share by importing `pianoflow_infra` if extracted later; MVP: worker has its own copies of the two factory files**, acceptable duplication to keep apps independent; revisit at Phase 11).

---

## 4. Music Core Library (`packages/music-core`)

```
packages/music-core/
  pianoflow_music/
    midi/
      validate.py              # magic bytes, structural checks, limits → ValidationResult
      parse.py                 # mido/pretty_midi → NoteData (notes JSON model)
      normalize.py             # dedupe, clamp, range filter
      hands.py                 # LH/RH heuristics (tracks / pitch-window)
      write.py                 # NoteData → .mid bytes (for processed/simplified output)
    notes/
      model.py                 # Note, NoteData dataclasses; (de)serialization matching shared-types schema
      timeline.py              # tempo map math, speed stretching, per-frame visibility index
    sheet/
      to_music21.py            # NoteData → music21 stream (two staves)
      quantize.py              # grid snapping (8th/16th)
      musicxml.py              # stream → MusicXML bytes
    video/
      layout.py                # key geometry (88 keys), resolution presets incl. vertical
      themes.py                # dark/light palettes, hand colors
      frames.py                # FrameRenderer: (NoteData, settings, t) → ndarray
      keyboard.py              # static keyboard image + active-key overlay
    simplify/
      rules.py                 # per-difficulty rule parameters (DESIGN.md §7.2)
      melody.py                # melody-line identification
      reduce.py                # chord reduction, density cap, short-note filter
    tests/
      fixtures/                # simple.mid, chords.mid, long_song.mid, invalid.mid (+ generators)
      ...
```

**Hard rule:** music-core does **zero I/O beyond local paths/bytes given to it**. No imports of boto3, supabase, redis, sqlalchemy, requests. This makes it trivially unit-testable and reusable by both worker and any future CLI/notebook.

---

## 5. Adapter Interfaces (canonical definitions)

Defined once (API `domains/` + mirrored protocol in worker), implemented per backend:

```python
# StorageService — local / supabase / s3
class StorageService(Protocol):
    def upload(self, key: str, data: bytes | BinaryIO, content_type: str) -> StoredObject: ...
    def download(self, key: str) -> bytes: ...
    def download_to(self, key: str, path: Path) -> None: ...
    def create_signed_upload_url(self, key: str, content_type: str, max_bytes: int) -> SignedUrl: ...
    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl: ...
    def delete(self, key: str) -> None: ...
    def delete_prefix(self, prefix: str) -> None: ...
    def exists(self, key: str) -> bool: ...

# QueueService — redis (RQ-style) / sqs
class QueueService(Protocol):
    def enqueue(self, queue_name: str, payload: dict) -> str: ...
    def receive(self, queue_name: str, visibility_timeout: int) -> JobMessage | None: ...
    def ack(self, message: JobMessage) -> None: ...
    def nack(self, message: JobMessage, requeue: bool) -> None: ...
    def depth(self, queue_name: str) -> int: ...

# DatabaseRepository — one interface per aggregate, e.g.:
class JobRepository(Protocol):
    def create(self, job: JobCreate) -> Job: ...
    def get(self, job_id: UUID, user_id: UUID) -> Job | None: ...
    def find_live_duplicate(self, project_id: UUID, job_type: str, settings_version: int) -> Job | None: ...
    def set_status(self, job_id: UUID, status: JobStatus, **fields) -> None: ...
    def update_progress(self, job_id: UUID, progress: int, message: str | None) -> None: ...

# RendererService — video / sheet engines behind one seam
class VideoEncoder(Protocol):
    def encode(self, frames: Iterator[np.ndarray], fps: int, size: tuple[int,int], out_path: Path) -> None: ...
class SheetEngraver(Protocol):
    def engrave(self, musicxml_path: Path, out_pdf_path: Path) -> None: ...
```

Selection via env (`STORAGE_BACKEND=local|supabase|s3`, `QUEUE_BACKEND=redis|sqs`) in factory functions; tests inject in-memory fakes (`MemoryStorage`, `MemoryQueue`) — no mocking frameworks needed for most tests.

---

## 6. Shared Types Strategy

- **Source of truth:** JSON Schema files in `packages/shared-types/schemas/` for: `notes.schema.json`, `job-payload.schema.json`, `render-settings.schema.json`, API DTOs.
- **Python:** Pydantic models in music-core/api validated against schemas in CI (schema-conformance test).
- **TypeScript:** generated types via `json-schema-to-typescript` (build step in `shared-types`), imported by `apps/web`.
- **Shared constants** (max file size, durations, enums, 88-key layout numbers) live in one JSON file consumed by both sides — prevents the classic "frontend allows 10 MB, backend allows 5 MB" drift.

---

## 7. Testing Plan

| Layer | What | Tools | Fixtures |
|---|---|---|---|
| music-core unit | parser correctness (note count, timing, BPM), invalid MIDI rejection, long-MIDI limits, hand split, quantization, simplify rules (melody preserved, chord caps), frame renderer (golden-image compare with tolerance), timeline math | pytest, hypothesis (property: simplify never increases note count; parse→write→parse roundtrip stable) | `simple.mid` (10 known notes), `chords.mid` (dense chords), `long_song.mid` (>10 min → rejected), `invalid.mid` (garbage bytes) — checked into `tests/fixtures`, plus generator script |
| api unit | job creation rules: dedup, settings snapshot, rate-limit denial; upload validation; ownership scoping | pytest + fake adapters | — |
| api integration | every route happy/error path from `API.md` against test Postgres (testcontainers) + MemoryStorage/MemoryQueue | pytest, httpx TestClient | — |
| worker unit | each handler with fakes: success path, transient retry (backoff called), permanent fail (no retry), idempotent re-run (completed job → ack, no work) | pytest | fixture notes JSON |
| worker integration | real FFmpeg + MuseScore inside CI container: render 5-second fixture → assert MP4 playable (ffprobe) and PDF non-empty | pytest, docker | `simple.mid` |
| adapters | contract test suite run against MemoryStorage *and* local *and* (CI-optional) supabase/s3 — same assertions, all backends | pytest parametrized | — |
| web | `MidiUploader` flow (type/size rejection, progress, confirm call), `JobStatusPanel` polling (starts/stops correctly, renders failure), settings PATCH debounce | Vitest + React Testing Library + MSW (mock API) | — |
| e2e (smoke) | upload → parse → generate → download against docker-compose stack | Playwright (1 golden-path spec, CI nightly) | `simple.mid` |

CI (GitHub Actions): lint (ruff, eslint, tsc) → unit → integration (services via docker) → build images. Golden-path e2e nightly, not per-PR (slow).

---

## 8. Code Conventions

- Python: ruff (lint+format), mypy strict on music-core and domains; Google-style docstrings on public functions.
- TypeScript: strict mode, eslint + prettier; no `any` in `shared-types` consumers.
- Errors: never raise vendor exceptions across the adapter boundary — adapters translate to `StorageError`, `QueueError` (transient/permanent flagged).
- Config: 12-factor — all env, validated at startup by pydantic-settings; app refuses to boot with missing config (fail fast, not at first request).
- Commits: Conventional Commits; PRs small and phase-scoped per `ROADMAP.md`.
