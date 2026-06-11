# PianoFlow AI — System Design

## 1. High-Level Architecture

```text
User Browser
  ↓
Vercel Next.js Frontend
  ↓
FastAPI API
  ↓
Supabase Postgres
  ↓
Redis Queue
  ↓
Python Worker
  ↓
Supabase Storage
```

## 2. Core Rule

The API is thin.

The API should:

- validate requests
- check auth and ownership
- create DB records
- create signed URLs
- enqueue jobs
- return job/output metadata

The API should not:

- parse MIDI
- transcribe audio
- render video
- run FFmpeg
- run MuseScore
- handle large file bytes

## 3. Storage Pattern

Large objects go to object storage:

```text
MIDI
audio
draft MIDI
notes.json
confidence.json
MusicXML
PDF
MP4
thumbnails
```

Postgres stores metadata:

```text
storage_path
duration_seconds
note_count
bpm
status
settings snapshot
output policy
```

## 4. Queue Pattern

Queue payloads are thin:

```json
{
  "job_id": "uuid",
  "project_id": "uuid"
}
```

Worker loads all details from DB.

## 5. Queue Names

MVP:

```text
queue.parse
queue.sheet
queue.video
```

MVP+ / Beta:

```text
queue.audio
```

## 6. Worker Types

MVP can start with one general worker:

```text
worker
```

Scale later:

```text
parse-worker
sheet-worker
video-worker
audio-worker
```

## 7. Job Types

MVP:

```text
parse_midi
render_sheet
render_video
simplify_midi
```

MVP+ / Beta:

```text
transcribe_audio
parse_draft_midi
generate_confidence
```

Later:

```text
render_vertical_video
create_practice_pack
generate_thumbnail
```

## 8. Job Status

```text
queued
processing
completed
failed
cancelled
```

## 9. Idempotency

Each job must be safe to retry.

Rules:

- Use deterministic output paths where possible.
- Check if output already exists before rerendering.
- Update job state atomically.
- Store safe error messages.
- Do not create duplicate output records for retry.

## 10. Settings Snapshot

When a render job is created, copy settings into `settings_snapshot`.

Why:

```text
User changing settings later should not corrupt an already queued job.
```

## 11. MIDI Pipeline

```text
uploaded MIDI
→ parse_midi job
→ notes.json
→ analysis_summary
→ piano roll preview
→ sheet/video/simplify jobs
```

## 12. Audio → MIDI Pipeline

```text
uploaded audio
→ transcribe_audio job
→ TranscriptionEngine
→ transcribed_draft.mid
→ transcription_notes.json
→ transcription_confidence.json
→ transcription_report.json
→ parse draft MIDI
→ piano roll preview
→ sheet/video/simplify jobs
```

Audio transcription should be best-effort.

The UI must describe the result as:

```text
editable draft MIDI
```

## 13. TranscriptionEngine Adapter

Interface:

```text
transcribe(input_audio_path, output_dir, options)
→ draft_midi_path
→ notes_json_path
→ confidence_json_path
→ report_json_path
```

Possible implementations:

```text
BasicPitchEngine
OmnizartEngine
MT3Engine
ExternalAPIEngine
```

Claude must not hardcode a specific model into product logic.

## 14. Video Rendering

MVP video rendering:

```text
notes.json
→ timeline calculation
→ draw frames
→ stream frames to FFmpeg stdin
→ output MP4 to temp file
→ upload to storage
→ create output_files record
```

Do not create a PNG sequence on disk.

## 15. Sheet Rendering

MVP sheet rendering:

```text
notes.json or MIDI
→ MusicXML
→ MuseScore CLI
→ PDF
→ preview image later
→ upload outputs
```

MuseScore is primary.

LilyPond is fallback behind the same adapter.

## 16. Safe Social Link Handling

```text
social URL
→ validate platform
→ fetch metadata only
→ store reference
→ embed player
→ user uploads authorized MIDI/audio
```

No media download.

## 17. Tutorial Video Access

Tutorial videos are private streaming-only by default:

```text
frontend requests stream-url
→ API checks auth/ownership/plan
→ API creates short-lived signed stream URL
→ frontend video player plays URL
→ URL expires
```

No direct download button.
