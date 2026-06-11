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
