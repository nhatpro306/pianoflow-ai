# PianoFlow AI — README Plan

> This file specifies what the **root `README.md`** will contain once code exists. The README is the portfolio's front door — recruiters and engineers may read nothing else. It is written for two audiences at once: (1) a user who wants to try the product, (2) an engineer evaluating the author's cloud/architecture skills.

---

## 1. README Structure (root `README.md`)

```markdown
# 🎹 PianoFlow AI
Turn any piano MIDI into a tutorial video, sheet music, and a beginner-friendly version.

[live demo badge] [CI badge] [license badge] [stack badges: Next.js · FastAPI · Redis/SQS · Postgres · Terraform]

<demo GIF — 5 s clip of a falling-note render>

## What it does
- 🎬 Falling-note tutorial video (MP4) — 720p/1080p/vertical, dark/light, adjustable speed
- 🎼 Sheet music (PDF + MusicXML)
- 🎵 Processed + beginner-simplified MIDI (rule-based, honestly labeled)

## Try it
→ live URL (Stage 2+) · 60-second walkthrough GIF

## Architecture
<architecture diagram image — the DESIGN.md §1 diagram, rendered>
One paragraph: API never renders; queue + workers; adapters make
storage/queue swappable (local → Supabase → AWS S3/SQS) with zero
domain-code changes.
Link: docs/DESIGN.md

## Tech stack table
Frontend / API / Worker / Music / Queue / Storage / DB / IaC — one line each, with the WHY column.

## Run it locally
git clone → cp .env.example .env → docker compose up → open localhost:3000
(3 commands, genuinely working — tested on fresh clones)

## Monorepo map
10-line annotated tree (apps/web · apps/api · apps/worker · packages/music-core · infra/)

## Engineering highlights  ← the section interviews come from
- Job system: idempotency, retries with backoff, DLQ, settings snapshots
- Adapter pattern: Redis→SQS and Supabase→S3 migrations as config changes
- Rendering: frames streamed to FFmpeg stdin, O(visible-notes) frame loop
- Cost controls: quotas, output expiry, lifecycle rules
- Observability: structured JSON logs with request_id propagation, CloudWatch dashboard (screenshot)
- AWS: ECS Fargate + SQS autoscaling via Terraform (link to write-up)

## Docs index
table linking all 10 docs/ files with one-line descriptions

## Roadmap snapshot
✅/🔜 checklist of the 12 phases (kept current)

## Honest limitations
MIDI-only input (audio = future) · approximate sheet rhythm ·
rule-based (not AI) simplification · private outputs only

## License + author links (GitHub, LinkedIn)
```

---

## 2. Rules for the README

1. **Demo GIF above the fold.** The product is visual; show it within one screen height.
2. **Local run must be 3 commands and actually work** — this gets tested on a clean machine before every release tag. Nothing destroys portfolio credibility like a broken quickstart.
3. **"Why" column in the stack table** — listing tools is noise; justifying them is signal.
4. **Engineering highlights over feature lists** — the hiring audience cares about the job system and the migration story, not the button colors.
5. **Honest limitations section** — stated limitations read as senior judgment, not weakness.
6. **Keep it under ~250 lines**; depth lives in `docs/`, the README links to it.
7. **Update cadence:** README updated in the same PR as any phase completion (badge/checklist drift is a smell).

## 3. Supporting assets to produce (by phase)

| Asset | Produced in | Used in |
|---|---|---|
| Architecture diagram (PNG/SVG from DESIGN.md §1) | Phase 2 | README, DESIGN.md |
| 5-sec demo GIF of rendered video | Phase 7 | README hero |
| 60-sec full-flow walkthrough GIF | Phase 10 | README "Try it" |
| CloudWatch dashboard screenshot | Phase 11 | README highlights |
| AWS migration write-up (`docs/AWS_MIGRATION.md`, new) | Phase 11 | README link — the interview centerpiece |

## 4. Documentation set this plan completes

| File | Role |
|---|---|
| `docs/PRODUCT.md` | What & why, scope, metrics |
| `docs/DESIGN.md` | Architecture, jobs, rendering, security, observability |
| `docs/DATABASE.md` | Schema, notes-storage decision, lifecycle |
| `docs/API.md` | REST v1 contract with examples |
| `docs/UI_UX.md` | Pages, components, flows, states |
| `docs/CODE_ARCHITECTURE.md` | Monorepo, clean architecture, adapters, testing |
| `docs/DEPLOYMENT.md` | 4 deployment stages + transitions |
| `docs/ROADMAP.md` | 12 phases with guardrails |
| `docs/RISKS.md` | Risks, cost controls, free-tier limits |
| `docs/README_PLAN.md` | This file — README spec |

Next action after this design set is approved: **Phase 2 — Monorepo Setup** (`ROADMAP.md`).
