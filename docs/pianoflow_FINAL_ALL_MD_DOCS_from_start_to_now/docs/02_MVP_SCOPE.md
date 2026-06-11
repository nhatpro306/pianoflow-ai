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
- 4K render
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
