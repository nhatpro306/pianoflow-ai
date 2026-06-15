# PianoFlow AI — Architectural Decision Log

ADR-style entries, newest first. Each entry covers Context, Decision, and Consequences.

---

## ADR-007 — Audio→MIDI: Self-Hosted, CPU-Now/GPU-Later, Pluggable Engines

**Date:** 2026-06-15
**Status:** Accepted

### Context

Basic Pitch (Spotify, Apache-2.0, ONNX) is the current production transcription
engine. It is instrument-agnostic — trained on general polyphonic audio — and
produces characteristic artifacts on dense solo piano: out-of-range pitches,
fragmented same-pitch events, ghost notes, imprecise onsets, and no pedal
information. Competing products (e.g. Songscription) use proprietary
Transformer models trained on licensed piano data and achieve noticeably higher
quality, but Songscription is a direct competitor and using it as a backend
vendor carries elevated business risk beyond the normal vendor dependency concern.
Piano-specific open models such as Transkun exist but require GPU or significant
CPU time and their Python APIs are not yet stable. A B2B transcription API
(e.g. Klangio) is a neutral alternative but adds per-job cost and means audio
leaves the system.

### Decision

1. Improve Basic Pitch output quality first using pure post-processing in
   `packages/music-core` (no new infra, no new runtime deps in the default
   path): range clipping, fragment merging, ghost-note removal, chord-aware
   hand split, optional beat-aligned quantization, honest tempo confidence.
2. Keep the `TranscriptionEngine` port in `engine.py` as the single swap
   point. No router or worker code knows which concrete engine is active.
3. Add Transkun as the next self-hosted candidate behind a `transkun` optional
   extra. The adapter scaffold (`transcription/transkun.py`) is committed but
   remains `ENGINE_UNAVAILABLE` until the real model output mapping is
   implemented — the scaffold must never silently produce wrong data.
4. Add an `onset_prf()` eval harness (`transcription/evaluate.py`) so any
   future engine comparison is measurement-driven, not impressionistic.
5. Defer any paid API spend and GPU instance provisioning until there is an
   explicit budget decision and a measured quality baseline from the eval harness.

### Consequences

- No new infra cost and no new runtime dependencies in the default path (Basic
  Pitch ONNX on CPU, placeholder engine for free-tier workers, unchanged).
- Pedal (CC64), quantization, and onset-level evaluation now exist in
  `music-core` and are available to any future engine that populates
  `NoteData.sustain`.
- Phase 4 compute path (GPU spot vs. Klangio vs. other) is left open; the
  pluggable engine port ensures the choice is a single-file swap, not a
  cross-cutting change.
- Songscription is ruled out as a vendor due to competitor risk; Klangio
  remains a candidate if a paid-API path is chosen.
- The `transcription-beat` and `transkun` extras in `pyproject.toml` are the
  only new package surface; they are entirely opt-in.

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
