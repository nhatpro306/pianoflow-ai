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
