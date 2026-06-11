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
