# PianoFlow AI — Architectural Decision Log

ADR-style entries, newest first. Each entry covers Context, Decision, and Consequences.

---

## ADR-006 — ECC (Enhanced Claude Code) Adopted Selectively

**Date:** 2026-06-15
**Status:** Accepted

### Context

Claude Code sessions on this repo were accumulating context rapidly — inline
retrieval of architecture docs, convention lookups, and re-derivation of stack
knowledge across sessions. ECC provides a framework of agents, skills, commands,
and hooks to manage this.

### Decision

Adopt ECC selectively. Accept components with clear value for this stack
(architect/planner/reviewer agents; coding-standards + backend/frontend-patterns +
security-review skills; ruff/console.log hooks; memory-persistence hooks).
Reject components that correspond to absent infrastructure or add noise
(e2e-runner, clickhouse-io, continuous-learning, prettier/tsc TS hooks, block-random-md).

Full rationale: `ECC_ADOPTION_REPORT.md`.

### Consequences

- `CLAUDE.md` at repo root is now the canonical project memory for Claude Code.
- Model delegation is explicit: Opus for architecture/planning/review; Sonnet for
  coding/testing/docs.
- Ruff and console.log hooks run automatically on file save in-session.
- Memory-persistence hooks reduce re-derivation cost across sessions.
- ~12 irrelevant components excluded, keeping the agent/command namespace
  signal-dense.

---

## ADR-005 — Model Delegation: Opus = Plan/Review, Sonnet = Build/Test

**Date:** 2026-06-15
**Status:** Accepted

### Context

Complex architectural reasoning is well-suited to Opus; high-volume coding,
refactoring, and documentation are more efficiently done by Sonnet. Without
explicit policy, sessions drift toward using the same model for everything.

### Decision

Opus for: architecture decisions, system design, security review, final PR review,
multi-agent orchestration. Sonnet for: coding, testing, refactoring, documentation
writing, build-error fixing. Default is Sonnet; escalate to Opus explicitly when
deep reasoning is needed.

### Consequences

- Policy codified in `CLAUDE.md` and `ECC_ADOPTION_REPORT.md`.
- Agents labeled by model in the CLAUDE.md index.
- Consistent with the user's global `~/.claude/CLAUDE.md` workflow.

---

## ADR-004 — Auth: Supabase JWT (ES256/JWKS) with HS256 Fallback

**Date:** 2026-06-09 (approx)
**Status:** Accepted

### Context

The API must verify JWTs issued by Supabase Auth. Supabase issues ES256 tokens
verified via JWKS endpoint. Some legacy tokens or dev environments may use HS256
(symmetric, shared `SUPABASE_JWT_SECRET`).

### Decision

Verify JWTs via JWKS ES256 as the primary path. Fall back to HS256 (shared
secret) if JWKS verification fails, to support dev/legacy tokens without breaking
production. Implemented in `apps/api/app/core/security.py` and
`infrastructure/auth/`.

### Consequences

- Production tokens verified asymmetrically (no secret needed on API side at
  runtime, only the JWKS URL).
- HS256 fallback keeps local dev simple (`AUTH_MODE=dev` can bypass entirely).
- Risk: HS256 fallback must be audited — a compromised `SUPABASE_JWT_SECRET` would
  allow forged tokens. Mitigated by scoping the fallback to a configurable flag.

---

## ADR-003 — Storage Backend: S3 on AWS (Stage 3+)

**Date:** 2026-06-12 (approx)
**Status:** Accepted

### Context

Stage 2 used Supabase Storage (1 GB free, bandwidth-limited). S3 is required for
Stage 3 to integrate with the AWS-native worker, eliminate cross-cloud egress from
EC2 to Supabase Storage, and leverage S3 lifecycle rules for output expiry.

### Decision

Switch `STORAGE_BACKEND=s3` on AWS deployment. Three buckets: `sources` (uploads),
`analysis` (notes JSON), `outputs` (MP4/PDF/MusicXML). Lifecycle rules: `tmp/`
expires 1 day; outputs expire 30 days. CORS configured on `sources` bucket to
allow browser presigned PUT from Vercel origin.

### Consequences

- Presigned URL flow unchanged from app code perspective (`StorageService` API is
  identical).
- S3 costs are within 12-month free tier (5 GB storage, 20k GET, 2k PUT).
- Video streaming egress can exceed free tier on high traffic — lifecycle rules and
  MVP duration caps (720p, <5 min) are the primary cost control.
- Existing Supabase Storage objects migrated via `infra/aws/migrate_storage.py`.

---

## ADR-002 — Worker: EC2 t2.micro Always-On (vs Serverless/Render)

**Date:** 2026-06-12 (approx)
**Status:** Accepted

### Context

The worker is a long-polling consumer loop (`BLPOP` / SQS long-poll 20 s). It
must be continuously running to drain the queue. Serverless functions (Lambda)
have a 15-minute max timeout and would require SQS trigger configuration that
introduces cold-start delays for each job. Render free "web service" suspends
after ~15 minutes of idle HTTP activity — but the worker makes no HTTP calls, so
it suspended immediately under light load and never woke up.

### Decision

Run the worker on EC2 t2.micro (`--restart unless-stopped`, Docker). Always-on, 1
GB RAM + 1 GB swap, within the 750 h/month 12-month free tier. This permanently
fixes the "jobs stuck in queued" bug.

### Consequences

- Worker is always available; no cold-start delay for job processing.
- 750 h/month free tier covers ~31 days (one instance). Stops being free after
  12 months (~$8–9/month to continue).
- Single instance: no autoscaling. Queue depth can grow under burst load.
- 1 GB RAM limits video rendering to 720p, songs under ~5 minutes. Audio
  transcription with Basic Pitch (ONNX) requires a larger instance — remains on
  placeholder engine for now.
- Deployment: EC2 user-data installs Docker + swap, pulls ECR image, starts
  container. Updates require `docker pull && docker restart` or re-running user-data.

---

## ADR-001 — Queue Backend: SQS on AWS (vs Redis/Upstash)

**Date:** 2026-06-12 (approx)
**Status:** Accepted

### Context

Stage 2 used Upstash Redis (10k commands/day free). Two reliability problems
emerged in practice:

1. Render free Key Value (Redis) is non-persistent — queued messages were
   silently dropped on restart.
2. The worker ran as a Render "web service" which suspended after idle, killing
   the `BLPOP` loop.

Redis also requires an always-on broker process; on Upstash free it is persistent
but the 10k command/day cap is tight (each job costs ~5–10 commands).

### Decision

Switch `QUEUE_BACKEND=sqs` for AWS deployment. SQS standard queues with one DLQ
per queue (redrive after 3 failures). Long-poll 20 s. Always-free tier: 1M
requests/month (perpetual, not 12-month).

### Consequences

- Messages are durable: SQS persists messages for up to 4 days by default (14
  days max). No message loss on worker restart or crash.
- DLQ captures permanently-failed jobs for inspection/replay.
- `requeue_stuck_jobs.py` script re-enqueues orphaned Render/Redis jobs that were
  in `status='queued'` in Postgres but had no broker message.
- SQS visibility timeout must be set longer than the maximum job duration to
  prevent duplicate processing.
- No Redis dependency in production; Redis remains available as a `QUEUE_BACKEND`
  option for local dev and Stage 1/2.
