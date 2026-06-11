"""Generated output routes.

Listing is metadata-only (no URLs, no raw storage paths). Signed URLs are
minted on demand: download-url for downloadable kinds, stream-url for video
kinds — tutorial videos never get a download URL
(12_NO_TUTORIAL_DOWNLOAD_POLICY).
"""

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user
from app.domains.jobs.schemas import OutputOut
from app.domains.outputs.policy import is_downloadable, is_streamable
from app.infrastructure.database.models import OutputFile
from app.infrastructure.database.repositories import OutputFileRepository, ProjectRepository
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.base import StorageService
from app.infrastructure.storage.factory import get_storage

router = APIRouter(prefix="/api/v1", tags=["outputs"])

STREAM_URL_EXPIRES_SECONDS = 300


def output_out(output: OutputFile) -> OutputOut:
    return OutputOut(
        id=output.id,
        kind=output.kind,
        job_id=output.job_id,
        content_type=output.content_type,
        size_bytes=output.size_bytes,
        metadata=output.output_metadata,
        downloadable=is_downloadable(output.kind),
        streamable=is_streamable(output.kind),
        file_expires_at=output.expires_at,
        created_at=output.created_at,
    )


class OutputListOut(BaseModel):
    items: list[OutputOut]
    next_cursor: str | None = None


class DownloadUrlOut(BaseModel):
    download_url: str
    expires_at: str


class StreamUrlOut(BaseModel):
    stream_url: str
    expires_at: str
    expires_in_seconds: int


@router.get("/projects/{project_id}/outputs", response_model=OutputListOut)
def list_outputs(
    project_id: uuid.UUID,
    kind: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> OutputListOut:
    if ProjectRepository(db).get(project_id, user.id) is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    items = [
        output_out(output)
        for output in OutputFileRepository(db).list_for_project(project_id, user.id, kind=kind)
    ]
    return OutputListOut(items=items)


def _require_output(db: Session, output_id: uuid.UUID, user: CurrentUser) -> OutputFile:
    output = OutputFileRepository(db).get(output_id, user.id)
    if output is None:
        raise NotFoundError(
            "Output does not exist or you do not have access.", code="OUTPUT_NOT_FOUND"
        )
    return output


@router.post("/outputs/{output_id}/download-url", response_model=DownloadUrlOut)
def create_download_url(
    output_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_storage),
) -> DownloadUrlOut:
    output = _require_output(db, output_id, user)
    if not is_downloadable(output.kind):
        raise ForbiddenError(
            "Tutorial videos are view-only in PianoFlow AI.", code="DOWNLOAD_NOT_ALLOWED"
        )
    signed = storage.create_signed_download_url(output.storage_key)
    return DownloadUrlOut(download_url=signed.url, expires_at=signed.expires_at)


@router.post("/outputs/{output_id}/stream-url", response_model=StreamUrlOut)
def create_stream_url(
    output_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_storage),
) -> StreamUrlOut:
    output = _require_output(db, output_id, user)
    if not is_streamable(output.kind):
        raise ConflictError("This output is not a streaming output.", code="STREAM_NOT_AVAILABLE")
    signed = storage.create_signed_download_url(
        output.storage_key, expires_in=STREAM_URL_EXPIRES_SECONDS
    )
    return StreamUrlOut(
        stream_url=signed.url,
        expires_at=signed.expires_at,
        expires_in_seconds=STREAM_URL_EXPIRES_SECONDS,
    )
