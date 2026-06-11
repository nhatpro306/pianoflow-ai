# PianoFlow AI — Product Document

> Version: 1.0 (MVP design)
> Status: Approved for design phase
> Last updated: 2026-06-11

---

## 1. Product Vision

**PianoFlow AI turns a piano MIDI file into learning material in one click:**

1. A falling-note piano tutorial video (MP4) — the "Synthesia / YouTube piano tutorial" style.
2. Printable sheet music (PDF + MusicXML).
3. A cleaned, processed MIDI file.
4. A beginner-friendly simplified version of the song.

The core promise: **"Upload a MIDI. Get everything a piano learner needs."**

### Why MIDI-first?

MIDI input is deterministic, lightweight, and parseable with mature open-source tools (`pretty_midi`, `mido`, `music21`). Audio-to-MIDI transcription is a hard ML problem with noisy output and heavy compute requirements. Starting MIDI-first lets us:

- Ship a working end-to-end pipeline quickly.
- Build the rendering/sheet/simplification infrastructure that audio input will reuse later.
- Keep MVP infrastructure costs near zero.

Audio-to-MIDI and YouTube import are explicitly **future phases** (see `ROADMAP.md`, Phase 12).

---

## 2. Target Users

| Persona | Description | Primary need |
|---|---|---|
| **Self-taught piano learner** | Learns from YouTube falling-note videos. Finds MIDI files online or exports them from apps. | Turn any MIDI into a watchable tutorial video at their own speed. |
| **Piano teacher** | Prepares material for students of mixed levels. | Generate sheet music + simplified versions of the same song for different students. |
| **Content creator** | Makes piano tutorial videos for YouTube/Shorts/TikTok. | Fast, branded, configurable video rendering without manual video editing. |
| **Hobbyist composer** | Writes music in a DAW, exports MIDI. | Get readable sheet music from their own compositions. |

### Secondary audience (portfolio context)

This project is also a **portfolio piece for Cloud / DevOps / AI engineering roles**. Architecture decisions intentionally demonstrate:

- Async job-queue architecture (API never does heavy work).
- Adapter/port pattern for storage, queue, and rendering backends.
- A documented migration path from low-cost MVP hosting to AWS (ECS Fargate, SQS, RDS, Terraform).
- Observability, cost control, and testing discipline.

---

## 3. MVP Scope (v1)

### 3.1 In scope

**Upload & validation**
- User uploads a `.mid` / `.midi` file (max size enforced, type validated by magic bytes, not extension).
- System rejects corrupt or non-MIDI files with a clear error.

**Parsing & analysis**
- Backend parses the MIDI and extracts:
  - BPM (including tempo changes — MVP uses the dominant tempo, stores the tempo map)
  - Total duration (seconds)
  - Track list (name, instrument, note count)
  - Notes: pitch, note name (e.g. `C4`), velocity, start time, end time, duration
  - Left-hand / right-hand estimate (heuristic: track split if 2 tracks, else pitch-split around middle C with overlap handling)

**Preview**
- Frontend renders an interactive piano roll preview from the parsed note data.

**Render settings**
- Resolution: `720p`, `1080p`, `vertical` (1080×1920)
- FPS: `30` (fixed in MVP)
- Playback speed: `50%`, `75%`, `100%`
- Difficulty: `original`, `easy`, `very_easy`
- Show note names: on/off
- Show keyboard: on/off
- Theme: `dark` / `light`

**Generation (async jobs, processed by worker)**
- MP4 falling-note tutorial video
- PDF sheet music + MusicXML
- Simplified MIDI (when difficulty ≠ original)
- Processed/normalized MIDI

**Delivery**
- User downloads outputs via signed URLs.
- User sees project history (list of projects, per-project outputs).
- User sees live job status and progress (queued → processing N% → completed/failed).

### 3.2 Explicitly out of scope (MVP)

| Feature | Why deferred |
|---|---|
| MP3/audio → MIDI | Hard ML problem; heavy GPU compute; noisy results. Phase 12. |
| YouTube link import | Depends on audio→MIDI + copyright/ToS complexity. Future. |
| "AI perfect transcription" | Research-grade problem. Future. |
| Payments / subscriptions | No revenue need in portfolio MVP. Usage limits suffice. |
| Public song library | Copyright exposure; moderation burden. Future. |
| Real-time collaboration | High complexity, low MVP value. |
| Mobile app | Web-first; responsive web covers mobile viewing. |
| Advanced sheet editor | Sheet output is generated, not edited, in MVP. |

---

## 4. Core User Flow

```
1. Upload    → drag & drop a .mid file
2. Preview   → see piano roll, BPM, duration, hand split
3. Customize → choose resolution, speed, difficulty, theme, overlays
4. Generate  → one click creates render jobs (video, sheet, MIDI)
5. Download  → watch progress, then download MP4 / PDF / MusicXML / MIDI
```

Every step must work without reading documentation. Target time from upload to first completed video (for a 2-minute song at 720p): **under 3 minutes**.

---

## 5. Success Metrics (MVP)

| Metric | Target |
|---|---|
| Upload → parsed preview latency | < 5 s for a typical 3-minute MIDI |
| Video render time (720p, 2-min song) | < 90 s wall clock |
| Sheet render time | < 30 s |
| Job success rate | > 95% on valid MIDI files |
| End-to-end flow completion (upload → download) | > 70% of sessions that upload |
| Infra cost (MVP stage) | < $20/month |

---

## 6. Product Principles

1. **The API never renders.** Heavy work always goes through the queue to workers. This is non-negotiable and shapes everything in `DESIGN.md`.
2. **Outputs are reproducible.** Same input + same settings ⇒ same output. Jobs are idempotent.
3. **Honest about quality.** Beginner mode is rule-based simplification, not AI arrangement. Sheet output has quantization limitations. The UI says so.
4. **Cheap by default.** Free-tier limits, duration caps, lifecycle cleanup. See `RISKS.md` §Cost.
5. **Built to migrate.** Every external dependency (storage, queue, DB) sits behind an adapter so the MVP stack can swap to AWS without rewriting domain code.

---

## 7. Naming & Glossary

| Term | Meaning |
|---|---|
| **Project** | One uploaded song and everything derived from it (notes, settings, jobs, outputs). |
| **Job** | One async unit of work (`parse_midi`, `render_video`, …) processed by a worker. |
| **Output file** | A generated artifact (MP4, PDF, MusicXML, MIDI) stored in object storage. |
| **Notes JSON** | The canonical parsed representation of the song's notes, stored in object storage. |
| **Hand estimate** | Heuristic LH/RH assignment per note; used for coloring video notes and splitting sheet staves. |

---

## 8. Related Documents

- System architecture: [`DESIGN.md`](./DESIGN.md)
- Data model: [`DATABASE.md`](./DATABASE.md)
- REST API: [`API.md`](./API.md)
- UI/UX: [`UI_UX.md`](./UI_UX.md)
- Code layout: [`CODE_ARCHITECTURE.md`](./CODE_ARCHITECTURE.md)
- Deployment stages: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- Build phases: [`ROADMAP.md`](./ROADMAP.md)
- Risks & mitigations: [`RISKS.md`](./RISKS.md)
