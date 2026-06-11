# PianoFlow AI — Business Model and Subscription Strategy

## 1. Business Model Summary

PianoFlow AI should use a hybrid model:

```text
Freemium
+ Monthly subscription
+ Pay-per-song
+ Teacher/studio plans
+ Enterprise/API later
```

The main cost drivers are:

- video rendering minutes
- audio transcription minutes later
- storage
- worker compute
- database
- queue
- bandwidth

Therefore, pricing must be based on:

- number of projects
- render minutes
- output quality
- storage duration
- priority queue
- transcription minutes
- team/student features

## 2. Pricing Tiers

### 2.1 Free Plan

Purpose:

- let users test the product
- generate leads
- keep cost low

Limits:

```text
3 MIDI projects/month
30-second preview render
720p watermarked video
basic sheet preview
limited PDF export or watermark
no audio transcription
no batch export
outputs deleted after 7-14 days
```

Good for:

- first-time users
- portfolio demo users
- casual hobbyists

### 2.2 Starter / Plus Plan

Suggested price:

```text
$9–12/month
```

Features:

```text
20 MIDI projects/month
Full PDF export
MusicXML export
MIDI export
720p and 1080p render
Basic beginner mode
No watermark or small watermark
Project history
Storage for 30-60 days
```

Good for:

- hobbyists
- piano beginners
- music students

### 2.3 Creator / Pro Plan

Suggested price:

```text
$19–29/month
```

Features:

```text
100 MIDI projects/month
More render minutes
1080p export
Vertical Shorts/TikTok format
No watermark
Priority queue
More storage
Batch export
Render templates
Thumbnail generator later
Audio upload beta later
```

Good for:

- YouTube/TikTok tutorial creators
- advanced hobbyists
- teachers with a few students

### 2.4 Teacher / Studio Plan

Suggested price:

```text
$49–99/month
```

Features:

```text
student folders
private share links
classroom dashboard
team seats
higher render limits
brandable videos
longer storage retention
lesson pack templates
```

Good for:

- piano teachers
- small music schools
- studios

### 2.5 Pay-Per-Song

Purpose:

- capture users who hate subscriptions
- monetize one-time needs

Example:

```text
$2–5 per full export pack
```

Includes:

```text
PDF
MusicXML
MIDI
MP4 tutorial video
simplified version
```

### 2.6 Enterprise / API

Suggested:

```text
custom pricing
```

Features:

```text
bulk processing
API access
custom render limits
school/studio licensing
SLA
dedicated support
private deployment option
```

## 3. Usage Limits

Recommended limits:

| Plan | Projects | Max Video Length | Resolution | Audio Transcription | Storage |
|---|---:|---:|---|---|---|
| Free | 3/month | 30 sec preview | 720p watermark | No | 7-14 days |
| Starter | 20/month | 5 min | 1080p | No or limited later | 30-60 days |
| Creator | 100/month | 10 min | 1080p + vertical | Beta/limited | 180 days |
| Teacher | 300+/month | 10-15 min | 1080p | More later | 1 year |
| Enterprise | custom | custom | custom | custom | custom |

## 4. Cost Model Assumptions

These are rough planning assumptions, not guaranteed production prices.

### 4.1 Video Render Cost

Assumption:

```text
1080p render cost: $0.01–0.05 per video minute
```

For a 5-minute video:

```text
$0.05–0.25
```

For a 10-minute video:

```text
$0.10–0.50
```

### 4.2 Storage Cost

Estimated output size:

```text
Sheet PDF: <5 MB
MusicXML: <1 MB
MIDI: <1 MB
Notes JSON: 0.1–5 MB
MP4 1080p: 50–250 MB depending on length/bitrate
```

Storage is usually less expensive than compute, but free users can abuse it. Use lifecycle rules.

### 4.3 Database Cost

Database stores metadata only:

```text
projects
jobs
settings
output paths
analysis summary
usage
billing
```

Do not store:

```text
MP4
PDF
MIDI blob
full notes JSON
audio blob
```

### 4.4 Queue Cost

Queue payloads are IDs only, so queue cost should stay low.

### 4.5 Audio Transcription Cost Later

Audio transcription is much more expensive than MIDI processing.

Pricing must separate:

```text
MIDI render credits
audio transcription credits
```

## 5. Margin Strategy

Rules:

1. Free tier must be capped.
2. Preview render should be short.
3. Full render should require paid plan or credits.
4. 4K should not be in MVP.
5. Audio transcription should be paid or credit-based.
6. Priority queue should be paid.
7. Storage retention should depend on plan.
8. Old outputs should be cleaned automatically.

## 6. Break-Even Example

Assume:

```text
Fixed monthly cost: $300
Average paid user revenue: $12/month
Average variable cost per paid user: $1.50/month
Gross margin per paid user: $10.50/month
```

Break-even:

```text
$300 / $10.50 ≈ 29 paying users
```

If fixed cost is $1000/month:

```text
$1000 / $10.50 ≈ 96 paying users
```

## 7. LTV/CAC

Target:

```text
LTV:CAC >= 3:1
```

Example:

```text
ARPU: $12/month
Gross margin: 85%
Monthly churn: 5%
LTV ≈ $12 * 0.85 / 0.05 = $204
Target CAC <= $68
```

## 8. Growth Strategy

### 8.1 SEO

Create content:

- MIDI to piano tutorial video
- MIDI to sheet music
- piano falling notes generator
- beginner piano arrangement generator
- MIDI to MusicXML
- piano tutorial video maker

### 8.2 Creator Outreach

Target:

- small YouTube piano tutorial creators
- TikTok piano accounts
- piano teachers on Instagram
- music students

Offer:

- free credits
- branded templates
- creator showcase

### 8.3 Teacher Workflow

Teachers are sticky because they create repeat projects.

Later features:

- student folders
- assignment links
- lesson packs
- private sharing

### 8.4 Community

Offer public-domain demo library:

```text
Bach
Mozart
Beethoven
simple exercises
```

Avoid copyrighted popular songs in public library.

## 9. Revenue Milestones

### MVP

Goal:

```text
validate that users want MIDI → sheet + video
```

No payment required yet.

### Beta

Goal:

```text
add free limits and email capture
```

### Paid Beta

Goal:

```text
Stripe + credits + pay-per-song
```

### SaaS v1

Goal:

```text
subscriptions + project history + render limits
```

### Real Product

Goal:

```text
teacher/studio plans + multi-source safe references + audio transcription beta
```
