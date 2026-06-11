# PianoFlow AI — Full Claude Development Docs Pack v3 Audio MIDI Integrated

This file combines all Markdown docs from `/docs`.



---

# docs/00_INDEX.md

# PianoFlow AI — Documentation Index

This `/docs` folder is the planning and execution source of truth for Claude/Codex.

## Product Goal

PianoFlow AI is a cloud-based piano learning material generator.

Core MVP pipeline:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF / MusicXML
→ falling-note tutorial video
→ beginner-friendly versions
→ private project history
```

MVP+ / Beta pipeline:

```text
Legal audio upload
→ AI transcription
→ draft MIDI
→ transcription notes JSON
→ confidence JSON
→ editable preview
→ existing sheet/video/beginner pipeline
```

Safe social-link support:

```text
YouTube / TikTok / Instagram link
→ metadata + embedded preview only
→ user uploads authorized MIDI/audio
→ processing pipeline
```

## Important Locked Decisions

1. MVP is MIDI-first.
2. Audio → MIDI is MVP+ / Beta, not Phase 1.
3. Audio transcription output must be called **draft MIDI**, not perfect MIDI.
4. Audio upload requires rights attestation.
5. No YouTube/TikTok/Instagram audio/video download in the public app.
6. Tutorial videos are streaming-only by default, not downloadable.
7. Sheet/PDF/MIDI/MusicXML may be downloadable depending on plan.
8. Notes JSON is stored in object storage, not Postgres.
9. Audio files, draft MIDI, confidence JSON, and transcription notes JSON are stored in object storage.
10. API never handles large file bytes.
11. Upload/download/stream uses signed URLs.
12. Queue payloads contain IDs only.
13. Heavy work happens in workers, not HTTP requests.
14. Vercel + Supabase is the MVP stack.
15. AWS is the long-term production scale path.

## Recommended Reading Order for Claude

1. `01_PRODUCT_SPEC.md`
2. `02_MVP_SCOPE.md`
3. `03_SYSTEM_DESIGN.md`
4. `04_DATABASE_SCHEMA.md`
5. `05_API_SPEC.md`
6. `06_UI_UX_SPEC.md`
7. `07_CODE_ARCHITECTURE.md`
8. `08_DEPLOYMENT_VERCEL_SUPABASE.md`
9. `09_AUDIO_TO_MIDI_PLAN.md`
10. `10_MULTI_SOURCE_IMPORT.md`
11. `11_SECURITY_COMPLIANCE.md`
12. `12_NO_TUTORIAL_DOWNLOAD_POLICY.md`
13. `13_BUSINESS_MODEL.md`
14. `14_ROADMAP.md`
15. `15_CLOUD_SCALE_PLAN.md`
16. `16_IMPLEMENTATION_RULES.md`
17. `17_CLAUDE_PHASE_PROMPTS.md`
18. `18_CLAUDE_NEXT_STEPS.md`

## What Claude Should Do First

Implement **Phase 2 only**:

```text
Monorepo skeleton
Docker Compose
CI
health checks
placeholder modules
```

Do not implement MIDI parsing, video rendering, audio transcription, billing, or social link import in Phase 2.


---

# docs/01_PRODUCT_SPEC.md

# PianoFlow AI — Product Specification

## 1. Product Positioning

PianoFlow AI is a cloud-based piano learning material generator.

It is not just:

```text
audio transcription
MIDI visualizer
practice game
```

It is:

```text
one source → complete piano learning pack
```

## 2. Core Value Proposition

Instead of giving users only a sheet, PianoFlow AI gives a complete learning pack:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
notes.json
tutorial video stream
beginner-friendly version
project history
```

Future Audio → MIDI adds:

```text
uploaded audio
→ AI draft MIDI
→ editable notes preview
→ same learning pack pipeline
```

## 3. Main Users

### Piano Beginners

Need:

- easy versions of songs
- visual learning
- slow tempo
- sheet + video together
- future: convert their own recordings to draft MIDI

### Piano Teachers

Need:

- quick student materials
- simplified versions
- private sharing later
- organized project history
- future: turn student recordings into draft MIDI for correction

### Piano Tutorial Creators

Need:

- falling-note video
- vertical video later
- templates
- branding
- batch export later
- future: audio demo → draft MIDI → content pack

### Music Students / Hobbyists

Need:

- MIDI preview
- MusicXML export
- sheet PDF
- practice pack
- future: audio upload for transcription experiments

## 4. MVP Product Promise

MVP promise:

```text
Upload a MIDI file and generate piano learning materials.
```

Do not promise:

```text
Upload any song from YouTube and get perfect sheet music.
```

## 5. MVP+ Product Promise

MVP+ / Beta promise:

```text
Upload an audio file you own or have permission to use.
PianoFlow AI creates an editable draft MIDI and learning pack.
```

Do not promise:

```text
Perfect MIDI from any audio.
```

Correct wording:

```text
AI transcription draft
editable draft MIDI
transcription preview
confidence report
```

## 6. MVP Outputs

Downloadable depending on plan:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
```

Streaming-only by default:

```text
tutorial.mp4
vertical_tutorial.mp4 later
```

## 7. Audio → MIDI Outputs

When audio transcription is enabled:

```text
transcribed_draft.mid
transcription_notes.json
transcription_confidence.json
transcription_report.json
```

These are stored in object storage.

Postgres stores only paths and metadata.

## 8. What The Product Should Not Do

PianoFlow AI should not be:

- a YouTube downloader
- a TikTok audio extractor
- an Instagram audio/video scraper
- a public copyrighted song library
- a tool that promises perfect transcription
- a full DAW
- a full notation editor like MuseScore
- a full practice game like Synthesia

## 9. Product Differentiation

PianoFlow AI should stand out by combining:

1. MIDI-first reliability.
2. Future Audio → MIDI as editable draft, not fake perfection.
3. Sheet + video in one workflow.
4. Beginner Mode.
5. Private project history.
6. SaaS cloud architecture.
7. Safe social-link references.
8. Streaming-only tutorial videos.
9. Teacher/student workflow later.
10. Creator templates later.


---

# docs/02_MVP_SCOPE.md

# PianoFlow AI — MVP Scope

## 1. MVP Goal

Build a working product that proves:

```text
MIDI → piano roll preview → sheet PDF → falling-note tutorial video → beginner version
```

## 2. MVP+ Goal

After the MIDI MVP is stable, add:

```text
Audio upload → AI transcription → draft MIDI → editable preview → same sheet/video/beginner pipeline
```

## 3. MVP Feature List

### Must Have

- Supabase Auth
- Project dashboard
- Create project
- Upload MIDI via signed URL
- Parse MIDI in worker
- Store notes JSON in object storage
- Save analysis summary in Postgres
- Piano roll preview
- Render sheet PDF
- Render MusicXML
- Render falling-note tutorial video
- Beginner Mode v1
- Output list
- Download sheet/MIDI/MusicXML
- Stream tutorial video inside app
- Job status polling
- Private storage and RLS

### Should Have

- Basic render settings
- Dark/light theme
- note colors
- left/right hand estimate
- retry failed job
- project delete
- storage cleanup job

### MVP+ / Beta Audio → MIDI

Add only after MIDI pipeline works:

- audio upload signed URL
- audio rights attestation
- transcribe_audio job
- queue.audio
- audio-worker
- TranscriptionEngine interface
- draft MIDI output
- transcription notes JSON
- confidence JSON
- transcription report JSON
- editable preview placeholder
- reuse sheet/video/beginner pipeline

### Not in MVP

- Audio → MIDI in first release
- YouTube/TikTok/Instagram media download
- public song library
- payment
- teacher classroom
- public sharing
- higher-than-1080p render
- mobile app
- full sheet editor

## 4. MVP Stack

```text
Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
Hosting: Vercel
Auth: Supabase Auth
Database: Supabase Postgres
Storage: Supabase Storage
Backend API: FastAPI
Queue: Redis
Worker: Python
Sheet: MuseScore CLI, LilyPond fallback later
Video: FFmpeg
```

## 5. MVP User Flow

```text
1. User signs in.
2. User creates project.
3. User uploads MIDI.
4. API creates parse_midi job.
5. Worker parses MIDI.
6. Notes JSON is saved to storage.
7. Frontend shows piano roll.
8. User selects render settings.
9. User creates sheet/video jobs.
10. Worker renders outputs.
11. User downloads sheet/MIDI/XML.
12. User watches tutorial video in app.
```

## 6. MVP+ Audio User Flow

```text
1. User creates project with source_type=audio_upload.
2. User checks rights attestation.
3. User uploads WAV/MP3/M4A via signed URL.
4. API creates transcribe_audio job.
5. audio-worker creates draft MIDI.
6. Worker stores draft MIDI, transcription notes JSON, confidence JSON.
7. Frontend shows editable transcription preview.
8. User accepts/corrects draft.
9. Existing sheet/video/beginner jobs reuse draft MIDI.
```

## 7. MVP Acceptance Criteria

- User can upload a valid `.mid`.
- System parses notes correctly enough to preview.
- PDF sheet output is generated.
- MP4 tutorial output is generated.
- Video is not directly downloadable.
- User cannot access another user's project.
- Large files are not stored in Postgres.
- Render jobs do not run inside HTTP requests.

## 8. MVP+ Audio Acceptance Criteria

- User can upload a valid audio file with rights attestation.
- System creates a `transcribe_audio` job.
- Audio worker creates `transcribed_draft.mid`.
- Draft MIDI can enter the same parse/sheet/video/beginner pipeline.
- UI clearly says transcription is a draft and may need correction.


---

# docs/03_SYSTEM_DESIGN.md

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


---

# docs/04_DATABASE_SCHEMA.md

# PianoFlow AI — Database Schema

## 1. Database

MVP database:

```text
Supabase Postgres
```

Long-term database:

```text
AWS RDS PostgreSQL
```

## 2. Tables

### profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text default 'free',
  created_at timestamptz default now()
);
```

### projects

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  source_type text not null default 'midi_upload',
  status text not null default 'created',
  notes_json_path text,
  draft_midi_path text,
  transcription_notes_json_path text,
  transcription_confidence_json_path text,
  transcription_report_json_path text,
  transcription_status text,
  analysis_summary jsonb,
  duration_seconds numeric,
  bpm numeric,
  note_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Allowed `source_type`:

```text
midi_upload
audio_upload
youtube_reference
tiktok_reference
instagram_reference
licensed_provider
public_domain_source
creative_commons_source
```

### uploaded_files

```sql
create table uploaded_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  file_type text not null,
  storage_path text not null,
  original_filename text,
  content_type text,
  size_bytes bigint,
  duration_seconds numeric,
  sample_rate integer,
  channels integer,
  upload_status text default 'pending',
  rights_attestation boolean default false,
  rights_attested_at timestamptz,
  created_at timestamptz default now()
);
```

Allowed `file_type`:

```text
midi
audio
draft_midi
```

### render_settings

```sql
create table render_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  resolution text default '1080p',
  fps integer default 30,
  speed_multiplier numeric default 1.0,
  difficulty text default 'original',
  show_note_names boolean default false,
  show_keyboard boolean default true,
  theme text default 'dark',
  left_hand_color text,
  right_hand_color text,
  created_at timestamptz default now()
);
```

### render_jobs

```sql
create table render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  job_type text not null,
  queue_name text,
  status text not null default 'queued',
  settings_snapshot jsonb,
  progress integer default 0,
  retry_count integer default 0,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);
```

Allowed `job_type`:

```text
parse_midi
render_sheet
render_video
simplify_midi
transcribe_audio
parse_draft_midi
render_vertical_video
create_practice_pack
```

### output_files

```sql
create table output_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid references render_jobs(id) on delete set null,
  output_type text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  duration_seconds numeric,
  download_allowed boolean default true,
  streaming_only boolean default false,
  watermark_required boolean default false,
  access_policy text default 'private_download',
  created_at timestamptz default now()
);
```

Allowed `output_type`:

```text
sheet_pdf
music_xml
original_midi
simplified_midi
transcribed_draft_midi
transcription_notes_json
transcription_confidence_json
transcription_report_json
tutorial_mp4
vertical_tutorial_mp4
thumbnail_png
```

Output policy:

```text
sheet_pdf: download_allowed=true
music_xml: download_allowed=true
original_midi: download_allowed=true
simplified_midi: download_allowed=true
transcribed_draft_midi: download_allowed=true depending on plan
transcription_notes_json: download_allowed=false by default
transcription_confidence_json: download_allowed=false by default
tutorial_mp4: download_allowed=false, streaming_only=true
vertical_tutorial_mp4: download_allowed=false, streaming_only=true
```

### project_sources

```sql
create table project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  source_type text not null,
  source_platform text,
  source_url text,
  source_external_id text,
  source_title text,
  source_author text,
  source_thumbnail_url text,
  source_duration_seconds integer,
  source_license_type text,
  source_rights_attestation boolean default false,
  source_policy_status text default 'metadata_only',
  created_at timestamptz default now()
);
```

### project_events

```sql
create table project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### usage_limits

```sql
create table usage_limits (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan text default 'free',
  midi_projects_used integer default 0,
  render_minutes_used numeric default 0,
  transcription_minutes_used numeric default 0,
  storage_bytes_used bigint default 0,
  reset_at timestamptz,
  updated_at timestamptz default now()
);
```

## 3. Storage Key Layout

```text
users/{user_id}/projects/{project_id}/input/original.mid
users/{user_id}/projects/{project_id}/input/original_audio.wav
users/{user_id}/projects/{project_id}/analysis/notes.json
users/{user_id}/projects/{project_id}/analysis/transcription_notes.json
users/{user_id}/projects/{project_id}/analysis/transcription_confidence.json
users/{user_id}/projects/{project_id}/analysis/transcription_report.json
users/{user_id}/projects/{project_id}/outputs/transcribed_draft.mid
users/{user_id}/projects/{project_id}/outputs/sheet.pdf
users/{user_id}/projects/{project_id}/outputs/score.musicxml
users/{user_id}/projects/{project_id}/outputs/tutorial.mp4
users/{user_id}/projects/{project_id}/outputs/simplified.mid
```

## 4. RLS Rules

Every user-owned table must enforce:

```text
user_id = auth.uid()
```

For storage, use private buckets and policies that allow access only to the user's folder/project.

## 5. Migration Rule

Every database change must be a migration file.

No manual production schema edits.


---

# docs/05_API_SPEC.md

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

### GET /health

Response:

```json
{
  "status": "ok",
  "service": "pianoflow-api"
}
```

### GET /api/v1/health

Same response.

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

## 5. MIDI Upload

### POST /api/v1/projects/{project_id}/upload-midi-url

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
  "file_id": "file_uuid",
  "upload_url": "https://signed-upload-url"
}
```

API must not trust user filename.

### POST /api/v1/projects/{project_id}/midi-upload-complete

Request:

```json
{
  "file_id": "file_uuid"
}
```

Response:

```json
{
  "job_id": "job_uuid",
  "job_type": "parse_midi",
  "status": "queued"
}
```

## 6. Audio Upload — MVP+ / Beta

### POST /api/v1/projects/{project_id}/upload-audio-url

Requires rights attestation.

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
  "file_id": "file_uuid",
  "upload_url": "https://signed-upload-url",
  "max_duration_seconds": 180,
  "max_size_bytes": 52428800
}
```

Errors:

```text
AUDIO_TRANSCRIPTION_NOT_ENABLED
RIGHTS_ATTESTATION_REQUIRED
AUDIO_FILE_TOO_LARGE
UNSUPPORTED_AUDIO_TYPE
PLAN_LIMIT_EXCEEDED
```

### POST /api/v1/projects/{project_id}/audio-upload-complete

Creates `transcribe_audio` job.

Request:

```json
{
  "file_id": "file_uuid"
}
```

Response:

```json
{
  "job_id": "job_uuid",
  "job_type": "transcribe_audio",
  "status": "queued"
}
```

### POST /api/v1/projects/{project_id}/jobs/transcribe-audio

Creates transcription job for an uploaded audio file.

Request:

```json
{
  "file_id": "file_uuid",
  "engine": "default",
  "options": {
    "instrument_hint": "solo_piano",
    "quality": "draft"
  }
}
```

Response:

```json
{
  "job_id": "job_uuid",
  "job_type": "transcribe_audio",
  "status": "queued",
  "queue": "queue.audio"
}
```

### GET /api/v1/projects/{project_id}/transcription

Returns metadata about draft MIDI and confidence.

Response:

```json
{
  "status": "completed",
  "draft_midi_output_id": "out_draft_midi",
  "confidence_summary": {
    "overall": 0.72,
    "timing": 0.68,
    "pitch": 0.79
  },
  "message": "AI transcription is a draft and may need correction."
}
```

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

Only for downloadable outputs.

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


---

# docs/06_UI_UX_SPEC.md

# PianoFlow AI — UI/UX Specification

## 1. Pages

### Landing Page `/`

Sections:

- hero
- demo preview
- value proposition
- how it works
- target users
- pricing teaser
- compliance-safe note
- CTA

### Auth Pages

Use Supabase Auth UI or custom form:

```text
/sign-in
/sign-up
```

### Dashboard `/projects`

Shows:

- project cards
- status
- source type
- last updated
- create project button

### Upload `/upload`

Tabs:

```text
Upload MIDI
Upload Audio later
Paste Link later
Public Domain Library later
```

MVP only enables MIDI.

### Project Detail `/projects/[id]`

Layout:

```text
left: piano roll / video / sheet preview
right: settings + job status + outputs
```

### Output Page `/projects/[id]/outputs`

Shows:

- downloadable sheet/MIDI/XML
- watch tutorial button
- no video download button

## 2. Core Components

```text
ProjectCard
MidiUploader
AudioUploader later
SourceLinkInput later
PianoRollPreview
RenderSettingsPanel
JobStatusPanel
SheetPreview
StreamingVideoPlayer
OutputList
UsageLimitBanner
RightsAttestationCheckbox
```

## 3. Video UX Rule

For tutorial videos, show:

```text
Watch Tutorial
```

Do not show:

```text
Download Video
Save MP4
Export MP4
```

Use a streaming player.

Light friction:

```html
<video controls controlsList="nodownload">
```

Disable right-click as UX friction, not security.

## 4. Rights Attestation UI

For audio upload:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

For social link:

```text
This link is used only as a reference. PianoFlow AI does not download, extract, cache, or store audio/video from this platform.
```

## 5. Job UX

Job states:

```text
Queued
Processing
Completed
Failed
Cancelled
```

Show progress when possible.

For failed jobs:

- show human-safe error
- show retry button
- do not show stack trace

## 6. Empty States

Dashboard empty:

```text
No projects yet. Upload your first MIDI file to create a piano learning pack.
```

No outputs:

```text
No outputs yet. Generate a sheet or tutorial video.
```

## 7. Accessibility

- keyboard navigation
- labels for inputs
- aria-live for job status
- readable contrast
- focus ring
- captions/descriptions where needed
- avoid color-only meaning for hand distinction

## Audio → MIDI UI Update

Add later under Upload page as a disabled/beta tab first:

```text
Upload Audio Beta
```

UI requirements:

- show rights attestation checkbox
- show file limits
- show supported formats
- show warning that output is draft MIDI
- show transcription confidence after job completes
- allow user to continue with draft MIDI into sheet/video pipeline

Copy:

```text
Audio transcription works best with clean solo piano recordings.
The generated MIDI is an editable draft and may need correction.
Only upload audio that you own or have permission to use.
```


---

# docs/07_CODE_ARCHITECTURE.md

# PianoFlow AI — Code Architecture

## 1. Monorepo Structure

```text
pianoflow-ai/
  apps/
    web/
    api/
    worker/
  packages/
    music-core/
    shared-types/
  infra/
    docker/
    supabase/
    terraform/
    aws/
  docs/
```

## 2. Frontend Structure

```text
apps/web/
  src/
    app/
    components/
      ui/
      layout/
    features/
      projects/
      upload/
      outputs/
      billing/
    lib/
      api-client.ts
      supabase-client.ts
    types/
```

## 3. API Structure

```text
apps/api/app/
  main.py
  core/
    config.py
    logging.py
    exceptions.py
    security.py
  api/v1/routers/
    health.py
    projects.py
    uploads.py
    jobs.py
    outputs.py
    sources.py
  domains/
    projects/
    jobs/
    files/
    billing/
    sources/
  infrastructure/
    database/
    storage/
    queue/
    auth/
  tests/
```

## 4. Worker Structure

```text
apps/worker/app/
  main.py
  jobs/
    base.py
    parse_midi.py
    render_sheet.py
    render_video.py
    simplify_midi.py
    transcribe_audio.py
  processors/
  renderers/
  tests/
```

## 5. music-core Structure

```text
packages/music-core/pianoflow_music/
  midi/
  notes/
  sheet/
  video/
  simplify/
  transcription/
  tests/
```

## 6. Adapter Interfaces

### StorageService

```text
create_upload_url()
create_download_url()
create_stream_url()
upload_file()
download_file()
exists()
delete()
```

Implementations:

```text
LocalStorageService
SupabaseStorageService
S3StorageService
```

### QueueService

```text
enqueue(job_id, project_id, queue_name)
ack()
retry()
dead_letter()
```

Implementations:

```text
RedisQueueService
SQSQueueService
```

### SheetEngraver

```text
engrave_musicxml_to_pdf()
```

Implementations:

```text
MuseScoreEngraver
LilyPondEngraver
```

### TranscriptionEngine

```text
transcribe_audio_to_draft_midi()
```

Implementations later:

```text
BasicPitchEngine
OmnizartEngine
MT3Engine
ExternalAPIEngine
```

## 7. Clean Architecture Rule

Domain logic should not import cloud SDKs.

Bad:

```text
music-core imports boto3
```

Good:

```text
worker uses StorageService adapter
music-core only processes local files/streams
```

## 8. Testing

Test layers:

- unit tests for music-core
- API route tests
- worker handler tests
- adapter contract tests
- integration tests for upload → job → output
- RLS access tests
- billing limit tests later

## 9. Fixtures

Create test fixtures:

```text
simple_scale.mid
chords.mid
left_right.mid
long_song.mid
invalid.mid
short_audio.wav later
```

## Audio → MIDI Code Architecture Update

Add to `packages/music-core`:

```text
transcription/
  engine.py
  result.py
  confidence.py
```

Add to worker:

```text
jobs/transcribe_audio.py
processors/audio_processor.py
```

Add adapter:

```text
TranscriptionEngine
```

Do not put model-specific logic in API routes.

Do not run transcription inside HTTP requests.


---

# docs/08_DEPLOYMENT_VERCEL_SUPABASE.md

# PianoFlow AI — MVP Deployment on Vercel + Supabase

## 1. MVP Deployment Goal

Deploy a real web product quickly using:

```text
Vercel + Supabase + FastAPI + Worker + Redis
```

## 2. Services

### Vercel

Hosts:

```text
Next.js frontend
```

### Supabase

Provides:

```text
Auth
Postgres
Storage
RLS
signed URLs
```

### Render / Railway / Fly.io

Hosts:

```text
FastAPI API
Python worker
Redis or Redis provider
```

## 3. Local Development

Use Docker Compose:

```text
web
api
worker
postgres
redis
```

Expected local URLs:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

## 4. Environment Variables

```env
APP_ENV=development

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

API_HOST=0.0.0.0
API_PORT=8000
API_BASE_URL=http://localhost:8000

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pianoflow

QUEUE_BACKEND=redis
REDIS_URL=redis://redis:6379/0

STORAGE_BACKEND=supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
```

## 5. Supabase Setup

Steps:

1. Create Supabase project.
2. Enable Auth.
3. Create private storage buckets.
4. Apply database migrations.
5. Enable RLS.
6. Add storage RLS policies.
7. Add service role key to backend environment only.
8. Never expose service role key to frontend.

## 6. Vercel Setup

Steps:

1. Connect GitHub repo.
2. Set root directory `apps/web`.
3. Add env vars:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy preview branches.
5. Deploy production from main.

## 7. Backend Setup

Use Render/Railway/Fly.io for MVP.

Deploy:

```text
apps/api
apps/worker
```

Worker must run separately from API.

## 8. Production Rules

- no local storage in production
- storage bucket private
- RLS enabled
- signed URLs only
- video streaming-only
- no raw storage paths in frontend
- logs enabled
- rate limits enabled
- free-tier limits enabled before public launch


---

# docs/09_AUDIO_TO_MIDI_PLAN.md

# PianoFlow AI — Audio to MIDI Plan

## 1. Feature Position

Audio → MIDI is not the first MVP feature.

It is:

```text
MVP+ / Beta
```

Core MVP remains:

```text
MIDI → sheet/video/beginner
```

## 2. Product Promise

Use this wording:

```text
AI creates an editable draft MIDI from your uploaded audio.
```

Do not say:

```text
Perfect MIDI from any song.
```

## 3. Audio Flow

```text
User uploads legal audio
→ rights attestation
→ signed upload URL
→ audio stored privately
→ transcribe_audio job created
→ audio-worker processes file
→ draft MIDI generated
→ transcription_notes.json generated
→ transcription_confidence.json generated
→ transcription_report.json generated
→ user previews/edits draft
→ existing sheet/video pipeline
```

## 4. Best Initial Scope

Start with:

```text
solo piano audio
short clips
clean recording
max 3 minutes
```

Avoid first:

```text
full band songs
vocals + drums + guitar
low-quality live recording
copyrighted social media links
audio too long
```

## 5. Engine Adapter

Create:

```text
TranscriptionEngine
```

Possible implementations:

```text
BasicPitchEngine
OmnizartEngine
MT3Engine
ExternalAPIEngine
```

Claude should not hardcode the first engine into product logic.

## 6. TranscriptionEngine Interface

```text
transcribe_audio_to_draft_midi(
  input_audio_path,
  output_dir,
  options
) -> TranscriptionResult
```

`TranscriptionResult`:

```json
{
  "draft_midi_path": "outputs/transcribed_draft.mid",
  "notes_json_path": "analysis/transcription_notes.json",
  "confidence_json_path": "analysis/transcription_confidence.json",
  "report_json_path": "analysis/transcription_report.json",
  "duration_seconds": 120,
  "engine": "default",
  "status": "completed"
}
```

## 7. Outputs

```text
transcribed_draft.mid
transcription_notes.json
transcription_confidence.json
transcription_report.json
```

## 8. Confidence JSON

Example:

```json
{
  "overall_confidence": 0.72,
  "pitch_confidence": 0.79,
  "timing_confidence": 0.68,
  "tempo_confidence": 0.74,
  "warnings": [
    "Dense chord section may need correction.",
    "Audio may contain non-piano sounds."
  ]
}
```

## 9. UI Warnings

Show:

```text
Best for solo piano audio.
AI transcription creates an editable draft.
Results may need correction.
Only upload files you own or have permission to use.
```

## 10. Business Limits

Free:

```text
no audio transcription or 30-second preview only
```

Starter:

```text
limited transcription minutes
```

Creator:

```text
more transcription minutes
priority queue
```

Teacher:

```text
larger quota
student workflow later
```

## 11. Technical Limits

MVP beta limits:

```text
max audio length: 3 minutes
max file size: 30-50 MB
supported formats: wav, mp3, m4a
timeout: strict
retry: limited
queue: queue.audio
worker: audio-worker
```

## 12. Security

Audio upload requires:

- auth
- rights attestation
- file type validation
- size limit
- duration limit
- private storage
- signed URL
- malware scan later
- lifecycle deletion

## 13. Roadmap

```text
Phase 11.1: audio upload only
Phase 11.2: TranscriptionEngine interface
Phase 11.3: one experimental engine
Phase 11.4: draft MIDI output
Phase 11.5: confidence report
Phase 11.6: editable preview
Phase 11.7: paid transcription quota
```

## 14. Claude Implementation Rule

Claude must not implement Audio → MIDI before:

```text
MIDI upload
parse_midi
sheet generation
tutorial video streaming
beginner mode
auth/project history
usage limits
```

are stable.


---

# docs/10_MULTI_SOURCE_IMPORT.md

# PianoFlow AI — Multi-Source Import Plan

## 1. Goal

Support different source references without becoming a social media ripping tool.

## 2. Supported Source Types

```text
midi_upload
audio_upload
youtube_reference
tiktok_reference
instagram_reference
licensed_provider
public_domain_source
creative_commons_source
oauth_owned_media later
```

## 3. Strict Rule

Do not implement:

```text
Paste YouTube/TikTok/Instagram link
→ app downloads audio/video
→ app stores/caches it
→ app converts it to MIDI
```

## 4. Safe Social Link Flow

```text
User pastes link
→ app validates URL
→ app fetches metadata using allowed API/oEmbed
→ app stores platform/title/thumbnail/duration
→ app shows embedded player if allowed
→ user uploads legal MIDI/audio file
→ normal processing
```

## 5. UI Copy

For Paste Link tab:

```text
This link is used only as a reference. PianoFlow AI does not download, extract, cache, or store audio/video from this platform. To generate learning materials, upload a MIDI/audio file you own or have permission to use.
```

## 6. Database

Use `project_sources`.

Important fields:

```text
source_type
source_platform
source_url
source_external_id
source_title
source_author
source_thumbnail_url
source_duration_seconds
source_license_type
source_rights_attestation
source_policy_status
```

## 7. API

```text
POST /api/v1/sources/metadata
POST /api/v1/projects/from-source
POST /api/v1/projects/{project_id}/sources
GET /api/v1/projects/{project_id}/sources
```

## 8. Future OAuth-Owned Media

Only consider this when:

- platform API allows it
- user owns the content
- user connects account
- legal review is complete
- feature flag is enabled

## 9. Licensed Provider

Future safer source:

```text
public domain library
Creative Commons library
licensed MIDI/audio provider
school/studio library
```

## 10. Feature Flags

```text
ENABLE_AUDIO_UPLOAD
ENABLE_YOUTUBE_METADATA
ENABLE_TIKTOK_METADATA
ENABLE_INSTAGRAM_METADATA
ENABLE_LICENSED_PROVIDER
ENABLE_OAUTH_IMPORT
```

## Audio → MIDI and Social Links

Social links must not automatically become audio input.

Correct flow:

```text
social link metadata
→ embedded reference
→ user uploads authorized audio
→ transcribe_audio job
```

Incorrect flow:

```text
social link
→ download audio
→ transcribe
```

This is not allowed in the public app.


---

# docs/11_SECURITY_COMPLIANCE.md

# PianoFlow AI — Security and Compliance

## 1. Principles

1. Private by default.
2. Least privilege.
3. No user-controlled storage keys.
4. Signed URLs for upload/download/stream.
5. API never handles large file bytes.
6. Workers re-check file/project/job state.
7. Social links are metadata-only.
8. Tutorial videos are streaming-only.
9. Logs must not expose secrets or raw signed URLs.
10. RLS enabled before public launch.

## 2. Upload Security

- file size limit
- file type allowlist
- MIME validation where possible
- duration validation after parse
- server-generated storage key
- private bucket
- signed upload URL
- malware scan later for audio

## 3. Auth

Use Supabase Auth for MVP.

Every API call except health must have auth.

## 4. Authorization

Check:

```text
project.user_id == current_user.id
```

Use RLS in database and storage.

## 5. Storage

Buckets should be private.

Never expose:

```text
raw storage path
public MP4 URL
service role key
```

## 6. Tutorial Video Protection

- no download button
- short-lived stream URL
- watermark by plan
- access logging
- streaming-only output policy

Important: screen recording cannot be fully prevented.

## 7. Social Platform Compliance

Public app must not:

- download platform media
- cache platform media
- extract audio from social videos
- store copies of social audio/video
- encourage ripping

Allowed:

- metadata
- thumbnail where allowed
- embedded player where allowed
- user-uploaded authorized files
- licensed/public-domain files

## 8. Rights Attestation

For audio uploads:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

Store:

```text
rights_attestation=true
attested_at
user_id
```

## 9. DMCA / Takedown

Real product needs:

- complaint email
- report form
- takedown workflow
- output disable ability
- repeat infringer policy
- audit logs
- appeal flow

## 10. Production Checklist

- RLS enabled
- storage private
- signed URLs expire
- rate limits enabled
- CORS allowlist
- no stack traces
- secrets in env/vault
- logs sanitized
- usage limits enforced
- copyright terms visible

## Audio → MIDI Security Update

Audio transcription requires extra controls:

- rights attestation required
- stricter file size limits
- duration limits
- private storage only
- malware scan later
- transcription minutes limit
- abuse detection
- no social platform media download
- no public sharing by default

Audio files should have shorter retention than user-created MIDI unless the user is on a paid plan.


---

# docs/12_NO_TUTORIAL_DOWNLOAD_POLICY.md

# PianoFlow AI — No Tutorial Video Download Policy

## 1. Product Decision

Tutorial videos must not be directly downloadable by default.

They are:

```text
private
streaming-only
viewable inside the app
protected by short-lived signed stream URLs
watermarked by plan
not exposed as public MP4 links
```

## 2. Downloadable Outputs

Depending on plan, users may download:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
practice_pack.zip later without MP4 or with policy-controlled contents
```

## 3. Non-Downloadable Outputs

By default, users cannot directly download:

```text
tutorial.mp4
vertical_tutorial.mp4
falling-note tutorial videos
```

## 4. Why

This:

- reduces redistribution risk
- supports subscription retention
- protects generated tutorial content
- reduces copyright/platform risk
- supports teacher/student view-only sharing later

## 5. Reality

This cannot fully stop:

```text
screen recording
browser capture
external camera recording
developer tools abuse
```

The goal is not perfect DRM.

The goal is:

```text
no official direct download
no public permanent URL
private access
short expiry
watermark
access logs
```

## 6. API

Use:

```text
POST /api/v1/outputs/{output_id}/stream-url
POST /api/v1/outputs/{output_id}/download-url
```

`download-url` returns an error for videos:

```text
DOWNLOAD_NOT_ALLOWED
```

## 7. Database Fields

```text
download_allowed
streaming_only
watermark_required
access_policy
```

Video output default:

```text
download_allowed=false
streaming_only=true
watermark_required=true
access_policy=private_streaming
```

## 8. UI

Show:

```text
Watch Tutorial
```

Do not show:

```text
Download Video
Save MP4
Export MP4
```

## 9. Future Add-On

Only later consider:

```text
Video Export License
```

This would require rights confirmation and paid export credits.


---

# docs/13_BUSINESS_MODEL.md

# PianoFlow AI — Business Model

## 1. Revenue Model

Use:

```text
Freemium
+ subscription
+ pay-per-song
+ render/transcription credits
+ teacher/studio plan
+ enterprise/API later
```

## 2. Pricing Tiers

### Free

- 3 MIDI projects/month
- 30-second video preview
- visible watermark
- streaming-only video
- limited PDF export
- no audio transcription or 30-second preview only
- short storage retention

### Starter

Target: hobbyist / beginner.

- more MIDI projects
- full sheet export
- full video streaming
- basic beginner mode
- no direct video download
- limited storage

### Creator

Target: tutorial creators.

- more render minutes
- priority queue
- vertical format later
- no visible watermark later
- templates later
- batch export later
- audio transcription quota later

### Teacher / Studio

Target: teachers and schools.

- student folders later
- private student view links
- higher render quota
- shared classroom dashboard later
- custom watermark
- longer storage retention

### Pay-Per-Song

For users who do not want subscription.

### Enterprise/API

For studios, schools, apps, or bulk processing.

## 3. Cost Drivers

```text
video rendering
audio transcription
storage
bandwidth
database
queue
worker compute
```

## 4. Margin Rules

- Free users get preview limits.
- Audio transcription is paid or credit-based.
- Full-length video costs credits or paid plan.
- higher-than-1080p is not MVP.
- Long storage retention is paid.
- Priority queue is paid.
- Old outputs are cleaned up.

## 5. Tutorial Video Monetization

Because tutorial videos are streaming-only, subscriptions retain value:

```text
users return to the app to watch lessons
teachers share view-only links
creators manage projects inside app
```

Optional future add-on:

```text
Video Export License
```

Do not include in MVP.

## 6. Example Limits

| Plan | MIDI projects | Video | Audio transcription | Storage |
|---|---:|---|---|---|
| Free | 3/month | 30s preview | none / 30s preview | 7-14 days |
| Starter | 20/month | full streaming | limited later | 30-60 days |
| Creator | 100/month | priority streaming | more later | 180 days |
| Teacher | 300+/month | student streaming | high quota | 1 year |

## 7. Growth Channels

- SEO: MIDI to sheet, MIDI to piano tutorial, falling notes generator
- YouTube demos
- TikTok piano creator outreach
- piano teacher outreach
- public-domain demo songs
- GitHub technical write-up
- student/teacher communities

## Audio → MIDI Pricing Update

Audio transcription is more expensive than MIDI parsing.

Recommended limits:

```text
Free: no audio transcription or 30-second preview only
Starter: 5-10 transcription minutes/month
Creator: 60 transcription minutes/month
Teacher: 200 transcription minutes/month
Enterprise: custom
```

Audio transcription should use credits:

```text
1 minute audio transcription = X credits
```

Do not offer unlimited audio transcription on cheap plans.


---

# docs/14_ROADMAP.md

# PianoFlow AI — Roadmap

## Phase 1 — Documentation

Goal:

```text
create product/system/business/security docs
```

Status:

```text
done
```

## Phase 2 — Monorepo Skeleton

Deliver:

- Next.js app
- FastAPI app
- Worker app
- music-core package
- shared-types package
- Docker Compose
- CI
- health checks

Do not implement product logic.

## Phase 3 — Auth + Project Dashboard

Deliver:

- Supabase Auth
- project CRUD
- dashboard
- RLS policies

## Phase 4 — MIDI Upload + Parse

Deliver:

- signed MIDI upload
- upload complete endpoint
- parse_midi job
- notes JSON
- analysis summary
- piano roll preview

## Phase 5 — Sheet Generation

Deliver:

- MusicXML
- MuseScore adapter
- sheet PDF
- output records
- download URL for PDF/XML

## Phase 6 — Falling-Note Video Streaming

Deliver:

- render_video job
- FFmpeg streaming render
- tutorial MP4 stored privately
- stream-url endpoint
- Watch Tutorial UI
- no video download

## Phase 7 — Beginner Mode

Deliver:

- original/easy/very_easy
- simplified MIDI
- simplified sheet/video
- rule-based simplifier

## Phase 8 — Usage Limits

Deliver:

- free limits
- render minute tracking
- storage tracking
- job concurrency limits

## Phase 9 — MVP Public Beta

Deliver:

- polished UI
- error handling
- logs
- deployment
- demo assets

## Phase 10 — Billing

Deliver:

- Stripe
- subscription tiers
- pay-per-song
- credits
- billing dashboard

## Phase 11 — Audio Upload + Draft MIDI

Deliver:

- audio upload
- rights attestation
- transcribe_audio job
- draft MIDI
- confidence JSON
- editable preview placeholder

## Phase 12 — Multi-Source Metadata

Deliver:

- YouTube metadata only
- TikTok/Instagram metadata later
- embedded reference player
- no media download

## Phase 13 — Creator Features

Deliver:

- vertical video streaming
- templates
- watermark settings
- thumbnails

## Phase 14 — Teacher/Studio Features

Deliver:

- student folders
- private share links
- classroom view
- custom watermark

## Phase 15 — AWS Scale

Deliver:

- S3
- SQS
- ECS API
- ECS workers
- RDS Postgres
- CloudFront
- CloudWatch
- Terraform

## Audio → MIDI Roadmap Detail

Audio transcription begins only after core MIDI product is stable.

Detailed audio phases:

```text
Phase 11.1 — Audio upload with rights attestation
Phase 11.2 — queue.audio and audio-worker
Phase 11.3 — TranscriptionEngine interface
Phase 11.4 — draft MIDI output
Phase 11.5 — transcription notes JSON
Phase 11.6 — confidence JSON/report
Phase 11.7 — editable preview
Phase 11.8 — paid transcription quota
```


---

# docs/15_CLOUD_SCALE_PLAN.md

# PianoFlow AI — Cloud Scale Plan

## 1. MVP

```text
Vercel frontend
FastAPI on Render/Railway/Fly.io
Worker on Render/Railway/Fly.io
Supabase Auth/Postgres/Storage
Redis queue
```

## 2. AWS Production

```text
CloudFront
S3
ECS Fargate API
ECS Fargate workers
SQS
RDS PostgreSQL
CloudWatch
Secrets Manager
Terraform
```

## 3. Migration Without Rewrite

Use adapters:

```text
Storage: Local → Supabase → S3
Queue: Redis → SQS
Database: Supabase Postgres → RDS Postgres
Auth: Supabase Auth → Cognito/Auth0/custom later
```

## 4. Worker Scaling

Start:

```text
general-worker
```

Scale to:

```text
parse-worker
sheet-worker
video-worker
audio-worker
```

Queues:

```text
queue.parse
queue.sheet
queue.video
queue.audio
```

## 5. Cost Control

- max video length
- max resolution
- no higher-than-1080p in MVP
- preview-only free video
- audio transcription paid
- storage lifecycle
- concurrency limits
- priority queue for paid plans

## 6. Observability

Log fields:

```text
request_id
user_id
project_id
job_id
job_type
duration_ms
error_type
status
queue_delay_ms
```

Metrics:

```text
uploads
completed jobs
failed jobs
render time
transcription time
queue backlog
storage usage
paid conversion
churn
```

## 7. Terraform Later

```text
infra/terraform/
  environments/dev
  environments/staging
  environments/prod
  modules/s3
  modules/ecs
  modules/sqs
  modules/rds
  modules/cloudfront
  modules/secrets
  modules/cloudwatch
```

## Audio Worker Scaling

Audio transcription should have a separate queue:

```text
queue.audio
```

And separate worker type:

```text
audio-worker
```

Reason:

- transcription is slower
- transcription is more expensive
- transcription should not block parse/sheet/video jobs
- transcription limits can be enforced separately


---

# docs/16_IMPLEMENTATION_RULES.md

# PianoFlow AI — Implementation Rules

## 1. Do

- Keep API thin.
- Run heavy tasks in workers.
- Store large files in object storage.
- Store metadata in Postgres.
- Use adapters.
- Use signed URLs.
- Use RLS.
- Use private buckets.
- Use settings snapshots.
- Use thin queue payloads.
- Make jobs idempotent.
- Enforce usage limits.
- Keep tutorial videos streaming-only.
- Use feature flags for risky features.

## 2. Do Not

- Do not render video in HTTP request.
- Do not store MP4/PDF/MIDI blobs in DB.
- Do not store full notes JSON in DB.
- Do not put file bytes in queue.
- Do not trust user filenames.
- Do not expose public storage URLs.
- Do not expose raw storage paths to frontend.
- Do not implement YouTube/TikTok/Instagram download.
- Do not allow tutorial MP4 download by default.
- Do not build audio transcription before MIDI pipeline is stable.
- Do not skip auth/RLS tests.
- Do not hardcode secrets.

## 3. Code Review Checklist

- Is ownership checked?
- Is the endpoint thin?
- Is there an adapter boundary?
- Is the job idempotent?
- Are outputs private?
- Are signed URLs short-lived?
- Are tests added?
- Are migrations added?
- Is there cost abuse risk?
- Is there copyright/platform risk?
- Does this break no-video-download policy?

## 4. Phase Discipline

Claude must not jump phases.

If Phase 2 is requested, only implement skeleton.

If Phase 3 is requested, only implement MIDI upload/parse skeleton.

Video comes later.

Audio comes later.

Billing comes later.

## Audio → MIDI Implementation Rules

Do:

- call result `draft MIDI`
- require rights attestation
- use queue.audio
- use audio-worker
- use TranscriptionEngine adapter
- store audio/draft MIDI/confidence JSON in object storage
- enforce transcription minute limits

Do not:

- call transcription perfect
- run transcription in API
- download audio from social links
- allow unlimited free transcription
- hardcode one transcription model into product logic


---

# docs/17_CLAUDE_PHASE_PROMPTS.md

# PianoFlow AI — Claude Phase Prompts

## Phase 2 Prompt — Monorepo Skeleton

```text
Implement Phase 2 only.

Create the monorepo skeleton for PianoFlow AI.

Create:
- apps/web
- apps/api
- apps/worker
- packages/music-core
- packages/shared-types
- infra/docker
- infra/supabase
- infra/terraform
- infra/aws
- docker-compose.yml
- .env.example
- .gitignore
- .github/workflows/ci.yml
- README.md

Requirements:
- Next.js + TypeScript + Tailwind skeleton in apps/web
- FastAPI skeleton in apps/api
- Worker skeleton in apps/worker
- music-core placeholder package
- shared-types placeholder package
- Docker Compose with web, api, worker, postgres, redis
- API health endpoints:
  GET /health
  GET /api/v1/health
- Worker logs "PianoFlow worker started"
- Basic tests/smoke tests
- CI runs install/build/test where configured

Do not implement:
- MIDI parsing
- video rendering
- sheet generation
- real upload flow
- audio transcription
- social link import
- billing
- auth

Only create skeleton, config, health checks, placeholder modules, and CI.
```

## Phase 3 Prompt — Auth + Project Dashboard

```text
Implement Phase 3 only.

Add Supabase Auth integration and project CRUD.

Do:
- create profiles table migration
- create projects table migration
- enable RLS
- add API routes for project CRUD
- add frontend dashboard
- add sign in/sign up pages
- add ownership checks
- add basic tests

Do not:
- implement MIDI upload
- implement parsing
- implement render jobs
```

## Phase 4 Prompt — MIDI Upload + Parse

```text
Implement Phase 4 only.

Add MIDI upload and parse_midi job.

Do:
- signed upload URL endpoint
- upload complete endpoint
- uploaded_files table support
- storage adapter
- Redis queue adapter
- parse_midi worker handler
- notes JSON schema
- save notes JSON to storage
- update project analysis_summary
- piano roll preview endpoint
- basic piano roll UI

Do not:
- render video
- render sheet
- add audio transcription
```

## Phase 5 Prompt — Sheet Generation

```text
Implement Phase 5 only.

Add MusicXML and PDF sheet generation.

Do:
- SheetEngraver interface
- MuseScore adapter
- render_sheet job
- output_files record
- download-url endpoint for PDF/XML
- frontend output list

Do not:
- implement video
- implement audio transcription
```

## Phase 6 Prompt — Falling-Note Video Streaming

```text
Implement Phase 6 only.

Add tutorial video generation and streaming-only access.

Do:
- render_video job
- FFmpeg pipeline
- private video storage
- output_files policy fields
- stream-url endpoint
- no download-url for tutorial video
- Watch Tutorial UI
- watermark placeholder

Do not:
- add video download button
- expose raw MP4 URL
- add higher-than-1080p
```

## Phase 11 Prompt — Audio to MIDI Beta

```text
Implement audio upload and transcribe_audio beta only after MIDI/sheet/video are stable.

Do:
- audio upload signed URL
- rights attestation
- transcribe_audio job
- TranscriptionEngine interface
- one experimental engine adapter
- draft MIDI output
- transcription notes JSON
- confidence JSON
- UI warning that result is a draft

Do not:
- download audio from YouTube/TikTok/Instagram
- promise perfect transcription
```

## Phase 11 Prompt — Audio → MIDI Beta

```text
Implement Phase 11 only after MIDI, sheet, video, beginner mode, auth, and usage limits are stable.

Add Audio → MIDI Beta.

Do:
- add audio_upload source_type support
- add signed audio upload URL endpoint
- add audio-upload-complete endpoint
- require rights_attestation=true
- add transcribe_audio job type
- add queue.audio
- add audio-worker handler
- add TranscriptionEngine interface
- create one placeholder/mock engine first if real engine is not ready
- output transcribed_draft.mid
- output transcription_notes.json
- output transcription_confidence.json
- output transcription_report.json
- update frontend with Audio Upload Beta tab
- show warning that transcription is an editable draft
- reuse existing sheet/video/beginner pipeline

Do not:
- download YouTube/TikTok/Instagram audio
- promise perfect transcription
- make audio transcription free/unlimited
- implement social media ripping
```


---

# docs/18_CLAUDE_NEXT_STEPS.md

# PianoFlow AI — Claude Next Steps

## Current Goal

Use this docs pack to continue development phase by phase.

## Immediate Next Step

Start with:

```text
Phase 2 — Monorepo Skeleton, Docker Compose, CI
```

## Phase 2 Acceptance Criteria

After Claude implements Phase 2:

```bash
docker compose up --build
```

Should start:

- web
- api
- worker
- postgres
- redis

These should work:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

## What Claude Must Not Do in Phase 2

- no MIDI parsing
- no real upload flow
- no video rendering
- no sheet generation
- no audio transcription
- no social link import
- no billing
- no auth logic beyond placeholder

## After Phase 2

Move to:

```text
Phase 3 — Auth + Project Dashboard
```

Then:

```text
Phase 4 — MIDI Upload + Parse
```

Then:

```text
Phase 5 — Sheet Generation
```

Then:

```text
Phase 6 — Tutorial Video Streaming
```

## Claude Final Response Format After Each Phase

Claude should summarize:

1. Files created/changed
2. Commands to run
3. What works now
4. What is intentionally not implemented
5. Next phase
6. Known risks

## Future Audio → MIDI Reminder

Do not start Audio → MIDI until:

```text
Phase 4 MIDI Upload + Parse
Phase 5 Sheet Generation
Phase 6 Tutorial Video Streaming
Phase 7 Beginner Mode
Phase 8 Usage Limits
```

are stable.

Audio → MIDI belongs to Phase 11.


---

# docs/19_LONG_TERM_PRODUCT_PLAN.md

# PianoFlow AI — Long-Term Product Plan

## 1. 3-Year Vision

Build the most practical cloud platform for creating piano learning materials from MIDI and legally uploaded audio.

## 2. 5-Year Vision

Expand into a broader music education infrastructure platform:

```text
learning packs
teacher/student workflows
creator tools
licensed source library
API for music education apps
```

## 3. Product Moat

Potential moats:

1. Beginner simplification data loop.
2. Teacher/student workflows.
3. Project history and learning library.
4. Render templates and brand presets.
5. Audio correction/editing feedback.
6. Compliance-safe platform positioning.
7. API and school/studio integrations.

## 4. Data Flywheel

Future:

```text
AI draft
→ user corrections
→ simplified arrangement choices
→ difficulty ratings
→ better simplification rules
→ better user retention
```

Do not train on user content without explicit consent and legal review.

## 5. Expansion Paths

### Education SaaS

- student folders
- assignments
- private lesson packs
- teacher dashboard

### Creator SaaS

- branded tutorial video styles
- vertical video
- thumbnails
- scheduling/export workflow

### API Platform

- generate sheet/video via API
- bulk conversion
- studio integration

### B2B Studio Tools

- team workspace
- custom rendering
- private deployment

## 6. Key KPIs

North Star:

```text
completed learning packs per active user
```

Supporting metrics:

- MIDI uploads
- render success rate
- average job time
- video watches
- sheet downloads
- beginner mode usage
- project return rate
- free-to-paid conversion
- churn
- gross margin
- support tickets
- copyright complaints

## 7. Long-Term Risks

- transcription quality
- copyright/platform risk
- cloud cost
- free-tier abuse
- user churn
- competition
- unclear positioning
- slow render times

## 8. Long-Term Strategy

Do not try to beat every transcription company at transcription first.

Win by owning:

```text
music learning workflow
```

The product should be remembered as:

```text
the tool that turns a song source into a complete piano lesson pack
```


---

# docs/20_README_PLAN.md

# PianoFlow AI — README Plan

## Project Name

PianoFlow AI

## Short Description

Cloud-based MIDI-to-piano-learning-material generator.

## README Sections

1. What is PianoFlow AI?
2. Demo screenshots/video
3. Core features
4. Tech stack
5. Architecture diagram
6. Local setup
7. Environment variables
8. Docker Compose
9. API health check
10. Development phases
11. Security/compliance notes
12. Roadmap
13. Portfolio highlights

## Portfolio Highlights

Mention:

- Next.js frontend on Vercel
- FastAPI backend
- Supabase Auth/Postgres/Storage
- Redis queue
- Python worker
- object storage for large files
- signed URLs
- RLS
- FFmpeg video render
- MuseScore sheet render
- streaming-only tutorial video policy
- AWS migration plan

## Important README Warning

Add:

```text
PianoFlow AI does not download audio/video from YouTube, TikTok, or Instagram. Social links are metadata/reference only.
```


---

# docs/21_RISKS.md

# PianoFlow AI — Risk Register

## 1. Technical Risks

### MIDI parsing edge cases

Mitigation:

- fixture tests
- support standard MIDI first
- safe error handling

### Video render performance

Mitigation:

- 30 fps fixed
- max 1080p
- max duration limits
- worker queue

### Audio transcription quality

Mitigation:

- beta feature
- solo piano first
- call output draft MIDI
- editable preview later

## 2. Legal Risks

### Copyrighted uploads

Mitigation:

- rights attestation
- private outputs
- no public library
- DMCA workflow

### Social platform policy

Mitigation:

- metadata-only
- no media download
- feature flags
- legal review before OAuth import

## 3. Business Risks

### Free-tier abuse

Mitigation:

- preview limits
- render caps
- storage lifecycle
- rate limits

### Low conversion

Mitigation:

- teacher workflow
- project history
- watermark/plan limits
- SEO and creator outreach

## 4. Cloud Cost Risks

Mitigation:

- usage_limits table
- max duration
- no higher-than-1080p MVP
- paid audio transcription
- autoscaling workers
- lifecycle cleanup

## 5. Security Risks

Mitigation:

- RLS
- private buckets
- signed URLs
- no service key in frontend
- safe logging
- auth checks


---

# docs/22_METRICS_KPI.md

# PianoFlow AI — Metrics and KPIs

## North Star Metric

```text
Completed learning packs per active user
```

A completed learning pack means:

```text
MIDI parsed
+ at least one sheet or video output generated
+ user opened or downloaded/streamed output
```

## Product Metrics

- signups
- active users
- projects created
- MIDI uploads
- successful parses
- piano roll previews opened
- sheet renders
- video renders
- video streams
- beginner mode usage
- output downloads
- return rate

## Engineering Metrics

- API latency
- job queue delay
- render duration
- render failure rate
- parse failure rate
- storage upload failure rate
- stream URL errors
- worker crash rate
- DB error rate

## Business Metrics

- free-to-paid conversion
- churn
- ARPU
- gross margin
- render cost per user
- transcription cost per user
- storage cost per user
- LTV/CAC
- monthly recurring revenue

## Compliance Metrics

- rights attestation rate
- takedown requests
- abuse reports
- suspicious upload volume
- failed authorization attempts


---

# docs/23_ENVIRONMENT_VARIABLES.md

# PianoFlow AI — Environment Variables

## Frontend

```env
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## API

```env
APP_ENV=
API_HOST=
API_PORT=
API_BASE_URL=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
CORS_ALLOWED_ORIGINS=
```

## Queue

```env
QUEUE_BACKEND=redis
REDIS_URL=
SQS_QUEUE_PARSE_URL=
SQS_QUEUE_SHEET_URL=
SQS_QUEUE_VIDEO_URL=
SQS_QUEUE_AUDIO_URL=
```

## Storage

```env
STORAGE_BACKEND=supabase
LOCAL_STORAGE_ROOT=
SUPABASE_STORAGE_BUCKET=
AWS_REGION=
S3_BUCKET_NAME=
```

## Limits

```env
MAX_MIDI_FILE_MB=10
MAX_AUDIO_FILE_MB=50
MAX_VIDEO_DURATION_SECONDS=600
MAX_FREE_PREVIEW_SECONDS=30
SIGNED_URL_TTL_SECONDS=300
```

## Feature Flags

```env
ENABLE_AUDIO_UPLOAD=false
ENABLE_AUDIO_TRANSCRIPTION=false
ENABLE_YOUTUBE_METADATA=false
ENABLE_TIKTOK_METADATA=false
ENABLE_INSTAGRAM_METADATA=false
ENABLE_BILLING=false
ENABLE_PUBLIC_SHARING=false
ENABLE_VIDEO_DOWNLOAD=false
```


---

# docs/24_TEST_PLAN.md

# PianoFlow AI — Test Plan

## 1. Unit Tests

### music-core

- parse simple MIDI
- parse chords
- reject invalid MIDI
- calculate duration
- normalize notes
- simplify notes
- generate timeline

### API

- auth required
- project ownership
- create project
- signed upload URL validation
- job creation
- output policy

### Worker

- parse_midi handler
- render_sheet handler later
- render_video handler later
- retry logic
- failure handling

## 2. Integration Tests

- upload MIDI → parse job → notes JSON
- render sheet → output_files record
- render video → streaming-only output
- download-url rejects video
- stream-url works for owner
- non-owner cannot access output

## 3. RLS Tests

- user A cannot read user B projects
- user A cannot read user B files
- storage policy blocks cross-user access

## 4. Performance Tests

- long MIDI file
- high note count
- concurrent jobs
- queue backlog

## 5. Security Tests

- invalid file type
- large file
- path traversal filename
- missing auth
- expired signed URL
- raw storage path not returned

## 6. Fixtures

```text
simple_scale.mid
chords.mid
left_right.mid
long_song.mid
invalid.mid
short_piano.wav later
```


---

# docs/25_AUDIO_TO_MIDI_INTEGRATION_SUMMARY.md

# PianoFlow AI — Audio → MIDI Integration Summary

## 1. Final Decision

Audio → MIDI is included in the product plan as **MVP+ / Beta**.

It is not part of the first MVP.

## 2. Why

MIDI-first gives:

- faster MVP
- more reliable output
- easier video rendering
- easier sheet generation
- less cost
- less legal/platform risk

Audio → MIDI adds:

- stronger product value
- stronger competitive positioning against transcription tools
- paid feature potential
- creator/teacher value

## 3. Correct Product Wording

Use:

```text
Audio upload → editable draft MIDI
```

Avoid:

```text
perfect MIDI
accurate sheet from any song
YouTube to MIDI
```

## 4. System Additions

```text
queue.audio
audio-worker
TranscriptionEngine
transcribe_audio job
transcription confidence report
draft MIDI output
```

## 5. Database Additions

```text
projects.draft_midi_path
projects.transcription_notes_json_path
projects.transcription_confidence_json_path
projects.transcription_report_json_path
projects.transcription_status

uploaded_files.file_type = audio
uploaded_files.rights_attestation = true

render_jobs.job_type = transcribe_audio
render_jobs.queue_name = queue.audio

output_files.output_type = transcribed_draft_midi
output_files.output_type = transcription_notes_json
output_files.output_type = transcription_confidence_json
output_files.output_type = transcription_report_json
```

## 6. API Additions

```text
POST /api/v1/projects/{project_id}/upload-audio-url
POST /api/v1/projects/{project_id}/audio-upload-complete
POST /api/v1/projects/{project_id}/jobs/transcribe-audio
GET  /api/v1/projects/{project_id}/transcription
```

## 7. UI Additions

Add Audio Upload Beta tab later.

Required copy:

```text
Audio transcription works best with clean solo piano recordings.
The generated MIDI is an editable draft and may need correction.
Only upload audio that you own or have permission to use.
```

## 8. Business Additions

Audio transcription should be usage-limited:

```text
Free: none or 30-second preview
Starter: 5-10 minutes/month
Creator: 60 minutes/month
Teacher: 200 minutes/month
Enterprise: custom
```

## 9. Security Additions

Audio upload requires:

- rights attestation
- private storage
- signed upload URL
- file size limit
- duration limit
- plan limit
- no social media download
- no public sharing

## 10. Roadmap Position

Audio → MIDI starts at:

```text
Phase 11 — Audio Upload + Draft MIDI
```

Only after:

```text
MIDI upload
sheet generation
tutorial video streaming
beginner mode
auth/project history
usage limits
```

are stable.
