# PianoFlow AI — Final Master Index

This is the final merged Markdown documentation pack.

It includes:

1. The latest v3 product docs with Audio → MIDI integrated.
2. The original strategy docs pack.
3. The combined strategy markdown.
4. The original Claude master prompt.
5. The no-tutorial-download policy and Claude update prompt.
6. A final combined markdown file for easy upload to Claude.

## Main Docs To Use Now

Start Claude with these files:

```text
docs/00_INDEX.md
docs/01_PRODUCT_SPEC.md
docs/02_MVP_SCOPE.md
docs/03_SYSTEM_DESIGN.md
docs/04_DATABASE_SCHEMA.md
docs/05_API_SPEC.md
docs/08_DEPLOYMENT_VERCEL_SUPABASE.md
docs/09_AUDIO_TO_MIDI_PLAN.md
docs/12_NO_TUTORIAL_DOWNLOAD_POLICY.md
docs/14_ROADMAP.md
docs/16_IMPLEMENTATION_RULES.md
docs/17_CLAUDE_PHASE_PROMPTS.md
docs/18_CLAUDE_NEXT_STEPS.md
docs/25_AUDIO_TO_MIDI_INTEGRATION_SUMMARY.md
```

## Locked Product Rules

```text
MVP = MIDI-first
Audio → MIDI = MVP+ / Beta / Phase 11
Audio output = editable draft MIDI, not perfect MIDI
Social links = metadata/embed only
No YouTube/TikTok/Instagram audio/video download
Tutorial video = streaming-only, no direct MP4 download
Sheet/PDF/MIDI/MusicXML = downloadable depending on plan
Vercel + Supabase = MVP deployment
AWS = long-term scale
```

## Recommended Next Claude Task

```text
Implement Phase 2 only:
Monorepo skeleton, Docker Compose, CI, health checks.
Do not implement MIDI parsing, video rendering, audio transcription, billing, or social link import yet.
```

## Archive Folder

`archive_previous_versions/` contains older combined docs and prompts for reference.
