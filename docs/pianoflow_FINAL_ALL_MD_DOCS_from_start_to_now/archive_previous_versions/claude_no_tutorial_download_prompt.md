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
