# PianoFlow AI — Product Strategy

## 1. Positioning

PianoFlow AI is a cloud-based piano learning material generator.

It turns MIDI or legally uploaded audio into:

- Sheet music PDF
- MusicXML
- MIDI
- Falling-note piano tutorial video
- Beginner-friendly simplified versions
- Project history
- Downloadable practice packs

The product is not positioned as only an audio transcription tool. It is positioned as a complete learning-material generator for piano students, teachers, and tutorial creators.

## 2. Core Product Statement

> PianoFlow AI helps users turn a music source into a complete piano learning pack: sheet music, tutorial video, MIDI, MusicXML, and simplified beginner versions.

## 3. What We Are

PianoFlow AI is:

- MIDI-first in the MVP
- Learning-first, not transcription-first
- Cloud-based
- Private-by-default
- Built for scalable media jobs
- Designed for future audio transcription
- Designed for safe social-link metadata/reference support

## 4. What We Are Not

PianoFlow AI is not:

- A YouTube ripping tool
- A TikTok/Instagram audio downloader
- A public copyrighted song library
- A promise of perfect AI transcription
- A full DAW
- A full MuseScore replacement
- A replacement for professional arrangers
- A public file-sharing platform

## 5. Target Users

### 5.1 Piano Beginners

Needs:

- Easy versions of songs
- Visual falling-note videos
- Sheet PDF
- Slower tempo
- Simple practice material

Pain points:

- Original sheet is often too hard
- YouTube tutorials are not downloadable as practice packs
- MIDI files are hard to understand without visual tools

### 5.2 Piano Teachers

Needs:

- Create simplified versions for students
- Export PDF and video
- Share private practice material
- Organize student projects later

Pain points:

- Manually arranging songs takes time
- Students need multiple formats: sheet, video, MIDI

### 5.3 Piano Tutorial Creators

Needs:

- Falling-note videos
- Vertical video export later
- Brandable visual templates
- Fast render workflow
- Batch export later

Pain points:

- Existing video visualizers may not include sheet and beginner versions
- Manual workflow across multiple tools is slow

### 5.4 Music Students and Hobbyists

Needs:

- MIDI preview
- Sheet export
- Practice versions
- Project history

## 6. Product Wedge

Start with the most reliable source:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF
→ tutorial video
→ beginner mode
```

Then expand:

```text
User-uploaded audio
→ draft MIDI
→ editable preview
→ sheet/video generation
```

Then add safe social reference:

```text
Social link
→ metadata
→ embedded player/reference
→ user uploads authorized MIDI/audio
→ normal processing pipeline
```

## 7. Why MIDI-First Is the Best MVP

MIDI already contains symbolic note data:

- note number
- start time
- end time
- velocity
- track
- tempo

This makes it reliable for:

- piano roll preview
- falling-note video
- sheet generation
- beginner simplification

Audio transcription is much harder and should come later.

## 8. Main Differentiation

Competitors often focus on one area:

- Audio to sheet
- MIDI to video
- Practice app

PianoFlow AI combines:

```text
MIDI/draft source
→ sheet
→ MusicXML
→ MIDI
→ tutorial video
→ beginner version
→ practice pack
```

## 9. Strategic Product Principles

1. Do not overpromise transcription accuracy.
2. Always provide editable/previewable intermediate results.
3. Keep user outputs private by default.
4. Build source ingestion safely.
5. Keep the cloud architecture scalable from the beginning.
6. Treat rendering/transcription as background jobs.
7. Keep cost limits strict.
8. Prioritize beginner value over perfect notation.
9. Make the demo visually impressive.
10. Make the codebase portfolio-quality.

## 10. Long-Term Vision

Long-term, PianoFlow AI can become a learning workflow platform:

```text
Source
→ transcription or MIDI parse
→ correction/editing
→ simplification
→ sheet/video/MIDI export
→ teacher/student sharing
→ practice analytics
```

The product becomes defensible when it learns from user corrections and simplification preferences over time.
