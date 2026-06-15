---
description: Analyze pytest coverage across Python workspaces and generate missing tests to reach 80%+.
---

Analyze test coverage and generate missing tests.

Steps:
1. Run coverage for all Python workspaces:
   ```bash
   uv run --directory apps/api pytest --cov=src --cov-report=term-missing --cov-report=json
   uv run --directory apps/worker pytest --cov=src --cov-report=term-missing
   uv run --directory packages/music-core pytest --cov=src --cov-report=term-missing
   ```

2. For web TypeScript, check for untested hooks/utils:
   ```bash
   pnpm --filter @pianoflow/web lint
   pnpm -r typecheck
   ```
   (No unit test framework configured in web — note gaps for future setup)

3. Identify Python files below 80% coverage:
   - Parse `coverage.json` → list modules with `line_rate < 0.80`

4. For each under-covered module:
   - Read the source file
   - Identify untested code paths (uncovered lines from report)
   - Generate pytest tests covering:
     - Happy path
     - Error paths (exception branches)
     - Edge cases (empty input, None, boundary values)
   - Place test in the correct directory:
     - `apps/api/tests/test_<module>.py`
     - `apps/worker/tests/test_<module>.py`
     - `packages/music-core/tests/test_<module>.py`

5. Run tests after generating:
   ```bash
   uv run --directory <workspace> pytest --cov=src --cov-report=term-missing
   ```

6. Report before/after coverage for each workspace

Coverage targets:
- **80%** minimum for all modules
- **100%** for `packages/music-core` (pure algorithms) and auth/JWT helpers
