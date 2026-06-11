# PianoFlow AI — Claude Next Steps

## Current Status

Design documentation is complete.

Additional strategy documentation is now defined:

```text
STRATEGY.md
COMPETITIVE_POSITIONING.md
BUSINESS_MODEL.md
MULTI_SOURCE_IMPORT.md
REAL_PRODUCT_ROADMAP.md
SECURITY_COMPLIANCE.md
CLOUD_SCALE_PLAN.md
IMPLEMENTATION_RULES.md
CLAUDE_NEXT_STEPS.md
```

## Locked Decisions

Keep these locked:

1. MIDI-first MVP.
2. Notes JSON in object storage, not database.
3. Database stores metadata and analysis summary.
4. Queue payloads contain IDs only.
5. Settings snapshot per job.
6. Direct-to-storage signed upload URLs.
7. API never handles large file bytes.
8. Frames stream to FFmpeg stdin.
9. MuseScore primary, LilyPond fallback.
10. Adapter boundaries for storage/queue/sheet engraver.
11. Outputs private by default.
12. No YouTube/TikTok/Instagram audio/video download.

## Next Implementation Phase

The next implementation phase is:

```text
Phase 2 — Monorepo Skeleton, Docker Compose, CI
```

## Exact Prompt for Claude

```text
Implement Phase 2 only.

Create the monorepo skeleton for PianoFlow AI.

Create:
- apps/web
- apps/api
- apps/worker
- packages/music-core
- packages/shared-types
- infra/docker
- infra/terraform
- infra/supabase
- infra/aws
- docker-compose.yml
- .env.example
- .gitignore
- .github/workflows/ci.yml
- README.md

Requirements:
- Next.js + TypeScript + Tailwind skeleton in apps/web
- FastAPI skeleton in apps/api
- Worker skeleton in apps/worker
- music-core placeholder package
- shared-types placeholder package
- Docker Compose with web, api, worker, postgres, redis
- API health endpoints:
  GET /health
  GET /api/v1/health
- Worker logs "PianoFlow worker started"
- Basic tests/smoke tests
- CI runs install/build/test where configured

Do not implement:
- MIDI parsing
- video rendering
- sheet generation
- real upload flow
- audio transcription
- YouTube/TikTok/Instagram import
- billing
- auth

Only create skeleton, config, health checks, placeholder modules, and CI.
```

## Phase 2 Acceptance Criteria

These should work:

```bash
docker compose up --build
```

URLs:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

CI should run basic checks.

## Phase 3 Preview

After Phase 2, implement:

```text
Phase 3 — MIDI upload and parse_midi job skeleton
```

Phase 3 includes:

- project creation
- signed upload URL endpoint
- storage adapter interface
- local storage adapter
- upload complete endpoint
- parse_midi job
- notes JSON schema
- analysis_summary update
- basic piano roll preview data

Phase 3 does not include:

- video rendering
- sheet generation
- beginner mode
- audio transcription
- social link import

## Claude Behavior Rules

When implementing:

1. Follow docs.
2. Do not skip architecture boundaries.
3. Do not add unplanned features.
4. Keep each phase small.
5. Summarize files changed.
6. Explain how to run.
7. Explain what is intentionally not implemented.
8. Stop after the requested phase.
