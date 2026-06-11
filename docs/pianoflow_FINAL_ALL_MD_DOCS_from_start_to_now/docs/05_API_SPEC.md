# PianoFlow AI — API Specification

## 1. Base URL

Local:

```text
http://localhost:8000
```

MVP production:

```text
https://api.pianoflow.ai
```

## 2. Error Envelope

All API errors must use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message.",
    "request_id": "req_123"
  }
}
```

## 3. Health

### GET /healthz

Liveness probe. Response:

```json
{
  "status": "ok"
}
```

### GET /readyz

Readiness probe (checks database + queue):

```json
{
  "status": "ready",
  "checks": { "database": "ok", "queue": "ok" }
}
```

## 4. Projects

### POST /api/v1/projects

Create project.

Request:

```json
{
  "name": "My Song",
  "source_type": "midi_upload"
}
```

Audio project later:

```json
{
  "name": "My Recording",
  "source_type": "audio_upload"
}
```

Response:

```json
{
  "id": "project_uuid",
  "name": "My Song",
  "source_type": "midi_upload",
  "status": "created"
}
```

### GET /api/v1/projects

List user's projects.

### GET /api/v1/projects/{project_id}

Get project detail.

### DELETE /api/v1/projects/{project_id}

Delete project and schedule storage cleanup.

## 5. MIDI Upload (implemented route names)

### POST /api/v1/projects/{project_id}/upload-midi

Phase 1 — request signed upload URL.

Request:

```json
{
  "filename": "song.mid",
  "content_type": "audio/midi",
  "size_bytes": 12345
}
```

Response:

```json
{
  "upload_id": "file_uuid",
  "upload_url": "https://signed-upload-url",
  "method": "PUT",
  "headers": { "Content-Type": "audio/midi" },
  "expires_at": "2026-06-11T10:15:00Z",
  "max_bytes": 5242880
}
```

API must not trust user filename — storage keys are server-generated.

### POST /api/v1/projects/{project_id}/upload-midi/confirm

Phase 2 — confirm the PUT landed; enqueues `parse_midi`.

Request:

```json
{
  "upload_id": "file_uuid"
}
```

Response `202`:

```json
{
  "upload_id": "file_uuid",
  "status": "validated_pending",
  "parse_job": { "id": "job_uuid", "job_type": "parse_midi", "status": "queued" }
}
```

## 6. Audio Upload — MVP+ / Beta (implemented route names)

Audio → MIDI is Beta. Output is an **editable draft MIDI** — never promised
as perfect. Feature-flagged via `AUDIO_TRANSCRIPTION_ENABLED`.

### POST /api/v1/projects/{project_id}/upload-audio

Phase 1 — requires rights attestation.

Request:

```json
{
  "filename": "recording.wav",
  "content_type": "audio/wav",
  "size_bytes": 1234567,
  "rights_attestation": true
}
```

Response:

```json
{
  "upload_id": "file_uuid",
  "upload_url": "https://signed-upload-url",
  "method": "PUT",
  "headers": { "Content-Type": "audio/wav" },
  "expires_at": "2026-06-11T10:15:00Z",
  "max_bytes": 52428800,
  "max_duration_seconds": 180
}
```

Errors:

```text
AUDIO_TRANSCRIPTION_NOT_ENABLED
RIGHTS_ATTESTATION_REQUIRED
AUDIO_FILE_TOO_LARGE
UNSUPPORTED_AUDIO_TYPE
TRANSCRIPTION_LIMIT_EXCEEDED
```

Supported types (Beta): `.wav`, `.mp3`, `.m4a`. Max 3 minutes, max 50 MB,
best for clean solo-piano recordings.

### POST /api/v1/projects/{project_id}/upload-audio/confirm

Phase 2 — confirms the PUT landed; enqueues `transcribe_audio` on `q_audio`.

Request:

```json
{
  "upload_id": "file_uuid"
}
```

Response `202`:

```json
{
  "upload_id": "file_uuid",
  "status": "uploaded",
  "project_status": "transcribing",
  "transcribe_job": { "id": "job_uuid", "job_type": "transcribe_audio", "status": "queued" }
}
```

### POST /api/v1/projects/{project_id}/jobs/transcribe-audio

(Re-)creates the transcription job for the project's confirmed audio upload.

Request: `{}`

Response:

```json
{
  "id": "job_uuid",
  "job_type": "transcribe_audio",
  "status": "queued"
}
```

Job runs on queue `q_audio` (queue.audio), processed by the audio worker —
never inside the API process.

### GET /api/v1/projects/{project_id}/transcription

Returns metadata about draft MIDI and confidence. Never returns raw storage
paths — use `POST /outputs/{output_id}/download-url` for the draft MIDI.

Response:

```json
{
  "status": "completed",
  "engine": "placeholder_deterministic_v1",
  "draft_midi_output_id": "out_draft_midi",
  "notes_json_output_id": "out_notes_json",
  "confidence_json_output_id": "out_confidence_json",
  "report_json_output_id": "out_report_json",
  "confidence_summary": {
    "overall": 0.72,
    "timing": 0.68,
    "pitch": 0.79
  },
  "message": "AI transcription is an editable draft and may need correction."
}
```

`status`: `none` | `queued` | `processing` | `completed` | `failed`.

## 7. Job Endpoints

### GET /api/v1/jobs/{job_id}

Response:

```json
{
  "id": "job_uuid",
  "project_id": "project_uuid",
  "job_type": "render_video",
  "status": "processing",
  "progress": 42
}
```

### POST /api/v1/projects/{project_id}/jobs/render-sheet

Creates sheet job.

### POST /api/v1/projects/{project_id}/jobs/render-video

Creates video job.

### POST /api/v1/projects/{project_id}/jobs/simplify-midi

Creates simplification job.

## 8. Preview

### GET /api/v1/projects/{project_id}/piano-roll

Returns normalized notes for preview.

Response:

```json
{
  "duration_seconds": 120,
  "source": "midi_upload",
  "notes": [
    {
      "pitch": 60,
      "name": "C4",
      "start": 0.5,
      "end": 1.0,
      "velocity": 80,
      "hand": "right"
    }
  ]
}
```

For audio transcription:

```json
{
  "duration_seconds": 120,
  "source": "audio_upload",
  "transcription_status": "draft",
  "notes": []
}
```

## 9. Outputs

### GET /api/v1/projects/{project_id}/outputs

Returns output metadata only. Do not return raw storage paths.

### POST /api/v1/outputs/{output_id}/download-url

Only for downloadable outputs:

```text
sheet_pdf
sheet_musicxml
original_midi
simplified_midi
transcribed_draft_midi
```

`video_mp4` / `vertical_video_mp4` never get a download URL (streaming-only).

If output is tutorial video, return:

```json
{
  "error": {
    "code": "DOWNLOAD_NOT_ALLOWED",
    "message": "Tutorial videos are view-only in PianoFlow AI.",
    "request_id": "req_123"
  }
}
```

### POST /api/v1/outputs/{output_id}/stream-url

Only for streaming outputs.

Response:

```json
{
  "stream_url": "https://short-lived-signed-url",
  "expires_in_seconds": 300
}
```

## 10. Source Metadata Later

### POST /api/v1/sources/metadata

Fetch metadata only for supported social links.

### POST /api/v1/projects/from-source

Create project from source reference metadata.

## 11. Security Rules

Every endpoint must:

- require auth unless public health check
- check project ownership
- validate input
- return safe errors
- avoid raw storage paths
- enforce plan limits
