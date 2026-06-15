# PianoFlow AI — Architecture Overview

> This document is a concise summary. It deliberately defers all detail to
> [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) (layout, dependency rules,
> adapter interfaces, conventions) and [docs/DATABASE.md](DATABASE.md) (schema, ER
> diagram, storage key layout). Do not duplicate content from those files here.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                      │
│  Next.js 15 (Vercel)                                         │
│  TanStack Query polling · smplr piano-roll · signed-URL DL   │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS  REST /api/v1
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  API  —  FastAPI (Lambda + API Gateway on AWS)               │
│  Validates · persists metadata · issues signed URLs          │
│  Enqueues jobs · returns job status                          │
│  Never parses MIDI or renders anything                       │
└──────┬───────────────────────────────────────────────────────┘
       │ enqueue (SQS / Redis / memory)
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Queue  —  QueueService abstraction                          │
│  Backends: SQS (AWS, production) · Redis · in-memory (test)  │
│  Per-type queues: q_default · q_audio · DLQs                │
└──────┬───────────────────────────────────────────────────────┘
       │ poll + ack
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Worker  —  Python (EC2 t2.micro on AWS)                     │
│  Always-on consume loop (long-poll 20 s, SIGTERM-safe)       │
│  Job handlers: parse_midi · render_sheet · render_video      │
│                simplify_midi · generate_preview              │
│  Uses music-core for all pure music logic (no I/O in core)  │
└──────┬───────────────────────────────────────────────────────┘
       │ upload outputs / update job status
       ▼
┌─────────────────────┐      ┌────────────────────────────────┐
│  Object Storage      │      │  PostgreSQL (Supabase)         │
│  StorageService      │      │  DatabaseRepository            │
│  S3 / Supabase /     │      │  Metadata only — no blobs      │
│  local               │      │  Alembic migrations            │
└─────────────────────┘      └────────────────────────────────┘
```

---

## Hexagonal Ports/Adapters Pattern

All external I/O is hidden behind three protocol interfaces defined in `apps/api/domains/`:

| Interface | Implementations | Selected by |
|---|---|---|
| `StorageService` | `LocalStorage` · `SupabaseStorage` · `S3StorageService` | `STORAGE_BACKEND=local\|supabase\|s3` |
| `QueueService` | `MemoryQueue` · `RedisQueue` · `SqsQueueService` | `QUEUE_BACKEND=redis\|sqs` |
| `DatabaseRepository` | SQLAlchemy concrete repos | always Postgres via `DATABASE_URL` |

Routers only import domain services. Domain services only import interfaces.
Only `main.py` (composition root) knows which concrete adapter is configured.
This means switching from Redis to SQS, or Supabase Storage to S3, is a config
change plus infrastructure work — no application code changes.

Tests inject `MemoryStorage` and `MemoryQueue` directly — no mocking frameworks
needed.

---

## Request/Job Lifecycle

```
1. Upload
   Browser → PUT (presigned URL to S3/Supabase) ← signed by API
   Browser → POST /api/v1/projects/{id}/upload-midi (confirm)

2. Enqueue
   API validates file (magic bytes, size, MIME)
   API creates render_jobs row (status='queued')
   API publishes job payload to QueueService

3. Worker processes
   Worker long-polls QueueService (20 s visibility timeout)
   Worker dispatches to handler by job_type
   Handler downloads source from StorageService
   Handler calls music-core (pure Python, no I/O)
   Handler uploads outputs to StorageService
   Handler updates render_jobs.status → 'completed' (or 'failed')
   Worker acks message; on transient error → nack + backoff retry

4. Frontend polls
   TanStack Query polls GET /api/v1/jobs/{id} (≤5 s interval)
   On status='completed': fetches output list + signed download URLs
   Renders piano-roll preview (notes JSON via signed URL)
```

---

## Backend Abstractions Summary

```
STORAGE_BACKEND=local      → dev/CI, writes to ./data/storage
STORAGE_BACKEND=supabase   → Stage 2 (free MVP)
STORAGE_BACKEND=s3         → Stage 3/4 (AWS)

QUEUE_BACKEND=redis        → Stage 1/2
QUEUE_BACKEND=sqs          → Stage 3/4 (durable, DLQ, always-free tier)
```

The adapter swap has been completed: Stage 3 is live with `STORAGE_BACKEND=s3` and
`QUEUE_BACKEND=sqs`. The fix resolved the root cause of queued jobs never being
processed (Render free worker suspension + non-persistent Redis).

---

## Further Detail

- Full monorepo layout, dependency rules, adapter interface signatures, code
  conventions: [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md)
- Database schema, ER diagram, storage key namespace, retention policies:
  [docs/DATABASE.md](DATABASE.md)
- Job system design, rendering pipelines, security, observability:
  [docs/DESIGN.md](DESIGN.md)
- AWS infrastructure and first-deploy walkthrough:
  [docs/DEPLOYMENT_AWS.md](DEPLOYMENT_AWS.md)
