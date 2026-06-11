# PianoFlow AI — REST API v1 Specification

> Base URL: `/api/v1`
> Auth: `Authorization: Bearer <JWT>` (Supabase Auth token) on every route below.
> Content type: `application/json` unless noted.
> IDs: UUIDv4. Times: ISO-8601 UTC.

---

## 0. Conventions

### Error envelope (all errors)

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project does not exist or you do not have access.",
    "request_id": "req_8d7e2f"
  }
}
```

### Common error codes

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad body/params (details array included) |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired JWT |
| 403 | `FORBIDDEN` | Valid user, not the resource owner |
| 404 | `PROJECT_NOT_FOUND` / `JOB_NOT_FOUND` | Resource absent (also returned instead of 403 to avoid existence leaks on cross-user UUID guesses) |
| 409 | `CONFLICT` | State conflict (e.g., parse before upload) |
| 413 | `FILE_TOO_LARGE` | Upload exceeds limit |
| 422 | `INVALID_MIDI` | File uploaded but unparseable |
| 429 | `RATE_LIMITED` | Usage limit hit; includes `Retry-After` |
| 500 | `INTERNAL_ERROR` | Unexpected; logged with `request_id` |

### Pagination (list endpoints)

`?limit=20&cursor=<opaque>` → response includes `"next_cursor": "..."` or `null`.

---

## 1. Projects

### POST `/api/v1/projects`

**Purpose:** create an empty project (step 1 of upload flow).

Request:
```json
{ "name": "Clair de Lune" }
```

Response `201`:
```json
{
  "id": "7ab0c1d2-...",
  "name": "Clair de Lune",
  "status": "created",
  "analysis_summary": null,
  "created_at": "2026-06-11T10:00:00Z"
}
```

Errors: `VALIDATION_ERROR` (empty/too-long name, >120 chars), `RATE_LIMITED` (max projects per user).

---

### GET `/api/v1/projects`

**Purpose:** list current user's projects (project history page).

Request: `GET /api/v1/projects?limit=20&cursor=...`

Response `200`:
```json
{
  "items": [
    {
      "id": "7ab0c1d2-...",
      "name": "Clair de Lune",
      "status": "ready",
      "analysis_summary": { "bpm": 66.0, "duration_sec": 302.1, "note_count": 1623, "track_count": 2 },
      "preview_url": "https://storage.../previews/7ab0....png?token=...",
      "created_at": "2026-06-11T10:00:00Z"
    }
  ],
  "next_cursor": null
}
```

Errors: `UNAUTHORIZED`.

---

### GET `/api/v1/projects/{project_id}`

**Purpose:** full project detail for the editor page (settings + latest jobs + outputs included to avoid waterfall requests).

Response `200`:
```json
{
  "id": "7ab0c1d2-...",
  "name": "Clair de Lune",
  "status": "ready",
  "analysis_summary": {
    "bpm": 66.0, "duration_sec": 302.1, "track_count": 2,
    "note_count": 1623, "pitch_min": 36, "pitch_max": 96,
    "hand_split": "tracks", "time_signature": "4/4"
  },
  "settings": {
    "resolution": "720p", "fps": 30, "speed_percent": 100,
    "difficulty": "original", "show_note_names": true,
    "show_keyboard": true, "theme": "dark", "version": 3
  },
  "active_jobs": [
    { "id": "9f1c...", "job_type": "render_video", "status": "processing", "progress": 42 }
  ],
  "outputs_count": 2,
  "created_at": "2026-06-11T10:00:00Z"
}
```

Errors: `PROJECT_NOT_FOUND`.

---

### DELETE `/api/v1/projects/{project_id}`

**Purpose:** soft-delete project; storage objects + rows hard-deleted after 14-day grace (see `DATABASE.md` §6). Queued jobs for the project are cancelled.

Response `204` (no body).

Errors: `PROJECT_NOT_FOUND`, `CONFLICT` (job currently `processing` — response says retry after it finishes, or it will be cleaned up by the grace-period job).

---

## 2. Upload, Notes, Settings

### POST `/api/v1/projects/{project_id}/upload-midi`

**Purpose:** two-phase direct-to-storage upload. The API issues a signed upload URL (phase 1); after the client PUTs the file to storage, it confirms (phase 2) and the API enqueues `parse_midi` automatically.

**Phase 1 — request signed URL:**

Request:
```json
{ "filename": "clair_de_lune.mid", "size_bytes": 48213, "content_type": "audio/midi" }
```

Response `200`:
```json
{
  "upload_id": "f00d1234-...",
  "upload_url": "https://storage.../projects/7ab0.../uploads/ae31....mid?token=...",
  "method": "PUT",
  "headers": { "Content-Type": "audio/midi" },
  "expires_at": "2026-06-11T10:15:00Z",
  "max_bytes": 5242880
}
```

**Phase 2 — confirm (client calls after PUT succeeds):**

Request:
```json
{ "upload_id": "f00d1234-...", "confirmed": true }
```

Response `202`:
```json
{
  "upload_id": "f00d1234-...",
  "status": "validated_pending",
  "parse_job": { "id": "11aa22bb-...", "job_type": "parse_midi", "status": "queued" }
}
```

Errors:
- Phase 1: `FILE_TOO_LARGE` (size_bytes > 5 MB), `VALIDATION_ERROR` (extension not .mid/.midi), `RATE_LIMITED` (daily upload cap), `CONFLICT` (project already has a validated upload — MVP: one source file per project).
- Phase 2: `CONFLICT` (object not found in storage — PUT never happened), `INVALID_MIDI` is reported asynchronously by the parse job, not here.

---

### POST `/api/v1/projects/{project_id}/upload-audio` — Beta (MVP+)

**Purpose:** two-phase direct-to-storage **audio** upload for AI transcription
(Audio → editable **draft MIDI**). Same shape as `upload-midi`, plus a
mandatory rights attestation. Feature-flagged (`AUDIO_TRANSCRIPTION_ENABLED`).

Beta limits: `.wav` / `.mp3` / `.m4a`, max 50 MB, max 3 minutes, best for
clean solo-piano recordings. Output is an **editable draft MIDI** — never
promised as perfect.

**Phase 1 — request signed URL:**

Request:
```json
{
  "filename": "recording.wav",
  "size_bytes": 1234567,
  "content_type": "audio/wav",
  "rights_attestation": true
}
```

Response `200`:
```json
{
  "upload_id": "f00d1234-...",
  "upload_url": "https://storage.../projects/7ab0.../uploads/ae31....wav?token=...",
  "method": "PUT",
  "headers": { "Content-Type": "audio/wav" },
  "expires_at": "2026-06-11T10:15:00Z",
  "max_bytes": 52428800,
  "max_duration_seconds": 180
}
```

**Phase 2 — confirm (client calls after PUT succeeds):**

Request:
```json
{ "upload_id": "f00d1234-...", "confirmed": true }
```

Response `202` — enqueues `transcribe_audio` automatically:
```json
{
  "upload_id": "f00d1234-...",
  "status": "uploaded",
  "project_status": "transcribing",
  "transcribe_job": { "id": "11aa22bb-...", "job_type": "transcribe_audio", "status": "queued" }
}
```

Errors:

| HTTP | code | When |
|---|---|---|
| 403 | `AUDIO_TRANSCRIPTION_NOT_ENABLED` | Feature flag off |
| 400 | `RIGHTS_ATTESTATION_REQUIRED` | `rights_attestation` missing or false |
| 400 | `UNSUPPORTED_AUDIO_TYPE` | Extension not .wav/.mp3/.m4a |
| 413 | `AUDIO_FILE_TOO_LARGE` | Exceeds max audio bytes |
| 429 | `TRANSCRIPTION_LIMIT_EXCEEDED` | Plan/daily transcription quota hit |

---

### POST `/api/v1/projects/{project_id}/jobs/transcribe-audio` — Beta

**Purpose:** (re-)enqueue transcription for the project's uploaded audio.
Runs on `q_audio`, processed by the audio worker — never in the API process.

Request: `{}`

Response `201`:
```json
{
  "id": "11aa22bb-...",
  "job_type": "transcribe_audio",
  "status": "queued",
  "progress": 0,
  "created_at": "2026-06-11T10:01:00Z"
}
```

Errors: `CONFLICT` (`NO_VALIDATED_UPLOAD` — no confirmed audio upload), `RIGHTS_ATTESTATION_REQUIRED`, `AUDIO_TRANSCRIPTION_NOT_ENABLED`, `RATE_LIMITED`.

---

### GET `/api/v1/projects/{project_id}/transcription` — Beta

**Purpose:** transcription status + draft MIDI / confidence metadata.

Response `200`:
```json
{
  "status": "completed",
  "engine": "placeholder_deterministic_v1",
  "draft_midi_output_id": "out-uuid-1",
  "notes_json_output_id": "out-uuid-2",
  "confidence_json_output_id": "out-uuid-3",
  "report_json_output_id": "out-uuid-4",
  "confidence_summary": { "overall": 0.72, "timing": 0.68, "pitch": 0.79 },
  "message": "AI transcription is an editable draft and may need correction."
}
```

`status` is one of `none` | `queued` | `processing` | `completed` | `failed`.

Errors: `PROJECT_NOT_FOUND`.

---

### GET `/api/v1/projects/{project_id}/notes`

**Purpose:** parsed notes for the piano-roll preview.

Request: `GET .../notes?difficulty=original` (`original` | `easy` | `very_easy`; non-original requires a completed `simplify_midi` job)

Response `200` — small files returned inline:
```json
{
  "schema_version": 1,
  "bpm": 66.0,
  "duration_sec": 302.1,
  "time_signature": "4/4",
  "notes": [
    { "id": 0, "pitch": 60, "name": "C4", "velocity": 80,
      "start": 0.0, "end": 0.5, "duration": 0.5, "track": 0, "hand": "R" }
  ]
}
```

Large note sets (> ~1 MB): `200` with a redirect-style body instead:
```json
{ "notes_url": "https://storage.../notes/v1.json?token=...", "expires_at": "..." }
```

Errors: `PROJECT_NOT_FOUND`, `CONFLICT` (`code: NOTES_NOT_READY` — parse not finished; body includes the parse job id so the client can poll it), `404 NOT_FOUND` for `difficulty` variant that was never generated.

---

### PATCH `/api/v1/projects/{project_id}/settings`

**Purpose:** update render settings (partial update; bumps `settings.version`).

Request:
```json
{ "resolution": "1080p", "speed_percent": 75, "theme": "light" }
```

Response `200`:
```json
{
  "resolution": "1080p", "fps": 30, "speed_percent": 75,
  "difficulty": "original", "show_note_names": true,
  "show_keyboard": true, "theme": "light", "version": 4
}
```

Errors: `VALIDATION_ERROR` (value outside allowed enum — message lists allowed values), `PROJECT_NOT_FOUND`.

---

## 3. Jobs

All four job-creation endpoints share behavior:

- Snapshot current settings into the job (`settings_snapshot`).
- **Dedup:** identical live job (same type + settings version, status queued/processing) → returns `200` with the existing job instead of `201`.
- Enforce per-user daily job cap → `429 RATE_LIMITED`.
- Require project status `ready` (parse completed) except `parse-midi` itself → else `409 CONFLICT`.

### POST `/api/v1/projects/{project_id}/jobs/parse-midi`

**Purpose:** (re-)parse the uploaded MIDI. Normally triggered automatically by upload confirm; exposed for manual re-parse after parser upgrades.

Request: `{}` (empty body)

Response `201`:
```json
{
  "id": "11aa22bb-...",
  "job_type": "parse_midi",
  "status": "queued",
  "progress": 0,
  "created_at": "2026-06-11T10:01:00Z"
}
```

Errors: `CONFLICT` (no validated upload), `RATE_LIMITED`.

---

### POST `/api/v1/projects/{project_id}/jobs/render-sheet`

**Purpose:** generate MusicXML + PDF sheet music using current settings (difficulty determines which notes variant is engraved).

Request: `{}` — settings come from the project's `render_settings`.

Response `201`:
```json
{
  "id": "33cc44dd-...",
  "job_type": "render_sheet",
  "status": "queued",
  "progress": 0,
  "settings_version": 4,
  "created_at": "2026-06-11T10:05:00Z"
}
```

Errors: `CONFLICT` (`NOTES_NOT_READY`, or difficulty=easy without completed simplify job — body tells client to create `simplify-midi` first; the frontend "Generate" button chains this automatically), `RATE_LIMITED`.

---

### POST `/api/v1/projects/{project_id}/jobs/render-video`

**Purpose:** generate the falling-note MP4 using current settings.

Request: `{}`

Response `201`:
```json
{
  "id": "9f1c2e34-...",
  "job_type": "render_video",
  "status": "queued",
  "progress": 0,
  "settings_version": 4,
  "estimated_seconds": 90,
  "created_at": "2026-06-11T10:05:01Z"
}
```

Errors: `CONFLICT` (notes not ready / simplify prerequisite), `RATE_LIMITED` (daily job cap or daily video-seconds cap), `VALIDATION_ERROR` (song exceeds max duration for rendering).

---

### POST `/api/v1/projects/{project_id}/jobs/simplify-midi`

**Purpose:** generate simplified MIDI + simplified notes JSON at the difficulty in current settings (rejects `difficulty=original`).

Request — optional override:
```json
{ "difficulty": "easy" }
```

Response `201`:
```json
{
  "id": "55ee66ff-...",
  "job_type": "simplify_midi",
  "status": "queued",
  "progress": 0,
  "created_at": "2026-06-11T10:04:00Z"
}
```

Errors: `VALIDATION_ERROR` (difficulty `original`), `CONFLICT` (`NOTES_NOT_READY`), `RATE_LIMITED`.

---

### GET `/api/v1/jobs/{job_id}`

**Purpose:** job status polling (frontend polls every 2 s while active).

Response `200`:
```json
{
  "id": "9f1c2e34-...",
  "project_id": "7ab0c1d2-...",
  "job_type": "render_video",
  "status": "processing",
  "progress": 42,
  "progress_message": "Encoding frames 2520/6000",
  "attempt": 1,
  "error_type": null,
  "error_message": null,
  "created_at": "2026-06-11T10:05:01Z",
  "started_at": "2026-06-11T10:05:04Z",
  "finished_at": null,
  "outputs": []
}
```

Completed job includes output **metadata** inline (no URLs — request one via
`POST /outputs/{output_id}/download-url` or `/stream-url`, see §4):
```json
{
  "status": "completed",
  "progress": 100,
  "outputs": [
    {
      "id": "abc...",
      "kind": "video_mp4",
      "content_type": "video/mp4",
      "size_bytes": 24811234,
      "created_at": "2026-06-11T10:06:31Z"
    }
  ]
}
```

Failed job:
```json
{
  "status": "failed",
  "error_type": "INVALID_MIDI",
  "error_message": "File is not a valid MIDI file (missing MThd header).",
  "attempt": 1
}
```

Errors: `JOB_NOT_FOUND`.

---

## 4. Outputs

Output access policy (NO_TUTORIAL_DOWNLOAD_POLICY):

- `GET .../outputs` returns **metadata only** — never URLs, never raw storage paths.
- `POST /outputs/{output_id}/download-url` — downloadable kinds only:
  `sheet_pdf`, `sheet_musicxml`, `original_midi`, `simplified_midi`,
  `transcribed_draft_midi`. Video kinds return `403 DOWNLOAD_NOT_ALLOWED`.
- `POST /outputs/{output_id}/stream-url` — streaming kinds only:
  `video_mp4`, `vertical_video_mp4`. Other kinds return `409 STREAM_NOT_AVAILABLE`.
- `video_mp4` / `vertical_video_mp4` never get a `download_url`. Streaming-only.

### GET `/api/v1/projects/{project_id}/outputs`

**Purpose:** list generated artifacts for the export page (metadata only).

Request: `GET .../outputs?kind=sheet_pdf` (optional filter)

Response `200`:
```json
{
  "items": [
    {
      "id": "abc12345-...",
      "kind": "video_mp4",
      "job_id": "9f1c2e34-...",
      "content_type": "video/mp4",
      "size_bytes": 24811234,
      "metadata": { "resolution": "1080p", "duration_sec": 402.8, "speed_percent": 75 },
      "downloadable": false,
      "streamable": true,
      "file_expires_at": "2026-07-11T10:06:31Z",
      "created_at": "2026-06-11T10:06:31Z"
    },
    {
      "id": "def67890-...",
      "kind": "sheet_pdf",
      "content_type": "application/pdf",
      "size_bytes": 184211,
      "downloadable": true,
      "streamable": false,
      "created_at": "2026-06-11T10:05:40Z"
    }
  ],
  "next_cursor": null
}
```

Errors: `PROJECT_NOT_FOUND`.

---

### POST `/api/v1/outputs/{output_id}/download-url`

**Purpose:** mint a short-lived signed download URL for a downloadable output.

Request: `{}`

Response `200`:
```json
{
  "download_url": "https://storage.../sheet.pdf?token=...",
  "expires_at": "2026-06-11T11:10:00Z"
}
```

Errors: `NOT_FOUND` (`OUTPUT_NOT_FOUND`), `403 DOWNLOAD_NOT_ALLOWED` (video / non-downloadable kind — tutorial videos are view-only in PianoFlow AI).

---

### POST `/api/v1/outputs/{output_id}/stream-url`

**Purpose:** mint a short-lived signed streaming URL for tutorial video playback inside the app.

Request: `{}`

Response `200`:
```json
{
  "stream_url": "https://storage.../video.mp4?token=...",
  "expires_at": "2026-06-11T10:11:00Z",
  "expires_in_seconds": 300
}
```

Errors: `NOT_FOUND` (`OUTPUT_NOT_FOUND`), `409 STREAM_NOT_AVAILABLE` (kind is not a streaming output).

---

## 5. Route Summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/projects` | Create project |
| GET | `/projects` | List projects |
| GET | `/projects/{id}` | Project detail |
| DELETE | `/projects/{id}` | Soft-delete project |
| POST | `/projects/{id}/upload-midi` | Signed-URL upload (2-phase) |
| POST | `/projects/{id}/upload-audio` | Beta: signed-URL audio upload (2-phase, rights attestation) |
| GET | `/projects/{id}/notes` | Parsed notes for preview |
| PATCH | `/projects/{id}/settings` | Update render settings |
| POST | `/projects/{id}/jobs/parse-midi` | Enqueue parse |
| POST | `/projects/{id}/jobs/render-sheet` | Enqueue sheet render |
| POST | `/projects/{id}/jobs/render-video` | Enqueue video render |
| POST | `/projects/{id}/jobs/simplify-midi` | Enqueue simplification |
| POST | `/projects/{id}/jobs/transcribe-audio` | Beta: enqueue audio transcription (q_audio) |
| GET | `/projects/{id}/transcription` | Beta: transcription status + draft MIDI metadata |
| GET | `/jobs/{job_id}` | Job status (polling, metadata-only outputs) |
| GET | `/projects/{id}/outputs` | List outputs (metadata only) |
| POST | `/outputs/{output_id}/download-url` | Signed download URL (downloadable kinds only) |
| POST | `/outputs/{output_id}/stream-url` | Signed stream URL (video kinds only) |

Non-user routes (internal): `GET /healthz` (liveness), `GET /readyz` (DB+queue check), `GET /internal/metrics` (protected summary; see `DESIGN.md` §9).
