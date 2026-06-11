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
