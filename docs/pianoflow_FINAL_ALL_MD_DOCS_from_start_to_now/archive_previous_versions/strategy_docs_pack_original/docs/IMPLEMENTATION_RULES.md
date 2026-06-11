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
