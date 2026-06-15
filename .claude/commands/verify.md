---
description: Run comprehensive verification across all PianoFlow workspaces — pytest, ruff, tsc, and lint. Reports pass/fail and readiness for PR.
---

Run verification in this exact order. Stop and report on first critical failure.

## 1. Python — Lint & Format
```bash
uv run --directory apps/api ruff check .
uv run --directory apps/worker ruff check .
uv run --directory packages/music-core ruff check .
```

## 2. Python — Tests
```bash
uv run --directory apps/api pytest
uv run --directory apps/worker pytest
uv run --directory packages/music-core pytest
```

## 3. TypeScript — Type Check
```bash
pnpm -r typecheck
```

## 4. Web — Lint
```bash
pnpm --filter @pianoflow/web lint
```

## 5. Web — Build (for pre-PR)
```bash
pnpm --filter @pianoflow/web build
```

## 6. Secret / Console Log Scan
```bash
grep -rn "console\.log" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."
grep -rn "print(" apps/api/src/ apps/worker/src/ packages/music-core/src/
```

## 7. Git Status
```bash
git diff --stat
```

## Output

```
VERIFICATION: [PASS/FAIL]

Ruff (api):     [OK/N errors]
Ruff (worker):  [OK/N errors]
Ruff (core):    [OK/N errors]
Pytest (api):   [N passed / N failed]
Pytest (worker):[N passed / N failed]
Pytest (core):  [N passed / N failed]
TypeCheck:      [OK/N errors]
Lint (web):     [OK/N issues]
Build (web):    [OK/FAIL] (pre-PR only)
Console.log:    [OK/N found]
Print stmts:    [OK/N found]

Ready for PR: [YES/NO]
```

## Arguments

`$ARGUMENTS`:
- `quick` — ruff + tsc only (fastest)
- `full` — all checks including build (default for pre-PR)
- `python` — Python workspaces only
- `web` — TypeScript/Next.js only
