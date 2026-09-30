"""2-phase MIDI upload + notes retrieval (API.md §2)."""

import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import ConflictError, NotFoundError
from app.core.rate_limit import record_usage, require_upload_quota
from app.core.security import CurrentUser, get_current_user
from app.domains.files.service import confirm_upload, init_upload
from app.domains.jobs.schemas import JobBriefOut
from app.domains.jobs.service import create_parse_midi_job
from app.infrastructure.database.repositories import ProjectRepository
from app.infrastructure.database.session import get_db
from app.infrastructure.queue.base import QueueService
from app.infrastructure.queue.factory import get_queue
from app.infrastructure.storage.base import StorageService
from app.infrastructure.storage.factory import get_storage


def get_upload_storage(
    settings: Settings = Depends(get_settings),
    default_storage: StorageService = Depends(get_storage),
) -> StorageService:
    if settings.r2_bucket:
        from app.infrastructure.storage.s3 import S3StorageService

        endpoint = (
            f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
            if settings.r2_account_id
            else None
        )
        return S3StorageService(
            region="auto",
            bucket_sources=settings.r2_bucket,
            bucket_analysis=settings.r2_bucket,
            bucket_outputs=settings.r2_bucket,
            endpoint_url=endpoint,
            access_key=settings.r2_access_key,
            secret_key=settings.r2_secret_key,
        )
    return default_storage


router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["uploads"])


class UploadInitIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    size_bytes: int
    content_type: str = "audio/midi"


class UploadInitOut(BaseModel):
    upload_id: uuid.UUID
    upload_url: str
    method: str
    headers: dict[str, str]
    expires_at: str
    max_bytes: int
    download_url: str | None = None


class UploadConfirmIn(BaseModel):
    upload_id: uuid.UUID
    confirmed: bool = True


class UploadConfirmOut(BaseModel):
    upload_id: uuid.UUID
    status: str
    project_status: str
    parse_job: JobBriefOut


def _get_project(db: Session, project_id: uuid.UUID, user: CurrentUser):
    project = ProjectRepository(db).get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    return project


global_router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])


@global_router.post("/audio", response_model=UploadInitOut)
def upload_audio_init(
    body: UploadInitIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_upload_storage),
) -> UploadInitOut:
    import re

    safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", body.filename)
    key = f"users/{user.id}/audio/{uuid.uuid4()}_{safe_name}"

    upload_url = storage.create_signed_upload_url(key, body.content_type, body.size_bytes)
    download_url = storage.create_signed_download_url(key, expires_in=7200)

    return UploadInitOut(
        upload_id=uuid.uuid4(),  # Dummy UUID since we don't save to DB for audio yet
        upload_url=upload_url.url,
        method=upload_url.method,
        headers=upload_url.headers,
        expires_at=upload_url.expires_at,
        max_bytes=body.size_bytes,
        download_url=download_url.url,
    )


@router.post("/upload-midi", response_model=UploadInitOut)
def upload_midi_init(
    project_id: uuid.UUID,
    body: UploadInitIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_upload_storage),
) -> UploadInitOut:
    project = _get_project(db, project_id, user)
    result = init_upload(db, storage, user, project, body.filename, body.size_bytes)
    return UploadInitOut(
        upload_id=result.upload_id,
        upload_url=result.signed.url,
        method=result.signed.method,
        headers=result.signed.headers,
        expires_at=result.signed.expires_at,
        max_bytes=result.max_bytes,
    )


@router.post("/upload-midi/confirm", status_code=202, response_model=UploadConfirmOut)
def upload_midi_confirm(
    project_id: uuid.UUID,
    body: UploadConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_upload_quota),
    storage: StorageService = Depends(get_upload_storage),
    queue: QueueService = Depends(get_queue),
) -> UploadConfirmOut:
    project = _get_project(db, project_id, user)
    record = confirm_upload(db, storage, user, body.upload_id)
    record_usage(db, user.id, "uploads")
    if record.project_id != project.id:
        raise ConflictError("Upload belongs to a different project.")

    result = create_parse_midi_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )

    return UploadConfirmOut(
        upload_id=record.id,
        status="validated_pending",
        project_status=project.status,
        parse_job=JobBriefOut.model_validate(result.job),
    )
