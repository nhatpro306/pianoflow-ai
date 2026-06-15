---
name: backend-patterns
description: PianoFlow backend patterns — FastAPI hexagonal ports/adapters, SQLAlchemy 2.0, pydantic-settings, SQS worker, S3 storage. Mirror of docs/CODE_ARCHITECTURE.md conventions.
---

# Backend Patterns — PianoFlow

## Hexagonal Architecture (Ports & Adapters)

### Structure
```
apps/api/src/
├── ports/          # Abstract interfaces (Python ABCs)
├── adapters/       # Concrete implementations (S3, SQS, Supabase, SQLAlchemy)
├── domain/         # Business entities (no infra dependencies)
├── services/       # Use-case orchestrators (depend on ports only)
├── schemas/        # Pydantic request/response models
├── routers/        # FastAPI route handlers (thin, delegate to services)
└── main.py         # App factory + DI wiring
```

### Port Interface (Abstract)
```python
# apps/api/src/ports/storage_port.py
from abc import ABC, abstractmethod
from uuid import UUID

class StoragePort(ABC):
    @abstractmethod
    async def put_object(self, key: str, data: bytes, content_type: str) -> str:
        """Upload data and return the storage key."""

    @abstractmethod
    async def get_presigned_url(self, key: str, expires_in: int = 900) -> str:
        """Return a pre-signed download URL valid for expires_in seconds."""
```

### Adapter (Concrete Implementation)
```python
# apps/api/src/adapters/s3_adapter.py
import boto3
from apps.api.src.ports.storage_port import StoragePort
from apps.api.src.config import Settings

class S3Adapter(StoragePort):
    def __init__(self, settings: Settings):
        self._client = boto3.client("s3", region_name=settings.aws_region)
        self._bucket = settings.s3_bucket

    async def put_object(self, key: str, data: bytes, content_type: str) -> str:
        self._client.put_object(Bucket=self._bucket, Key=key,
                                Body=data, ContentType=content_type)
        return key

    async def get_presigned_url(self, key: str, expires_in: int = 900) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )
```

### Service (Use-Case Orchestrator)
```python
# apps/api/src/services/project_service.py
from apps.api.src.ports.storage_port import StoragePort
from apps.api.src.ports.queue_port import QueuePort
from apps.api.src.domain.project import Project

class ProjectService:
    def __init__(self, storage: StoragePort, queue: QueuePort):
        self._storage = storage
        self._queue = queue

    async def upload_audio(self, project_id: str, user_id: str,
                           filename: str, data: bytes) -> dict:
        s3_key = f"audio/{user_id}/{project_id}/{filename}"
        await self._storage.put_object(key=s3_key, data=data,
                                       content_type="audio/wav")
        job_id = await self._queue.send_message({
            "job_id": str(uuid4()),
            "s3_key": s3_key,
            "project_id": project_id,
        })
        return {"job_id": job_id, "s3_key": s3_key}
```

### FastAPI Router (Thin Handler)
```python
# apps/api/src/routers/projects.py
from fastapi import APIRouter, Depends, UploadFile
from apps.api.src.services.project_service import ProjectService
from apps.api.src.dependencies import get_project_service, get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/{project_id}/audio", status_code=202)
async def upload_audio(
    project_id: str,
    file: UploadFile,
    user=Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
):
    """Upload audio file and enqueue for processing."""
    data = await file.read()
    return await service.upload_audio(project_id, user.sub, file.filename, data)
```

---

## pydantic-settings Pattern

```python
# apps/api/src/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwks_url: str

    aws_region: str = "us-east-1"
    s3_bucket: str
    sqs_queue_url: str
    sqs_dlq_url: str

    database_url: str

# Singleton via functools.lru_cache
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## SQS Worker Pattern

```python
# apps/worker/src/handler.py
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

async def handle_sqs_event(event: dict, processor) -> dict:
    """Process SQS batch; return failed item identifiers."""
    failures = []
    for record in event.get("Records", []):
        message_id = record["messageId"]
        try:
            body = json.loads(record["body"])
            await processor(job_id=body["job_id"], s3_key=body["s3_key"])
        except Exception as exc:
            logger.error("Processing failed", extra={"message_id": message_id,
                                                      "error": str(exc)})
            failures.append({"itemIdentifier": message_id})
    return {"batchItemFailures": failures}
```

Key worker rules:
- Always return `batchItemFailures` for partial batch success
- Log `message_id` on every error for SQS DLQ correlation
- Messages must be idempotent (check `job_id` for duplicates)

---

## SQLAlchemy 2.0 Query Patterns

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Avoid N+1 with eager loading
stmt = (
    select(Project)
    .where(Project.user_id == user_id)
    .options(selectinload(Project.tracks))
    .limit(20)
)
projects = (await session.execute(stmt)).scalars().all()

# Always use bound params for raw SQL
from sqlalchemy import text
result = await session.execute(
    text("SELECT * FROM projects WHERE id = :id"),
    {"id": project_id}
)
```

---

## Error Response Envelope

All FastAPI errors use this envelope:
```python
from fastapi import HTTPException

# 4xx — client error
raise HTTPException(status_code=400, detail={"code": "INVALID_FILE_TYPE",
                                              "message": "Only wav/mp3/midi accepted"})

# 5xx — surface as 502 (storage/queue failures), 500 (unexpected)
raise HTTPException(status_code=502, detail={"code": "STORAGE_ERROR",
                                              "message": "Upload failed"})
```
