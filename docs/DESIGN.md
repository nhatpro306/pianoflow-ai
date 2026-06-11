# PianoFlow AI — System Design Document

> Version: 1.0 (MVP design)
> Scope: end-to-end architecture, job system, rendering pipelines, security, observability

---

## 1. Architecture Overview

### 1.1 Core principle

**The API never does heavy work.** The API validates, persists metadata, and enqueues jobs. Workers do all parsing, rendering, and uploading. This keeps API latency low, lets workers scale independently, and survives long renders without HTTP timeouts.

### 1.2 High-level diagram

```
┌──────────┐     HTTPS      ┌─────────────┐   enqueue    ┌─────────┐
│  Browser  │ ────────────▶ │  Next.js     │              │  Queue   │
│  (User)   │               │  Frontend    │              │ (Redis / │
└──────────┘               └──────┬──────┘              │  SQS)    │
                                   │ REST /api/v1         └────┬────┘
                                   ▼                           │ dequeue
                            ┌─────────────┐                    ▼
                            │  FastAPI     │             ┌──────────┐
                            │  API service │             │  Worker   │
                            │  (no heavy   │             │  (Python) │
                            │   work)      │             │ parse /   │
                            └──────┬──────┘             │ render /  │
                                   │ metadata            │ simplify  │
                                   ▼                     └─────┬────┘
                            ┌─────────────┐                    │ upload outputs,
                            │ PostgreSQL   │ ◀──────────────────┤ update job status
                            │ (metadata    │                    ▼
                            │  only)       │             ┌──────────┐
                            └─────────────┘             │  Object   │
                                                         │  Storage  │
                                                         │ (S3 /     │
                                                         │ Supabase) │
                                                         └──────────┘
```

Flow: `User → Next.js → FastAPI → Queue → Worker → Storage → PostgreSQL` (worker writes results to storage, status to DB; frontend polls API for status and gets signed URLs for downloads).

### 1.3 Services

| Service | Responsibility | Must NOT do |
|---|---|---|
| **web** (Next.js) | UI, piano-roll preview, settings form, job status polling, downloads via signed URLs | Talk to DB/queue/storage directly (except direct-to-storage upload via signed URL) |
| **api** (FastAPI) | Auth, validation, CRUD on projects/settings, job creation, signed URL issuance, status reads | Parse MIDI bodies, render anything, block on long work |
| **worker** (Python) | Consume jobs: parse MIDI, render video/sheet, simplify, upload outputs, report progress | Serve HTTP traffic, hold user sessions |
| **music-core** (library) | Pure music logic: MIDI parsing, note model, simplification, sheet conversion, video frame drawing | I/O. No knowledge of S3/Redis/Postgres — receives bytes/paths, returns data/files |

### 1.4 Data placement rules

- **PostgreSQL** stores metadata only: users, projects, settings, jobs, file records, events, usage counters.
- **Object storage** stores all binary/large data: uploaded MIDI, notes JSON, MP4, PDF, MusicXML, simplified MIDI, preview images.
- **Notes JSON decision:** full parsed note data lives in **object storage**, not the database. A 5-minute piece can have 5,000+ notes (~500 KB JSON); storing that per project bloats the DB, slows backups, and gains nothing — the API never queries individual notes. The DB keeps a small `analysis_summary` JSONB (BPM, duration, track count, note count, pitch range, hand-split method) for list views. Rationale and schema in `DATABASE.md` §4.

---

## 2. Adapter / Port Layer

Every external system is accessed through an interface. Domain and worker code depend on the interface, never on the vendor SDK.

| Interface | MVP implementation | Scale implementation | Local/dev |
|---|---|---|---|
| `StorageService` | Supabase Storage | AWS S3 | Local filesystem |
| `QueueService` | Redis (RQ) | AWS SQS | Redis in Docker |
| `DatabaseRepository` | Supabase Postgres (SQLAlchemy) | RDS PostgreSQL (same SQLAlchemy) | Postgres in Docker |
| `RendererService` | OpenCV/Pillow + FFmpeg | Same code on bigger ECS tasks; optionally GPU later | Same |
| `AuthProvider` | Supabase Auth (JWT verification) | Cognito or keep Supabase Auth | Stub/dev tokens |

Contract sketches (final signatures in `CODE_ARCHITECTURE.md` §5):

```python
class StorageService(Protocol):
    def upload(self, key: str, data: bytes | BinaryIO, content_type: str) -> StoredObject: ...
    def download(self, key: str) -> bytes: ...
    def create_signed_upload_url(self, key: str, content_type: str, max_bytes: int) -> SignedUrl: ...
    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl: ...
    def delete(self, key: str) -> None: ...

class QueueService(Protocol):
    def enqueue(self, queue_name: str, payload: JobPayload) -> str: ...        # returns broker message id
    def consume(self, queue_name: str) -> Iterator[JobMessage]: ...
    def ack(self, message: JobMessage) -> None: ...
    def nack(self, message: JobMessage, requeue: bool) -> None: ...
```

Migration consequence: moving Redis→SQS or Supabase Storage→S3 means writing one new adapter class and changing one environment variable (`QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`). No domain code changes. This is the single most important architectural property of the project.

---

## 3. Job System Design

### 3.1 Job types

| Job type | Input | Output | Typical duration |
|---|---|---|---|
| `parse_midi` | uploaded MIDI key | notes JSON + analysis summary | 1–5 s |
| `generate_preview` | notes JSON | piano-roll PNG thumbnail | 1–3 s |
| `render_sheet` | notes JSON (or MIDI) + settings | MusicXML + PDF | 5–30 s |
| `render_video` | notes JSON + settings | MP4 | 30–300 s |
| `simplify_midi` | notes JSON + difficulty | simplified MIDI + simplified notes JSON | 1–5 s |
| `transcribe_audio` | (future) audio file | MIDI | minutes, GPU |

### 3.2 Job statuses & lifecycle

```
queued ──▶ processing ──▶ completed
   │            │
   │            ├──▶ failed (after retries exhausted)
   └──▶ cancelled (user cancels while queued; processing jobs run to completion in MVP)
```

Status lives in the `render_jobs` table (source of truth). The queue message is transport only.

### 3.3 Job payload structure

The queue message is intentionally thin — IDs, not data. The worker loads everything else from DB/storage. This keeps messages under SQS's 256 KB limit forever and makes payloads replayable.

```json
{
  "job_id": "9f1c2e34-...",
  "job_type": "render_video",
  "project_id": "7ab0c1d2-...",
  "user_id": "3e4f5a6b-...",
  "attempt": 1,
  "settings_version": 4,
  "input": {
    "notes_key": "projects/7ab0.../notes/v3.json",
    "settings_snapshot_id": "c0ffee12-..."
  },
  "created_at": "2026-06-11T10:00:00Z",
  "trace_id": "req_8d7e..."
}
```

- `settings_snapshot_id`: jobs render against a **snapshot** of settings taken at enqueue time, so the user editing settings mid-render doesn't produce mixed output.
- `attempt`: incremented by the retry mechanism; logged for observability.

### 3.4 Idempotency

- **Job ID is the idempotency key.** The worker checks job status in DB before starting: if already `completed`, it acks and exits (handles duplicate delivery — both Redis re-delivery and SQS at-least-once).
- **Deterministic output keys:** outputs are written to `projects/{project_id}/outputs/{job_id}/{filename}` — re-running a job overwrites its own output, never another job's.
- **API-side dedup:** `POST .../jobs/render-video` returns the existing job if an identical job (same project, type, settings snapshot) is already `queued`/`processing`, instead of enqueueing a duplicate (HTTP 200 with existing job rather than 201).

### 3.5 Retry strategy

| Failure class | Examples | Action |
|---|---|---|
| Transient | storage timeout, DB connection drop, FFmpeg OOM-killed once | Retry with exponential backoff: 10 s, 60 s, 300 s. Max 3 attempts. |
| Permanent | corrupt MIDI, unsupported feature, invalid settings | Fail immediately, no retry. Store `error_type` + human-readable message. |
| Poison | crashes the worker process itself | After max attempts → status `failed`, message to dead-letter queue (SQS DLQ at scale; `failed` Redis registry in MVP). Alert. |

Workers classify exceptions: `TransientError` vs `PermanentError` base classes in `music-core`/worker; unknown exceptions are treated as transient (retry) but flagged.

### 3.6 Progress updates

- Worker updates `render_jobs.progress` (0–100) and `progress_message` at coarse checkpoints, throttled to **at most once per 2 seconds** to avoid hammering the DB.
- Video render reports per-frame-batch progress (e.g., every 5% of frames encoded).
- Frontend polls `GET /api/v1/jobs/{job_id}` every 2 s while a job is active (see `API.md`). WebSocket/SSE push is a deliberate non-goal for MVP — polling is simpler and good enough at MVP traffic.

### 3.7 Queue separation (scale path)

MVP: a single Redis queue is fine. Designed-in separation for later:

| Queue | Jobs | Why separate |
|---|---|---|
| `q_fast` | `parse_midi`, `simplify_midi`, `generate_preview` | Seconds-long; should never wait behind videos |
| `q_render` | `render_video`, `render_sheet` | Minutes-long, CPU-heavy; scale worker count on queue depth |
| `q_ml` (future) | `transcribe_audio` | GPU instances, different autoscaling, different cost profile |

The `QueueService` interface takes `queue_name` from day one, so this split is a config change, not a refactor. On AWS: three SQS queues, two ECS worker services (fast + render) with depth-based autoscaling.

---

## 4. MIDI Parsing & Analysis Pipeline

```
MIDI bytes ─▶ validate (mido) ─▶ parse (pretty_midi) ─▶ normalize ─▶ analyze ─▶ notes JSON + summary
```

1. **Validate:** magic bytes `MThd`, parseable header, ≥1 track, ≥1 note, duration ≤ configured max (default 10 min). Reject otherwise with specific error codes (`INVALID_MIDI`, `EMPTY_MIDI`, `TOO_LONG`).
2. **Parse:** extract tempo map, time signatures, tracks, notes (pitch, velocity, start, end).
3. **Normalize:** merge duplicate notes, clamp negative durations, drop notes outside piano range (A0–C8) with a warning count.
4. **Hand estimation heuristic (MVP):**
   - If exactly 2 note-bearing tracks → track 0 = right hand, track 1 = left hand (the dominant convention in piano MIDI).
   - Else: pitch split — notes ≥ middle C (60) right, < 60 left, with a sliding-window adjustment so chords aren't split mid-hand and crossovers follow the local center of mass.
   - Stored per note as `"hand": "L" | "R"`; method recorded in summary (`"hand_split": "tracks" | "pitch_heuristic"`). UI labels it as an estimate.
5. **Output:**
   - `notes.json` (versioned key, schema in `DATABASE.md` §4) → object storage.
   - `analysis_summary` JSONB → `projects` row.

### Notes JSON schema (canonical internal format)

```json
{
  "schema_version": 1,
  "bpm": 120.0,
  "tempo_map": [{"time": 0.0, "bpm": 120.0}],
  "time_signature": "4/4",
  "duration_sec": 154.2,
  "tracks": [{"index": 0, "name": "Piano RH", "note_count": 812}],
  "notes": [
    {
      "id": 0,
      "pitch": 60,
      "name": "C4",
      "velocity": 80,
      "start": 0.0,
      "end": 0.5,
      "duration": 0.5,
      "track": 0,
      "hand": "R"
    }
  ]
}
```

This format is the contract between parser, frontend preview, video renderer, sheet generator, and simplifier. It is versioned (`schema_version`) so the format can evolve.

---

## 5. Video Rendering Design (falling-note tutorial)

### 5.1 Visual composition

```
┌────────────────────────────────────┐
│  (optional) title / progress bar    │  ← top strip
│                                     │
│      falling notes area             │  ← notes fall top→bottom
│   ████      ██                      │     RH = color A (e.g. cyan)
│        ██        ████               │     LH = color B (e.g. orange)
│  ───────────────────────────────   │  ← HIT LINE
│ ▐█▌▐█▌▐█▌ piano keyboard ▐█▌▐█▌    │  ← 88 keys; active keys glow
└────────────────────────────────────┘
```

- **Falling notes:** rectangles; x = key position, width = key width, height ∝ note duration × fall speed, y = function of (note.start − current_time).
- **Hit line:** the y where keyboard begins; a note "plays" when its bottom edge crosses it.
- **Keyboard:** 88-key layout rendered once as a base image; active keys overlaid with highlight color (matching hand color) while a note is sounding.
- **Note names (optional):** text label inside each falling rectangle, hidden when rectangle too small.
- **Progress bar (optional):** thin bar at top, fill = current_time / duration.
- **Themes:** dark (default) and light — background, key colors, note colors defined as theme palettes in `music-core/video`.

### 5.2 Rendering flow

```
notes JSON
   ▶ 1. timeline calc      : effective tempo = speed% applied; for each note compute
                              y(t) per frame from fall_speed_px_per_sec
   ▶ 2. static layer        : render keyboard base image + background once (Pillow)
   ▶ 3. frame loop          : for frame i in 0..duration*fps:
                                t = i / fps
                                visible = notes where y intersects viewport  (precomputed
                                          per-frame index via sorted starts — O(visible), not O(all))
                                draw falling rects (+names) on copy of static layer
                                overlay active-key highlights
                                draw progress bar
   ▶ 4. encode              : stream frames to FFmpeg via stdin pipe
                              (rawvideo → libx264, yuv420p, faststart)
                              audio: none in MVP v1; optional synthesized piano audio
                              (FluidSynth + soundfont) is a fast-follow
   ▶ 5. upload              : MP4 → storage at outputs/{job_id}/video.mp4
   ▶ 6. finalize            : insert output_files row, job → completed
```

### 5.3 Performance & scalability decisions

- **Stream frames to FFmpeg stdin** — never write thousands of PNGs to disk. One pipe, constant disk usage.
- **NumPy-backed drawing** (OpenCV rectangles on ndarray) rather than per-pixel Pillow ops; Pillow only for text and the static layer.
- **Per-frame cost is O(visible notes)** thanks to a start-time-sorted index with a sliding window.
- **Resolution/FPS caps in MVP:** 1080p max, 30 fps fixed, duration ≤ 10 min — bounds worst-case render time and cost (see `RISKS.md` §Cost).
- **Speed setting** (50/75/100%) stretches the timeline (note times ÷ speed); video gets proportionally longer.
- **Vertical format** (1080×1920): same pipeline, different layout constants (keyboard shows a windowed key range that follows the active notes' center). Designed now, shipped for Shorts/TikTok later.
- **Scale path:** rendering is embarrassingly parallel across jobs — scale by adding worker instances, not by parallelizing one render. If single-video latency ever matters: segment-based rendering (render N-second chunks in parallel, FFmpeg concat) is compatible with this design but explicitly **not** MVP.

---

## 6. Sheet Music Generation Design

### 6.1 Flow

```
MIDI / notes JSON
   ▶ music21 stream construction (two parts: RH treble, LH bass, from hand estimate)
   ▶ quantization to nearest grid (16th note default; configurable)
   ▶ metadata (title from project name, tempo mark, time signature)
   ▶ export MusicXML
   ▶ MuseScore CLI:  mscore input.musicxml -o output.pdf   (headless, in worker image)
        └─ fallback: LilyPond if MuseScore unavailable
   ▶ upload PDF + MusicXML, register output_files rows
```

MuseScore CLI chosen over LilyPond as primary: better default engraving from MusicXML, single binary, actively maintained. LilyPond kept as documented fallback because it's lighter in Docker. Decision recorded here so the `SheetRenderer` adapter keeps both behind one interface.

### 6.2 Known MVP limitations (documented honestly, also shown in UI)

| Limitation | Cause | MVP stance |
|---|---|---|
| **Quantization artifacts** | Real/humanized MIDI has imprecise timings; snapping to a 16th grid distorts rubato, triplets, grace notes | Accept. Offer grid choice (8th/16th) later. UI: "Sheet is auto-generated; rhythm is approximate." |
| **Rhythm spelling** | music21 may choose awkward tied-note spellings across beats | Accept in MVP; post-process pass is a future improvement |
| **Hand/staff split errors** | Heuristic hand estimate | Accept; future: user can flip hand per note in editor (non-MVP) |
| **No dynamics/pedal/fingering** | Not reliably derivable from MIDI in MVP | Velocity→rough dynamics is a future improvement; pedal CC64 import is future |
| **Dense music renders ugly** | Black-MIDI style files | Duration/note-count limits reject pathological inputs |

### 6.3 Future improvements (post-MVP)

- Triplet & swing detection before quantization.
- Voice separation within a staff (music21 `voiceAssignment` tuning).
- Velocity-derived dynamics marks; CC64 → pedal marks.
- User-selectable transposition and key-signature override.

---

## 7. Beginner Mode (Rule-Based Simplification)

**Positioning (must appear in UI copy):** this is *rule-based simplification*, not AI arrangement. It makes songs *playable*, not *re-arranged*. Honest framing is a product principle.

### 7.1 Pipeline

```
notes JSON ─▶ filter ─▶ chord reduction ─▶ melody preservation ─▶ density cap ─▶ tempo adjust ─▶ simplified notes JSON ─▶ simplified MIDI
```

### 7.2 Rules per difficulty

| Rule | `original` | `easy` | `very_easy` |
|---|---|---|---|
| Remove notes shorter than | — | 60 ms | 100 ms |
| Max simultaneous notes (total) | — | 4 | 2 |
| Max notes per chord per hand | — | 2 (keep lowest = bass, highest = top voice) | 1 (keep highest in RH, lowest in LH) |
| Melody preservation | — | Highest-pitch line in RH is never removed | Same; RH reduced to melody only (optional toggle: RH-melody-only output) |
| Tempo | 100% | 85% suggested (written into MIDI tempo) | 70% suggested |
| Octave doubling removal | — | yes | yes |

Order matters: melody identification runs **before** chord reduction so reduction never deletes the melody note. Melody heuristic (MVP): top-most sounding pitch in the RH stream, smoothed to avoid octave jumps from ornaments.

### 7.3 Outputs

- `simplified.mid` (downloadable)
- `simplified_notes.json` (so video + sheet jobs can render the simplified version when difficulty ≠ original)
- Video and sheet jobs take a `difficulty` setting and consume the corresponding notes JSON — simplification is one job whose output feeds the others.

---

## 8. Security Design

| Concern | Control |
|---|---|
| File type | Validate magic bytes (`MThd`) server-side and in worker; never trust extension or `Content-Type` |
| File size | Hard limit (default **5 MB** for MIDI) enforced at signed-upload-URL creation and re-checked by API/worker |
| Upload path | Client uploads **directly to storage via signed URL** (API issues it); API never proxies file bytes. Key is server-generated — `projects/{project_id}/uploads/{uuid}.mid` — so filenames are never user-controlled (no path traversal, no unsafe names). Original filename stored as display metadata only, sanitized. |
| Authorization | Every project/job/file query is scoped `WHERE user_id = :current_user`. Ownership checked in the service layer, not just the router. IDs are UUIDv4 (non-enumerable). |
| Downloads | Storage buckets **private by default**; downloads only via short-lived signed URLs (1 h). Public sharing = future feature with explicit opt-in share tokens. |
| Rate limits | Per user: uploads/day, render jobs/day, concurrent active jobs (defaults in `RISKS.md` §Cost; enforced via `usage_limits` table + middleware). 429 with `Retry-After`. |
| Auth | Supabase Auth JWT; FastAPI verifies signature + expiry on every request. No session state in API. |
| Worker isolation | Workers process untrusted MIDI: parsing wrapped in resource limits (max notes, max tracks, timeout per job) to prevent decompression-bomb-style MIDI (huge tick values, absurd track counts). |
| Secrets | Env vars only; never in repo. Per-stage secret management in `DEPLOYMENT.md`. |
| Copyright | Users upload content they have rights to (ToS). No public library in MVP. Full risk discussion in `RISKS.md` §Legal. |

---

## 9. Observability Design

### 9.1 Structured logging

JSON logs everywhere (API + worker), one event per line:

```json
{
  "ts": "2026-06-11T10:00:03.412Z",
  "level": "info",
  "service": "worker",
  "event": "job.completed",
  "request_id": "req_8d7e...",
  "user_id": "3e4f...",
  "project_id": "7ab0...",
  "job_id": "9f1c...",
  "job_type": "render_video",
  "duration_ms": 48211,
  "error_type": null
}
```

- `request_id` generated by API middleware, propagated into job payloads (`trace_id`) so one upload→render→download flow is traceable across services.
- `error_type` is a stable machine-readable code (`INVALID_MIDI`, `FFMPEG_FAILED`, `STORAGE_TIMEOUT`…), distinct from the human message.

### 9.2 Metrics (MVP: derived from logs + DB queries; scale: CloudWatch)

| Metric | Source |
|---|---|
| Total uploads / day | `uploaded_files` count |
| Jobs completed / failed (by type) | `render_jobs` aggregates |
| Average + p95 render time by job type | `started_at`/`finished_at` deltas |
| Queue delay (enqueue → start) | `created_at` → `started_at` delta |
| Storage usage per user / total | `output_files.size_bytes` sum + bucket metrics |
| Active workers / queue depth | Redis introspection (MVP) / SQS `ApproximateNumberOfMessages` (scale) |

MVP exposes an internal `/internal/metrics` summary (protected) good enough for a portfolio dashboard. Scale stage: CloudWatch Logs (structured JSON → Logs Insights), CloudWatch custom metrics, alarms on: failure rate > 10% (15 min), queue delay p95 > 2 min, DLQ depth > 0, worker CPU > 85% sustained.

---

## 10. Key Design Decisions (summary table)

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Async job queue; API never renders | Sync rendering in API | HTTP timeouts, no scaling isolation, blocks event loop |
| 2 | Notes JSON in object storage, summary in DB | Notes as DB rows / JSONB | DB stays small & fast; notes are read-whole, never queried per-row |
| 3 | Adapter layer for storage/queue/DB/renderer | Direct SDK calls | Enables MVP→AWS migration with zero domain-code changes |
| 4 | Thin queue payloads (IDs only) | Fat payloads with note data | SQS 256 KB limit; replayability; single source of truth in DB |
| 5 | Settings snapshot per job | Read live settings in worker | Reproducible output; no mid-render setting races |
| 6 | Frames streamed to FFmpeg stdin | PNG sequence on disk | Constant disk usage; faster; container-friendly |
| 7 | MuseScore CLI primary, LilyPond fallback | LilyPond only | Better MusicXML engraving; both behind one adapter |
| 8 | Polling for job status | WebSocket/SSE | Simpler MVP; 2 s polls fine at MVP scale; interface allows swap later |
| 9 | Direct-to-storage uploads via signed URL | Upload through API | API stays light; no large bodies through Render/Railway dyno |
| 10 | Rule-based simplification, honestly labeled | "AI arrangement" claims | Shippable, testable, truthful; ML arrangement is future work |
