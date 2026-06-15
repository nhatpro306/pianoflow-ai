---
description: Security and quality review of uncommitted changes across Python and TypeScript workspaces.
---

Invoke the **code-reviewer** agent to review current changes.

Steps:
1. `git diff --name-only HEAD` — identify changed files
2. For each changed file, check:

**Security (CRITICAL — block merge):**
- Hardcoded secrets, API keys, or tokens
- `SUPABASE_SERVICE_ROLE_KEY` reachable from client bundle
- SQLAlchemy f-string queries (SQL injection)
- FastAPI routes missing JWT auth (`Depends(get_current_user)`)
- S3 / SQS IAM permissions too broad

**Code Quality (HIGH):**
- Python functions > 50 lines; missing type hints; bare `except`
- TypeScript `console.log` left in; `any` types; React hooks rule violations
- Business logic inside `apps/api/src/adapters/` (belongs in domain/services)
- Missing error handling on async operations

**Performance (MEDIUM):**
- SQLAlchemy N+1 queries (missing `selectinload`)
- TanStack Query missing `staleTime`
- Lambda handler importing heavy modules at top level

3. Output a report with CRITICAL / HIGH / MEDIUM / LOW findings and suggested fixes
4. BLOCK if any CRITICAL or HIGH issue found
