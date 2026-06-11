# PianoFlow AI — FINAL ALL Markdown Docs From Start To Now

This combined file includes the latest v3 docs, previous strategy docs, prompts, policies, and final changelog.

Use this file when you want to give Claude one single context file.



---

# archive_previous_versions/claude_no_tutorial_download_prompt.md

# Claude Prompt — Update PianoFlow AI Docs: No Tutorial Video Download

Update the PianoFlow AI docs with a new product/security/business rule:

## New Rule

Tutorial videos must not be directly downloadable by default.

Users may download:
- sheet.pdf
- score.musicxml
- original.mid
- simplified.mid

Users may not directly download:
- tutorial.mp4
- vertical_tutorial.mp4
- rendered falling-note tutorial video

Tutorial videos must be:
- private
- streaming-only
- viewable inside the app
- protected by signed short-lived stream URLs
- not exposed through public storage URLs
- not shown with a download button
- watermarked depending on plan
- access logged

## Important Reality

Mention clearly:

It is impossible to fully stop screen recording or browser capture. The goal is to prevent official direct download, avoid public permanent URLs, reduce redistribution risk, and protect the SaaS business model.

## Docs to update

Update:
- docs/PRODUCT.md
- docs/DESIGN.md
- docs/DATABASE.md
- docs/API.md
- docs/UI_UX.md
- docs/SECURITY_COMPLIANCE.md
- docs/BUSINESS_MODEL.md
- docs/ROADMAP.md
- docs/IMPLEMENTATION_RULES.md
- docs/CLAUDE_NEXT_STEPS.md

## Database update

Add fields to output_files:

```sql
download_allowed boolean default true,
streaming_only boolean default false,
watermark_required boolean default false,
access_policy text default 'private_download'
```

For video outputs, default:

```text
download_allowed = false
streaming_only = true
watermark_required = true
access_policy = private_streaming
```

## API update

Add:
- POST /api/v1/outputs/{output_id}/stream-url
- POST /api/v1/outputs/{output_id}/download-url

Rules:
- download-url returns an error for tutorial video outputs.
- stream-url checks auth, ownership, plan, and returns a short-lived signed URL.
- Raw storage path is never returned to frontend.

## UI update

For downloadable files:
- Download PDF
- Download MIDI
- Download MusicXML

For tutorial video:
- Watch Tutorial

Do not show:
- Download Video
- Save MP4
- Export MP4

Use frontend video player with:
- no download button
- no public URL display
- optional right-click disabled
- watermark overlay by plan

## Business model update

Free:
- video preview streaming only
- visible watermark

Starter:
- full video streaming
- no download

Creator:
- full video streaming
- optional future export license

Teacher:
- student share links
- streaming only by default

Future add-on:
- Video Export License
- only for users who confirm rights and pay export credits

Do not implement video download in MVP.

## Final response

Summarize:
1. Docs updated
2. New product rule
3. API/database changes
4. What remains impossible to prevent
5. Next implementation phase


---

# archive_previous_versions/claude_pianoflow_master_prompt.md

# Claude Master Prompt — PianoFlow AI Real Product Strategy + Scalable Architecture + Multi-Source Link Roadmap

You are a senior product strategist, SaaS architect, cloud engineer, security architect, and technical product manager.

We are building **PianoFlow AI**.

PianoFlow AI is a cloud-based piano learning material generator.

The product converts music sources into a complete piano learning package:

- Sheet music PDF
- MusicXML
- MIDI
- Falling-note piano tutorial video
- Beginner-friendly simplified versions
- Project history
- Downloadable practice pack

## Current Docs Already Exist

The repo already has these design documents:

```text
docs/PRODUCT.md
docs/DESIGN.md
docs/DATABASE.md
docs/API.md
docs/UI_UX.md
docs/CODE_ARCHITECTURE.md
docs/DEPLOYMENT.md
docs/ROADMAP.md
docs/RISKS.md
docs/README_PLAN.md
```

They already cover:

- Product vision
- MVP scope
- System design
- Database schema
- REST API design
- UI/UX design
- Code architecture
- Deployment stages
- Roadmap
- Risks
- README plan

## Locked Technical Decisions

Keep these decisions locked unless there is a very strong reason to change:

1. Notes JSON goes to object storage, not PostgreSQL.
2. PostgreSQL keeps only metadata and a small `analysis_summary`.
3. Queue payloads are thin and contain IDs only.
4. Settings are snapshotted per job.
5. Uploads use direct-to-storage signed URLs.
6. API never touches large file bytes.
7. User filenames are never trusted or used as storage keys.
8. Frames stream directly to FFmpeg stdin.
9. Do not create PNG frame sequences on disk.
10. MuseScore CLI is the primary sheet engraver.
11. LilyPond is the fallback sheet engraver.
12. Both sheet engravers sit behind one `SheetEngraver` adapter.
13. Redis Queue is for MVP.
14. AWS SQS is for scale.
15. Supabase Storage or local storage is for MVP.
16. S3 is for scale.
17. Adapter contract tests must run against every backend.
18. No public song library in MVP.
19. Outputs are private by default.
20. Do not implement YouTube/TikTok/Instagram audio/video downloading inside the public codebase.

## Important Compliance Rule

The product may support YouTube, TikTok, Instagram, and other social links later, but it must be designed safely.

Do NOT design or implement:

```text
Paste YouTube/TikTok/Instagram link
→ app downloads audio/video
→ app stores or caches audio/video
→ app converts that downloaded media to MIDI
```

Instead, design a compliance-safe multi-source strategy:

```text
Paste social link
→ fetch metadata only using official API/oEmbed where allowed
→ show embedded player/preview where allowed
→ user uploads their own MIDI/audio file that they own or have rights to use
→ app processes the uploaded file
```

Future advanced support may include:

- OAuth-based import only when the user is the content owner and the platform API allows it.
- Licensed music provider integrations.
- Creative Commons/public-domain source filtering.
- User rights attestation.
- DMCA/takedown workflow.
- Region/platform-specific policy checks.
- A provider abstraction that can disable risky providers via feature flags.

## Product Differentiation Goal

We do not want to compete only as another audio transcription tool.

Competitors:

- Klangio / Piano2Notes: Audio/YouTube to sheet/MIDI/MusicXML.
- Songscription: Audio or social link to sheet/MIDI/MusicXML/tabs with editor.
- AnthemScore: Desktop audio-to-sheet transcription.
- SeeMusic: MIDI to cinematic falling-note videos.
- Piano VFX: MIDI visualizer and video rendering.
- Synthesia: Piano practice app using falling notes.

PianoFlow AI should stand out as:

```text
A full piano learning material generator, not just a transcription tool.
```

Main unique angle:

```text
One source
→ sheet PDF
→ MusicXML
→ MIDI
→ falling-note tutorial video
→ beginner/easy version
→ downloadable practice pack
```

Strategic differentiation:

1. Learning-first workflow, not transcription-first.
2. Beginner Mode as a core feature.
3. Exportable tutorial video + sheet in the same workflow.
4. Cloud project history.
5. Teacher/student sharing later.
6. Private-by-default copyright-safe posture.
7. Clean scalable cloud architecture.
8. Job/worker system suitable for long-running media jobs.
9. Multi-source metadata reference without unsafe ripping.
10. SaaS pricing based on render/transcription minutes.

## Your Task

Based on the current docs and the research above, create a **new second-layer strategy document set**.

Do not write app code.

Create or update these files:

```text
docs/STRATEGY.md
docs/COMPETITIVE_POSITIONING.md
docs/BUSINESS_MODEL.md
docs/MULTI_SOURCE_IMPORT.md
docs/REAL_PRODUCT_ROADMAP.md
docs/SECURITY_COMPLIANCE.md
docs/CLOUD_SCALE_PLAN.md
docs/IMPLEMENTATION_RULES.md
docs/CLAUDE_NEXT_STEPS.md
```

If the docs already exist, update them.
If not, create them.

Write detailed Markdown content.

---

# 1. docs/STRATEGY.md

Create a product strategy document.

Include:

## Product positioning

Position PianoFlow AI as:

```text
A cloud-based piano learning material generator that turns MIDI or legally uploaded audio into sheet music, tutorial videos, and beginner-friendly practice versions.
```

## What we are not

Clearly state:

- Not a YouTube ripping tool.
- Not a public copyrighted song library.
- Not promising perfect audio transcription.
- Not replacing professional arrangers.
- Not a full DAW.
- Not a full MuseScore replacement.

## Main target users

Include personas:

1. Piano beginners
2. Piano teachers
3. YouTube/TikTok piano tutorial creators
4. Music students
5. Hobbyists who collect MIDI files
6. Future: schools/music studios

## Core value proposition

Explain:

```text
Instead of giving users only a sheet, PianoFlow AI gives a complete learning pack.
```

## Product wedge

Start with the easiest reliable input:

```text
MIDI-first
```

Then expand later:

```text
User-uploaded audio
→ editable draft MIDI
→ social link metadata/preview
→ licensed/OAuth-based import where allowed
```

## Why this is stronger than starting with YouTube download

Explain the legal, technical, and product-quality reasons.

---

# 2. docs/COMPETITIVE_POSITIONING.md

Create a competitor positioning document.

Include comparison with:

- Klangio / Piano2Notes
- Songscription
- AnthemScore
- SeeMusic
- Piano VFX
- Synthesia

For each competitor, compare:

- Main input
- Main output
- Strength
- Weakness / gap
- How PianoFlow AI differentiates

Create a table like:

```markdown
| Product | Main Strength | Gap | PianoFlow AI Advantage |
```

Important differentiation:

## Against Klangio/Songscription

They are transcription-first.
PianoFlow AI is learning-material-first.

## Against AnthemScore

AnthemScore is desktop and transcription-focused.
PianoFlow AI is cloud/project/workflow-focused.

## Against SeeMusic/Piano VFX

They are video-visualization-first.
PianoFlow AI combines video + sheet + beginner mode + project history.

## Against Synthesia

Synthesia is practice-app-first.
PianoFlow AI is export/content-generation-first.

Add a section:

## Most defensible advantages

Include:

1. Beginner simplification data loop
2. Teacher/student workflow
3. Project history and reusable learning packs
4. Render templates and brandable tutorial styles
5. Cloud architecture and API potential
6. Compliance-safe link handling

---

# 3. docs/BUSINESS_MODEL.md

Create a detailed SaaS business model.

Include:

## Pricing tiers

Propose:

### Free

- 3 MIDI projects/month
- 30-second preview render
- Watermarked video
- PDF export maybe limited
- No audio transcription
- No batch export

### Starter / Plus

- Around $9–12/month
- More MIDI projects
- Full PDF/MusicXML/MIDI export
- 720p/1080p render
- Basic beginner mode
- Limited project storage

### Creator / Pro

- Around $19–29/month
- More render minutes
- Vertical Shorts/TikTok export
- No watermark
- Priority queue
- More storage
- Batch export
- Teacher sharing later

### Teacher / Studio

- Around $49–99/month
- Student folders
- Share links
- Classroom mode
- Team seats
- Higher render limits
- Brandable videos

### Pay-per-song

- One-time unlock
- Useful for users who do not want a subscription

### Enterprise/API

- Custom pricing
- Bulk processing
- API access
- School/music studio licensing

## Cost model

Create rough assumptions:

- Video render cost per minute
- Storage cost per project
- Database cost
- Queue cost
- Worker cost
- Audio transcription cost later
- Free-tier abuse cost

Do not pretend exact numbers are guaranteed. Mark them as estimates.

## Margin strategy

Explain:

- Free tier must be capped.
- Full video render must be limited by minutes.
- 4K should not be in MVP.
- Priority queue should be paid.
- Old outputs can be deleted or archived based on plan.

## Break-even model

Include an example:

```text
Fixed monthly infra cost
+ variable render cost
+ storage cost
→ required paying users
```

## LTV/CAC strategy

Explain:

- Aim for LTV:CAC >= 3:1.
- Use SEO, MIDI community content, piano teacher outreach, tutorial creator demos.
- Reduce churn by project history and student workflows.

---

# 4. docs/MULTI_SOURCE_IMPORT.md

Create a detailed multi-source import strategy.

This is extremely important.

Support these source types:

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

## MVP

Only support:

```text
midi_upload
```

## Later safe support

Support:

```text
audio_upload
```

Only for files users own or have permission to use.

## Social link support

For YouTube/TikTok/Instagram:

Design only:

```text
Paste link
→ validate URL
→ fetch metadata using official API/oEmbed where allowed
→ store title/thumbnail/duration/platform/video_id
→ embed player if allowed
→ ask user to upload legal MIDI/audio
```

Do not download audio/video.

## Future owner-authorized import

Design a future flow:

```text
User connects account with OAuth
→ user selects their own media
→ platform policy check
→ import only if API allows media access for that use case
→ process only if user confirms they own rights
```

This should be behind a feature flag.

## Licensed provider import

Design:

```text
User chooses from licensed/public-domain/Creative Commons library
→ app gets allowed audio/MIDI
→ process normally
```

## Database changes

Propose tables or fields:

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

Potential table:

```sql
project_sources
```

## API changes

Design endpoints:

```text
POST /api/v1/sources/metadata
POST /api/v1/projects/from-source
POST /api/v1/projects/{id}/sources
GET /api/v1/projects/{id}/sources
```

## UI changes

Design page:

```text
/import
```

Tabs:

```text
Upload MIDI
Upload Audio
Paste Link
Public Domain Library
```

For Paste Link tab, show warning:

```text
This link is used only as a reference. PianoFlow AI does not download or extract audio/video from this platform.
```

## Compliance warning

Add explicit UI copy and terms copy.

---

# 5. docs/REAL_PRODUCT_ROADMAP.md

Create an expanded roadmap from MVP to real product.

Use phases:

## Phase 1 — Design docs complete

Already done.

## Phase 2 — Monorepo skeleton

- Next.js
- FastAPI
- Worker
- Docker Compose
- CI
- health checks

## Phase 3 — MIDI upload pipeline

- signed URL
- storage adapter
- project creation
- upload complete callback
- parse_midi job
- notes JSON output contract
- piano roll preview

## Phase 4 — Sheet PDF generation

- MusicXML generation
- MuseScore adapter
- LilyPond fallback
- sheet output files

## Phase 5 — Falling-note video renderer

- timeline calculation
- FFmpeg streaming
- 720p/1080p
- settings snapshot
- job progress

## Phase 6 — Beginner Mode

- original/easy/very easy
- rule-based simplification
- export simplified MIDI
- render simplified sheet/video

## Phase 7 — User accounts and project history

- auth
- RLS
- projects list
- private storage
- signed download URLs

## Phase 8 — Business model

- Stripe
- free limits
- render credits
- paid plan limits
- usage dashboard

## Phase 9 — Creator features

- vertical video export
- templates
- watermark control
- thumbnail generator
- brand style presets

## Phase 10 — Multi-source metadata

- YouTube/TikTok/Instagram metadata only
- embedded preview
- no media download
- upload legal file separately

## Phase 11 — Audio transcription beta

- user-uploaded audio only
- draft MIDI
- editor
- no perfect-transcription claim

## Phase 12 — Real product scale

- ECS/SQS/S3/RDS
- autoscaling workers
- observability
- teacher/student workflows
- API/enterprise

For each phase, include:

- Goal
- Implementation tasks
- Deliverables
- Risks
- Acceptance criteria
- What NOT to do

---

# 6. docs/SECURITY_COMPLIANCE.md

Create a security and compliance document.

Include:

## File upload security

- signed upload URLs
- server-generated storage keys
- file type validation
- file size limit
- MIME sniffing
- virus scan later
- no user-controlled filenames
- private bucket by default

## Auth and authorization

- JWT/session auth
- RLS for multi-tenant isolation
- users can only access their own projects
- admin operations separated

## Storage security

- private storage
- signed download URLs
- lifecycle deletion
- access logs
- encryption at rest

## API security

- rate limiting
- request validation
- CORS allowlist
- CSRF considerations
- error envelope
- no stack traces in production

## Job security

- queue payloads are IDs only
- worker re-validates ownership and file status
- idempotency
- retry and DLQ
- job timeout

## Copyright and social platform compliance

State clearly:

```text
No YouTube/TikTok/Instagram audio/video download, import, cache, backup, or storage in the public app.
```

Only support:

```text
metadata
thumbnail where allowed
embedded player where allowed
user-uploaded authorized files
licensed/public-domain/Creative Commons sources
```

## Terms UX

Include required user attestation:

```text
I confirm I own this file or have permission to process it.
```

Include DMCA/takedown policy checklist.

---

# 7. docs/CLOUD_SCALE_PLAN.md

Create a cloud scalability plan.

Start architecture:

```text
Vercel + FastAPI on Render/Railway + Supabase Postgres + Supabase Storage + Redis
```

Scale architecture:

```text
CloudFront
S3
ECS Fargate API
ECS Fargate Worker
SQS
RDS PostgreSQL
CloudWatch
Secrets Manager
Terraform
```

Include:

## Migration without app rewrite

Explain adapter pattern:

```text
StorageAdapter: Local → Supabase → S3
QueueAdapter: Redis → SQS
Database: Supabase Postgres → RDS Postgres
Auth: Supabase Auth → Cognito/Auth0/custom JWT later
```

## Worker scaling

Separate queues:

```text
queue.parse
queue.sheet
queue.video
queue.audio
```

Worker types:

```text
parse-worker
sheet-worker
video-worker
audio-worker
```

## Cost control

- max video length
- max resolution
- free-tier render caps
- storage lifecycle
- queue limits
- concurrency limits
- priority queue for paid users

## Observability

- structured logs
- request_id
- user_id
- project_id
- job_id
- duration_ms
- error_type
- queue delay
- render duration
- storage usage
- failed jobs

## CI/CD

- GitHub Actions
- Docker build
- tests
- lint
- type check
- staging deploy
- production deploy approval

---

# 8. docs/IMPLEMENTATION_RULES.md

Create coding and engineering rules.

Include:

## Do

- Keep API thin.
- Put heavy work in workers.
- Keep domain logic in packages/music-core.
- Use adapters for storage/queue/sheet engraver.
- Use Pydantic schemas.
- Use TypeScript types.
- Use migrations.
- Use contract tests.
- Use feature flags for risky features.
- Keep outputs private by default.

## Do not

- Do not render video inside HTTP request.
- Do not store MP4/PDF/MIDI blobs in DB.
- Do not store notes JSON in DB.
- Do not put secrets in code.
- Do not trust user filenames.
- Do not put large data in queue payload.
- Do not implement YouTube/TikTok/Instagram download.
- Do not build audio transcription before MIDI pipeline is stable.
- Do not skip RLS/auth checks.
- Do not skip rate limits.

## Code review checklist

Include:

- Is the endpoint thin?
- Is there an adapter boundary?
- Is file access private?
- Is user ownership checked?
- Is the job idempotent?
- Are errors logged safely?
- Are tests added?
- Is there a migration?
- Does this increase cost risk?
- Does this create copyright/platform-policy risk?

---

# 9. docs/CLAUDE_NEXT_STEPS.md

Create a document that tells Claude what to do next.

The next implementation phase should be:

```text
Phase 2 — Monorepo skeleton, Docker Compose, CI
```

Do not implement product logic yet.

Include the exact next command/prompt:

```text
Implement Phase 2 only.
Create apps/web, apps/api, apps/worker, packages/music-core, packages/shared-types, infra folders, docker-compose.yml, .env.example, GitHub Actions CI, and health checks.
Do not build MIDI parsing, video rendering, sheet generation, audio transcription, or social link import yet.
```

Then define Phase 3 preview:

```text
Phase 3 — MIDI upload and parse_midi job skeleton
```

Include what Phase 3 will do later.

---

# Output Format

Write each document in full Markdown.

Use headings like:

```markdown
# docs/STRATEGY.md
...
```

Then:

```markdown
# docs/COMPETITIVE_POSITIONING.md
...
```

Continue for every requested file.

Do not write actual application code.

Only create/update documentation and strategy files.

Make the writing practical, technical, and suitable for a serious SaaS/product GitHub repository.

The final answer should summarize:

1. Files created or updated
2. Key strategy decisions
3. What changed from the original docs
4. Next implementation phase
5. Risks still unresolved


---

# archive_previous_versions/NO_TUTORIAL_DOWNLOAD_POLICY.md

# PianoFlow AI — No Tutorial Download Policy

## 1. Decision

PianoFlow AI should not allow users to directly download tutorial videos to their local device by default.

Tutorial videos should be:

```text
private
streaming-only
viewable inside the app
protected by signed short-lived access
watermarked by plan
not exposed as direct public MP4 links
```

This applies especially to:

```text
falling-note tutorial videos
creator-style tutorial videos
vertical short videos
rendered MP4 tutorial outputs
```

## 2. Why This Matters

This rule improves the product in several ways:

1. Protects generated content from easy redistribution.
2. Reduces copyright risk.
3. Makes the product feel more like a SaaS platform, not a file generator.
4. Supports subscription retention because users return to the app to view projects.
5. Enables teacher/student sharing without exposing permanent download links.
6. Makes free-tier abuse harder.
7. Makes future licensing/compliance easier.

## 3. Important Reality

It is impossible to completely stop users from copying video.

Users can still:

```text
screen record
use browser developer tools
capture HDMI output
record with another device
```

Therefore, the goal is not perfect protection.

The goal is:

```text
do not provide an easy official download button
do not expose permanent public URLs
make access private and temporary
add visible/invisible watermarking
log access
limit sharing by plan
```

## 4. MVP Policy

### Allowed in MVP

Users can download:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
```

Users cannot directly download:

```text
tutorial.mp4
vertical_tutorial.mp4
```

Tutorial videos are view-only inside the web app.

### MVP Video Access

Flow:

```text
User opens project
→ frontend requests stream access
→ API checks ownership and plan
→ API returns short-lived signed stream URL
→ video plays inside app
→ URL expires quickly
```

No permanent public URL.

No download button.

No `download` attribute in frontend.

No public bucket.

## 5. Storage Rule

Store video in private object storage:

```text
users/{user_id}/projects/{project_id}/outputs/tutorial.mp4
```

Never store video in public bucket.

Never expose raw storage path to the frontend.

Database stores only:

```text
output_file_id
storage_path
output_type
duration_seconds
resolution
watermark_status
streaming_only = true
download_allowed = false
```

## 6. API Design Update

Add or update output file fields:

```sql
download_allowed boolean default true
streaming_only boolean default false
watermark_required boolean default false
access_policy text default 'private_download'
```

Output type policy:

```text
sheet_pdf: download_allowed=true
music_xml: download_allowed=true
original_midi: download_allowed=true
simplified_midi: download_allowed=true
tutorial_mp4: download_allowed=false
vertical_tutorial_mp4: download_allowed=false
```

## 7. API Endpoints

### GET /api/v1/projects/{project_id}/outputs

Returns output metadata without raw storage URLs.

Example:

```json
{
  "outputs": [
    {
      "id": "out_sheet_123",
      "type": "sheet_pdf",
      "download_allowed": true
    },
    {
      "id": "out_video_123",
      "type": "tutorial_mp4",
      "streaming_only": true,
      "download_allowed": false
    }
  ]
}
```

### POST /api/v1/outputs/{output_id}/download-url

Only works if `download_allowed = true`.

If user requests video download, return:

```json
{
  "error": {
    "code": "DOWNLOAD_NOT_ALLOWED",
    "message": "Tutorial videos are view-only in PianoFlow AI."
  }
}
```

### POST /api/v1/outputs/{output_id}/stream-url

Only for video outputs.

Rules:

```text
check auth
check project ownership
check output type
check plan
create short-lived signed URL
return streaming URL
log access
```

Response:

```json
{
  "stream_url": "https://signed-url...",
  "expires_in_seconds": 300
}
```

## 8. Frontend UX

### Project Output Page

For sheet/MIDI:

```text
Download PDF
Download MIDI
Download MusicXML
```

For tutorial video:

```text
Watch Tutorial
```

Do not show:

```text
Download Video
Save MP4
Export MP4
```

### Video Player

Use:

```html
<video controls controlsList="nodownload">
```

Also disable right click on video as light friction:

```text
onContextMenu preventDefault
```

Important: this is not real security. Real protection comes from private storage and signed short-lived URLs.

## 9. Watermark Policy

Free plan:

```text
visible watermark
username/project id watermark
low resolution preview
short preview only
```

Paid plan:

```text
smaller watermark or no visible watermark
invisible forensic watermark later
streaming-only still applies by default
```

Teacher/Studio plan:

```text
shareable student view links
optional custom watermark
download video only if explicitly enabled later
```

## 10. Sharing Policy

MVP:

```text
no public sharing
private only
```

Later:

```text
private share link
student view link
expiry date
password protection
view-only
no download
```

For teacher sharing:

```text
Teacher creates project
→ creates student view link
→ student can watch in browser
→ student cannot download video
```

## 11. Subscription Strategy

### Free

```text
video preview only
watermarked
streaming-only
no download
```

### Starter

```text
full-length streaming
watermarked or small watermark
no download
```

### Creator / Pro

```text
full-length streaming
no visible watermark
download disabled by default
optional export credits later
```

### Teacher / Studio

```text
streaming-only student links
custom watermark
download video only if studio policy allows
```

### Optional Future Add-On

A separate paid add-on:

```text
Video Export License
```

This could allow direct MP4 download only for users who confirm rights and pay for export credits.

Do not include this in MVP.

## 12. Compliance Benefit

This policy reduces risk when social links are used as references.

Even if a project is based on a user-uploaded file, PianoFlow AI avoids becoming a public redistribution tool.

The safe stance:

```text
We generate private learning previews and practice material.
We do not provide public downloadable copies of tutorial videos by default.
```

## 13. Technical Protection Levels

### Level 1 — MVP

```text
private bucket
short-lived signed stream URL
no download button
controlsList="nodownload"
right-click disabled
access logs
watermark
```

### Level 2 — SaaS Beta

```text
HLS streaming instead of raw MP4
signed cookies
short segment expiry
CloudFront/Supabase edge access control
per-user watermark overlay
```

### Level 3 — Real Product

```text
DRM for enterprise/studio
Widevine/FairPlay/PlayReady where feasible
forensic watermark
abuse detection
download export license
```

## 14. Database Update

Add fields to `output_files`:

```sql
alter table output_files
add column download_allowed boolean default true,
add column streaming_only boolean default false,
add column watermark_required boolean default false,
add column access_policy text default 'private_download';
```

For video outputs:

```sql
update output_files
set download_allowed = false,
    streaming_only = true,
    watermark_required = true,
    access_policy = 'private_streaming'
where type in ('video_mp4', 'tutorial_mp4', 'vertical_tutorial_mp4');
```

Recommended future enum values:

```text
private_download
private_streaming
private_share_streaming
paid_export_download
blocked
```

## 15. Claude Prompt To Update Docs

Use this prompt:

```text
Update the PianoFlow AI docs with a new rule:

Tutorial videos must not be directly downloadable by default.

Keep downloads for:
- sheet.pdf
- score.musicxml
- original.mid
- simplified.mid

But tutorial videos must be:
- private
- streaming-only
- protected by signed short-lived stream URLs
- not exposed through public storage URLs
- not shown with a download button
- watermarked based on plan
- access logged

Update these files:
- docs/PRODUCT.md
- docs/DESIGN.md
- docs/DATABASE.md
- docs/API.md
- docs/UI_UX.md
- docs/SECURITY_COMPLIANCE.md
- docs/BUSINESS_MODEL.md
- docs/ROADMAP.md
- docs/IMPLEMENTATION_RULES.md

Add these database fields to output_files:
- download_allowed boolean
- streaming_only boolean
- watermark_required boolean
- access_policy text

Add API routes:
- POST /api/v1/outputs/{output_id}/stream-url
- POST /api/v1/outputs/{output_id}/download-url

Rules:
- download-url returns an error for tutorial video outputs.
- stream-url checks auth, ownership, plan, and returns a short-lived signed URL.
- Frontend must show “Watch Tutorial” instead of “Download Video”.
- Do not add a public video download button.
- Do not use public buckets for videos.
- Do not expose raw storage paths to the frontend.

Mention that this cannot fully prevent screen recording, but it prevents official direct download and reduces redistribution risk.

Do not write app code yet unless asked.
Only update planning docs.
```

## 16. Updated Product Output Policy

| Output | Free | Starter | Creator | Teacher |
|---|---|---|---|---|
| Sheet PDF | limited download | download | download | download |
| MusicXML | limited or locked | download | download | download |
| MIDI | limited or locked | download | download | download |
| Tutorial Video | stream preview only | streaming only | streaming only | streaming/student links |
| Video MP4 Download | no | no | optional future add-on | optional admin setting |

## 17. Final Decision

The best default policy is:

```text
Tutorial video = view online only
Sheet/MIDI/XML = downloadable depending on plan
```

This makes PianoFlow AI more like a serious SaaS product and less like a raw file export tool.


---

# archive_previous_versions/PianoFlow_AI_FULL_DOCS_V3_AUDIO_MIDI_COMBINED.md

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
- 4K is not MVP.
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
- no 4K in MVP
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
- no 4K MVP
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


---

# archive_previous_versions/PianoFlow_AI_strategy_docs_combined.md

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


---

# archive_previous_versions/strategy_docs_pack_original/docs/BUSINESS_MODEL.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/CLAUDE_NEXT_STEPS.md

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


---

# archive_previous_versions/strategy_docs_pack_original/docs/CLOUD_SCALE_PLAN.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/COMPETITIVE_POSITIONING.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/IMPLEMENTATION_RULES.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/MULTI_SOURCE_IMPORT.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/REAL_PRODUCT_ROADMAP.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/SECURITY_COMPLIANCE.md

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

# archive_previous_versions/strategy_docs_pack_original/docs/STRATEGY.md

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

# archive_previous_versions/strategy_docs_pack_original/PianoFlow_AI_strategy_docs_combined.md

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
- 4K is not MVP.
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
- no 4K in MVP
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
- no 4K MVP
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


---

# docs/98_FINAL_CHANGELOG.md

# PianoFlow AI — Final Changelog Summary

## Initial Idea

The product started as a falling-note piano tutorial generator similar to YouTube/Synthesia-style videos.

Initial desired features:

```text
upload music
create falling-note video
change note colors
sync sound with falling notes
control speed slower/faster
```

## Core Product Direction

The product became:

```text
PianoFlow AI
= cloud-based piano learning material generator
```

Core output pack:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
tutorial video stream
notes.json
project history
```

## MVP Direction

MVP is MIDI-first:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF
→ MusicXML
→ falling-note tutorial video
→ beginner mode
```

## Audio → MIDI Update

Audio → MIDI was added as MVP+ / Beta:

```text
legal audio upload
→ rights attestation
→ transcribe_audio job
→ queue.audio
→ audio-worker
→ TranscriptionEngine
→ transcribed_draft.mid
→ transcription_notes.json
→ transcription_confidence.json
→ editable preview
→ reuse sheet/video/beginner pipeline
```

Important wording:

```text
draft MIDI
editable transcription draft
```

Do not claim perfect transcription.

## Social Link Decision

YouTube/TikTok/Instagram links are allowed only as:

```text
metadata
thumbnail/reference
embedded preview where allowed
```

Not allowed:

```text
download audio/video
extract audio
cache platform media
store social media copies
```

## Tutorial Video Download Decision

Tutorial videos are:

```text
streaming-only
private
short-lived signed stream URL
no direct MP4 download
watermarked by plan
```

Downloadable outputs may include:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
```

## MVP Deployment

MVP deploy target:

```text
Vercel frontend
Supabase Auth/Postgres/Storage/RLS
FastAPI backend
Redis queue
Python worker
```

## Long-Term Cloud

Long-term scale target:

```text
AWS S3
AWS SQS
ECS Fargate API
ECS Fargate workers
RDS PostgreSQL
CloudFront
CloudWatch
Secrets Manager
Terraform
```

## Next Step

Claude should implement:

```text
Phase 2 — Monorepo Skeleton
```

Do not jump directly to Audio → MIDI or video rendering.


---

# docs/99_FINAL_MASTER_INDEX.md

# PianoFlow AI — Final Master Index

This is the final merged Markdown documentation pack.

It includes:

1. The latest v3 product docs with Audio → MIDI integrated.
2. The original strategy docs pack.
3. The combined strategy markdown.
4. The original Claude master prompt.
5. The no-tutorial-download policy and Claude update prompt.
6. A final combined markdown file for easy upload to Claude.

## Main Docs To Use Now

Start Claude with these files:

```text
docs/00_INDEX.md
docs/01_PRODUCT_SPEC.md
docs/02_MVP_SCOPE.md
docs/03_SYSTEM_DESIGN.md
docs/04_DATABASE_SCHEMA.md
docs/05_API_SPEC.md
docs/08_DEPLOYMENT_VERCEL_SUPABASE.md
docs/09_AUDIO_TO_MIDI_PLAN.md
docs/12_NO_TUTORIAL_DOWNLOAD_POLICY.md
docs/14_ROADMAP.md
docs/16_IMPLEMENTATION_RULES.md
docs/17_CLAUDE_PHASE_PROMPTS.md
docs/18_CLAUDE_NEXT_STEPS.md
docs/25_AUDIO_TO_MIDI_INTEGRATION_SUMMARY.md
```

## Locked Product Rules

```text
MVP = MIDI-first
Audio → MIDI = MVP+ / Beta / Phase 11
Audio output = editable draft MIDI, not perfect MIDI
Social links = metadata/embed only
No YouTube/TikTok/Instagram audio/video download
Tutorial video = streaming-only, no direct MP4 download
Sheet/PDF/MIDI/MusicXML = downloadable depending on plan
Vercel + Supabase = MVP deployment
AWS = long-term scale
```

## Recommended Next Claude Task

```text
Implement Phase 2 only:
Monorepo skeleton, Docker Compose, CI, health checks.
Do not implement MIDI parsing, video rendering, audio transcription, billing, or social link import yet.
```

## Archive Folder

`archive_previous_versions/` contains older combined docs and prompts for reference.


---

# PianoFlow_AI_FULL_DOCS_COMBINED.md

# PianoFlow AI — Full Claude Development Docs Pack

This file combines all Markdown docs from `/docs`.


---

# docs/00_INDEX.md

# PianoFlow AI — Documentation Index

This `/docs` folder is the planning and execution source of truth for Claude/Codex.

## Product Goal

PianoFlow AI is a cloud-based piano learning material generator.

Core pipeline:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF / MusicXML
→ falling-note tutorial video
→ beginner-friendly versions
→ private project history
```

Future pipeline:

```text
Legal audio upload
→ AI transcription
→ draft MIDI
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
2. Audio → MIDI is MVP+ / Beta, not the first feature.
3. No YouTube/TikTok/Instagram audio/video download in the public app.
4. Tutorial videos are streaming-only by default, not downloadable.
5. Sheet/PDF/MIDI/MusicXML may be downloadable depending on plan.
6. Notes JSON is stored in object storage, not Postgres.
7. API never handles large file bytes.
8. Upload/download/stream uses signed URLs.
9. Queue payloads contain IDs only.
10. Heavy work happens in workers, not HTTP requests.
11. Vercel + Supabase is the MVP stack.
12. AWS is the long-term production scale path.

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

## 3. Main Users

### Piano Beginners

Need:

- easy versions of songs
- visual learning
- slow tempo
- sheet + video together

### Piano Teachers

Need:

- quick student materials
- simplified versions
- private sharing later
- organized project history

### Piano Tutorial Creators

Need:

- falling-note video
- vertical video later
- templates
- branding
- batch export later

### Music Students / Hobbyists

Need:

- MIDI preview
- MusicXML export
- sheet PDF
- practice pack

## 4. MVP Product Promise

MVP promise:

```text
Upload a MIDI file and generate piano learning materials.
```

Do not promise:

```text
Upload any song from YouTube and get perfect sheet music.
```

## 5. MVP Outputs

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

## 6. Future Product Promise

Future promise:

```text
Upload audio you own or have permission to use.
PianoFlow AI creates an editable draft MIDI and learning pack.
```

The word **draft** is important. Audio transcription is not guaranteed perfect.

## 7. Product Differentiation

PianoFlow AI should stand out by combining:

1. MIDI-first reliability.
2. Sheet + video in one workflow.
3. Beginner Mode.
4. Private project history.
5. SaaS cloud architecture.
6. Safe social-link references.
7. Streaming-only tutorial videos.
8. Teacher/student workflow later.
9. Creator templates later.
10. Audio transcription as a paid beta feature later.


---

# docs/02_MVP_SCOPE.md

# PianoFlow AI — MVP Scope

## 1. MVP Goal

Build a working product that proves:

```text
MIDI → piano roll preview → sheet PDF → falling-note tutorial video → beginner version
```

## 2. MVP Feature List

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

### Not in MVP

- Audio → MIDI
- YouTube/TikTok/Instagram media download
- public song library
- payment
- teacher classroom
- public sharing
- 4K render
- mobile app
- full sheet editor

## 3. MVP Stack

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

## 4. MVP User Flow

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

## 5. MVP Acceptance Criteria

- User can upload a valid `.mid`.
- System parses notes correctly enough to preview.
- PDF sheet output is generated.
- MP4 tutorial output is generated.
- Video is not directly downloadable.
- User cannot access another user's project.
- Large files are not stored in Postgres.
- Render jobs do not run inside HTTP requests.


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

## 5. Job Types

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
generate_confidence
```

Later:

```text
render_vertical_video
create_practice_pack
generate_thumbnail
```

## 6. Job Status

```text
queued
processing
completed
failed
cancelled
```

## 7. Idempotency

Each job must be safe to retry.

Rules:

- Use deterministic output paths where possible.
- Check if output already exists before rerendering.
- Update job state atomically.
- Store safe error messages.
- Do not create duplicate output records for retry.

## 8. Settings Snapshot

When a render job is created, copy settings into `settings_snapshot`.

Why:

```text
User changing settings later should not corrupt an already queued job.
```

## 9. Video Rendering

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

## 10. Sheet Rendering

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

## 11. Audio Transcription Later

```text
audio file
→ transcribe_audio job
→ TranscriptionEngine
→ draft MIDI
→ transcription notes JSON
→ confidence JSON
→ user preview/edit
→ existing sheet/video pipeline
```

## 12. Safe Social Link Handling

```text
social URL
→ validate platform
→ fetch metadata only
→ store reference
→ embed player
→ user uploads authorized file
```

No media download.

## 13. Tutorial Video Access

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
  upload_status text default 'pending',
  rights_attestation boolean default false,
  created_at timestamptz default now()
);
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

Output policy:

```text
sheet_pdf: download_allowed=true
music_xml: download_allowed=true
original_midi: download_allowed=true
simplified_midi: download_allowed=true
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
users/{user_id}/projects/{project_id}/analysis/transcription_confidence.json
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
  "upload_url": "https://signed-upload-url",
  "storage_path": "hidden-or-optional"
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

## 6. Audio Upload Later

### POST /api/v1/projects/{project_id}/upload-audio-url

Beta feature.

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

### POST /api/v1/projects/{project_id}/audio-upload-complete

Creates `transcribe_audio` job.

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

### POST /api/v1/projects/{project_id}/jobs/transcribe-audio

Beta feature.

## 8. Preview

### GET /api/v1/projects/{project_id}/piano-roll

Returns normalized notes for preview.

Response:

```json
{
  "duration_seconds": 120,
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
→ notes JSON generated
→ confidence JSON generated
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

## 6. Outputs

```text
transcribed_draft.mid
transcription_notes.json
transcription_confidence.json
transcription_report.json
```

## 7. UI Warnings

Show:

```text
Best for solo piano audio.
AI transcription creates an editable draft.
Results may need correction.
Only upload files you own or have permission to use.
```

## 8. Business Limits

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

## 9. Technical Limits

MVP beta limits:

```text
max audio length: 3 minutes
max file size: 30-50 MB
supported formats: wav, mp3, m4a
timeout: strict
retry: limited
```

## 10. Security

Audio upload requires:

- auth
- rights attestation
- file type validation
- size limit
- private storage
- signed URL
- malware scan later
- lifecycle deletion


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
- 4K is not MVP.
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
- no 4K in MVP
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
- no 4K MVP
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

# PianoFlow_AI_FULL_DOCS_V3_AUDIO_MIDI_COMBINED.md

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
- 4K is not MVP.
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
- no 4K in MVP
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
- no 4K MVP
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


---

# README.md

# PianoFlow AI — Claude Development Docs Pack v3

This pack contains all Markdown planning files needed for Claude to continue developing PianoFlow AI phase by phase.

## v3 Update

Audio → MIDI has been integrated across the docs as an MVP+ / Beta feature.

Important:

- MVP remains MIDI-first.
- Audio → MIDI is Phase 11 / Beta.
- Audio output is called editable draft MIDI.
- Audio upload requires rights attestation.
- Social links are metadata/embed only.
- Tutorial videos are streaming-only and not downloadable by default.

Start with:

```text
docs/00_INDEX.md
docs/17_CLAUDE_PHASE_PROMPTS.md
docs/18_CLAUDE_NEXT_STEPS.md
docs/25_AUDIO_TO_MIDI_INTEGRATION_SUMMARY.md
```
