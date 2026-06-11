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
