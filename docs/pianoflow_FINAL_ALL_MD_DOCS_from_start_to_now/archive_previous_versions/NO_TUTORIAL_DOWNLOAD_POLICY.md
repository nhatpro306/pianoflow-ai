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
