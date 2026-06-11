# PianoFlow AI — Implementation Rules

## 1. Do

- Keep API thin.
- Run heavy tasks in workers.
- Store large files in object storage.
- Store metadata in Postgres.
- Use adapters.
- Use signed URLs.
- Use RLS.
- Use private buckets.
- Use settings snapshots.
- Use thin queue payloads.
- Make jobs idempotent.
- Enforce usage limits.
- Keep tutorial videos streaming-only.
- Use feature flags for risky features.

## 2. Do Not

- Do not render video in HTTP request.
- Do not store MP4/PDF/MIDI blobs in DB.
- Do not store full notes JSON in DB.
- Do not put file bytes in queue.
- Do not trust user filenames.
- Do not expose public storage URLs.
- Do not expose raw storage paths to frontend.
- Do not implement YouTube/TikTok/Instagram download.
- Do not allow tutorial MP4 download by default.
- Do not build audio transcription before MIDI pipeline is stable.
- Do not skip auth/RLS tests.
- Do not hardcode secrets.

## 3. Code Review Checklist

- Is ownership checked?
- Is the endpoint thin?
- Is there an adapter boundary?
- Is the job idempotent?
- Are outputs private?
- Are signed URLs short-lived?
- Are tests added?
- Are migrations added?
- Is there cost abuse risk?
- Is there copyright/platform risk?
- Does this break no-video-download policy?

## 4. Phase Discipline

Claude must not jump phases.

If Phase 2 is requested, only implement skeleton.

If Phase 3 is requested, only implement MIDI upload/parse skeleton.

Video comes later.

Audio comes later.

Billing comes later.

## Audio → MIDI Implementation Rules

Do:

- call result `draft MIDI`
- require rights attestation
- use queue.audio
- use audio-worker
- use TranscriptionEngine adapter
- store audio/draft MIDI/confidence JSON in object storage
- enforce transcription minute limits

Do not:

- call transcription perfect
- run transcription in API
- download audio from social links
- allow unlimited free transcription
- hardcode one transcription model into product logic
