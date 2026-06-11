# PianoFlow AI — Strategy Documentation Pack



---

# docs/STRATEGY.md

# PianoFlow AI — Product Strategy

## 1. Positioning

PianoFlow AI is a cloud-based piano learning material generator.

It turns MIDI or legally uploaded audio into:

- Sheet music PDF
- MusicXML
- MIDI
- Falling-note piano tutorial video
- Beginner-friendly simplified versions
- Project history
- Downloadable practice packs

The product is not positioned as only an audio transcription tool. It is positioned as a complete learning-material generator for piano students, teachers, and tutorial creators.

## 2. Core Product Statement

> PianoFlow AI helps users turn a music source into a complete piano learning pack: sheet music, tutorial video, MIDI, MusicXML, and simplified beginner versions.

## 3. What We Are

PianoFlow AI is:

- MIDI-first in the MVP
- Learning-first, not transcription-first
- Cloud-based
- Private-by-default
- Built for scalable media jobs
- Designed for future audio transcription
- Designed for safe social-link metadata/reference support

## 4. What We Are Not

PianoFlow AI is not:

- A YouTube ripping tool
- A TikTok/Instagram audio downloader
- A public copyrighted song library
- A promise of perfect AI transcription
- A full DAW
- A full MuseScore replacement
- A replacement for professional arrangers
- A public file-sharing platform

## 5. Target Users

### 5.1 Piano Beginners

Needs:

- Easy versions of songs
- Visual falling-note videos
- Sheet PDF
- Slower tempo
- Simple practice material

Pain points:

- Original sheet is often too hard
- YouTube tutorials are not downloadable as practice packs
- MIDI files are hard to understand without visual tools

### 5.2 Piano Teachers

Needs:

- Create simplified versions for students
- Export PDF and video
- Share private practice material
- Organize student projects later

Pain points:

- Manually arranging songs takes time
- Students need multiple formats: sheet, video, MIDI

### 5.3 Piano Tutorial Creators

Needs:

- Falling-note videos
- Vertical video export later
- Brandable visual templates
- Fast render workflow
- Batch export later

Pain points:

- Existing video visualizers may not include sheet and beginner versions
- Manual workflow across multiple tools is slow

### 5.4 Music Students and Hobbyists

Needs:

- MIDI preview
- Sheet export
- Practice versions
- Project history

## 6. Product Wedge

Start with the most reliable source:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF
→ tutorial video
→ beginner mode
```

Then expand:

```text
User-uploaded audio
→ draft MIDI
→ editable preview
→ sheet/video generation
```

Then add safe social reference:

```text
Social link
→ metadata
→ embedded player/reference
→ user uploads authorized MIDI/audio
→ normal processing pipeline
```

## 7. Why MIDI-First Is the Best MVP

MIDI already contains symbolic note data:

- note number
- start time
- end time
- velocity
- track
- tempo

This makes it reliable for:

- piano roll preview
- falling-note video
- sheet generation
- beginner simplification

Audio transcription is much harder and should come later.

## 8. Main Differentiation

Competitors often focus on one area:

- Audio to sheet
- MIDI to video
- Practice app

PianoFlow AI combines:

```text
MIDI/draft source
→ sheet
→ MusicXML
→ MIDI
→ tutorial video
→ beginner version
→ practice pack
```

## 9. Strategic Product Principles

1. Do not overpromise transcription accuracy.
2. Always provide editable/previewable intermediate results.
3. Keep user outputs private by default.
4. Build source ingestion safely.
5. Keep the cloud architecture scalable from the beginning.
6. Treat rendering/transcription as background jobs.
7. Keep cost limits strict.
8. Prioritize beginner value over perfect notation.
9. Make the demo visually impressive.
10. Make the codebase portfolio-quality.

## 10. Long-Term Vision

Long-term, PianoFlow AI can become a learning workflow platform:

```text
Source
→ transcription or MIDI parse
→ correction/editing
→ simplification
→ sheet/video/MIDI export
→ teacher/student sharing
→ practice analytics
```

The product becomes defensible when it learns from user corrections and simplification preferences over time.


---

# docs/COMPETITIVE_POSITIONING.md

# PianoFlow AI — Competitive Positioning

## 1. Competitive Landscape

PianoFlow AI sits between three existing product categories:

1. Audio transcription tools
2. MIDI visualizer/video tools
3. Piano practice apps

The product should not compete only on transcription accuracy. It should compete on complete learning-output workflow.

## 2. Competitor Comparison

| Product | Main Strength | Gap | PianoFlow AI Advantage |
|---|---|---|---|
| Klangio / Piano2Notes | Audio/YouTube-style transcription to sheet/MIDI/MusicXML | Transcription-first, not complete learning pack | Sheet + tutorial video + beginner versions + cloud project history |
| Songscription | Audio/social-link transcription, piano roll, sheet/MIDI/MusicXML/tabs | Strong transcription UX, but not focused only on piano learning packs | Piano-specific beginner workflow + exportable tutorial video + teacher/creator features |
| AnthemScore | Desktop audio-to-sheet transcription | Desktop-first, transcription-focused, less cloud workflow | Cloud projects, private storage, background jobs, video export |
| SeeMusic | MIDI to cinematic falling-note videos | Video-first, not sheet/transcription/workflow-first | Video + sheet + MusicXML + MIDI + beginner version |
| Piano VFX | MIDI visualizer and high-quality video rendering | Visualization-first | Full learning package and SaaS workflow |
| Synthesia | Practice app with falling notes | Practice-first, not export/content-generation-first | Exportable practice content: PDF, MP4, MIDI, MusicXML |

## 3. Positioning Statement

> PianoFlow AI is not just an AI transcription tool and not just a MIDI visualizer. It is a cloud-based piano learning material generator that creates a complete practice pack from MIDI or draft transcription.

## 4. Differentiation Against Transcription Tools

Klangio/Songscription/AnthemScore focus on:

```text
Audio
→ AI transcription
→ sheet/MIDI/MusicXML
```

PianoFlow AI focuses on:

```text
MIDI or draft notes
→ sheet
→ falling-note video
→ beginner version
→ practice pack
```

This gives a stronger learning workflow.

## 5. Differentiation Against Video Tools

SeeMusic/Piano VFX focus on:

```text
MIDI
→ visual video
```

PianoFlow AI adds:

- Sheet PDF
- MusicXML
- Beginner simplification
- Project history
- Cloud rendering
- Teacher sharing later
- Render templates later
- Usage/subscription controls

## 6. Differentiation Against Practice Apps

Synthesia focuses on:

```text
Play along inside app
```

PianoFlow AI focuses on:

```text
Generate and export learning material
```

This is better for:

- teachers
- creators
- students who want downloadable material
- portfolio/demo use

## 7. Most Defensible Advantages

### 7.1 Beginner Simplification Data Loop

Over time, users will correct and choose simplified outputs. PianoFlow AI can learn:

- which notes are usually removed
- how chords are simplified
- which difficulty level users prefer
- what tempo beginners choose
- which arrangements are easier to practice

This can become a product moat.

### 7.2 Teacher/Student Workflow

Teachers can create private practice packs:

```text
Student folder
→ simplified sheet
→ tutorial video
→ MIDI
→ practice notes
```

Competitors focused only on transcription may not own this workflow.

### 7.3 Project History and Learning Packs

A learning pack contains:

- source file
- notes JSON
- sheet PDF
- MusicXML
- original MIDI
- simplified MIDI
- tutorial video
- render settings

This creates retention because users build a library.

### 7.4 Render Templates

Creators may pay for:

- dark theme
- neon falling notes
- vertical Shorts format
- watermark control
- custom colors
- branded intro/outro
- thumbnail generation

### 7.5 API Potential

Because the system is queue/worker/storage-based, later it can expose API access:

```text
POST source
→ job
→ outputs
```

This enables studio/school/creator tools.

### 7.6 Compliance-Safe Source Handling

The product can be trusted by teachers and institutions because it avoids unsafe ripping and uses private-by-default outputs.

## 8. Best Market Entry

Start with:

```text
MIDI creators + piano teachers + beginner students
```

Avoid starting with:

```text
convert any YouTube song perfectly
```

That promise is technically difficult and legally risky.

## 9. Competitive Slogan

> From MIDI to a complete piano learning pack.

Alternative:

> Sheet, video, MIDI, and beginner versions from one source.


---

# docs/BUSINESS_MODEL.md

# PianoFlow AI — Business Model and Subscription Strategy

## 1. Business Model Summary

PianoFlow AI should use a hybrid model:

```text
Freemium
+ Monthly subscription
+ Pay-per-song
+ Teacher/studio plans
+ Enterprise/API later
```

The main cost drivers are:

- video rendering minutes
- audio transcription minutes later
- storage
- worker compute
- database
- queue
- bandwidth

Therefore, pricing must be based on:

- number of projects
- render minutes
- output quality
- storage duration
- priority queue
- transcription minutes
- team/student features

## 2. Pricing Tiers

### 2.1 Free Plan

Purpose:

- let users test the product
- generate leads
- keep cost low

Limits:

```text
3 MIDI projects/month
30-second preview render
720p watermarked video
basic sheet preview
limited PDF export or watermark
no audio transcription
no batch export
outputs deleted after 7-14 days
```

Good for:

- first-time users
- portfolio demo users
- casual hobbyists

### 2.2 Starter / Plus Plan

Suggested price:

```text
$9–12/month
```

Features:

```text
20 MIDI projects/month
Full PDF export
MusicXML export
MIDI export
720p and 1080p render
Basic beginner mode
No watermark or small watermark
Project history
Storage for 30-60 days
```

Good for:

- hobbyists
- piano beginners
- music students

### 2.3 Creator / Pro Plan

Suggested price:

```text
$19–29/month
```

Features:

```text
100 MIDI projects/month
More render minutes
1080p export
Vertical Shorts/TikTok format
No watermark
Priority queue
More storage
Batch export
Render templates
Thumbnail generator later
Audio upload beta later
```

Good for:

- YouTube/TikTok tutorial creators
- advanced hobbyists
- teachers with a few students

### 2.4 Teacher / Studio Plan

Suggested price:

```text
$49–99/month
```

Features:

```text
student folders
private share links
classroom dashboard
team seats
higher render limits
brandable videos
longer storage retention
lesson pack templates
```

Good for:

- piano teachers
- small music schools
- studios

### 2.5 Pay-Per-Song

Purpose:

- capture users who hate subscriptions
- monetize one-time needs

Example:

```text
$2–5 per full export pack
```

Includes:

```text
PDF
MusicXML
MIDI
MP4 tutorial video
simplified version
```

### 2.6 Enterprise / API

Suggested:

```text
custom pricing
```

Features:

```text
bulk processing
API access
custom render limits
school/studio licensing
SLA
dedicated support
private deployment option
```

## 3. Usage Limits

Recommended limits:

| Plan | Projects | Max Video Length | Resolution | Audio Transcription | Storage |
|---|---:|---:|---|---|---|
| Free | 3/month | 30 sec preview | 720p watermark | No | 7-14 days |
| Starter | 20/month | 5 min | 1080p | No or limited later | 30-60 days |
| Creator | 100/month | 10 min | 1080p + vertical | Beta/limited | 180 days |
| Teacher | 300+/month | 10-15 min | 1080p | More later | 1 year |
| Enterprise | custom | custom | custom | custom | custom |

## 4. Cost Model Assumptions

These are rough planning assumptions, not guaranteed production prices.

### 4.1 Video Render Cost

Assumption:

```text
1080p render cost: $0.01–0.05 per video minute
```

For a 5-minute video:

```text
$0.05–0.25
```

For a 10-minute video:

```text
$0.10–0.50
```

### 4.2 Storage Cost

Estimated output size:

```text
Sheet PDF: <5 MB
MusicXML: <1 MB
MIDI: <1 MB
Notes JSON: 0.1–5 MB
MP4 1080p: 50–250 MB depending on length/bitrate
```

Storage is usually less expensive than compute, but free users can abuse it. Use lifecycle rules.

### 4.3 Database Cost

Database stores metadata only:

```text
projects
jobs
settings
output paths
analysis summary
usage
billing
```

Do not store:

```text
MP4
PDF
MIDI blob
full notes JSON
audio blob
```

### 4.4 Queue Cost

Queue payloads are IDs only, so queue cost should stay low.

### 4.5 Audio Transcription Cost Later

Audio transcription is much more expensive than MIDI processing.

Pricing must separate:

```text
MIDI render credits
audio transcription credits
```

## 5. Margin Strategy

Rules:

1. Free tier must be capped.
2. Preview render should be short.
3. Full render should require paid plan or credits.
4. 4K should not be in MVP.
5. Audio transcription should be paid or credit-based.
6. Priority queue should be paid.
7. Storage retention should depend on plan.
8. Old outputs should be cleaned automatically.

## 6. Break-Even Example

Assume:

```text
Fixed monthly cost: $300
Average paid user revenue: $12/month
Average variable cost per paid user: $1.50/month
Gross margin per paid user: $10.50/month
```

Break-even:

```text
$300 / $10.50 ≈ 29 paying users
```

If fixed cost is $1000/month:

```text
$1000 / $10.50 ≈ 96 paying users
```

## 7. LTV/CAC

Target:

```text
LTV:CAC >= 3:1
```

Example:

```text
ARPU: $12/month
Gross margin: 85%
Monthly churn: 5%
LTV ≈ $12 * 0.85 / 0.05 = $204
Target CAC <= $68
```

## 8. Growth Strategy

### 8.1 SEO

Create content:

- MIDI to piano tutorial video
- MIDI to sheet music
- piano falling notes generator
- beginner piano arrangement generator
- MIDI to MusicXML
- piano tutorial video maker

### 8.2 Creator Outreach

Target:

- small YouTube piano tutorial creators
- TikTok piano accounts
- piano teachers on Instagram
- music students

Offer:

- free credits
- branded templates
- creator showcase

### 8.3 Teacher Workflow

Teachers are sticky because they create repeat projects.

Later features:

- student folders
- assignment links
- lesson packs
- private sharing

### 8.4 Community

Offer public-domain demo library:

```text
Bach
Mozart
Beethoven
simple exercises
```

Avoid copyrighted popular songs in public library.

## 9. Revenue Milestones

### MVP

Goal:

```text
validate that users want MIDI → sheet + video
```

No payment required yet.

### Beta

Goal:

```text
add free limits and email capture
```

### Paid Beta

Goal:

```text
Stripe + credits + pay-per-song
```

### SaaS v1

Goal:

```text
subscriptions + project history + render limits
```

### Real Product

Goal:

```text
teacher/studio plans + multi-source safe references + audio transcription beta
```


---

# docs/MULTI_SOURCE_IMPORT.md

# PianoFlow AI — Multi-Source Import Strategy

## 1. Purpose

This document defines how PianoFlow AI can support multiple source types safely and scalably.

Supported source types over time:

```text
midi_upload
audio_upload
youtube_reference
tiktok_reference
instagram_reference
licensed_provider
oauth_owned_media
public_domain_source
creative_commons_source
```

## 2. Critical Rule

Do not implement this flow in the public product:

```text
Paste YouTube/TikTok/Instagram link
→ app downloads audio/video
→ app stores/caches media
→ app converts downloaded media to MIDI
```

Instead, use this safe flow:

```text
Paste social link
→ fetch metadata only
→ show embedded player if allowed
→ user uploads their own authorized MIDI/audio file
→ process uploaded file
```

## 3. Source Types

### 3.1 midi_upload

MVP source.

Flow:

```text
User uploads .mid/.midi
→ signed URL
→ object storage
→ parse_midi job
→ notes JSON
→ preview
→ sheet/video jobs
```

### 3.2 audio_upload

Future source.

Flow:

```text
User uploads audio they own or have permission to use
→ signed URL
→ storage
→ transcribe_audio job
→ draft MIDI
→ editable preview
→ sheet/video pipeline
```

Important:

- user must attest rights
- do not claim perfect transcription
- output should be editable draft

### 3.3 youtube_reference

Safe source reference.

Flow:

```text
User pastes YouTube URL
→ validate URL
→ fetch metadata using official API where allowed
→ store title, channel, thumbnail, duration, video_id
→ show embedded player
→ user uploads authorized MIDI/audio
```

No audio/video download.

### 3.4 tiktok_reference

Safe source reference.

Flow:

```text
User pastes TikTok URL
→ validate URL
→ fetch metadata/oEmbed where allowed
→ show embed where allowed
→ user uploads authorized MIDI/audio
```

No media download.

### 3.5 instagram_reference

Safe source reference.

Flow:

```text
User pastes Instagram URL
→ fetch metadata/oEmbed where allowed
→ show embed/preview where allowed
→ user uploads authorized MIDI/audio
```

No media download.

### 3.6 licensed_provider

Future source.

Flow:

```text
User chooses licensed/public-domain source
→ app verifies license/source
→ imports allowed MIDI/audio
→ processes normally
```

Possible sources:

- public domain MIDI libraries
- Creative Commons libraries
- licensed music providers
- school/studio-owned libraries

### 3.7 oauth_owned_media

Future advanced source.

Flow:

```text
User connects account with OAuth
→ user selects their own media
→ platform policy check
→ app imports only if API allows that use case
→ user confirms rights
→ process file
```

This should be behind feature flags.

## 4. MVP Scope

Only support:

```text
midi_upload
```

Do not support social imports in MVP.

## 5. Multi-Source UI

Add `/import` page later.

Tabs:

```text
Upload MIDI
Upload Audio
Paste Link
Public Domain Library
```

### Paste Link UI Copy

Show this warning:

```text
This link is used only as a reference. PianoFlow AI does not download, extract, cache, or store audio/video from this platform. To generate sheet music or a tutorial video, upload a MIDI/audio file you own or have permission to use.
```

## 6. Database Design

Add table:

```sql
create table project_sources (
  id uuid primary key,
  project_id uuid not null references projects(id),
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

Possible `source_type`:

```text
midi_upload
audio_upload
youtube_reference
tiktok_reference
instagram_reference
licensed_provider
oauth_owned_media
public_domain_source
creative_commons_source
```

Possible `source_policy_status`:

```text
metadata_only
user_uploaded_authorized_file_required
licensed_import_allowed
oauth_import_allowed
blocked
```

## 7. API Design

### POST /api/v1/sources/metadata

Purpose:

```text
Fetch metadata for a supported link.
```

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=example"
}
```

Response:

```json
{
  "platform": "youtube",
  "external_id": "example",
  "title": "Example Video",
  "author": "Example Channel",
  "thumbnail_url": "https://...",
  "duration_seconds": 180,
  "policy_status": "metadata_only"
}
```

### POST /api/v1/projects/from-source

Purpose:

```text
Create a project with source reference metadata.
```

Request:

```json
{
  "source_type": "youtube_reference",
  "url": "https://www.youtube.com/watch?v=example",
  "title": "Example Video"
}
```

Response:

```json
{
  "project_id": "uuid",
  "source_id": "uuid",
  "next_step": "upload_authorized_midi_or_audio"
}
```

### POST /api/v1/projects/{id}/sources

Attach source metadata to project.

### GET /api/v1/projects/{id}/sources

Return all source references.

## 8. Storage Design

Social metadata does not create media storage objects.

Only user uploads or licensed imports create storage files:

```text
users/{user_id}/projects/{project_id}/input/original.mid
users/{user_id}/projects/{project_id}/input/original_audio.wav
```

## 9. Compliance UX

Before processing uploaded audio/MIDI, show checkbox:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

For social link projects:

```text
This platform link is used only as a reference. PianoFlow AI does not download or extract audio/video from this link.
```

## 10. Feature Flags

Use feature flags:

```text
ENABLE_YOUTUBE_METADATA
ENABLE_TIKTOK_METADATA
ENABLE_INSTAGRAM_METADATA
ENABLE_AUDIO_UPLOAD
ENABLE_OAUTH_IMPORT
ENABLE_LICENSED_PROVIDER_IMPORT
```

Risky features should be disabled by default in production.

## 11. Implementation Order

1. MIDI upload only
2. Audio upload with rights attestation
3. YouTube metadata only
4. TikTok/Instagram metadata only
5. Public-domain source library
6. Licensed provider integration
7. OAuth-owned media only if allowed


---

# docs/REAL_PRODUCT_ROADMAP.md

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
do not support 4K in MVP
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


---

# docs/SECURITY_COMPLIANCE.md

# PianoFlow AI — Security and Compliance

## 1. Security Principles

1. Private by default.
2. Least privilege.
3. No user-controlled storage keys.
4. Signed URLs for file transfer.
5. API never handles large file bytes.
6. Workers validate before processing.
7. Queue payloads contain IDs only.
8. No social-media audio/video downloading in public app.
9. All outputs require authorization unless explicitly shared.
10. Logs must not leak secrets or file URLs.

## 2. File Upload Security

### 2.1 Signed Upload URLs

Upload flow:

```text
Frontend asks API for upload URL
API checks auth and project ownership
API generates safe storage key
API returns signed upload URL
Frontend uploads directly to storage
Frontend calls upload-complete endpoint
```

API does not receive file bytes.

### 2.2 Server-Generated Keys

Bad:

```text
user_filename.mid
```

Good:

```text
users/{user_id}/projects/{project_id}/input/original.mid
```

### 2.3 Validation

Validate:

- extension
- MIME type where possible
- file size
- duration after parsing
- note count after parsing
- empty file
- corrupted MIDI

MVP allowed:

```text
.mid
.midi
```

Future audio:

```text
.wav
.mp3
.m4a
```

### 2.4 Virus Scan Later

For audio upload and public product, add:

- ClamAV worker
- malware scan status
- processing only after scan passes

## 3. Auth and Authorization

Use:

- JWT/session auth
- project ownership checks
- RLS in Postgres/Supabase
- admin role separated

Rules:

```text
User can only access own projects.
User can only access own output files.
User can only create jobs for own projects.
Worker re-validates project and file status.
```

## 4. Storage Security

Storage should be private by default.

Use signed URLs for:

- upload
- download
- preview

Do not expose public bucket.

Use lifecycle rules:

```text
temporary files: delete after 1 day
failed outputs: delete after 7 days
free user outputs: delete after 14-30 days
paid outputs: retain by plan
```

## 5. API Security

Implement:

- rate limiting
- request validation
- CORS allowlist
- no stack traces in production
- structured error envelope
- request_id
- auth middleware
- input sanitization
- safe logging

Error envelope:

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only .mid and .midi files are supported.",
    "request_id": "req_123"
  }
}
```

## 6. Job Security

Queue payload:

```json
{
  "job_id": "uuid",
  "project_id": "uuid"
}
```

Worker must load full details from DB.

Worker rules:

- verify project exists
- verify user/project ownership context
- verify file exists
- verify file status is uploaded
- use settings snapshot
- enforce limits
- update progress safely
- mark failed with safe error
- support retry
- use DLQ later

## 7. Copyright and Platform Compliance

Public product must not implement:

```text
download YouTube audio/video
download TikTok audio/video
download Instagram audio/video
cache social audio/video
store social media copies
extract audio from social video
```

Allowed safer approach:

```text
fetch metadata where allowed
show embedded player where allowed
store title/thumbnail/duration/platform ID
ask user to upload authorized file
```

## 8. User Rights Attestation

Before processing uploaded audio or non-public-domain files, show:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

Store:

```text
source_rights_attestation = true
attested_at
user_id
```

## 9. DMCA / Takedown Checklist

For real product:

- contact email for complaints
- report form
- ability to disable project/output
- audit logs
- repeat infringer policy
- user notification flow
- appeal flow

## 10. Secrets Management

Never commit:

- API keys
- Supabase service role key
- AWS keys
- Stripe secret key
- YouTube API key
- private signing secrets

Use:

- local `.env`
- Vercel/Render env vars for MVP
- AWS Secrets Manager for production
- IAM roles where possible

## 11. Production Checklist

Before production:

- RLS enabled
- storage private
- signed URLs expire
- rate limits enabled
- secrets outside Git
- logs sanitized
- backups enabled
- lifecycle rules enabled
- billing limits enabled
- copyright terms visible
- no social media download code


---

# docs/CLOUD_SCALE_PLAN.md

# PianoFlow AI — Cloud Scale Plan

## 1. Goal

Build the MVP cheaply, but design the system so it can migrate to AWS production without rewriting app logic.

## 2. MVP Architecture

```text
Vercel
  → Next.js frontend

Render/Railway/Fly.io
  → FastAPI API
  → Worker

Supabase
  → Postgres
  → Auth
  → Storage

Redis
  → job queue
```

## 3. Production AWS Architecture

```text
CloudFront
  → frontend static assets or Vercel frontend

ALB / API Gateway
  → ECS Fargate API service

SQS
  → ECS Fargate worker services

S3
  → source files
  → notes JSON
  → output MP4/PDF/MIDI/MusicXML

RDS PostgreSQL
  → metadata

CloudWatch
  → logs, metrics, alarms

Secrets Manager
  → secrets
```

## 4. Adapter-Based Migration

### 4.1 Storage

```text
LocalStorageAdapter
→ SupabaseStorageAdapter
→ S3StorageAdapter
```

App code uses:

```text
StorageService
```

Not direct S3/Supabase calls.

### 4.2 Queue

```text
RedisQueueAdapter
→ SQSQueueAdapter
```

App code uses:

```text
QueueService
```

### 4.3 Database

```text
Supabase Postgres
→ RDS PostgreSQL
```

Keep SQL standard and migrations portable.

### 4.4 Auth

```text
Supabase Auth
→ Auth0/Cognito/custom JWT later
```

Auth should be isolated behind auth middleware/service.

## 5. Worker Scaling

Start with:

```text
one general worker
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

This prevents video rendering from blocking quick parse/sheet jobs.

## 6. Job System

Job statuses:

```text
queued
processing
completed
failed
cancelled
```

Job payload:

```json
{
  "job_id": "uuid",
  "project_id": "uuid"
}
```

Full details are loaded from DB.

## 7. Cost Controls

### 7.1 Render Limits

MVP:

```text
max 1080p
fixed 30 fps
max 10 min
no 4K
```

Free plan:

```text
30 sec preview
watermark
limited projects
```

### 7.2 Concurrency Limits

Use:

- max active jobs per user
- max daily render minutes
- max concurrent workers
- priority queue for paid users

### 7.3 Lifecycle Rules

```text
temporary files: delete after 1 day
failed job outputs: delete after 7 days
free outputs: delete after 14-30 days
paid outputs: retain longer
```

## 8. Observability

Structured logs must include:

```text
request_id
user_id
project_id
job_id
job_type
duration_ms
error_type
status
```

Metrics:

```text
total uploads
total jobs
completed jobs
failed jobs
average render time
queue delay
storage usage
active users
paid conversion
```

Alarms:

```text
API 5xx rate high
worker failures high
queue delay high
storage upload failures
database connection failures
monthly cost threshold
```

## 9. CI/CD

GitHub Actions should run:

- frontend lint
- frontend type check
- frontend build
- backend tests
- worker tests
- music-core tests
- Docker build
- migration check later

Deployment stages:

```text
dev
staging
production
```

Production deploy should require approval.

## 10. Terraform Plan

Folder structure:

```text
infra/terraform/
  environments/
    dev/
    staging/
    prod/
  modules/
    s3/
    ecs/
    sqs/
    rds/
    cloudfront/
    iam/
    cloudwatch/
    secrets/
```

Do not write Terraform before MVP skeleton is stable.

## 11. Migration Roadmap

### Stage 1 — Local

```text
Docker Compose
Postgres
Redis
Local storage
```

### Stage 2 — Public MVP

```text
Vercel
Render/Railway
Supabase
Redis
```

### Stage 3 — AWS Hybrid

```text
Vercel frontend
ECS API
ECS worker
SQS
S3
Supabase or RDS
```

### Stage 4 — Full AWS

```text
CloudFront
S3
ECS Fargate
SQS
RDS
CloudWatch
Secrets Manager
Terraform
```

## 12. Key Rule

Cloud migration should change:

```text
environment variables
adapters
infrastructure
```

It should not rewrite:

```text
business logic
music-core
API contracts
job contracts
frontend flow
```


---

# docs/IMPLEMENTATION_RULES.md

# PianoFlow AI — Implementation Rules

## 1. Engineering Principles

1. Keep API thin.
2. Put heavy work in workers.
3. Keep music logic in `packages/music-core`.
4. Store large files in object storage.
5. Store only metadata in database.
6. Use adapters for external services.
7. Use versioned APIs.
8. Use typed schemas.
9. Make jobs idempotent.
10. Keep outputs private by default.

## 2. Do

- Use direct-to-storage signed upload URLs.
- Use server-generated storage keys.
- Store notes JSON in object storage.
- Store `analysis_summary` in database.
- Snapshot settings per job.
- Use queue payloads with IDs only.
- Stream video frames to FFmpeg stdin.
- Put MuseScore and LilyPond behind `SheetEngraver`.
- Use Redis for MVP queue.
- Use SQS for scale.
- Add adapter contract tests.
- Add file size and duration limits.
- Add RLS/auth checks.
- Add rate limiting.
- Add lifecycle cleanup.
- Use feature flags for risky features.
- Keep social-link support metadata-only.

## 3. Do Not

- Do not render video inside HTTP requests.
- Do not store MP4/PDF/MIDI blobs in Postgres.
- Do not store full notes JSON in Postgres.
- Do not put large data in queue payloads.
- Do not trust user filenames.
- Do not expose public storage buckets.
- Do not put secrets in code.
- Do not implement YouTube/TikTok/Instagram audio/video download.
- Do not build audio transcription before MIDI pipeline is stable.
- Do not promise perfect transcription.
- Do not skip tests for adapters.
- Do not manually change production DB without migrations.
- Do not add 4K rendering in MVP.
- Do not create a public copyrighted song library.

## 4. Code Organization Rules

### API

Routers should only:

- validate request
- call service
- return response

Routers should not:

- parse MIDI
- render video
- call FFmpeg
- directly call S3/Supabase everywhere

### Worker

Workers should:

- read job ID
- load job from DB
- load files from storage
- process
- upload outputs
- update job status

### music-core

`music-core` should contain:

- MIDI parser
- note normalization
- hand detection
- simplification rules
- MusicXML conversion
- video timeline calculation

It should not contain:

- HTTP logic
- database logic
- auth logic
- cloud-specific SDK code

## 5. Adapter Rules

Create interfaces:

```text
StorageService
QueueService
SheetEngraver
JobRepository
ProjectRepository
```

Implementations:

```text
LocalStorageService
SupabaseStorageService
S3StorageService

RedisQueueService
SQSQueueService

MuseScoreEngraver
LilyPondEngraver
```

## 6. Job Rules

Every job must have:

- job_id
- project_id
- job_type
- status
- settings_snapshot
- retry count
- created_at
- started_at
- finished_at
- error_message

Every job must be idempotent.

If the job runs twice, it must not corrupt the project.

## 7. Security Review Checklist

Before merging a feature, check:

- Is user ownership verified?
- Is storage private?
- Is signed URL expiry short?
- Are file types validated?
- Are secrets hidden?
- Are logs safe?
- Is rate limiting needed?
- Does this create copyright risk?
- Does this download social media content?
- Is RLS policy needed?

## 8. Cost Review Checklist

Before merging a feature, check:

- Can free users abuse it?
- Does it increase render time?
- Does it increase storage usage?
- Should it be paid-only?
- Should there be a limit?
- Should outputs expire?
- Does it need queue priority?

## 9. Code Review Checklist

- Is the endpoint thin?
- Is there an adapter boundary?
- Is business logic in service/domain layer?
- Are schemas typed?
- Are errors safe?
- Are tests added?
- Are migrations added?
- Is the job idempotent?
- Does the feature follow locked design decisions?
- Does it avoid social media download/ripping?

## 10. Feature Flag Rules

Use feature flags for:

```text
audio upload
audio transcription
YouTube metadata
TikTok metadata
Instagram metadata
public sharing
teacher sharing
paid billing
vertical export
```

Risky features disabled by default.


---

# docs/CLAUDE_NEXT_STEPS.md

# PianoFlow AI — Claude Next Steps

## Current Status

Design documentation is complete.

Additional strategy documentation is now defined:

```text
STRATEGY.md
COMPETITIVE_POSITIONING.md
BUSINESS_MODEL.md
MULTI_SOURCE_IMPORT.md
REAL_PRODUCT_ROADMAP.md
SECURITY_COMPLIANCE.md
CLOUD_SCALE_PLAN.md
IMPLEMENTATION_RULES.md
CLAUDE_NEXT_STEPS.md
```

## Locked Decisions

Keep these locked:

1. MIDI-first MVP.
2. Notes JSON in object storage, not database.
3. Database stores metadata and analysis summary.
4. Queue payloads contain IDs only.
5. Settings snapshot per job.
6. Direct-to-storage signed upload URLs.
7. API never handles large file bytes.
8. Frames stream to FFmpeg stdin.
9. MuseScore primary, LilyPond fallback.
10. Adapter boundaries for storage/queue/sheet engraver.
11. Outputs private by default.
12. No YouTube/TikTok/Instagram audio/video download.

## Next Implementation Phase

The next implementation phase is:

```text
Phase 2 — Monorepo Skeleton, Docker Compose, CI
```

## Exact Prompt for Claude

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
- infra/terraform
- infra/supabase
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
- YouTube/TikTok/Instagram import
- billing
- auth

Only create skeleton, config, health checks, placeholder modules, and CI.
```

## Phase 2 Acceptance Criteria

These should work:

```bash
docker compose up --build
```

URLs:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

CI should run basic checks.

## Phase 3 Preview

After Phase 2, implement:

```text
Phase 3 — MIDI upload and parse_midi job skeleton
```

Phase 3 includes:

- project creation
- signed upload URL endpoint
- storage adapter interface
- local storage adapter
- upload complete endpoint
- parse_midi job
- notes JSON schema
- analysis_summary update
- basic piano roll preview data

Phase 3 does not include:

- video rendering
- sheet generation
- beginner mode
- audio transcription
- social link import

## Claude Behavior Rules

When implementing:

1. Follow docs.
2. Do not skip architecture boundaries.
3. Do not add unplanned features.
4. Keep each phase small.
5. Summarize files changed.
6. Explain how to run.
7. Explain what is intentionally not implemented.
8. Stop after the requested phase.
