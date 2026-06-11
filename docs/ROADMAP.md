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

## Phase 10 — Deployment MVP (Stage 2 live)

- **Goal:** public URL anyone can use.
- **Tasks:** per `DEPLOYMENT.md` Stage 2 — Vercel + Render(API/worker) + Supabase(Postgres/Storage/Auth) + Upstash Redis; CI/CD pipeline (build, migrate, deploy); lifecycle cleanup job for expired outputs; `/internal/metrics`; uptime check; landing page final copy + demo video asset; README badges/screenshots.
- **Deliverables:** production URL in README; a stranger completes upload→download unaided; cost < $20/mo verified after 2 weeks.
- **Difficulty:** Medium. **Complexity:** M.
- **Do NOT:** AWS anything yet; premature autoscaling; custom domain perfectionism.

## Phase 11 — AWS Scalable Architecture (Stages 3→4)

- **Goal:** the cloud-engineering showcase: ECS/SQS/S3/RDS/CloudWatch via Terraform.
- **Tasks:** SQS + S3 adapters with contract tests; ECR + ECS Fargate services (api, worker-fast, worker-render) + ALB; queue split + depth-based autoscaling; data migration (S3 sync; later pg_dump→RDS); Terraform modules + staging/prod envs + remote state; CloudWatch logs/metrics/dashboard/alarms + DLQs; GitHub Actions OIDC deploy with plan-on-PR; architecture diagram + migration write-up in docs (the portfolio artifact).
- **Deliverables:** prod on AWS; `terraform apply` from clean account documented; dashboard screenshot + load-test report (e.g., 20 concurrent renders autoscale 1→4 workers) in README.
- **Difficulty:** High. **Complexity:** XL.
- **Do NOT:** Kubernetes (Fargate is the right size); multi-region; service mesh; rewrite anything that works.

## Phase 12 — Audio-to-MIDI Beta (future)

- **Goal:** beta-quality MP3/WAV → MIDI ingestion reusing the entire existing pipeline.
- **Tasks:** evaluate models (Onsets & Frames, Basic Pitch, MT3-class); `transcribe_audio` job on dedicated `q_ml` queue (GPU or CPU-heavy tasks); audio upload validation (duration/size caps tighter); confidence display + "beta" labeling; transcription quality test set; cost modeling before launch.
- **Deliverables:** MP3 → editable project → all existing outputs; honest quality disclaimer; per-transcription cost known.
- **Difficulty:** Very High. **Complexity:** XL.
- **Do NOT:** start before Phases 1–11 are solid; promise "perfect transcription"; YouTube import in the same phase (separate, after — adds ToS/copyright surface, see `RISKS.md`).

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
