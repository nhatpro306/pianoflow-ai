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
