# PianoFlow AI — Real Product Roadmap

## Phase 1 — Design Docs Complete

Status:

```text
completed
```

Deliverables:

- product design
- system design
- database design
- API design
- UI/UX design
- code architecture
- deployment plan
- risks
- README plan

Acceptance criteria:

```text
docs/ contains complete planning documents
```

What not to do:

```text
do not code before design is clear
```

## Phase 2 — Monorepo Skeleton

Goal:

```text
Create clean repository foundation.
```

Tasks:

- apps/web
- apps/api
- apps/worker
- packages/music-core
- packages/shared-types
- infra folders
- Docker Compose
- CI
- health checks

Deliverables:

```text
docker compose up --build works
GET /health works
CI runs skeleton tests
```

What not to do:

```text
do not implement MIDI parsing
do not implement video rendering
do not implement sheet generation
```

## Phase 3 — MIDI Upload Pipeline

Goal:

```text
Upload MIDI safely and create notes JSON.
```

Tasks:

- signed upload URL endpoint
- storage adapter interface
- local storage adapter
- project creation
- upload complete callback
- parse_midi job
- notes JSON schema
- analysis_summary in DB
- piano roll preview data endpoint

Deliverables:

```text
user uploads MIDI
worker parses MIDI
notes JSON saved to storage
project metadata updated
frontend can show basic piano roll
```

What not to do:

```text
do not render video yet
do not generate sheet PDF yet
do not add audio upload yet
```

## Phase 4 — Sheet PDF Generation

Goal:

```text
Generate PDF sheet and MusicXML from MIDI/notes.
```

Tasks:

- MusicXML generation
- SheetEngraver interface
- MuseScore adapter
- LilyPond fallback placeholder
- render_sheet job
- output_files record
- download signed URL

Deliverables:

```text
sheet.pdf
sheet.musicxml
```

What not to do:

```text
do not build advanced sheet editor
do not promise perfect engraving
```

## Phase 5 — Falling-Note Video Renderer

Goal:

```text
Generate MP4 piano tutorial video.
```

Tasks:

- timeline calculation
- keyboard rendering
- falling notes
- hit line
- note names optional
- left/right hand styling
- FFmpeg stdin streaming
- 720p/1080p
- job progress updates

Deliverables:

```text
tutorial.mp4
```

What not to do:

```text
do not write PNG frames to disk
do not support higher-than-1080p in MVP
do not render inside HTTP request
```

## Phase 6 — Beginner Mode

Goal:

```text
Generate easier versions of a song.
```

Tasks:

- original/easy/very_easy modes
- remove short notes
- reduce dense chords
- keep melody
- slow down tempo
- simplified MIDI export
- simplified sheet/video jobs

Deliverables:

```text
simplified.mid
easy sheet
easy tutorial video
```

What not to do:

```text
do not call it perfect AI arrangement
```

## Phase 7 — User Accounts and Project History

Goal:

```text
Make project personal and private.
```

Tasks:

- auth
- RLS
- project list
- project detail
- private storage access
- signed download URLs
- delete project
- lifecycle cleanup

Deliverables:

```text
users can manage own projects only
```

What not to do:

```text
do not create public song library
```

## Phase 8 — Business Model

Goal:

```text
Turn MVP into paid beta.
```

Tasks:

- Stripe
- free plan limits
- render credits
- usage_limits table
- plan enforcement
- pay-per-song
- billing dashboard

Deliverables:

```text
free/paid limits work
paid users can render more
```

What not to do:

```text
do not allow unlimited free rendering
```

## Phase 9 — Creator Features

Goal:

```text
Make outputs more valuable for creators.
```

Tasks:

- vertical export
- templates
- custom colors
- watermark control
- thumbnail generator
- batch export

Deliverables:

```text
creator-ready tutorial videos
```

What not to do:

```text
do not prioritize creator templates before core render is stable
```

## Phase 10 — Multi-Source Metadata

Goal:

```text
Support social links safely as references.
```

Tasks:

- /import page
- source metadata table
- YouTube metadata
- TikTok/Instagram metadata later
- embedded player
- rights warning
- user upload required

Deliverables:

```text
paste link creates reference project
no media download
```

What not to do:

```text
do not download audio/video from social platforms
```

## Phase 11 — Audio Transcription Beta

Goal:

```text
User-uploaded audio to draft MIDI.
```

Tasks:

- signed audio upload
- rights attestation
- transcribe_audio job
- draft MIDI
- editable preview
- reuse sheet/video pipeline

Deliverables:

```text
audio upload creates draft MIDI
```

What not to do:

```text
do not support random YouTube ripping
do not promise perfect transcription
```

## Phase 12 — Real Product Scale

Goal:

```text
Move from MVP to scalable SaaS.
```

Tasks:

- ECS API
- ECS workers
- SQS
- S3
- RDS
- CloudWatch
- Secrets Manager
- Terraform
- autoscaling
- teacher/student workflows
- enterprise/API

Deliverables:

```text
production-grade cloud system
```

What not to do:

```text
do not rewrite app logic during cloud migration
```
