# PianoFlow AI — Audio to MIDI Plan

## 1. Feature Position

Audio → MIDI is not the first MVP feature.

It is:

```text
MVP+ / Beta
```

Core MVP remains:

```text
MIDI → sheet/video/beginner
```

## 2. Product Promise

Use this wording:

```text
AI creates an editable draft MIDI from your uploaded audio.
```

Do not say:

```text
Perfect MIDI from any song.
```

## 3. Audio Flow

```text
User uploads legal audio
→ rights attestation
→ signed upload URL
→ audio stored privately
→ transcribe_audio job created
→ audio-worker processes file
→ draft MIDI generated
→ transcription_notes.json generated
→ transcription_confidence.json generated
→ transcription_report.json generated
→ user previews/edits draft
→ existing sheet/video pipeline
```

## 4. Best Initial Scope

Start with:

```text
solo piano audio
short clips
clean recording
max 3 minutes
```

Avoid first:

```text
full band songs
vocals + drums + guitar
low-quality live recording
copyrighted social media links
audio too long
```

## 5. Engine Adapter

Create:

```text
TranscriptionEngine
```

Possible implementations:

```text
BasicPitchEngine
OmnizartEngine
MT3Engine
ExternalAPIEngine
```

Claude should not hardcode the first engine into product logic.

### Implemented status (2026-06-12)

The Beta ships with `PlaceholderDeterministicEngine`
(`packages/music-core/pianoflow_music/transcription/`). It is **not real
AI transcription** — it deterministically derives a simple draft MIDI from
the audio bytes so the full pipeline (upload → queue → worker → outputs →
preview) is testable end-to-end. A real engine (e.g. Basic Pitch) plugs in
behind the same `TranscriptionEngine` interface without touching API routes.

## 6. TranscriptionEngine Interface

```text
transcribe_audio_to_draft_midi(
  input_audio_path,
  output_dir,
  options
) -> TranscriptionResult
```

`TranscriptionResult`:

```json
{
  "draft_midi_path": "outputs/transcribed_draft.mid",
  "notes_json_path": "analysis/transcription_notes.json",
  "confidence_json_path": "analysis/transcription_confidence.json",
  "report_json_path": "analysis/transcription_report.json",
  "duration_seconds": 120,
  "engine": "default",
  "status": "completed"
}
```

## 7. Outputs

```text
transcribed_draft.mid
transcription_notes.json
transcription_confidence.json
transcription_report.json
```

## 8. Confidence JSON

Example:

```json
{
  "overall_confidence": 0.72,
  "pitch_confidence": 0.79,
  "timing_confidence": 0.68,
  "tempo_confidence": 0.74,
  "warnings": [
    "Dense chord section may need correction.",
    "Audio may contain non-piano sounds."
  ]
}
```

## 9. UI Warnings

Show:

```text
Best for solo piano audio.
AI transcription creates an editable draft.
Results may need correction.
Only upload files you own or have permission to use.
```

## 10. Business Limits

Free:

```text
no audio transcription or 30-second preview only
```

Starter:

```text
limited transcription minutes
```

Creator:

```text
more transcription minutes
priority queue
```

Teacher:

```text
larger quota
student workflow later
```

## 11. Technical Limits

MVP beta limits:

```text
max audio length: 3 minutes
max file size: 30-50 MB
supported formats: wav, mp3, m4a
timeout: strict
retry: limited
queue: queue.audio
worker: audio-worker
```

## 12. Security

Audio upload requires:

- auth
- rights attestation
- file type validation
- size limit
- duration limit
- private storage
- signed URL
- malware scan later
- lifecycle deletion

## 13. Roadmap

```text
Phase 11.1: audio upload only
Phase 11.2: TranscriptionEngine interface
Phase 11.3: one experimental engine
Phase 11.4: draft MIDI output
Phase 11.5: confidence report
Phase 11.6: editable preview
Phase 11.7: paid transcription quota
```

## 14. Claude Implementation Rule

Claude must not implement Audio → MIDI before:

```text
MIDI upload
parse_midi
sheet generation
tutorial video streaming
beginner mode
auth/project history
usage limits
```

are stable.
