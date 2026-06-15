---
description: Enforce test-driven development for Python workspaces. Write pytest tests first, then implement minimal code to pass.
---

Invoke the **tdd-guide** agent to implement this feature using TDD.

The cycle is: **RED → GREEN → REFACTOR**

1. **Scaffold** the interface (Pydantic model, function signature, FastAPI route stub)
2. **Write failing tests** in the appropriate test directory:
   - `apps/api/tests/` for API/service layer
   - `apps/worker/tests/` for SQS handlers
   - `packages/music-core/tests/` for music algorithms
3. **Verify RED** — run tests and confirm they fail for the right reason:
   ```bash
   uv run --directory <workspace> pytest tests/<test_file>.py -v
   ```
4. **Implement minimal code** to make tests pass
5. **Verify GREEN**:
   ```bash
   uv run --directory <workspace> pytest tests/<test_file>.py -v
   ```
6. **Refactor** while keeping tests green; run ruff after:
   ```bash
   uv run --directory <workspace> ruff check . && uv run --directory <workspace> ruff format .
   ```
7. **Verify coverage**:
   ```bash
   uv run --directory <workspace> pytest --cov=src --cov-report=term-missing
   ```
   Target: 80%+ overall; 100% for music-core algorithms and auth helpers.

Tests must cover: happy path, empty/null inputs, error paths (e.g., S3 unavailable, SQS timeout), and boundary conditions.

Do not skip the RED phase. Tests must be written and confirmed failing before any implementation.
