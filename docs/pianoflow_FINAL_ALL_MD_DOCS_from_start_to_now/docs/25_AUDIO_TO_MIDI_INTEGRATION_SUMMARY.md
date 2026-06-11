# PianoFlow AI — Audio → MIDI Integration Summary

## 1. Final Decision

Audio → MIDI is included in the product plan as **MVP+ / Beta**.

It is not part of the first MVP.

## 2. Why

MIDI-first gives:

- faster MVP
- more reliable output
- easier video rendering
- easier sheet generation
- less cost
- less legal/platform risk

Audio → MIDI adds:

- stronger product value
- stronger competitive positioning against transcription tools
- paid feature potential
- creator/teacher value

## 3. Correct Product Wording

Use:

```text
Audio upload → editable draft MIDI
```

Avoid:

```text
perfect MIDI
accurate sheet from any song
YouTube to MIDI
```

## 4. System Additions

```text
queue.audio
audio-worker
TranscriptionEngine
transcribe_audio job
transcription confidence report
draft MIDI output
```

## 5. Database Additions

```text
projects.draft_midi_path
projects.transcription_notes_json_path
projects.transcription_confidence_json_path
projects.transcription_report_json_path
projects.transcription_status

uploaded_files.file_type = audio
uploaded_files.rights_attestation = true

render_jobs.job_type = transcribe_audio
render_jobs.queue_name = queue.audio

output_files.output_type = transcribed_draft_midi
output_files.output_type = transcription_notes_json
output_files.output_type = transcription_confidence_json
output_files.output_type = transcription_report_json
```

## 6. API Additions

```text
POST /api/v1/projects/{project_id}/upload-audio-url
POST /api/v1/projects/{project_id}/audio-upload-complete
POST /api/v1/projects/{project_id}/jobs/transcribe-audio
GET  /api/v1/projects/{project_id}/transcription
```

## 7. UI Additions

Add Audio Upload Beta tab later.

Required copy:

```text
Audio transcription works best with clean solo piano recordings.
The generated MIDI is an editable draft and may need correction.
Only upload audio that you own or have permission to use.
```

## 8. Business Additions

Audio transcription should be usage-limited:

```text
Free: none or 30-second preview
Starter: 5-10 minutes/month
Creator: 60 minutes/month
Teacher: 200 minutes/month
Enterprise: custom
```

## 9. Security Additions

Audio upload requires:

- rights attestation
- private storage
- signed upload URL
- file size limit
- duration limit
- plan limit
- no social media download
- no public sharing

## 10. Roadmap Position

Audio → MIDI starts at:

```text
Phase 11 — Audio Upload + Draft MIDI
```

Only after:

```text
MIDI upload
sheet generation
tutorial video streaming
beginner mode
auth/project history
usage limits
```

are stable.
