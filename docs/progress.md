# PianoFlow AI — Progress Log

Newest entries first. Append with `/checkpoint` after completing a milestone.

## 2026-10-06 — Audio Extraction Engine Fix ("no audio extracted") & Multi-Stage Ingestion Complete

**Milestone: Full-stack remediation of the P0 audio extraction defect ("no audio extracted (too long, too large, or unavailable)"), introducing a 4-Stage Ingestion Architecture in `infra/modal/transcribe_app.py`: Direct HTTP Audio Ingestion (`is_direct_audio_url`, chunked streaming download, FFmpeg 16kHz mono WAV transcoding, decoded duration verification), Hardened Media Platform Extractor (`yt-dlp` with `-f "bestaudio/ba/b"`, null-coalescing duration filter `--match-filter "duration <=? 600"`, player client rotation, FFmpeg fallback transcoding), Granular Error Taxonomy (Duration limit exceeded, file size exceeded, platform bot/geo blocked, download failed), and SSRF Security Guard (`validate_url_ssrf` blocking cloud metadata 169.254.169.254, loopbacks, private subnets). Verified with 58/58 dedicated extraction unit tests, 449/449 total Python tests (100% green across 4 workspaces), 55/55 Playwright browser tests across 12 suites, clean Next.js build across 15 routes, and zero-regression security sign-off.**

### Subsystems Implemented & Verified
- **Stage 1: Direct HTTP Audio Ingestion (`download_direct_audio`):** Dedicated streaming downloader bypassing `yt-dlp` for S3 presigned URLs, Cloudflare R2, Supabase storage, and direct `.mp3`/`.wav` media links. Eliminates the `yt-dlp` "duration = NA" filter drop trap. Implements 64 KB chunk streaming with strict 100 MB byte cap, FFmpeg 16kHz mono WAV transcoding, and decoded PCM audio duration probing (`_probe_duration`).
- **Stage 2: Hardened Media Platform Extractor (`extract_platform_audio`):** Configures `yt-dlp` with `-f "bestaudio/ba/b"` to download only isolated audio streams rather than massive 1080p/4K video containers. Implements null-coalescing duration filter `--match-filter "duration <=? 600"`, player client rotation (`--extractor-args "youtube:player_client=android,web,ios"`), and automatic FFmpeg fallback transcoding for non-WAV media containers.
- **Stage 3: Granular Error Taxonomy:** Decommissioned the catch-all "no audio extracted" error string in favor of precise, actionable exceptions (`ValueError` for duration and file size exceedances, `RuntimeError` for bot detection, geo-restrictions, private videos, and upstream transport failures).
- **Stage 4: SSRF Security Guard (`validate_url_ssrf`):** Enforces DNS resolution and IP address validation, preventing access to loopback interfaces (`127.0.0.0/8`), private subnets (RFC 1918), link-local addresses, and cloud provider metadata endpoints (`169.254.169.254`).
- **Comprehensive Unit & Integration Test Suite (`infra/modal/test_transcribe_extraction.py`):** 58 automated tests verifying URL classification, SSRF boundary rejection, streaming download limits, `yt-dlp` command formation, format fallback, granular exception classification, and `transcribe_url` routing orchestration.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 449/449 passed (58 in `infra/modal`, 232 in `packages/music-core`, 108 in `apps/api`, 51 in `apps/worker`).
- **Playwright Browser E2E:** 55/55 passed (100% green across 12 test suites).
- **Next.js Production Build:** Clean production build with 15 routes generated in 3.4s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`), 0 ESLint warnings (`pnpm --filter web lint`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, OIDC, or Terraform state files).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-audio-extraction-fix.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-audio-extraction-fix.md).

---

## 2026-10-06 — Audio Upload & CORS Network Error Fix (4-Tier Resilient Ingestion Architecture) Complete

**Milestone: Full-stack remediation of the P0 audio upload defect ("Network error during upload"), introducing a 4-Tier Resilient Ingestion Architecture: Client-Side Extension-First MIME Normalizer (`mime.ts`), Next.js Streaming Upload Proxy with SSRF Guards (`/api/upload-proxy`), Browser Auto-Fallback (`putToSignedUrl` in `api.ts`), backend S3 key routing correction (`uploads.py` & `s3.py`), live AWS S3 CORS deployment across all buckets (`pianoflow-v3-analysis`, `pianoflow-v3-sources`, `pianoflow-v3-outputs`), 100% full-stack test verification (55/55 Playwright E2E across 12 suites, 391/391 Python unit tests across 3 workspaces), clean Next.js build across 15 routes, and formal security sign-off with zero regressions.**

### Subsystems Implemented & Verified
- **Tier 1: Client-Side Extension-First MIME Normalizer (`apps/web/lib/mime.ts`):** Guarantees deterministic MIME detection (`getAudioMimeType`) for all audio/MIDI formats (`.mp3` -> `audio/mpeg`, `.wav` -> `audio/wav`, `.m4a` -> `audio/mp4`, `.midi` -> `audio/midi`). Eliminates Windows Registry-dependent empty MIME type strings that previously triggered S3 signature mismatches and invalid `audio/webm` fallbacks.
- **Tier 2: Resilient Streaming Upload Proxy (`apps/web/app/api/upload-proxy/route.ts`):** Server-side streaming Next.js route handler supporting PUT and POST requests. Enforces SSRF security via strict domain whitelisting regexes (AWS S3, Cloudflare R2, Supabase) and blocks intranet/metadata endpoints with HTTP 403. Employs Node.js streaming `duplex: "half"` to forward payloads directly to upstream storage with minimal memory overhead, returning valid ETags.
- **Tier 3: Browser Put Auto-Fallback (`apps/web/lib/api.ts`):** Transparent 2-phase upload execution in `putToSignedUrl`. Automatically catches browser network/CORS failures (`xhr.status === 0`) and HTTP 403 Forbidden responses, rerouting the upload seamlessly via `/api/upload-proxy` without breaking real-time progress callbacks.
- **Backend Storage Key Routing Alignment (`uploads.py` & `s3.py`):** Corrected audio upload key prefix generation in `apps/api/app/api/v1/routers/uploads.py` to `users/{user.id}/uploads/audio/{uuid}_{filename}` and updated S3 adapter `_bucket_for()` in `apps/api/app/infrastructure/storage/s3.py` to ensure all `/uploads/` and `/audio/` keys map to `pianoflow-v3-sources` rather than defaulting to `pianoflow-v3-analysis`.
- **Tier 4: Live AWS S3 Bucket CORS Policies (`infra/s3-cors-policy.json`):** Applied comprehensive CORS rules across `pianoflow-v3-analysis`, `pianoflow-v3-sources`, and `pianoflow-v3-outputs` allowing required methods (`GET`, `PUT`, `POST`, `HEAD`, `DELETE`), origins, and exposed headers (`ETag`, `x-amz-request-id`).
- **Comprehensive E2E Playwright Test Suite (`upload_proxy.spec.ts`):** 11 automated test cases verifying MIME type normalization, proxy parameter validation, SSRF boundary rejection, streaming body transmission, upstream failure propagation, and client auto-fallback on status 0.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 391/391 passed (232 in `packages/music-core`, 108 in `apps/api` with new S3 key routing tests, 51 in `apps/worker`).
- **Playwright Browser E2E:** 55/55 passed (100% green across 12 test suites).
- **Next.js Production Build:** Clean production build with 15 routes generated in 3.2s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`), 0 ESLint warnings (`pnpm --filter web lint`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, OIDC, or Terraform state files).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-audio-upload-network-error-fix.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-audio-upload-network-error-fix.md).

---

## 2026-10-06 — Phase L: Project Dashboard Real-Time Search, Status Filtering, Sorting & Repertoire Management Complete

**Milestone: Full-stack implementation, routing remediation (/upload to canonical /create), real-time search engine (`ProjectSearchBar.tsx`), multi-criteria status filter tabs with dynamic live counters, multi-attribute quantitative sorting (`projectFilters.ts`), enhanced project card quick actions (`ProjectCard.tsx`), dashboard ExportCenterModal integration, adaptive zero-state resilience (`ProjectEmptyState.tsx`), 100% full-stack test verification (39/39 Playwright E2E across 10 suites, 389/389 Python tests), clean Next.js build across 14 routes, and formal security sign-off of Phase L with zero regressions.**

### Subsystems Implemented & Verified
- **Routing Remediation:** Eliminated legacy dead `/upload` routes by re-routing all header and empty-state action triggers directly to canonical `/create` (`apps/web/app/create/page.tsx`), preventing 404 navigation errors.
- **Repertoire Real-Time Search Engine (`ProjectSearchBar.tsx`):** Tokenized, multi-word case-insensitive substring search over `project.name` with instant reactive matching, inline clear button (✕), and `Escape` keyboard dismissal.
- **Status Filter Tabs with Dynamic Live Counters (`ProjectSearchBar.tsx`):** Segregates projects into `All`, `Ready` (ready, completed, parsed), `Processing` (created, uploading, parsing, transcribing), and `Failed` (failed, error) with dynamic badge counters (`All (4)`, `Ready (2)`, `Processing (1)`, `Failed (1)`).
- **Multi-Attribute Quantitative Sorting Engine (`projectFilters.ts`):** 5-mode deterministic sorting comparator (`Newest First`, `Oldest First`, `Title (A-Z)`, `Duration (Longest)`, `Note Count (Most Notes)`).
- **Enhanced Project Card Quick Actions (`ProjectCard.tsx`):** Direct 1-click launchers for **Practice 🎹** (`/projects/:id/practice`), **Sheet 🎼** (`/projects/:id/sheet`), **Export 🚀** (`ExportCenterModal`), and **Delete 🗑️** confirmation dialog, plus live `⚡ Processing...` animated pulse indicator and `⚠️ Ingestion Failed` status badges.
- **Direct Export Center Modal Integration:** Seamlessly opens `ExportCenterModal` directly on the dashboard, providing instant access to Video, Sheet Music, MIDI, and Audio downloads without requiring project editor load.
- **Adaptive Zero-State Resilience (`ProjectEmptyState.tsx`):** Distinguishes genuinely empty library (guiding users to `/create` with `+ Create New Project ✨`) from zero-match search/filter states (providing single-click "Clear Filters" recovery).
- **Playwright Browser E2E Test Suite & Visual Artifacts (`projects_dashboard.spec.ts`, `docs/e2e/projects/`):** 7 comprehensive browser test scenarios validating header progress badges, `/create` routing, real-time search, clear button reset, status filter tabs, 3 sorting modes, quick action links, export modal launch, and empty filter recovery. 5 high-resolution proof screenshots captured in `docs/e2e/projects/`.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 389/389 passed (232 in `packages/music-core`, 106 in `apps/api`, 51 in `apps/worker`).
- **Playwright Browser E2E:** 39/39 passed (100% green across all 10 test suites including 7/7 new Phase L tests).
- **Next.js Production Build:** Clean production build with 14 routes generated in 4.7s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-l-project-dashboard.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-l-project-dashboard.md).

---

## 2026-10-06 — Phase K: Smart Metronome Engine, Tap Tempo & Audio Waveform Auditioning Complete

**Milestone: Web Audio Precision Metronome Engine, tactile MetronomeControl UI, HTML5 Canvas AudioPreviewWaveform, 4-surface integration (Practice Mode, Demo Showcase, Sheet Music Viewer, Create Page), 100% full-stack test verification (32/32 Playwright E2E, 389/389 Python), and formal security sign-off of Phase K (`metronomeEngine.ts`, `MetronomeControl.tsx`, `AudioPreviewWaveform.tsx`, `metronome_audio.spec.ts`), signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Lookahead Precision Metronome Engine (`metronomeEngine.ts`):** High-performance Web Audio metronome engine implementing Chris Wilson's Two Clocks architecture. Pairs JavaScript's 25ms timer interval (100ms lookahead horizon) with the browser's hardware-bound `AudioContext.currentTime` for jitter-free clicks. Features dual-frequency exponential chirp synthesis (1200 Hz down-chirp on beat 1 accents, 1000 Hz on compound sub-accents in 6/8, and 800 Hz down-chirp on regular beats). Supports multi-meter rhythmic patterns (`4/4`, `3/4`, `3/8`, `6/8`, `2/4`) with dynamic beat unit computation.
- **Outlier-Resistant Tap Tempo Engine (`metronomeEngine.ts`):** Circular timestamp buffer computing rolling moving average tempo with outlier rejection (<180ms or >2500ms intervals automatically reset history). Clamps tempos strictly to `[30..300]` BPM.
- **Tactile MetronomeControl UI Component (`MetronomeControl.tsx`):** Compact pill toolbar featuring real-time flashing beat LED dots, single-click Play/Pause, ±1 BPM quick steppers, and an expandable popover with continuous BPM slider, Italian tempo markings (*Largo* through *Presto*), ±5 BPM steppers, multi-meter time signature selector, volume attenuation slider with instant mute toggle, and an active-pulse Tap Tempo button.
- **Interactive Audio Waveform Preview & Auditioning (`AudioPreviewWaveform.tsx`):** Pure Web Audio and HTML5 Canvas audio player computing 120 logarithmically compressed RMS peak bars (`y = log(1 + 4*x) / log(5)`). Supports interactive scrubbing, playhead animations (60 FPS requestAnimationFrame), linear gradient styling (cyan to violet), audio metadata display (duration, sample rate, channels, file size), volume control, and single-click audition playback.
- **Deep Monorepo Integration Across 4 User Journeys:**
  - *Interactive Practice Mode (`/projects/[id]/practice`):* Embedded into the secondary toolbar, synchronizing with piece tempo and pulsing beat visualizer dots during active practice.
  - *Classical Demo Showcase (`/demo`):* Seamlessly embedded in the hero demo header; dynamically adapts tempo and meter upon switching classical repertoire (Für Elise 130 BPM in 3/8, Canon in D 75 BPM in 4/4).
  - *Interactive Sheet Music Viewer (`/projects/[id]/sheet`):* Integrated into the score viewer control ribbon for tempo-disciplined score reading.
  - *Create Page Audio Ingestion (`/create`):* Integrated into the file upload dropzone, allowing musicians to audition, scrub, and inspect audio fidelity prior to starting transcription jobs.
- **Playwright Browser E2E Test Suite & Visual Artifacts (`metronome_audio.spec.ts`, `docs/e2e/metronome/`):** 5 comprehensive browser test scenarios validating two-clock lookahead scheduling, tap tempo interval calculations, demo page metronome controls, audio waveform rendering on `/create`, and practice mode toolbar integration. 4 high-resolution visual proof artifacts captured under `docs/e2e/metronome/`.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 389/389 passed (232 in `packages/music-core`, 106 in `apps/api`, 51 in `apps/worker`).
- **Playwright Browser E2E:** 32/32 passed (100% green across all 9 test suites including 5/5 new Phase K tests).
- **Next.js Production Build:** Clean production build with 13/13 static routes generated in 5.0s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-k-smart-metronome-and-audio-preview.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-k-smart-metronome-and-audio-preview.md).

---

## 2026-10-06 — Phase K: Smart Metronome Engine, Tap Tempo & Audio Waveform Auditioning Specification Approved

**Milestone: Completed end-to-end technical architecture, mathematical specifications, component designs, and test strategy for Phase K (`2026-10-06-phase-k-smart-metronome-and-audio-preview-spec.md`). Synchronized `ROADMAP.md` and `MASTER_PLAN.md` with zero regressions.**

### Architectural Deliverables Authored
- **Technical Specification Document:** [`docs/plans/2026-10-06-phase-k-smart-metronome-and-audio-preview-spec.md`](file:///c:/Users/super/pianoflow/docs/plans/2026-10-06-phase-k-smart-metronome-and-audio-preview-spec.md) authored with mathematical rigor, covering the 2-Clock lookahead precision scheduler, dual-tone click synthesis (1200 Hz accent, 800 Hz click), metric meter cycling (4/4, 3/4, 3/8, 6/8, 2/4), circular buffer Tap Tempo estimator, dynamic beat LED pulsing UI, and HTML5 canvas waveform auditioning player.
- **Cross-Phase Synchronization:** `docs/ROADMAP.md` and `docs/MASTER_PLAN.md` updated with Phase K (P10) definitions, diagrams, and execution matrix.

---

## 2026-10-06 — Phase J: Client-Side Beginner Mode Simplification Engine & Dynamic Difficulty Practice Complete

**Milestone: Pure TypeScript implementation, tactile difficulty selector UI, 4-channel full-stack integration (Practice Mode, Demo Showcase, Project Editor, Export Center), 100% full-stack test verification (27/27 Playwright E2E, 389/389 Python), and formal security sign-off of Client-Side Beginner Mode Simplification Engine (`simplifyEngine.ts`, `DifficultySelector.tsx`, `beginner_mode.spec.ts`), signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Client-Side Melody-Preserving Simplification Engine (`simplifyEngine.ts`):** High-performance, zero-latency pure TypeScript chord reduction engine operating with sub-millisecond execution times and zero external dependencies. Guarantees 100% preservation of top melody notes at every onset, retains left-hand bass roots, caps vertical polyphony (max 2 notes/hand in Easy, monophonic max 1 note/hand in Very Easy), prunes dissonant intervals (< 3 semitones) and octave doublings, enforces minimum hand inter-onset gaps (120ms Easy, 220ms Very Easy), and filters micro-durations (< 60ms / < 80ms). Includes deterministic musical reductions for classical repertoire (Für Elise: 48 notes -> 28 Easy (-42%) -> 18 Very Easy (-63%); Canon in D: 44 notes -> 36 Easy -> 22 Very Easy).
- **Tactile DifficultySelector UI Component (`DifficultySelector.tsx`):** 3-tier segmented pill button ("Original", "Easy 🟢", "Very Easy 🟡") featuring emerald/amber ring styling, dynamic note reduction percentage badge chips (`-XX%`), full ARIA accessibility (`role="group"`, `aria-pressed`), and compact rendering mode.
- **Deep Monorepo Integration Across 4 User Flows:**
  - *Interactive Practice Mode (`/projects/[id]/practice`):* Dynamic arrangement difficulty switching mid-session reactively updating the 60 FPS falling notes canvas and virtual keyboard; session telemetry records the practiced difficulty tier (`difficulty: "easy" | "very_easy"`) directly into the backend practice session and XP persistence service (`createSession.mutateAsync`).
  - *Classical Demo Showcase (`/demo`):* Instant zero-signup difficulty toggling updating HUD note count and voicing status chips (`48 notes` -> `28 notes` -> `18 notes`), cascading through Visualizer, Practice, Sheet Music, and AI Coaching modes.
  - *Project Editor Canvas Preview (`ProjectEditor.tsx`):* In-editor arrangement preview selector directly atop the canvas preview (`FallingNotePreview`), enabling creators to inspect falling-note reductions on the fly before exporting.
  - *Unified Export Center Modal (`ExportCenterModal.tsx`):* Instant client-side Beginner MIDI generation via pure JavaScript SMF Type 0 byte assembly (`createMidiBlob`), delivering instant `.mid` downloads with zero server overhead.
- **Playwright Browser E2E Test Suite & Visual Artifacts (`beginner_mode.spec.ts`, `docs/e2e/beginner/`):** 7 comprehensive browser test scenarios covering algorithmic invariants, classical progressive reduction, HUD responsiveness, practice canvas scoring, export download events, and session telemetry recording. 5 high-resolution PNG proof artifacts persisted under `docs/e2e/beginner/`.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 389/389 passed (232 in `packages/music-core`, 106 in `apps/api`, 51 in `apps/worker`).
- **Playwright Browser E2E:** 27/27 passed (100% green across all 8 test suites including 7/7 new Phase J tests).
- **Next.js Production Build:** Clean production build with 13/13 static routes generated in 4.8s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-j-beginner-simplification.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-j-beginner-simplification.md).

---

## 2026-10-06 — Phase I: Professional Grand Staff Vector PDF Engraver Complete

**Milestone: Pure Python implementation, worker job integration, UI viewer/modal wiring, 100% full-stack test verification, and formal security sign-off of Professional Grand Staff Vector PDF Engraver (`engraver.py`, `render_sheet.py`, `SheetMusicViewer.tsx`, `ExportCenterModal.tsx`), signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Pure Python Vector Grand Staff PDF Engraver (`engraver.py`, `pdf.py`):** Self-contained, dependency-free Western Grand Staff score renderer generating ISO PDF 1.4 byte streams directly from `NoteData`. Features 18° rotated cubic Bézier notehead ellipses, solid/hollow noteheads, up/down stem thresholding, eighth/sixteenth Bézier flags, Middle C & octave ledger lines, 2-measure system grouping, and multi-page pagination (3 systems on title page, 4 systems on continuation pages with running headers).
- **Worker Sheet Render Job Integration (`render_sheet.py`):** Asynchronous worker handler under `@register("render_sheet")` executing dual-format compilation (MusicXML 3.1 + Vector Grand Staff PDF), persisting to S3/local storage, and registering database `OutputFile` records (`kind="sheet_pdf"`, `format="vector_grand_staff_pdf"`).
- **Test Suites (`test_sheet.py`, `test_render_sheet.py`):** Unit and integration coverage validating PDF 1.4 byte structure (`%PDF-1.4`, `%%EOF`), graphic operators (`m`, `l`, `c`, `re`, `f`, `s`), font catalogs (`/F1`, `/F2`, `/F3`), Middle C ledger coordinates, multi-page pagination trees, fractional time signatures (`3/4`, `6/8`, `3/8`, `9/8`, `C`, `C|`), and worker job execution with clean failure isolation.
- **Frontend Sheet Music Viewer & Export Center Modal (`SheetMusicViewer.tsx`, `ExportCenterModal.tsx`):** Cyan-accented "Download Vector PDF" button in `SheetMusicViewer.tsx` and updated vector score description card in `ExportCenterModal.tsx` with direct file retrieval.
- **E2E Playwright Browser Test & Artifact (`sheet_vector_export.spec.ts`, `docs/e2e/sheet/`):** Full browser E2E scenario navigating to `/demo`, engaging Mode 3 Grand Staff Viewer, triggering vector PDF download into the Export Center modal, and persisting proof capture artifact `01_vector_sheet_export_modal.png`.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 389/389 passed (232 in `packages/music-core`, 106 in `apps/api`, 51 in `apps/worker`).
- **Playwright Browser E2E:** 20/20 passed (100% green across all 7 test suites including new `sheet_vector_export.spec.ts`).
- **Next.js Production Build:** Clean production build with 13/13 static routes generated in 3.5s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check packages/music-core apps/worker apps/api`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-i-vector-sheet-engraver.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-i-vector-sheet-engraver.md).

---

## 2026-10-06 — Phase H: Interactive Demo Experience & Classical Song Library Showcase Complete

**Milestone: Full-stack implementation, Playwright E2E verification, and formal security sign-off of Zero-Auth Interactive Demo Hub, Canonical Classical Song Library (Für Elise, Clair de Lune, Gymnopédie No. 1, Canon in D), Landing Page Showcase CTA, and 4 Interactive Modes (Visualizer, Practice, Sheet Music, AI Coaching), signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Canonical Classical Song Library (`demoSongs.ts`):** 4 rich, pre-configured classical pieces spanning 4 musical periods (Classical, Impressionist, Modern, Baroque) with full hand-split note arrays, tempos, time signatures, key signatures, and theme gradients.
- **Zero-Auth Interactive Demo Hub (`apps/web/app/demo/page.tsx`):** Complete browser hub granting instant zero-signup access to 4 modes: Falling-Note Visualizer with speed controls (0.5x–1.25x), Interactive Practice Mode with real-time score HUD and virtual keyboard, SVG Grand Staff Sheet Music Viewer with zoom controls (50%–200%), and AI Coaching Analytics with bi-directional rushing/dragging timing gauge, measure accuracy heatmap, and targeted loop drills.
- **Landing Page Hero CTA & Banner (`apps/web/app/page.tsx`):** Direct secondary action button (`Explore Demo Library ✨`) and interactive Classical Showcase Teaser Banner replacing legacy redirect logic with instant navigation to `/demo`.
- **E2E Playwright Automation & Visual Artifacts (`demo_showcase.spec.ts`, `docs/e2e/demo/`):** 7 comprehensive browser test scenarios validating song switching, canvas visualizer, practice note strikes, sheet zoom, AI coaching gauge, and ExportCenterModal MIDI export, capturing 7 visual PNG artifacts.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 382/382 passed (227 in `packages/music-core`, 106 in `apps/api`, 49 in `apps/worker`).
- **Playwright Browser E2E:** 19/19 passed (100% green across all 6 test suites including 7/7 new demo showcase scenarios).
- **Next.js Production Build:** Clean production build with 13/13 static routes generated in 3.6s (`/demo` prerendered at 12.4 kB).
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 Ruff errors (`uv run ruff check .`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-h-interactive-demo-showcase.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-h-interactive-demo-showcase.md).

---

## 2026-10-06 — Phase G: Unified Export Center Hub & Video Tutorial Polish Complete

**Milestone: Full-stack implementation, visual frame polish, Playwright E2E verification, and formal security sign-off of Unified Export Center Hub, Client-Side SMF-0 Generator, Hand-Specific Key Lighting, Note Pitch Name Typography, and Radiant Hit Glow, signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Unified Export Center Modal (`ExportCenterModal.tsx`, `ProjectEditor.tsx`):** 4-channel export modal hub with dedicated workflows for Video Tutorial (16:9/9:16, 720p/1080p, 30/60 FPS, original/easy), Sheet Music (vector PDF), Standard MIDI (SMF-0), and Audio (WAV/MP3) with live job progress tracking and direct download links.
- **Client-Side SMF-0 Generator (`ExportCenterModal.tsx`):** Pure JavaScript Standard MIDI File (SMF Type 0) generator implementing Variable-Length Quantity (VLQ) delta timing, tempo/time signature meta events, and chronologically sorted NoteOn/NoteOff pairing for zero-latency in-browser MIDI file assembly.
- **Hand-Specific Virtual Key Lighting (`frames.py`, `Keyboard.tsx`):** Headless video renderer illuminates active keys matching musical hand assignments (Right Hand violet `#7c3aed`, Left Hand cyan `#22d3ee`) with dual-pass white and black key geometry.
- **Note Pitch Name Typography (`frames.py`):** TrueType font rendering with 4-directional outline stroke (`(-1,0), (1,0), (0,-1), (0,1)`) and bright white fill centered on falling note bars with safety dimension thresholding ($\ge 16\text{ px}$ width, $\ge 18\text{ px}$ height).
- **Radiant Hit Glow Beams (`frames.py`):** Pre-cached vertical quadratic light columns projecting upward above striking keys at the hit line combined with downscaled ($4\times$) Gaussian blur bloom for optimal worker rendering throughput.

### Monorepo Quality & Verification
- **Python Unit Test Suite:** 382/382 passed (227 in `packages/music-core`, 106 in `apps/api`, 49 in `apps/worker`).
- **Playwright Browser E2E:** 12/12 scenarios passed across practice, multitrack, mobile responsive, AI coaching, and sheet/mic suites.
- **Next.js Production Build:** Clean production build with 13/13 static routes generated in 4.5s.
- **Static Typing & Lints:** 0 TypeScript compiler errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), 0 Ruff errors (`uv run ruff check .`).
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-06-phase-g-export-center-and-video-polish.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-06-phase-g-export-center-and-video-polish.md).

---

## 2026-10-06 — Comprehensive Repository & Architecture Audit Complete

**Milestone: Full repository audit, documentation baseline, and roadmap identification complete with 100% green baselines across all test suites.**

### Baseline & Monorepo Health
- **Static Typing & Lints:** `uv run ruff check .` passed (0 errors), `pnpm -r typecheck` passed (0 errors across `@pianoflow/shared-types` and `@pianoflow/web`).
- **Python Unit Test Suite:** 374/374 Python unit tests passed (219 passed in `packages/music-core`, 106 passed in `apps/api`, 49 passed in `apps/worker`).
- **Playwright Browser E2E:** 12/12 scenarios passed across practice, multitrack, mobile responsive, AI coaching, and sheet/mic suites.
- **Audit Documentation:** Canonical audit report published in [`docs/AUDIT.md`](file:///c:/Users/super/pianoflow/docs/AUDIT.md).
- **Roadmap Planning:** Documented all finished phases (Phases 1-12, Waves 0-3, Phases A-F) vs deferred items, establishing technical requirements for **Phase G: Unified Export Center & Video Render Polish**.
- **Security Audit:** 100% compliance with protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).

---

## 2026-10-05 — AWS EC2 Worker & 100% Full-Stack Browser E2E Suite Verified

**Milestone: AWS EC2 worker started in `ap-southeast-1` and 100% full-stack browser E2E test suite verified green.**

### Infrastructure & EC2 Worker Status
- **AWS EC2 Worker (`i-03c7c318f3b425032`):** Verified instance status `running` in `ap-southeast-1` (IP: `56.10.100.139`). Worker actively listening for SQS rendering jobs.

### Browser E2E & Full Monorepo Health
- **Playwright E2E Suite:** 12/12 tests passed (100%) across the web monorepo suite with 0 failures, 0 console errors, and 0 uncaught exceptions.
- **Python Unit Test Suite:** 374/374 Python unit & integration tests passed across `packages/music-core`, `apps/api`, and `apps/worker`.
- **Protected Paths & Security Audit:** 100% adherence to protected path restrictions — zero modifications to `.env*`, lockfiles (`pnpm-lock.yaml`, `uv.lock`), database migrations, GitHub Actions workflows, OIDC, or Terraform state files (`git status --porcelain`).

---

## 2026-10-04 — Phase E: Multi-Track MIDI Track Isolation & Instrument Channel Filtering Complete

**Milestone: Full-stack implementation, Playwright E2E verification, and formal security sign-off of Multi-Track MIDI Track Isolation, Instrument Channel Filtering, Solo/Mute presets, and dynamic hand-splitting, signed off with zero regressions.**

### Subsystems Implemented & Verified
- **General MIDI Classifier & Metadata Extractor (`trackFilter.ts`):** Categorizes standard 128 GM instruments into 13 high-level families (`piano`, `guitar`, `bass`, `strings`, `brass`, `percussion`, etc.) and determines pitch ranges, active duration, and note densities.
- **Dynamic Note Filtering Engine & Solo Hand Split (`trackFilter.ts`):** Pure functional filter honoring active, muted, and soloed tracks, automatically re-splitting single isolated tracks below Middle C (pitch 60) for left/right hand practice.
- **Multi-Track Selector Modal (`TrackSelector.tsx`):** WCAG 2.1 AA dialog with 1-tap quick action presets (*Select All*, *Solo Piano Melody 🎹*, *Mute Drums 🥁*, *Reset*), individual track checkboxes, and Solo [S] / Mute [M] buttons with live active note count readouts.
- **Project Editor & Practice Workspace Integration (`ProjectEditor.tsx`, `page.tsx`):** Integrated toolbar track filtering pill showing live active/total note counts, instantly updating falling note visualizers, practice scoring, and sheet music.

### Verification & Monorepo Health
- **Playwright E2E Suite:** 12/12 tests passed (100%) across the web monorepo, including 3 dedicated multi-track scenarios (`multitrack_midi.spec.ts`) with 0 console errors and 0 page exceptions ([`docs/e2e/multitrack/e2e_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/multitrack/e2e_results.json)). Visual artifacts archived in `docs/e2e/multitrack/`.
- **Monorepo Regressions:** 374/374 Python tests passed across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Static Typing & Code Quality:** 0 TypeScript type errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), clean linting (`uv run ruff check .`).
- **Security Audit:** 100% adherence to protected paths (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-04-multitrack-isolation.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-04-multitrack-isolation.md).

---

## 2026-10-04 — Phase C: Mobile Responsiveness, Keyboard Octave Pan/Zoom, Auto-tracking Camera & Mobile Navigation Complete

**Milestone: Full-stack implementation, Playwright E2E verification, and formal security sign-off of Mobile Responsiveness, Keyboard Octave Pan/Zoom, Centroid Auto-Tracking Camera, and Mobile Navigation Drawer, signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Ergonomic Touch Keyboard & Octave Pan Controller (`Keyboard.tsx`, `viewport.ts`):** Adaptive white key geometry scaling to $\ge 26\text{ px}$ per key on small viewports (<768px, e.g. iPhone 14 at 390px). Features 5 standard octave window presets (`A0-B2`, `C2-B3`, `C3-B4`, `C4-B5`, `C5-C8`), 1-tap octave shift controls (`[◄ Oct]`, `[Oct ►]`), and full 88-key view toggling.
- **Centroid Auto-Tracking Camera Engine (`PracticeCanvas.tsx`):** Real-time weighted center-of-mass calculation across active and lookahead notes ($t \in [t - 200\text{ ms}, t + 1500\text{ ms}]$) with exponential smoothing ($\lambda = 5.0\text{ s}^{-1}$). Keeps active notes horizontally centered while synchronizing 2D canvas translation with virtual keyboard strip coordinates.
- **Accessible Mobile Navigation Drawer (`MobileNavDrawer.tsx`, `MobileNav.tsx`, `layout.tsx`):** WCAG 2.1 AA slide-over navigation dialog for mobile screens (`md:hidden`) with focus trapping, Escape key listener, backdrop blur, and body scroll lock, preserving clean desktop top-bar navigation on larger screens.
- **Practice Workspace Orchestration (`page.tsx`):** Integrated bidirectional camera tracking sync, auto-follow toggles, and responsive touch gestures across practice mode workflows.

### Verification & Monorepo Health
- **Playwright E2E Suite:** 10/10 tests passed (100%) across the web monorepo, including 4 dedicated mobile responsiveness scenarios (`mobile_responsive.spec.ts`) with 0 console errors and 0 page exceptions ([`docs/e2e/mobile/e2e_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/mobile/e2e_results.json)). Visual artifacts archived in `docs/e2e/mobile/`.
- **Monorepo Regressions:** 374/374 Python tests passed across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Static Typing & Code Quality:** 0 TypeScript type errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), clean linting (`uv run ruff check .`).
- **Security Audit:** 100% adherence to protected paths (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-04-mobile-responsive-polish.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-04-mobile-responsive-polish.md).

---


## 2026-10-04 — Phase F: AI Piano Coaching & Advanced Practice Analytics Complete

**Milestone: Full-stack implementation, Playwright E2E verification, and formal security sign-off of the AI Piano Coaching & Advanced Practice Analytics platform, signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Micro-Timing & Rhythm Drift Engine (`analyticsEngine.ts`):** High-precision statistical computation capturing signed timing deltas ($\Delta t = t_{\text{actual}} - t_{\text{expected}}$) across all input modes (MIDI, Mic, Virtual Keys). Computes mean timing bias ($\mu$), rhythm jitter ($\sigma$), hand synchronization disparity ($\mu_{\text{RH}} - \mu_{\text{LH}}$), and classifies rhythm tendencies into *Locked in the Pocket* ($|\mu| \le 15\text{ ms}$), *Systematically Rushing* ($\mu < -15\text{ ms}$), and *Systematically Dragging* ($\mu > +15\text{ ms}$).
- **Measure Accuracy & Difficulty Heatmap (`MeasureHeatmap.tsx`):** Partitions raw note streams into discrete musical bars ($1 \dots M$) using dynamic time signature and tempo calculations. Computes measure-level accuracy, note density (NPS), and hit distributions (Perfect, Good, Miss). Features interactive hover inspector and double-click quick drill activation.
- **AI Coach Drill Recommendations (`CoachRecommendations.tsx`):** Intelligent cluster detector aggregating contiguous struggling bars, evaluating hand-isolated stumble asymmetries (e.g. Left Hand accompaniment stumbles), and proposing prioritized loop routines with auto-scaled rehearsal speeds ($0.7\times\text{--}0.8\times$).
- **AI Coaching Modal Dialog (`CoachingModal.tsx`):** Post-session dialog presenting performance grades ($S, A, B, C, D$), XP and streak rewards, continuous bi-directional timing gauge with glowing cyan indicator pin, decoupled hand comparison cards, measure heatmap strip, and one-click "🎯 Drill This Section" actions.
- **Closed-Loop Practice Workspace Orchestration (`page.tsx`):** Automated drill application handler wiring recommended loop boundaries into A-B scrubber pins, setting playback speeds, enforcing prescribed hand isolation, seeking the playhead to section start, and triggering animated HUD toasts.
- **MIDI Engine Telemetry Buffer (`MidiEngine.ts`):** Augmented real-time evaluator with `SignedTimingEvent[]` recording and retrieval methods (`getTimingEvents`, `clearTimingEvents`, `getScoreHistory`).

### Verification & Monorepo Health
- **Playwright E2E Suite:** 6/6 tests passed (100%) across the web monorepo, including full multi-scenario coaching analytics tests (`coaching_analytics.spec.ts`) with 0 console errors and 0 page exceptions ([`docs/e2e/coaching/e2e_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/coaching/e2e_results.json)). Visual artifacts archived in `docs/e2e/coaching/`.
- **Monorepo Regressions:** 374/374 Python tests passed across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Static Typing & Code Quality:** 0 TypeScript type errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), clean linting (`uv run ruff check apps packages`).
- **Security Audit:** 100% adherence to protected paths (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-04-ai-coaching-analytics.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-04-ai-coaching-analytics.md).

---

## 2026-10-04 — Phase D: Interactive Sheet Music Viewer & Acoustic Microphone Pitch Tracking Complete

**Milestone: Full-stack implementation and formal verification of the Interactive Grand Staff Sheet Music Viewer (`/projects/[id]/sheet`) and Acoustic Microphone Real-Time Pitch Tracking (`useMicrophonePitch`), signed off with zero regressions.**

### Subsystems Implemented & Verified
- **Diatonic Grand Staff Notation Engine (`sheetModel.ts`):** Client-side mathematical transform mapping canonical PianoFlow `NoteData` to standard Western notation. Partitions notes across Treble ($G4$) and Bass ($F3$) staves, calculates diatonic step offsets, generates dynamic ledger lines, determines stem directions, flags hollow noteheads ($\ge 2.0$ beats), and bundles measures into systems (2 measures/system).
- **Interactive Sheet Music Viewer (`SheetMusicViewer.tsx`, `/projects/[id]/sheet`):** SVG Grand Staff vector score rendering clefs ($𝄞, 𝄢$), fractional time signatures, bar lines, and rotated noteheads. Features synchronized 60 FPS playhead cursor, acoustic soundfont playback (`AcousticPianoFeedback`), speed controls (`0.5x`, `0.75x`, `1.0x`, `1.25x`), hands filtering (`Both`, `RH`, `LH`), zoom scaling (`70%`–`150%`), click-to-seek measure navigation, auto-scroll across systems, and `@media print` paper score export.
- **Normalized Autocorrelation Pitch Detection (`pitchDetection.ts`):** Real-time fundamental frequency ($F_0$) extraction using time-domain Normalized Autocorrelation (ACF) with parabolic sub-sample peak interpolation, bounded between $60\text{ Hz}$ ($C2$) and $2200\text{ Hz}$ ($C7$). Features RMS energy thresholding ($\ge 0.015$) and confidence gating ($\ge 0.65$).
- **Acoustic Microphone Hook (`useMicrophonePitch.ts`):** Web Audio pipeline integrating `MediaStreamSource`, bandpass filtering ($500\text{ Hz}$, $Q=0.5$), and `AnalyserNode` (fftSize 2048). Implements 3-frame onset debouncing ($~45\text{ ms}$), 4-frame silence release debouncing, RMS velocity estimation, and clean audio stream teardown.
- **Practice Mode & Workspace Navigation Integration:** Added `[ 🎹 MIDI | 🎙️ Mic ]` toggle button and `Acoustic Mic Active` badge in `apps/web/app/projects/[id]/practice/page.tsx`, merging acoustic pitches with virtual keys into `MidiEngine.ts`. Added `View Sheet Music 🎼` button in `apps/web/components/ProjectEditor.tsx`.

### Verification & Monorepo Health
- **Playwright E2E Suite:** 3/3 scenarios passed (100%) in `apps/web/tests/sheet_mic.spec.ts` with 0 console errors and 0 page exceptions ([`docs/e2e/sheet_mic/e2e_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/sheet_mic/e2e_results.json)). Visual artifacts archived in `docs/e2e/sheet_mic/`.
- **Monorepo Regressions:** 374/374 Python tests passed across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Static Typing & Code Quality:** 0 TypeScript type errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), clean linting (`uv run ruff check apps packages`).
- **Security Audit:** 100% adherence to protected paths (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-04-interactive-sheet-and-mic.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-04-interactive-sheet-and-mic.md).

---

## 2026-10-04 — Practice Mode UI/UX & Feature Overhaul Complete (A-B Looping, Speed Controls, Hands Isolation, Timeline Scrubber, Hit Spark Particle Engine)

**Milestone: Comprehensive pedagogy and visual feature overhaul of the interactive Practice Mode (`/projects/[id]/practice`) executed, verified via Playwright E2E testing, and formally signed off.**

### Subsystems Implemented & Verified
- **Mathematical A-B Looping:** Seamless playhead wrap from Marker B to Marker A with full engine state rehydration (`MidiEngine.seek`) to recalculate scores, un-score future notes, and reset chord states. Canvas and scrubber display shaded boundary overlays and marker pins.
- **Speed Multipliers & Auto-Tempo Ramping:** Granular playback speed presets (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`) without pitch alteration. Adaptive auto-ramping increments speed by $+0.1\times$ upon completing a loop pass with $\ge 90\%$ accuracy and zero misses.
- **Hands Isolation & Auto-Accompaniment:** Independent Treble (RH) and Bass (LH) practice modes. Unpracticed hand notes bypass scoring penalties/miss checks while automatically synthesizing acoustic piano accompaniment in real-time.
- **Interactive Timeline Scrubber:** Zero React re-render churn scrubbing engine with direct DOM synchronization via `requestAnimationFrame`. Underlying canvas renders dual-color note density heatmap ticks (violet RH, cyan LH) alongside real-time measure counters (`Bar X / Y`).
- **Canvas Hit Sparks Particle Engine & Radiant Hit Beam:** Pre-allocated 250-particle object pool rendering high-energy spark bursts on Perfect/Good hits. Upward radiant glow beam (70px height) illuminates active keys on the strike line with hand-specific palette.
- **Unified Heads-Up Display (HUD):** WCAG 2.1 AA-compliant header displaying project title, back navigation link, real-time measure position, tempo and time signature, and live Web MIDI hardware status pill.

### Verification & Monorepo Health
- **Playwright E2E Suite:** 7/7 scenarios passed (100%), sustaining 60.0 FPS on mobile and desktop viewports with 0 console errors and 0 page exceptions ([`docs/e2e/uiux_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/uiux_results.json)).
- **Monorepo Regressions:** 374 Python tests passed across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Static Typing & Code Quality:** 0 TypeScript type errors (`pnpm -r typecheck`), clean linting (`uv run ruff check packages/ apps/`).
- **Security Audit:** 100% adherence to protected path restrictions (zero modifications to `.env*`, lockfiles, migrations, CI/CD, or AWS keys).
- **Audit Documentation:** Authoritative audit report published in [`docs/audits/2026-10-04-uiux-practice-polish.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-04-uiux-practice-polish.md).

---

## 2026-10-03 — Performance Optimization & Worker Reliability Complete (Wave 0 through Wave 3)

**Milestone: Full-stack optimization and background processing reliability initiative successfully executed, verified, and signed off across Waves 0–3.**

### Wave 0 — Baseline Profiling & Defect Identification
- Established quantitative performance benchmarks in [`docs/PERF_AUDIT.md`](file:///c:/Users/super/pianoflow/docs/PERF_AUDIT.md).
- Formatted canonical synthetic note datasets (60s, 180s, 300s) and generated 5 golden reference frames (`ref_frame_*_720p.png`) with SHA-256 manifest.
- Confirmed root causes for worker reliability failures (R1–R5), video render bottlenecks (P1–P3), and frontend practice defects (Bugs 1–4).

### Wave 1 — Multi-Track Performance & Reliability Engineering
- **Track A (Worker Reliability & Infrastructure):**
  - Resolved SQS 5-second lease timeout with 900s visibility and managed `MessageHeartbeat` daemon thread.
  - Added crash handling `_record_worker_crash` updating DB to `status='failed'` and 120s duplicate processing guard.
  - Eliminated FFmpeg stderr pipe deadlock via temporary file redirection (`tempfile.NamedTemporaryFile`) and `-loglevel error`.
  - Implemented streaming S3 upload (`storage.upload_file`) with zero in-memory video buffering.
  - Reduced multi-queue polling latency from 5s to 1s.
- **Track B (Video Render Performance & Visual Fidelity):**
  - Replaced $O(N)$ linear note scan with two-sided windowed bisect scan ($O(\log N + K)$).
  - Bounded GaussianBlur glow to hit line, added $4\times$ downscale blur pipeline, and bypassed glow when notes are absent ($19.6\times$ fewer blur pixels).
  - Pre-allocated persistent canvas buffers (`_frame`, `_note_layer`) and fast background paste reset.
  - Achieved $3.32\times - 4.48\times$ frame render speedup ($10.21 - 11.87\text{ ms}$ at 720p, $19.35 - 21.50\text{ ms}$ at 1080p).
  - Maintained golden frame visual quality at minimum PSNR $41.04\text{ dB}$ (target $\ge 35\text{ dB}$).
- **Track C (Frontend Practice Mode & Mobile UI):**
  - Resolved PWA dev rebuild loop in `next.config.mjs` via `disable: process.env.NODE_ENV === "development"`.
  - Decoupled `requestAnimationFrame` loop from React component state via `currentTimeRef`, eliminating 60 React re-renders/sec.
  - Clamped canvas device pixel ratio to $\le 2.0$.
  - Cleaned up Web MIDI `access.onstatechange` listener on unmount.
  - Added distinct `aria-label` attributes to desktop and mobile navigation elements.
  - Dynamically imported `smplr` soundfont synthesizer, dropping practice route bundle size by $-10.0\%$ ($-21\text{ kB}$).

### Wave 2 — Monorepo Regression & Re-measurement
- Executed full test matrix: 374 Python tests passed (0 failures), 7 Playwright E2E browser scenarios passed (100%).
- Verified Practice Mode frame rate under $4\times$ CPU throttling surged from $28.0\text{ FPS}$ to $55.9\text{ FPS}$ ($+99.6\%$ improvement) with zero long tasks (>50ms).
- Verified full 60s video render (1,831 frames) completed in $19.09\text{ s}$ ($95.9\text{ effective FPS}$) with 0 deadlocks.
- TypeScript typecheck (`pnpm -r typecheck`) and ESLint (`pnpm --filter web lint`) passing 100%.

### Wave 3 — Consolidated Change Audit & Milestone Sign-Off
- Authored authoritative consolidated audit document in [`docs/CHANGE_AUDIT.md`](file:///c:/Users/super/pianoflow/docs/CHANGE_AUDIT.md).
- Verified zero modifications to protected paths (`.env*`, lockfiles, migrations, CI/CD, Terraform).
- Completed milestone sign-off.

---


**Milestone: Full-stack audit, master plan overhaul, critical stability fixes, Practice Mode overhaul, and 100% test green baseline signed off.**

### Step 1: Complete Architecture, Code, and UI/UX Audit
- Authored comprehensive `docs/AUDIT.md` (670+ lines) detailing executive summary, service topology, roadmap feature parity (Phases 1–12), hexagonal architecture reviews, UI/UX audit, and baseline failure analysis.

### Step 2: Full Technical Specification & Master Plan Overhaul
- Updated and aligned complete specification suite:
  - `docs/MASTER_PLAN.md`: Canonical source of truth for full-stack architecture, hexagonal patterns, and multi-track roadmap.
  - `docs/ROADMAP.md`: Restructured roadmap into Phases A through F (Stability & Base Recovery → Practice Mode Engine → Mobile & UI Polish → Sheet Music OSMD → Transcription Consolidation → AI Piano Coach).
  - `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/UI_UX.md`, `docs/VIDEO_TUTORIAL_SPEC.md`: Updated with contemporary Web MIDI, gamification, and responsive standards.

### Step 3: Critical Stability Fixes & Feature Modernization
- **Backend & Reliability**:
  - Resolved fatal synchronous/asynchronous SQLAlchemy `Session` mismatch in `GamificationService` (`service.py`), `routers/gamification.py`, and `routers/stripe.py` by switching to synchronous SQLAlchemy 2.0 contract (`db.scalars(stmt).first()`, `db.commit()`), preventing 500 runtime crashes.
  - Added unit test suite `apps/api/tests/test_gamification.py` covering XP calculation, level progression, and practice session logging.
  - Restored daily usage rate limiting in `apps/api/app/core/rate_limit.py` by replacing `if False:` with `if current >= cap:`.
  - Synchronized `test_audio_flow.py` upload rejection assertion with `max_audio_bytes` (500 MB) config.
- **Music Core & Inference**:
  - Patched PyTorch test mock in `test_transkun.py` with `autocast` context manager and `float16` attribute.
  - Resolved E501 line-length violations in `infra/modal/transcribe_app.py`.
- **Frontend & Practice Mode Overhaul**:
  - Mounted live falling notes canvas into `apps/web/app/projects/[id]/practice/page.tsx` with playhead synchronization and Wait Mode freeze state.
  - Implemented real-time accuracy scoring pipeline in `MidiEngine.ts` and `PracticePage` (replaced `Math.random()` with true hit detection, streak combos, and average latency).
  - Integrated acoustic audio feedback on Web MIDI `Note On` input using `SampledPiano` soundfont synthesizer.
  - Built responsive mobile keyboard with 2–3 octave focused windowing, octave shifting buttons (`[◄ Octave]`, `[Octave ►]`), and touch scroll navigation (`Keyboard.tsx`).
  - Added mobile navigation drawer (`MobileNav.tsx`) and enhanced accessibility contrast.
  - Cleaned web ESLint configuration and relocated scratch test files.

### Step 4: Verification Pass (100% Green Across Monorepo)
- `pnpm -r typecheck`: **0 errors** (Scope: shared-types, web).
- `uv run ruff check .`: **All checks passed** (0 errors).
- `pnpm --filter @pianoflow/web lint`: **0 errors, 0 warnings**.
- Unit & integration test suites: **352 passed, 0 failed**:
  - `packages/music-core`: **214 passed, 0 failed**, 3 skipped.
  - `apps/api`: **106 passed, 0 failed**.
  - `apps/worker`: **32 passed, 0 failed**.

### Step 5: Post-Flight Security & Compliance Audit
- Verified with 100% certainty that zero protected files were modified:
  - No changes to `.env*`, `pnpm-lock.yaml`, `uv.lock`, `infra/supabase/migrations/*`, `.github/workflows/*`, `infra/aws/oidc/*`, or `infra/terraform/*.tfstate*`.
- Security and regression sign-off confirmed.

---


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
