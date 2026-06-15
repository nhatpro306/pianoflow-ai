---
description: Sync PianoFlow documentation from source-of-truth (pyproject.toml, route files, terraform, env examples).
---

Invoke the **doc-updater** agent to refresh documentation.

Steps:
1. Read `apps/api/pyproject.toml` → update `apps/api/README.md` dependencies and scripts section
2. Read `apps/web/package.json` → update `apps/web/README.md` scripts reference
3. Read `apps/api/src/` port/adapter structure → refresh `docs/CODE_ARCHITECTURE.md`
4. Read `infra/terraform/main.tf` and `infra/terraform/modules/` → refresh `docs/DEPLOYMENT_AWS.md`
5. Read `apps/api/.env.example` and `apps/web/.env.example` → verify env var lists in all docs
6. Find FastAPI routes missing docstrings:
   ```bash
   grep -rn "@router\.\(get\|post\|put\|patch\|delete\)" apps/api/src/ -l
   ```
7. Flag docs not updated in 30+ days for manual review
8. Produce diff summary of all changes made

All commands in docs must use `uv run --directory <workspace>` for Python and `pnpm --filter @pianoflow/web` for Node — never bare `python` or `npm`.
