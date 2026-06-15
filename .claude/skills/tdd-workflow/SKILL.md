---
name: tdd-workflow
description: PianoFlow TDD workflow using pytest. Enforces RED→GREEN→REFACTOR for all Python workspaces (apps/api, apps/worker, packages/music-core).
---

# TDD Workflow — PianoFlow (pytest)

## When to Activate

- Writing new FastAPI endpoints or service methods
- Adding domain logic to `packages/music-core`
- Implementing new SQS handler logic in `apps/worker`
- Fixing bugs (write regression test first)

## The Cycle

```
RED → GREEN → REFACTOR → REPEAT
```

Never write implementation code before a failing test exists.

---

## Step-by-Step

### Step 1: Define the Interface (SCAFFOLD)

```python
# apps/api/src/services/transcription_service.py
from apps.api.src.ports.storage_port import StoragePort
from apps.api.src.ports.queue_port import QueuePort
from uuid import UUID

class TranscriptionService:
    def __init__(self, storage: StoragePort, queue: QueuePort):
        self._storage = storage
        self._queue = queue

    async def start_transcription(self, project_id: UUID, s3_key: str) -> str:
        """Enqueue a transcription job. Returns job_id."""
        raise NotImplementedError
```

### Step 2: Write Failing Test (RED)

```python
# apps/api/tests/test_transcription_service.py
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from apps.api.src.services.transcription_service import TranscriptionService

@pytest.fixture
def mock_storage():
    return AsyncMock()

@pytest.fixture
def mock_queue():
    m = AsyncMock()
    m.send_message.return_value = "job-123"
    return m

@pytest.mark.asyncio
async def test_start_transcription_returns_job_id(mock_storage, mock_queue):
    service = TranscriptionService(storage=mock_storage, queue=mock_queue)
    job_id = await service.start_transcription(
        project_id=uuid4(), s3_key="audio/u1/p1/song.wav"
    )
    assert job_id == "job-123"
    mock_queue.send_message.assert_awaited_once()

@pytest.mark.asyncio
async def test_start_transcription_includes_s3_key_in_message(mock_storage, mock_queue):
    service = TranscriptionService(storage=mock_storage, queue=mock_queue)
    await service.start_transcription(project_id=uuid4(), s3_key="audio/u1/p1/song.wav")
    call_args = mock_queue.send_message.call_args[0][0]
    assert call_args["s3_key"] == "audio/u1/p1/song.wav"

@pytest.mark.asyncio
async def test_start_transcription_raises_on_queue_error(mock_storage, mock_queue):
    mock_queue.send_message.side_effect = RuntimeError("SQS unavailable")
    service = TranscriptionService(storage=mock_storage, queue=mock_queue)
    with pytest.raises(RuntimeError, match="SQS unavailable"):
        await service.start_transcription(project_id=uuid4(), s3_key="audio/u1/p1/song.wav")
```

### Step 3: Verify RED

```bash
uv run --directory apps/api pytest tests/test_transcription_service.py -v
# FAILED — NotImplementedError
```

### Step 4: Implement (GREEN)

```python
async def start_transcription(self, project_id: UUID, s3_key: str) -> str:
    from uuid import uuid4
    job_id = str(uuid4())
    await self._queue.send_message({
        "job_id": job_id,
        "project_id": str(project_id),
        "s3_key": s3_key,
    })
    return job_id
```

### Step 5: Verify GREEN

```bash
uv run --directory apps/api pytest tests/test_transcription_service.py -v
# PASSED ✓
```

### Step 6: Refactor

Clean up implementation while keeping tests green. Re-run after each change.

### Step 7: Check Coverage

```bash
uv run --directory apps/api pytest --cov=src --cov-report=term-missing
# Target: 80%+ overall; 100% for this service
```

---

## Test Organization

```
apps/api/tests/
  conftest.py          # db_session, auth_headers, mock_settings fixtures
  test_<service>.py    # unit tests with mocked ports
  integration/
    test_<route>.py    # httpx + real DB (marked @pytest.mark.integration)

apps/worker/tests/
  conftest.py
  test_<handler>.py

packages/music-core/tests/
  test_<module>.py     # pure function tests, no mocking needed
```

## Fixture Patterns

```python
# conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from apps.api.src.db import Base

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session

@pytest.fixture
def auth_headers():
    # Use a test JWT signed with test key
    return {"Authorization": "Bearer <test-token>"}
```

## Coverage Targets

| Workspace | Minimum | Priority |
|---|---|---|
| `packages/music-core` | 100% | Pure algorithms |
| `apps/api` auth/JWT | 100% | Security-critical |
| `apps/api` services | 90% | Core business logic |
| `apps/worker` handlers | 85% | Queue processing |
| `apps/api` adapters | 70% | Infra, harder to test |

## Running Tests

```bash
# Single workspace
uv run --directory apps/api pytest

# With coverage report
uv run --directory apps/api pytest --cov=src --cov-report=term-missing

# Skip integration tests (fast unit tests only)
uv run --directory apps/api pytest -m "not integration"

# Specific file
uv run --directory apps/api pytest tests/test_transcription_service.py -v

# All Python workspaces
uv run --directory apps/api pytest && \
uv run --directory apps/worker pytest && \
uv run --directory packages/music-core pytest
```
