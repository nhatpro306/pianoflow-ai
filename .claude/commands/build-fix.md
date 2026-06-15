---
description: Incrementally fix ruff, tsc, and pnpm build errors across all PianoFlow workspaces. Fix one error at a time, re-verify after each.
---

Invoke the **build-error-resolver** agent to fix current build errors.

Steps:
1. Collect all errors:
   ```bash
   uv run --directory apps/api ruff check . 2>&1
   uv run --directory apps/worker ruff check . 2>&1
   uv run --directory packages/music-core ruff check . 2>&1
   pnpm -r typecheck 2>&1
   pnpm --filter @pianoflow/web lint 2>&1
   ```

2. Group errors by workspace and file; sort by severity (import errors first)

3. For each error:
   - Show file + line + error message
   - Apply minimal fix (add type hint, fix import, wrap long line)
   - Re-run the specific checker for that workspace
   - Confirm error is resolved before moving to next

4. Stop if:
   - A fix introduces a new error not previously present
   - The same error persists after 2 fix attempts (escalate to architect agent)
   - User requests pause

5. Report:
   ```
   Errors fixed: N/M
   Workspaces clean: [list]
   Remaining: [list with reason]
   ```

Fix one error at a time. Do not refactor. Do not rename. Do not optimize. Just green.
