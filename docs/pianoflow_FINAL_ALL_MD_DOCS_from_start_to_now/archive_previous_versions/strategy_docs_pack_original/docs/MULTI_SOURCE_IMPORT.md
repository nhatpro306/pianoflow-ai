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
