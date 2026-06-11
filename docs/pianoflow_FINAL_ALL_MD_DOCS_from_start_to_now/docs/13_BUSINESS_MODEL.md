# PianoFlow AI — Business Model

## 1. Revenue Model

Use:

```text
Freemium
+ subscription
+ pay-per-song
+ render/transcription credits
+ teacher/studio plan
+ enterprise/API later
```

## 2. Pricing Tiers

### Free

- 3 MIDI projects/month
- 30-second video preview
- visible watermark
- streaming-only video
- limited PDF export
- no audio transcription or 30-second preview only
- short storage retention

### Starter

Target: hobbyist / beginner.

- more MIDI projects
- full sheet export
- full video streaming
- basic beginner mode
- no direct video download
- limited storage

### Creator

Target: tutorial creators.

- more render minutes
- priority queue
- vertical format later
- no visible watermark later
- templates later
- batch export later
- audio transcription quota later

### Teacher / Studio

Target: teachers and schools.

- student folders later
- private student view links
- higher render quota
- shared classroom dashboard later
- custom watermark
- longer storage retention

### Pay-Per-Song

For users who do not want subscription.

### Enterprise/API

For studios, schools, apps, or bulk processing.

## 3. Cost Drivers

```text
video rendering
audio transcription
storage
bandwidth
database
queue
worker compute
```

## 4. Margin Rules

- Free users get preview limits.
- Audio transcription is paid or credit-based.
- Full-length video costs credits or paid plan.
- higher-than-1080p is not MVP.
- Long storage retention is paid.
- Priority queue is paid.
- Old outputs are cleaned up.

## 5. Tutorial Video Monetization

Because tutorial videos are streaming-only, subscriptions retain value:

```text
users return to the app to watch lessons
teachers share view-only links
creators manage projects inside app
```

Optional future add-on:

```text
Video Export License
```

Do not include in MVP.

## 6. Example Limits

| Plan | MIDI projects | Video | Audio transcription | Storage |
|---|---:|---|---|---|
| Free | 3/month | 30s preview | none / 30s preview | 7-14 days |
| Starter | 20/month | full streaming | limited later | 30-60 days |
| Creator | 100/month | priority streaming | more later | 180 days |
| Teacher | 300+/month | student streaming | high quota | 1 year |

## 7. Growth Channels

- SEO: MIDI to sheet, MIDI to piano tutorial, falling notes generator
- YouTube demos
- TikTok piano creator outreach
- piano teacher outreach
- public-domain demo songs
- GitHub technical write-up
- student/teacher communities

## Audio → MIDI Pricing Update

Audio transcription is more expensive than MIDI parsing.

Recommended limits:

```text
Free: no audio transcription or 30-second preview only
Starter: 5-10 transcription minutes/month
Creator: 60 transcription minutes/month
Teacher: 200 transcription minutes/month
Enterprise: custom
```

Audio transcription should use credits:

```text
1 minute audio transcription = X credits
```

Do not offer unlimited audio transcription on cheap plans.
