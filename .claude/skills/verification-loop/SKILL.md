---
name: verification-loop
description: PianoFlow verification loop — run ruff + pytest for Python, lint + typecheck for web after every significant change. Use before PRs and after refactoring.
---

# Verification Loop — PianoFlow

## When to Run

- After completing a feature or significant code change
- Before opening a PR
- After refactoring any Python or TypeScript code
- After dependency version bumps

---

## Verification Sequence

### Phase 1: Python Lint (Fast — run first)

```bash
uv run --directory apps/api ruff check .
uv run --directory apps/worker ruff check .
uv run --directory packages/music-core ruff check .
```

If lint fails: fix with `ruff check . --fix` for safe auto-fixes, then manual edit. Do not proceed with red lint.

### Phase 2: Python Tests

```bash
uv run --directory apps/api pytest
uv run --directory apps/worker pytest
uv run --directory packages/music-core pytest
```

If tests fail: do not proceed. Diagnose and fix.

### Phase 3: TypeScript Type Check

```bash
pnpm -r typecheck
```

### Phase 4: Web Lint

```bash
pnpm --filter @pianoflow/web lint
```

### Phase 5: Web Build (pre-PR only)

```bash
pnpm --filter @pianoflow/web build
```

### Phase 6: Secret / Debug Statement Scan

```bash
# console.log in TypeScript
grep -rn "console\.log" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."

# print() in Python
grep -rn "^[[:space:]]*print(" apps/api/src/ apps/worker/src/ packages/music-core/src/
```

### Phase 7: Git Diff Review

```bash
git diff --stat
git diff HEAD --name-only
```

Review each changed file for unintended edits.

---

## Output Format

```
VERIFICATION REPORT — PianoFlow
================================
Ruff (api):      [OK / N errors]
Ruff (worker):   [OK / N errors]
Ruff (core):     [OK / N errors]
Pytest (api):    [N passed, N failed]
Pytest (worker): [N passed, N failed]
Pytest (core):   [N passed, N failed]
TypeCheck:       [OK / N errors]
Lint (web):      [OK / N issues]
Build (web):     [OK / FAIL] (pre-PR)
console.log:     [OK / N found]
print():         [OK / N found]
Diff:            [N files changed]

Ready for PR: [YES / NO]

Issues to fix:
1. ...
```

---

## Quick Modes

| Mode | Command |
|---|---|
| Fast (lint+types) | `uv run --directory apps/api ruff check . && pnpm -r typecheck` |
| Python only | phases 1–2 |
| Web only | phases 3–5 |
| Pre-PR (full) | all phases |

---

## Integration with Hooks

The PostToolUse ruff hook in `.claude/settings.json` catches issues on each Python file save. This skill provides the broader cross-workspace check. Both complement each other — the hook catches regressions immediately; this skill validates readiness for review.
