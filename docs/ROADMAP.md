# PianoFlow AI — Development Roadmap

> 12 phases. Each phase ends with something demonstrable. Complexity scale: S / M / L / XL (relative effort, not calendar promises). "What NOT to do" guards against scope creep — the main killer of portfolio projects.

---

## Phase 1 — Product & System Design

- **Goal:** complete, reviewed design document set (this `docs/` folder).
- **Tasks:** write PRODUCT/DESIGN/DATABASE/API/UI_UX/CODE_ARCHITECTURE/DEPLOYMENT/ROADMAP/RISKS/README_PLAN; decide notes-storage strategy; freeze MVP scope; pick MuseScore vs LilyPond primary.
- **Deliverables:** `docs/` folder merged; MVP scope frozen.
- **Difficulty:** Low. **Complexity:** S.
- **Do NOT:** write any production code; design future phases (audio-to-MIDI) beyond a paragraph; bikeshed naming.

## Phase 2 — Monorepo Setup

- **Goal:** skeleton repo where every service boots and CI is green.
- **Tasks:** monorepo layout per `CODE_ARCHITECTURE.md`; uv + pnpm workspaces; FastAPI hello + `/healthz`; Next.js shell with layout/theme; empty worker loop consuming a noop job; docker-compose with postgres/redis; ruff/mypy/eslint/tsc; GitHub Actions (lint+test); `.env.example`; Alembic init.
- **Deliverables:** `docker compose up` runs all services; CI green badge; README quickstart works.
- **Difficulty:** Low-Medium. **Complexity:** M.
- **Do NOT:** implement any feature; add Terraform yet; over-engineer shared-types generation (schemas can start as 2 files).

## Phase 3 — MIDI Upload & Parser

- **Goal:** a MIDI file gets uploaded, validated, parsed; notes JSON lands in storage; summary in DB.
- **Tasks:** `music-core` midi/validate + parse + normalize + hands modules with fixture tests; StorageService (local impl) + signed-URL flow stub for local; projects + uploaded_files tables/migrations; `POST /projects`, upload endpoints, `GET /notes`; parse logic callable synchronously for now (queue comes in Phase 5) — but **behind the job-shaped interface** so Phase 5 is a transplant, not a rewrite.
- **Deliverables:** curl-able flow: create project → upload `simple.mid` → fetch notes JSON; parser test suite green incl. `invalid.mid`, `long_song.mid` rejection.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** build UI yet; handle exotic MIDI (SMPTE offsets, multi-song format 2) beyond clean rejection; tune hand heuristic past "reasonable".

## Phase 4 — Piano Roll Preview

- **Goal:** the core editor screen renders parsed notes beautifully.
- **Tasks:** `/upload` page with `MidiUploader` (progress, errors); `/projects` list; `/projects/[id]` with `PianoRollPreview` canvas (zoom/scroll, hand colors, virtualized draw) + `KeyboardVisualizer`; TanStack Query API layer; shared-types for notes JSON.
- **Deliverables:** upload in browser → see piano roll; 5k-note file scrolls at 60 fps.
- **Difficulty:** Medium-High (canvas perf). **Complexity:** L.
- **Do NOT:** add audio playback (stretch goal, later polish); build settings panel yet; pixel-perfect design polish.

## Phase 4B — Live Preview & Visual Settings (added; spec: `VIDEO_TUTORIAL_SPEC.md`)

- **Goal:** Synthesia-style real-time preview in the browser: falling notes onto the keyboard, live piano audio, full color/speed customization — before any server-side rendering exists.
- **Tasks:** settings schema v2 (colors JSONB, presets, glow, speed_multiplier 0.25–2.0, fps 30/60); color pickers + preset themes + HEX validation + reset-to-default; playback-speed dropdown + estimated duration; vertical falling-note canvas player (play/pause, Web Audio clock, no rAF drift); approximate real-time piano sound; parser additions (channel, CC64 sustain → notes schema v2).
- **Deliverables:** upload → press play → watch glowing falling notes with sound at any speed/colors; settings persist and survive reload.
- **Difficulty:** Medium-High. **Complexity:** L.
- **Do NOT:** server-side audio/video; particles; exact-sounding preview audio (FluidSynth export is ground truth, preview approximates — labeled honestly).

## Phase 5 — Job Queue & Worker

- **Goal:** real async job system; parse runs through it end to end.
- **Tasks:** QueueService (redis impl) + MemoryQueue fake; render_jobs table + job domain (dedup, snapshot, status transitions); worker consume loop with registry, idempotency, retry/backoff, progress writer, tmp cleanup; move parse into worker; `GET /jobs/{id}`; `JobStatusPanel` with polling; project_events writes.
- **Deliverables:** upload → `parse_midi` job visible progressing in UI → notes appear; kill-worker-mid-job test shows clean retry; adapter contract tests green.
- **Difficulty:** Medium-High. **Complexity:** L.
- **Do NOT:** SQS adapter yet; WebSockets; multi-queue split (single queue fine — but keep `queue_name` in payloads).

## Phase 6 — Sheet PDF Generation

- **Goal:** download readable sheet music PDF + MusicXML for any parsed project.
- **Tasks:** music-core sheet modules (to_music21, quantize, musicxml); MuseScore CLI in worker image + `SheetEngraver` adapter (+ LilyPond fallback); `render_sheet` job; output_files table + outputs endpoint + signed downloads; minimal export page section.
- **Deliverables:** `simple.mid` and `chords.mid` produce correct, readable PDFs; quantization tests; UI shows the honest "approximate rhythm" note.
- **Difficulty:** Medium-High (engraving edge cases). **Complexity:** L.
- **Do NOT:** chase perfect engraving of humanized MIDI; dynamics/pedal/fingering; triplet detection (documented future work).

## Phase 7 — Video Tutorial Generation (scope superseded by `VIDEO_TUTORIAL_SPEC.md`)

- **Goal:** the headline feature — Synthesia-style falling-note MP4 **with synchronized SoundFont piano audio**, preserving the user's preview settings exactly.
- **Tasks:** music-core video modules (layout, glow/bloom blur layer, fog, hit line, keyboard, FrameRenderer with visibility index); FluidSynth `AudioRenderer` adapter + FluidR3_GM in worker image; speed-scaled MIDI re-render (single-timeline model, `VIDEO_TUTORIAL_SPEC.md` §4); FFmpeg stdin-pipe + WAV mux (H.264 + AAC); `render_video` job with staged progress; 720p/1080p × 30/60 fps; golden-frame tests per theme + audio-onset sync assertion; `VideoPreview` + export page.
- **Deliverables:** 2-min song → watchable 720p MP4 **with audio** in < 2 min on dev hardware; all color themes; no drift over a 10-min file (< 1 frame).
- **Difficulty:** High (perf + visual quality + sync). **Complexity:** XL.
- **Do NOT:** particle effects (Phase 7C); resolution above 1080p; per-segment parallel rendering; vertical format (moved to 7C with Shorts work); custom soundfont upload.

## Phase 7C — Video Visual Polish (added; after Phase 8, optional before 9)

- **Goal:** close the gap to the cinematic reference look.
- **Tasks:** bloom quality pass, hit particles, richer key lighting, fog refinement, vertical format, render perf tuning.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** block Phases 8–10 on this; chase film-grade VFX.

## Phase 8 — Beginner Mode

- **Goal:** easy / very-easy simplified outputs flowing through video + sheet.
- **Tasks:** music-core simplify modules (melody, reduce, rules); `simplify_midi` job producing simplified MIDI + notes JSON; difficulty setting wired through video/sheet jobs (consume the right notes variant); job chaining in API + frontend Generate button; property tests (melody never dropped, density caps hold).
- **Deliverables:** same song downloadable at 3 difficulties; A/B piano-roll comparison in UI (toggle); honest labeling everywhere.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** ML arrangement; key transposition; per-measure user overrides.

## Phase 9 — Authentication & Project History

- **Goal:** real multi-user product.
- **Tasks:** Supabase Auth integration (web SDK + API JWT verification + `AuthProvider` adapter); users table sync; ownership scoping audit on every endpoint (tests prove cross-user 404); usage_limits table + rate-limit middleware (uploads/day, jobs/day, video-seconds/day); RLS policies in `infra/supabase`; project list/history polish, delete flow.
- **Deliverables:** sign-up → personal project history; user B cannot see user A's anything (test-proven); limits return 429 correctly.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** OAuth providers beyond email+Google; roles/teams; payment plans.

## Phase 10 — Deployment MVP (Stage 2 live, $0/month)

- **Goal:** public URL anyone can use — entirely on free tiers.
- **Stack:** Vercel (web) + Render Free (API + worker) + Supabase Free (Postgres + Auth + Storage) + Upstash Free (Redis queue). All services are "forever free" — no 12-month expiry.
- **Tasks:** per `DEPLOYMENT.md` Stage 2 — Supabase project setup; Render blueprint deploy; Vercel import; Upstash Redis; CI/CD pipeline (lint/test on PR, migrate+deploy on merge); `cleanup_expired` job for 7-day output expiry; `/internal/metrics`; UptimeRobot pinger; landing page; README badges + deploy table.
- **Deliverables:** production URL in README; a stranger completes upload→download unaided; cost = $0/month verified.
- **Limitations:** Render sleeps (mitigated by UptimeRobot); 512MB worker RAM → video limited to 720p, <5min songs; 1GB storage → 7-day output expiry.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** AWS anything yet; premature autoscaling; custom domain perfectionism; pay for any service.

## Phase 11 — AWS Free-Tier Showcase (Stage 3, $0 for 12 months)

- **Goal:** the cloud-engineering portfolio showcase — Lambda + SQS + EC2 + S3 + Terraform, running at $0/month within AWS free tier limits.
- **Stack:** Lambda + API Gateway (API, always free) + SQS (queue, always free) + EC2 t2.micro (worker, 12mo free) + S3 (storage, 12mo free) + Supabase (DB + Auth, kept free). After 12 months EC2 costs ~$8/month; everything else stays free.
- **Tasks:** Mangum wrapper for Lambda; SQS + S3 adapters with contract tests; Terraform modules (`lambda-api`, `sqs`, `ec2-worker`, `s3`, `ecr`, `cloudwatch`); free-tier tfvars; EC2 user-data script (Docker + swap); data migration (Supabase Storage → S3 sync); GitHub Actions OIDC deploy with plan-on-PR; architecture diagram + cost report + CloudWatch dashboard screenshot.
- **Deliverables:** prod on AWS free tier; `terraform apply` from clean account documented; dashboard screenshot showing $0 cost; load test (10 concurrent uploads) in README.
- **Difficulty:** High. **Complexity:** XL.
- **Do NOT:** Kubernetes; multi-region; ECS Fargate (not free tier); RDS (keep Supabase for $0); pay for anything.

## Phase 12 — Audio-to-MIDI Beta (future)

- **Goal:** beta-quality MP3/WAV → MIDI ingestion reusing the entire existing pipeline.
- **Tasks:** evaluate models (Onsets & Frames, Basic Pitch, MT3-class); `transcribe_audio` job on dedicated `q_ml` queue (GPU or CPU-heavy tasks); audio upload validation (duration/size caps tighter); confidence display + "beta" labeling; transcription quality test set; cost modeling before launch.
- **Deliverables:** MP3 → editable project → all existing outputs; honest quality disclaimer; per-transcription cost known.
- **Difficulty:** Very High. **Complexity:** XL.
- **Do NOT:** start before Phases 1–11 are solid; promise "perfect transcription"; YouTube import in the same phase (separate, after — adds ToS/copyright surface, see `RISKS.md`).

**Status (Phase 12 implementation note):** A real Spotify Basic Pitch (Apache-2.0,
ONNX runtime) engine now exists behind the `TranscriptionEngine` interface as
`BasicPitchEngine` in `packages/music-core`. It is an optional, feature-flagged
extra (`pianoflow-music[basic-pitch]`); the deterministic placeholder remains
the free-tier default. The worker reads `TRANSCRIPTION_ENGINE` from env — set
`TRANSCRIPTION_ENGINE=basic_pitch` on a dedicated audio worker that has the
extra installed (Python ≤3.11 required for the current basic-pitch release).

---

## Audio → MIDI Quality Roadmap

Iterative improvement track for the Phase 12 transcription pipeline. All changes
live in `packages/music-core`; no new infra cost; new behaviour is opt-in or
config-gated. Default engine remains `basic_pitch`; the placeholder engine is
unchanged for free-tier workers.

### Phase 1 — Draft Cleanup (DONE)

- **Goal:** reduce the most common Basic Pitch artifacts before any downstream
  consumer sees the notes.
- **Delivered:**
  - `transcription/postprocess.py` — `clean_notes()` pipeline:
    `clip_to_piano_range` (drop notes outside A0–C8), `merge_same_pitch` (fold
    same-pitch events within 50 ms or overlapping into one), `drop_ghost_notes`
    (remove sub-40 ms notes with velocity < 18). Returns `(cleaned_notes, stats)`
    where stats counts removals per pass.
  - `BasicPitchEngine.transcribe()` now calls `clean_notes()` before hand
    estimation; cleanup stats are merged into the result `report`.
  - `midi/hands.py` `estimate_hands()` (chord-aware hand split) replaces the
    previous naive `pitch < 60` threshold. Hand assignment is now based on chord
    membership, not a fixed boundary.
- **Tests:** `test_postprocess.py`.
- **Do NOT:** tighten thresholds without measuring on a held-out test set first.

### Phase 2 — Timing & Confidence (DONE)

- **Goal:** honest tempo estimation and opt-in quantization; no silent fallbacks.
- **Delivered:**
  - `transcription/quantize.py` — pure `quantize_notes(notes, bpm, grid)` with
    `grid_step_sec()`. Supported grids: `1/4`, `1/8`, `1/16`, `1/32`, `1/8t`,
    `1/16t`. Snaps onsets; preserves duration; skips notes whose nearest grid
    position exceeds `max_shift_sec` (default 120 ms) to protect rubato phrasing.
    Zero external dependencies.
  - `transcription/beat.py` — `estimate_tempo_and_beats(audio_path)` via
    `librosa.beat.beat_track`; deferred import; returns `None` gracefully if
    librosa is absent or the file cannot be decoded. Registered as the
    `transcription-beat` optional extra (`librosa>=0.10`).
  - `BasicPitchEngine` tempo source priority: librosa beat tracker (when
    available and 40–240 BPM) → `midi_data.estimate_tempo()` → 120 BPM fallback.
    The `report["tempo_source"]` field records which path was taken
    (`"librosa_beat"` / `"midi_estimate"` / `"fallback"`).
  - `confidence["tempo_confidence"]` is `0.8` when librosa beats are available,
    `0.5` otherwise — no longer a fixed value.
  - Opt-in quantization: pass `options={"quantize": True, "grid": "1/16"}` to
    `transcribe()`. Off by default.
- **Tests:** `test_quantize.py`, `test_beat.py`.
- **Do NOT:** enable quantization by default; it damages humanized performances.

### Phase 3 — Engine Extensibility (DONE — scaffold)

- **Goal:** make swapping the transcription model a single-file change; add the
  next self-hosted engine behind an optional extra; add an eval harness.
- **Delivered:**
  - `transcription/transkun.py` — `TranskunEngine` adapter scaffold. Registered
    in `engine.py` as `get_engine("transkun")`. Behind the `transkun` optional
    extra (`transkun>=2.0`). Without the package installed, `transcribe()` raises
    `TranscriptionError(code="ENGINE_UNAVAILABLE")`. With it installed, also
    raises `ENGINE_UNAVAILABLE` until the real model output mapping is implemented
    (the TODO in `_run_model`). Pedal events from Transkun map to
    `NoteData.sustain` (list of `{time, value}`) which `write.py` emits as CC64
    in the draft MIDI.
  - `transcription/evaluate.py` — pure `onset_prf(reference, predicted)` harness.
    Returns `{precision, recall, f1, true_positives, false_positives,
    false_negatives, reference_count, predicted_count}`. Tolerance window is
    configurable (default 50 ms); pitch matching is configurable. Zero external
    dependencies.
  - `pyproject.toml` new optional extras: `transcription-beat` (librosa),
    `transkun` (transkun>=2.0).
- **Tests:** `test_transkun.py`, `test_evaluate.py`. Full music-core suite: 152
  passed.
- **Do NOT:** activate Transkun in any worker config until the output mapping in
  `_run_model` is completed and validated against the eval harness.

### Phase 3.5 — Baseline & Cheap Accuracy Wins (PLANNED — free, no infra, no budget)

> Prerequisite for the Phase 4 decision gate. Everything here is pure
> `music-core`, CPU-only, no new runtime deps in the default path. Do this
> before spending on any GPU instance or paid API.

- **Goal:** establish a measured quality baseline and capture the cheap accuracy
  wins that need no model change, so the Phase 4 model/compute choice is
  evidence-driven (ADR-007 gate), not impressionistic.
- **Step 1 — Baseline (must come first):** assemble a small held-out piano test
  set (5–10 clips with ground-truth MIDI; MAESTRO v3 subset is the obvious
  source). Run `transcription/evaluate.py` `onset_prf()` on `placeholder` vs
  `basic_pitch`. Record the F1 numbers in `docs/progress.md`. Without this number
  every downstream model swap is unmeasurable.
- **Step 2 — Cheap wins on the basic_pitch path (measure each vs Step 1):**
  - Dual-threshold onset hysteresis (onset `T_high` ≈ 0.7, frame `T_low` ≈ 0.3)
    to kill note-flicker.
  - Median-pool smoothing of frame activations to drop transient pops.
  - Sustain/CC64 heuristic extending note durations while pedal is held.
  - Keep only changes that raise F1 on the Step 1 set. Revert the rest.
- **Do NOT:** tune thresholds without re-running the eval set; enable
  quantization by default; chase changes that don't move the measured F1.

### Phase 4 — Compute Scale-Out (PLANNED — no budget decision yet)

- **Goal:** match or exceed proprietary transcription quality for dense solo piano.
- **Prerequisite:** Phase 3.5 baseline numbers exist.
- **Options under consideration (not built):**
  - **Self-hosted GPU/spot worker** — run a piano-specific model on a GPU or spot
    instance. No per-job cost once the model is running; audio stays in-house (no
    data-rights exposure). Two named candidates, choose by measured F1 on the
    Phase 3.5 test set:
    - **ByteDance `piano_transcription_inference`** (Apache-2.0, PyTorch,
      MAESTRO-trained) — strongest *proven* open solo-piano model; native velocity
      and pedal output; stable Python API. Preferred starting candidate.
    - **Transkun** — the Phase 3 scaffold; its `_run_model` output mapping
      (still `ENGINE_UNAVAILABLE`) must be finished before it can be evaluated.
    Either way requires a GPU instance budget or spot management.
  - **External transcription API** — delegate to a B2B service such as Klangio.
    Top quality with zero ML infrastructure to maintain; per-transcription cost.
    Audio leaves the system (rights concern for user-uploaded content). Note:
    Songscription is a direct competitor, making it a higher vendor risk than a
    neutral infrastructure vendor like Klangio.
- **Decision gate:** choose self-host vs. external API once there is a budget
  decision and a measured quality baseline from the eval harness.
- **Default engine** remains `basic_pitch` until Phase 4 is resolved.
- **Do NOT:** commit to either path, or spend on GPU/API, without the eval
  baseline and a budget sign-off.

---

## Dependency Graph

```
P1 ─ P2 ─ P3 ─┬─ P4 ──────────┐
               └─ P5 ─ P6 ─ P7 ─ P8 ─ P9 ─ P10 ─ P11 ─ P12
                    (P4 can overlap P5/P6)
```

## Milestone Demos (what to show at each checkpoint)

| After phase | Demo |
|---|---|
| P4 | "Upload a MIDI, see it as a piano roll" |
| P7 | "Upload a MIDI, get a YouTube-style tutorial video" ← first shareable wow |
| P10 | Public product URL |
| P11 | AWS architecture deep-dive write-up + dashboard ← interview centerpiece |
