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
- add 4K
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
