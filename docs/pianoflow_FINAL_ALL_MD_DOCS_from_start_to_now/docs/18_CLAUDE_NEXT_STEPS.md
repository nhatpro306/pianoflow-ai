# PianoFlow AI — Claude Next Steps

## Current Goal

Use this docs pack to continue development phase by phase.

## Status (updated 2026-06-12)

Implemented and verified:

```text
Phase 2 — monorepo skeleton, docker compose (web/api/worker/postgres/redis)
Phase 3 — projects CRUD, dev auth, uploaded_files
Phase 4 — 2-phase MIDI upload + parse_midi worker + notes JSON in storage
Phase 5 — sheet generation (MusicXML + simple PDF fallback), output_files,
          render_sheet job + outputs listing
Phase 6 — minimal tutorial video streaming: render_video job, falling-note
          frame renderer, FluidSynth audio, FFmpeg H.264/AAC mux, private
          video_mp4 output metadata, stream-url access, no MP4 download
Phase 11 (Beta slice) — audio upload with rights attestation,
          transcribe_audio job on q_audio, TranscriptionEngine adapter with
          deterministic placeholder engine, draft MIDI + notes/confidence/
          report JSON outputs, GET /transcription endpoint
Output policy — GET outputs is metadata-only; POST download-url (PDF/MIDI/
          MusicXML only) and POST stream-url (video only) endpoints
```

Not yet implemented: beginner mode (Phase 7), usage limits table (Phase 8),
Supabase auth (Phase 9), real transcription model, billing.

## Immediate Next Step

```text
Phase 7 — Beginner Mode
```

## Phase 2 Acceptance Criteria

After Claude implements Phase 2:

```bash
docker compose up --build
```

Should start:

- web
- api
- worker
- postgres
- redis

These should work:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

## What Claude Must Not Do in Phase 2

- no MIDI parsing
- no real upload flow
- no video rendering
- no sheet generation
- no audio transcription
- no social link import
- no billing
- no auth logic beyond placeholder

## After Phase 2

Move to:

```text
Phase 3 — Auth + Project Dashboard
```

Then:

```text
Phase 4 — MIDI Upload + Parse
```

Then:

```text
Phase 5 — Sheet Generation
```

Then:

```text
Phase 6 — Tutorial Video Streaming
```

## Claude Final Response Format After Each Phase

Claude should summarize:

1. Files created/changed
2. Commands to run
3. What works now
4. What is intentionally not implemented
5. Next phase
6. Known risks

## Future Audio → MIDI Reminder

Do not start Audio → MIDI until:

```text
Phase 4 MIDI Upload + Parse
Phase 5 Sheet Generation
Phase 6 Tutorial Video Streaming
Phase 7 Beginner Mode
Phase 8 Usage Limits
```

are stable.

Audio → MIDI belongs to Phase 11.
