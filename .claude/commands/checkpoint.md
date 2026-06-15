---
description: Create or verify a progress checkpoint. Appends to docs/progress.md and logs git SHA.
---

Create or verify a workflow checkpoint.

## Usage

`/checkpoint [create|verify|list] [name]`

## Create Checkpoint

1. Run quick verification:
   ```bash
   uv run --directory apps/api ruff check . && pnpm -r typecheck
   ```
2. Capture current git SHA:
   ```bash
   git rev-parse --short HEAD
   ```
3. Append to `docs/progress.md`:
   ```markdown
   ## YYYY-MM-DD HH:MM — <name>
   **SHA**: <short-sha>
   **Status**: [clean/dirty]
   **Notes**: [what was completed at this checkpoint]
   ```
4. Report: "Checkpoint '<name>' created at <sha>"

## Verify Checkpoint

1. Read the checkpoint entry from `docs/progress.md`
2. Compare current state:
   - Files changed since checkpoint SHA: `git diff <sha> --name-only`
   - Test status now vs then
3. Report:
   ```
   CHECKPOINT: <name> @ <sha>
   Files changed since: N
   Build: [PASS/FAIL]
   ```

## List Checkpoints

Show all entries in `docs/progress.md` with name, date, and SHA.

## Workflow

```
[Start feature] → /checkpoint create "feature-start"
[Core logic done] → /checkpoint create "core-done"
[Tests written] → /checkpoint verify "core-done"
[PR ready] → /checkpoint create "pr-ready"
```

## Arguments

`$ARGUMENTS`:
- `create <name>` — create named checkpoint
- `verify <name>` — compare current state to checkpoint
- `list` — show all checkpoints from docs/progress.md
