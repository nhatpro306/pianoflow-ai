# PianoFlow AI — ECC Adoption Report

**Date:** 2026-06-15
**Repo:** `C:\Users\super\pianoflow`
**Branch:** `codex/fix-upload-project-route`

This report documents which ECC components were adopted for this project, which
were rejected (and why), estimated context savings, and the recommended workflow.

---

## Selected Components

### Agents

| Agent | Model | Reason for selection |
|---|---|---|
| `architect` | Opus | PianoFlow has a non-trivial hexagonal architecture; new service/module decisions need deep reasoning. |
| `planner` | Opus | Phase-based roadmap (ROADMAP.md) means regular sprint/task decomposition. |
| `code-reviewer` | Opus | Final PR review touching adapter boundaries or security flows warrants Opus-level scrutiny. |
| `security-reviewer` | Opus | Auth (JWT/JWKS/HS256 fallback), CORS, signed URLs, and RLS are all active attack surfaces. |
| `refactor-cleaner` | Sonnet | Codebase is growing; regular cleanup keeps the adapter boundary clean. |
| `doc-updater` | Sonnet | Large docs/ directory; keeping docs in sync after code changes is high-frequency Sonnet work. |
| `tdd-guide` | Sonnet | Python side has a full test plan (CODE_ARCHITECTURE.md §7); driving implementation with tests is the intended workflow. |
| `build-error-resolver` | Sonnet | CI runs ruff + eslint + tsc + pytest; build errors are common during active development. |

### Skills

| Skill | Reason for selection |
|---|---|
| `coding-standards` | Enforces ruff @100 + Google docstrings (Python) and strict TS + no-any rules (web). |
| `backend-patterns` | FastAPI hexagonal patterns, SQLAlchemy repo pattern, Pydantic settings, Alembic. |
| `frontend-patterns` | Next.js 15 App Router, TanStack Query polling, Supabase SSR, smplr integration. |
| `security-review` | Active JWT/auth surface, CORS config, presigned URL issuance, RLS policies. |
| `tdd-workflow` | Fake adapters pattern already established; TDD skill drives tests-first discipline. |
| `verification-loop` | Confirms fixes work in the running app before marking a task done. |
| `strategic-compact` | Long sessions accumulate context quickly (large docs/ + multi-service monorepo). |

### Commands

| Command | Description |
|---|---|
| `/plan` | Opus: break a feature into scoped tasks aligned with ROADMAP.md phases. |
| `/code-review` | Opus: review open diff or PR for correctness, patterns, and security. |
| `/security-review` | Opus (security-reviewer): focused pass on auth, CORS, secrets, signed URLs. |
| `/refactor-clean` | Sonnet: simplification and cleanup pass on changed code. |
| `/tdd` | Sonnet: write failing tests first, then implement. |
| `/verify` | Run app and observe behavior to confirm a fix works. |
| `/update-docs` | Sonnet: update affected docs/ after a code change. |
| `/checkpoint` | Append dated entry to docs/progress.md. |
| `/build-fix` | Sonnet: investigate and fix CI/build/type/lint errors. |
| `/test-coverage` | Sonnet: identify untested paths and write tests. |
| `/orchestrate` | Opus: coordinate a multi-agent workflow across the above agents. |

### Hooks

| Hook | Trigger | Action |
|---|---|---|
| `ruff-format` | PostToolUse on `.py` file edit | Run `ruff format <file>` |
| `ruff-check` | PostToolUse on `.py` file edit | Run `ruff check --fix <file>` |
| `console-log-warn` | PostToolUse on `.ts/.tsx` file edit | Warn if `console.log` detected (use structured logger) |
| `git-push-reminder` | SessionEnd | Remind to `git push` if there are unpushed commits |
| `memory-persistence-start` | SessionStart | Load `docs/progress.md` and `docs/decisions.md` as session context |
| `memory-persistence-compact` | PreCompact | Write a compact session summary to `docs/progress.md` |
| `memory-persistence-end` | SessionEnd | Append any new decisions to `docs/decisions.md` |
| `strategic-compact` | SuggestCompact | Trigger compact when context exceeds threshold |

---

## Rejected Components

### Agents

| Agent | Reason for rejection |
|---|---|
| `e2e-runner` | No e2e test framework exists in the repo (web has zero tests; Playwright is planned but not implemented). Adding an e2e-runner agent before the framework exists adds noise. |

### Skills

| Skill | Reason for rejection |
|---|---|
| `clickhouse-io` | No ClickHouse in the stack (Postgres + Supabase only). |
| `continuous-learning` | Overhead not justified at current team/scale; re-evaluation deferred to when the project has >1 active contributor. |
| `eval-harness` | No LLM eval setup exists (the AI component is Basic Pitch for audio transcription, not a generative model requiring evals). |
| `project-guidelines-example` | Template skill; its content was folded directly into `CLAUDE.md` rather than loaded as a separate skill. |

### Commands

| Command | Reason for rejection |
|---|---|
| `/learn` | Corresponds to the rejected `continuous-learning` skill. |
| `/eval` | Corresponds to the rejected `eval-harness` skill. |
| `/e2e` | Corresponds to the rejected `e2e-runner` agent (no framework yet). |
| `/setup-pm` | Stack is fixed and known; project management setup is a one-time manual task. |
| `/update-codemaps` | Only useful when codemaps are used as an index; this project uses `docs/CODE_ARCHITECTURE.md` directly. |

### Hooks

| Hook | Reason for rejection |
|---|---|
| `dev-server-tmux` | Conflicts with the project's preview and verify workflow; would spawn unneeded tmux sessions. |
| `block-random-md` | This repo intentionally maintains a large, structured `docs/` directory; blocking markdown creation would prevent `/update-docs` and `/checkpoint` from working. |
| `prettier-ts` | No prettier in the stack (ESLint only for TypeScript). Adding prettier hooks would reformat files in a way that conflicts with existing ESLint config. |
| `tsc-watch` | `tsc` is run via `pnpm -r typecheck` as a deliberate step, not on every file save. A per-save tsc hook would be slow and block workflow (Next.js projects have expensive type-check cycles). |
| `evaluate-session` | Corresponds to the rejected `continuous-learning` skill. |

---

## Estimated Context Savings

All estimates are qualitative approximations, not measured benchmarks.

### Why context cost starts near zero

ECC agents, commands, and skills are **lazy-loaded**: they consume no tokens until
invoked or triggered by a keyword match. The baseline context cost of adopting ECC
is essentially the size of `CLAUDE.md` (~2 KB), not the sum of all selected
components.

### Where savings come from

1. **Tight `CLAUDE.md`** (~2 KB vs. the ~50 KB `docs/CODE_ARCHITECTURE.md`):
   Claude Code loads `CLAUDE.md` every session. A compact project memory means
   the session starts with a minimal context footprint and retrieves detail on
   demand.

2. **Subagent delegation** (architect, planner, refactor-cleaner, etc.):
   When a task is delegated to a subagent (e.g., `architect` for a new module
   design), the heavy retrieval — reading full architecture docs, comparing
   adapter interfaces, reasoning over trade-offs — happens in the subagent's
   context, not the main thread. Estimated reduction in main-thread context per
   complex architectural task: **~30–50%** compared to doing the same work
   inline. This is a rough estimate based on the volume of docs/ that would
   otherwise need to be loaded in the main thread.

3. **Strategic compact + memory-persistence hooks**:
   `PreCompact` writes a summary to `docs/progress.md`; `SessionStart` reads it
   back. This means re-deriving "where we are" at the start of a new session
   costs a single small file read rather than re-reading commit history and docs.
   Estimated saving per session: replaces ~5–10 minutes of re-orientation
   retrieval.

4. **Signal-dense namespace** (12 components rejected):
   Rejected components that don't apply to this stack are absent from the
   agent/command/skill namespace. This means keyword triggers (which auto-load
   skills) fire on relevant patterns only, reducing false-positive context loads.

**Overall estimate:** for a complex multi-step task (e.g., design + implement + test
a new job type), delegating architecture reasoning to `architect` (Opus subagent) and
implementation to `tdd-guide` + `build-error-resolver` (Sonnet subagents) is
estimated to keep the main-thread context ~30–50% smaller than doing everything
inline. This is an approximation; actual savings depend on task complexity and
how much retrieval each subtask requires.

---

## Recommended Workflow

The ECC-enhanced workflow maps directly to the Opus-plan → Sonnet-build →
Opus-review loop:

```
1. /plan  (Opus — architect/planner agent)
   Describe the feature or change. Opus breaks it into scoped tasks
   aligned with ROADMAP.md phases and ADR constraints.

2. Implement  (Sonnet — default model)
   Sonnet executes each task. Use /tdd to write tests first.
   ruff-format and ruff-check hooks run automatically on .py edits.
   /build-fix resolves CI failures as they arise.

3. /code-review  (Opus — code-reviewer agent)
   Review the diff for correctness, adapter boundary violations,
   and coding-standards conformance.

4. /security-review  (Opus — security-reviewer agent)
   Run on any change touching auth, CORS, signed URLs, input
   validation, or RLS policies.

5. /verify  (runs the app, observes behavior)
   Confirm the fix or feature works in the real running stack
   before marking the task done.

6. /checkpoint  (Sonnet — doc-updater agent)
   Append a dated entry to docs/progress.md summarizing what was
   done. Update docs/decisions.md if a new architectural decision
   was made. Run /update-docs for any docs/ files that need syncing.
```

For large changes spanning multiple components, use `/orchestrate` to have Opus
coordinate the above agents and sequence their outputs into a coherent result.
