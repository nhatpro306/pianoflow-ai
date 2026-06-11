# PianoFlow AI — Product Specification

## 1. Product Positioning

PianoFlow AI is a cloud-based piano learning material generator.

It is not just:

```text
audio transcription
MIDI visualizer
practice game
```

It is:

```text
one source → complete piano learning pack
```

## 2. Core Value Proposition

Instead of giving users only a sheet, PianoFlow AI gives a complete learning pack:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
notes.json
tutorial video stream
beginner-friendly version
project history
```

Future Audio → MIDI adds:

```text
uploaded audio
→ AI draft MIDI
→ editable notes preview
→ same learning pack pipeline
```

## 3. Main Users

### Piano Beginners

Need:

- easy versions of songs
- visual learning
- slow tempo
- sheet + video together
- future: convert their own recordings to draft MIDI

### Piano Teachers

Need:

- quick student materials
- simplified versions
- private sharing later
- organized project history
- future: turn student recordings into draft MIDI for correction

### Piano Tutorial Creators

Need:

- falling-note video
- vertical video later
- templates
- branding
- batch export later
- future: audio demo → draft MIDI → content pack

### Music Students / Hobbyists

Need:

- MIDI preview
- MusicXML export
- sheet PDF
- practice pack
- future: audio upload for transcription experiments

## 4. MVP Product Promise

MVP promise:

```text
Upload a MIDI file and generate piano learning materials.
```

Do not promise:

```text
Upload any song from YouTube and get perfect sheet music.
```

## 5. MVP+ Product Promise

MVP+ / Beta promise:

```text
Upload an audio file you own or have permission to use.
PianoFlow AI creates an editable draft MIDI and learning pack.
```

Do not promise:

```text
Perfect MIDI from any audio.
```

Correct wording:

```text
AI transcription draft
editable draft MIDI
transcription preview
confidence report
```

## 6. MVP Outputs

Downloadable depending on plan:

```text
sheet.pdf
score.musicxml
original.mid
simplified.mid
```

Streaming-only by default:

```text
tutorial.mp4
vertical_tutorial.mp4 later
```

## 7. Audio → MIDI Outputs

When audio transcription is enabled:

```text
transcribed_draft.mid
transcription_notes.json
transcription_confidence.json
transcription_report.json
```

These are stored in object storage.

Postgres stores only paths and metadata.

## 8. What The Product Should Not Do

PianoFlow AI should not be:

- a YouTube downloader
- a TikTok audio extractor
- an Instagram audio/video scraper
- a public copyrighted song library
- a tool that promises perfect transcription
- a full DAW
- a full notation editor like MuseScore
- a full practice game like Synthesia

## 9. Product Differentiation

PianoFlow AI should stand out by combining:

1. MIDI-first reliability.
2. Future Audio → MIDI as editable draft, not fake perfection.
3. Sheet + video in one workflow.
4. Beginner Mode.
5. Private project history.
6. SaaS cloud architecture.
7. Safe social-link references.
8. Streaming-only tutorial videos.
9. Teacher/student workflow later.
10. Creator templates later.
