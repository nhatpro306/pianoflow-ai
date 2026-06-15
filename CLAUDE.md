# PianoFlow AI — Project Memory for Claude Code

**Product:** MIDI → tutorial video + sheet music + simplified MIDI (web app + API + background worker).

---

## Stack & Key Commands

```bash
# Web (Next.js 15 / React 19 / Tailwind 4 / TanStack Query / Supabase SSR / smplr)
pnpm --filter @pianoflow/web dev
pnpm --filter @pianoflow/web build
pnpm --filter @pianoflow/web lint
pnpm -r typecheck

# Python (FastAPI + SQLAlchemy + Alembic + pydantic-settings; Python 3.12 via uv)
uv run --directory apps/api pytest
uv run --directory apps/worker pytest
uv run --directory packages/music-core pytest
ruff check .
ruff format --check .
uv run --directory apps/api alembic upgrade head
```

---

## Repo Layout

```
apps/
  web/          Next.js frontend (Vercel)
  api/          FastAPI — validate, persist, enqueue only (Lambda + API Gateway)
  worker/       Python consume loop — all heavy work (EC2 t2.micro)
packages/
  music-core/   Pure Python MIDI/sheet/video/simplify logic — ZERO I/O
  shared-types/ JSON Schemas + generated TS types + Pydantic models
infra/
  terraform/    AWS IaC (ECR, SQS, Lambda, EC2, S3, CloudWatch)
  docker/       Dockerfiles (api, worker, web)
  aws/          OIDC trust/permissions JSON, scripts (requeue_stuck_jobs.py)
  supabase/     Migration mirrors + RLS policies
docs/           project-analysis.md, architecture.md, CODE_ARCHITECTURE.md,
                DATABASE.md, API.md, DEPLOYMENT.md, DEPLOYMENT_AWS.md,
                DESIGN.md, PRODUCT.md, ROADMAP.md, progress.md, decisions.md
```

---

## Conventions

- **Python:** ruff lint + format, line-length 100; mypy strict on `music-core` and `domains/`; Google-style docstrings on public functions; pytest for all tests.
- **TypeScript:** strict mode; ESLint; no `any` in `shared-types` consumers. (No prettier — ESLint only.)
- **Architecture:** hexagonal ports/adapters — routers never import infrastructure; domains never import vendor SDKs; only `main.py` wires concrete impls. `music-core` has zero I/O.
- **Backends swapped by env:** `STORAGE_BACKEND=local|supabase|s3`; `QUEUE_BACKEND=redis|sqs`. Current live: `s3` + `sqs` (AWS ap-southeast-1).
- **Errors:** adapters translate vendor exceptions to `StorageError`/`QueueError` before crossing the boundary.
- **Config:** 12-factor — all env, validated at startup by pydantic-settings; fail fast on missing config.
- **Secrets:** never in repo. CI uses OIDC; local uses `.env` (gitignored).
- **Commits:** Conventional Commits; PRs small and phase-scoped per `docs/ROADMAP.md`.

---

## Model Delegation Policy

> This complements the global `~/.claude/CLAUDE.md`. Only project-specific rules are listed here.

| Task type | Model |
|---|---|
| Architecture decisions, system design, security review, final PR review | **Opus** |
| Coding, refactoring, testing, documentation writing, build-error fixing | **Sonnet** (default) |

When in doubt, default to Sonnet. Escalate to Opus when the task requires deep reasoning about trade-offs, cross-cutting concerns, or security.

### Available Agents

| Agent | Model | Purpose |
|---|---|---|
| `architect` | Opus | Major design decisions, new service/module design |
| `planner` | Opus | Sprint/phase planning, breaking work into tasks |
| `code-reviewer` | Opus | Final PR review — correctness, patterns, security |
| `security-reviewer` | Opus | Auth flows, input validation, secrets, CORS, RLS |
| `refactor-cleaner` | Sonnet | Code cleanup, dead code removal, simplification |
| `doc-updater` | Sonnet | Keep docs/ in sync after code changes |
| `tdd-guide` | Sonnet | Write tests first, drive implementation |
| `build-error-resolver` | Sonnet | Fix CI failures, type errors, lint errors |

### Available Commands

| Command | Description |
|---|---|
| `/plan` | Opus: break a feature into scoped tasks |
| `/code-review` | Opus: review open diff or PR |
| `/security-review` | Opus (security-reviewer agent): focused security pass |
| `/refactor-clean` | Sonnet: apply simplify/reuse/efficiency fixes |
| `/tdd` | Sonnet: write failing tests → implement |
| `/verify` | Run app and observe behavior to confirm a fix works |
| `/update-docs` | Sonnet: update affected docs/ after code change |
| `/checkpoint` | Append dated entry to docs/progress.md |
| `/build-fix` | Sonnet: investigate and fix CI/build error |
| `/test-coverage` | Sonnet: identify untested paths, write tests |
| `/orchestrate` | Opus: coordinate multi-agent workflow |

---

## Key Docs Index

| File | Purpose |
|---|---|
| `docs/project-analysis.md` | Purpose, full stack tables, build commands, deployment methods, testing |
| `docs/architecture.md` | Component diagram, ports/adapters pattern, request/job lifecycle |
| `docs/CODE_ARCHITECTURE.md` | Canonical layout, dependency rules, adapter interface signatures |
| `docs/DATABASE.md` | Full schema, ER diagram, storage key layout, retention |
| `docs/DEPLOYMENT_AWS.md` | AWS free-tier runbook (step-by-step) |
| `docs/progress.md` | Running log of completed work (append with /checkpoint) |
| `docs/decisions.md` | ADR-style log of key architectural decisions |
