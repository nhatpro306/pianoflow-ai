# PianoFlow AI — Progress Log

Newest entries first. Append with `/checkpoint` after completing a milestone.

## 2026-09-28 - MCP Virtual Pianist & PM Skill

**Milestone: Antigravity Agent Integration complete.**

- Implemented \irtual-pianist\ MCP server in \plugins/virtual-pianist\ using Playwright to mock Web MIDI for headless Practice Mode testing.
- Registered MCP server in \mcp_config.json\.
- Created \pianoflow-pm\ Skill in \.agents/skills/pianoflow-pm/SKILL.md\ to teach Antigravity how to triage bugs, review PRs, and manage CI/CD.
- Ran headless browser checks successfully.

---

---

## 2026-09-28 - AWS Infrastructure Redeployed & UI Upgraded

**Milestone: Stage 3 deployment fixed and UI primitives shipped.**

### AWS Redeployment Success
- Fixed GitHub Actions terraform state orphan issue by switching prefix to \pianoflow-v3\.
- Injected \	erraform apply -target=module.ecr\ dynamically before Docker build to prevent \RepositoryNotFoundException\ race conditions.
- Deployment run time reduced to < 4 minutes.
- Verified API Gateway health check (\/healthz\ returning 200 OK).

### UI / UX Improvements
- Replaced manual UI logic with a consolidated \pps/web/components/ui/\ primitive design system (Button, Card, Input, Badge, Progress, Skeleton).
- Streamlined project creation (\/create\) to accept both MIDI and Audio files natively.
- Evaluated transcription algorithms in python (\scripts/run_eval_baseline.py\).
- Authored plans for Web MIDI (\PRACTICE_WEB_MIDI_PLAN.md\) and Antigravity MCP integration (\ANTIGRAVITY_INTEGRATION_PLAN.md\).

---



## 2026-06-15 — AWS Free-Tier Deployment Live + ECC Adopted

**Milestone: Stage 3 deployment complete.**

### AWS Infrastructure (ap-southeast-1)

- API live on AWS Lambda + API Gateway via Mangum adapter.
  Endpoint: `https://fszwcr0te3.execute-api.ap-southeast-1.amazonaws.com`
- Worker running always-on on EC2 t2.micro (Docker, `--restart unless-stopped`,
  1 GB RAM + 1 GB swap). Worker drains SQS `q_default` and `q_audio` queues.
- SQS queues provisioned with DLQs (redrive policy: 3 attempts). This is the
  permanent fix for jobs stuck in `queued` status on Render/Redis.
- S3 buckets: `sources`, `analysis`, `outputs` with lifecycle rules (outputs
  expire 30 days; `tmp/` expires 1 day).
- CloudWatch log groups + basic alarms configured.
- Terraform IaC committed under `infra/terraform/` (modules: `ecr`, `sqs`, `s3`,
  `lambda-api`, `ec2-worker`, `cloudwatch`).
- GitHub OIDC deploy role (`pianoflow-gha-deploy`) created; trust and permissions
  policies committed to `infra/aws/oidc/`.
- CI workflow `aws-deploy.yml` (OIDC, ECR push, `terraform plan/apply`) in place.

### Root Cause Fixed

The worker on Render free-tier ("web service") suspended after ~15 minutes of
inactivity. Its Redis `BLPOP` loop died and queued jobs were never consumed. Render
Key Value (Redis) also dropped messages on restart. EC2 (always-on) + SQS (durable)
permanently resolves this.

### Other changes in this batch

- DB password rotated; new value stored in AWS SSM Parameter Store.
- AWS Budget alarm set at $5/month to catch free-tier overages.
- Orphaned `status='queued'` jobs from Render/Redis recoverable via
  `infra/aws/requeue_stuck_jobs.py`.
- Storage migration script `infra/aws/migrate_storage.py` committed (Supabase
  Storage → S3, idempotent, `--dry-run` supported).
- Upload route fixed to redirect to static project page (commit `9cb266d`).
- Vercel catch-all routes dropped so `@vercel/next` handles dynamic routes
  (commit `3414ecf`).
- Storage adapter errors surfaced as 502 envelope, not bare 500 (commit `8387e74`).
- CORS, auth callback, transcribing status, and user-identity bugs fixed
  (commit `qa: fix 9 bugs from full-stack audit`).

### ECC Adopted

- `CLAUDE.md` created at repo root with project memory, stack, commands, model
  delegation policy, agent/command index, and doc pointers.
- `docs/project-analysis.md`, `docs/architecture.md`, `docs/progress.md`,
  `docs/decisions.md` created.
- `ECC_ADOPTION_REPORT.md` filed at repo root.
- Selected components: architect/planner/code-reviewer/security-reviewer (Opus);
  refactor-cleaner/doc-updater/tdd-guide/build-error-resolver (Sonnet); 10 commands;
  coding-standards + backend/frontend-patterns + security-review + tdd-workflow +
  verification-loop + strategic-compact skills; 4 hook categories.

### Status

Stage 3 is live. Web → API → Queue → Worker → Storage/DB pipeline is end-to-end
functional. Audio transcription remains on `placeholder` engine (real Basic Pitch
needs more RAM than t2.micro provides).

---

## 2026-06-15 — Audio→MIDI Quality: Phases 1–3 Shipped (57002e9)

**Milestone: Transcription post-processing, timing, and engine extensibility landed in `packages/music-core`.**

### Phase 1 — Draft Cleanup

- `transcription/postprocess.py` added: `clean_notes()` pipeline runs
  `clip_to_piano_range` → `merge_same_pitch` (50 ms gap threshold) →
  `drop_ghost_notes` (sub-40 ms, velocity < 18). Returns `(notes, stats)` with
  per-pass removal counts. Input is never mutated; IDs are reassigned 0..n-1.
- `BasicPitchEngine.transcribe()` now calls `clean_notes()` before hand
  estimation; stats merged into `report`.
- Hand split upgraded from naive `pitch < 60` to chord-aware `estimate_hands()`
  from `midi/hands.py`.

### Phase 2 — Timing & Confidence

- `transcription/quantize.py` added: pure `quantize_notes(notes, bpm, grid)`;
  `grid_step_sec()` supports `1/4`, `1/8`, `1/16`, `1/32`, `1/8t`, `1/16t`.
  Onset-only snap; duration preserved; notes beyond `max_shift_sec` (120 ms)
  are left unchanged. Zero external dependencies.
- `transcription/beat.py` added: `estimate_tempo_and_beats(audio_path)` via
  deferred `librosa` import; returns `None` gracefully when librosa is absent.
  Registered as `transcription-beat` optional extra (`librosa>=0.10`).
- `BasicPitchEngine` tempo priority: librosa → `midi_data.estimate_tempo()` →
  120 BPM fallback. `report["tempo_source"]` records which path ran.
  `confidence["tempo_confidence"]` is `0.8` with librosa, `0.5` without.
- Opt-in quantization via `options={"quantize": True, "grid": "1/16"}`.

### Phase 3 — Engine Extensibility (scaffold)

- `transcription/transkun.py` added: `TranskunEngine` adapter scaffold registered
  in `engine.py` as `get_engine("transkun")`. Behind `transkun` optional extra
  (`transkun>=2.0`). Raises `ENGINE_UNAVAILABLE` when the package is absent or
  until the `_run_model` output mapping is implemented. Pedal events map to
  `NoteData.sustain` → CC64 in `write.py`.
- `transcription/evaluate.py` added: pure `onset_prf(reference, predicted)`
  returning precision/recall/F1 plus TP/FP/FN counts. Configurable tolerance
  (default 50 ms) and optional pitch matching. Zero external dependencies.
- `pyproject.toml` new optional extras: `transcription-beat`, `transkun`.

### Test suite

- New test files: `test_postprocess.py`, `test_quantize.py`, `test_beat.py`,
  `test_transkun.py`, `test_evaluate.py`.
- Full `music-core` suite: **152 passed**.

### What is NOT changed

- Default engine remains `basic_pitch`; placeholder engine unchanged.
- No new infra, no new required runtime dependencies, no worker config changes.
- Transkun is not active in any deployed environment.

---

<!-- /checkpoint will append the next entry above this line -->
