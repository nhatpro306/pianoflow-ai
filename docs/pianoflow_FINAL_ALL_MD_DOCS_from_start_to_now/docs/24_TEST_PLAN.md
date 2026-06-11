# PianoFlow AI — Test Plan

## 1. Unit Tests

### music-core

- parse simple MIDI
- parse chords
- reject invalid MIDI
- calculate duration
- normalize notes
- simplify notes
- generate timeline

### API

- auth required
- project ownership
- create project
- signed upload URL validation
- job creation
- output policy

### Worker

- parse_midi handler
- render_sheet handler later
- render_video handler later
- retry logic
- failure handling

## 2. Integration Tests

- upload MIDI → parse job → notes JSON
- render sheet → output_files record
- render video → streaming-only output
- download-url rejects video
- stream-url works for owner
- non-owner cannot access output

## 3. RLS Tests

- user A cannot read user B projects
- user A cannot read user B files
- storage policy blocks cross-user access

## 4. Performance Tests

- long MIDI file
- high note count
- concurrent jobs
- queue backlog

## 5. Security Tests

- invalid file type
- large file
- path traversal filename
- missing auth
- expired signed URL
- raw storage path not returned

## 6. Fixtures

```text
simple_scale.mid
chords.mid
left_right.mid
long_song.mid
invalid.mid
short_piano.wav later
```
