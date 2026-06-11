# PianoFlow AI — Documentation Index

This `/docs` folder is the planning and execution source of truth for Claude/Codex.

## Product Goal

PianoFlow AI is a cloud-based piano learning material generator.

Core MVP pipeline:

```text
MIDI upload
→ parse notes
→ piano roll preview
→ sheet PDF / MusicXML
→ falling-note tutorial video
→ beginner-friendly versions
→ private project history
```

MVP+ / Beta pipeline:

```text
Legal audio upload
→ AI transcription
→ draft MIDI
→ transcription notes JSON
→ confidence JSON
→ editable preview
→ existing sheet/video/beginner pipeline
```

Safe social-link support:

```text
YouTube / TikTok / Instagram link
→ metadata + embedded preview only
→ user uploads authorized MIDI/audio
→ processing pipeline
```

## Important Locked Decisions

1. MVP is MIDI-first.
2. Audio → MIDI is MVP+ / Beta, not Phase 1.
3. Audio transcription output must be called **draft MIDI**, not perfect MIDI.
4. Audio upload requires rights attestation.
5. No YouTube/TikTok/Instagram audio/video download in the public app.
6. Tutorial videos are streaming-only by default, not downloadable.
7. Sheet/PDF/MIDI/MusicXML may be downloadable depending on plan.
8. Notes JSON is stored in object storage, not Postgres.
9. Audio files, draft MIDI, confidence JSON, and transcription notes JSON are stored in object storage.
10. API never handles large file bytes.
11. Upload/download/stream uses signed URLs.
12. Queue payloads contain IDs only.
13. Heavy work happens in workers, not HTTP requests.
14. Vercel + Supabase is the MVP stack.
15. AWS is the long-term production scale path.

## Recommended Reading Order for Claude

1. `01_PRODUCT_SPEC.md`
2. `02_MVP_SCOPE.md`
3. `03_SYSTEM_DESIGN.md`
4. `04_DATABASE_SCHEMA.md`
5. `05_API_SPEC.md`
6. `06_UI_UX_SPEC.md`
7. `07_CODE_ARCHITECTURE.md`
8. `08_DEPLOYMENT_VERCEL_SUPABASE.md`
9. `09_AUDIO_TO_MIDI_PLAN.md`
10. `10_MULTI_SOURCE_IMPORT.md`
11. `11_SECURITY_COMPLIANCE.md`
12. `12_NO_TUTORIAL_DOWNLOAD_POLICY.md`
13. `13_BUSINESS_MODEL.md`
14. `14_ROADMAP.md`
15. `15_CLOUD_SCALE_PLAN.md`
16. `16_IMPLEMENTATION_RULES.md`
17. `17_CLAUDE_PHASE_PROMPTS.md`
18. `18_CLAUDE_NEXT_STEPS.md`

## What Claude Should Do First

Implement **Phase 2 only**:

```text
Monorepo skeleton
Docker Compose
CI
health checks
placeholder modules
```

Do not implement MIDI parsing, video rendering, audio transcription, billing, or social link import in Phase 2.
