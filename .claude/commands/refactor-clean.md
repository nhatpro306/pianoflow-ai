---
description: Safely identify and remove dead code, unused imports, and dead dependencies across Python and TypeScript workspaces.
---

Invoke the **refactor-cleaner** agent to clean up dead code.

Steps:
1. Run detection in all workspaces:
   ```bash
   uv run --directory apps/api ruff check . --select F401,F811
   uv run --directory apps/worker ruff check . --select F401,F811
   uv run --directory packages/music-core ruff check . --select F401,F811
   pnpm dlx knip
   pnpm dlx depcheck apps/web
   ```

2. Categorize findings:
   - **SAFE**: Unused imports, dead utility functions (zero grep hits)
   - **CAREFUL**: May be used via dynamic import or string reference
   - **RISKY**: Port interfaces, SQS schemas, Pydantic Settings fields

3. For each SAFE item: `grep -r "symbol" apps/ packages/` to confirm no references

4. Apply removals one category at a time. After each batch:
   ```bash
   uv run --directory apps/api pytest
   uv run --directory apps/worker pytest
   pnpm --filter @pianoflow/web lint
   pnpm -r typecheck
   ```

5. Rollback immediately if any test fails: `git revert HEAD`

6. Append to `docs/DELETION_LOG.md` with items removed and impact

Never remove port interfaces, SQS message schemas, or Pydantic Settings fields without a separate architectural plan.
