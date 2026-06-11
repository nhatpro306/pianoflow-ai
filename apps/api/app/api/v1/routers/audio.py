"""Audio → MIDI Beta routes (docs 09/25).

2-phase direct-to-storage audio upload (same pattern as upload-midi) with
mandatory rights attestation, plus transcription status. The API never
transcribes — confirm enqueues `transcribe_audio` on the audio queue.
"""

import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError
from app.core.security import CurrentUser, get_current_user
from app.domains.files.service import confirm_upload, init_audio_upload
from app.domains.jobs.schemas import JobBriefOut
from app.domains.jobs.service import create_transcribe_audio_job
from app.infrastructure.database.models import Project
from app.infrastructure.database.repositories import OutputFileRepository, ProjectRepository
from app.infrastructure.database.session import get_db
from app.infrastructure.queue.base import QueueService
from app.infrastructure.queue.factory import get_queue
from app.infrastructure.storage.base import StorageService
from app.infrastructure.storage.factory import get_storage

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["audio"])

TRANSCRIPTION_DRAFT_MESSAGE = "AI transcription is an editable draft and may need correction."


class AudioUploadInitIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    size_bytes: int
    content_type: str | None = None
    rights_attestation: bool = False


class AudioUploadInitOut(BaseModel):
    upload_id: uuid.UUID
    upload_url: str
    method: str
    headers: dict[str, str]
    expires_at: str
    max_bytes: int
    max_duration_seconds: int


class AudioUploadConfirmIn(BaseModel):
    upload_id: uuid.UUID
    confirmed: bool = True


class AudioUploadConfirmOut(BaseModel):
    upload_id: uuid.UUID
    status: str
    project_status: str
    transcribe_job: JobBriefOut


class TranscriptionOut(BaseModel):
    status: str
    engine: str | None = None
    draft_midi_output_id: uuid.UUID | None = None
    notes_json_output_id: uuid.UUID | None = None
    confidence_json_output_id: uuid.UUID | None = None
    report_json_output_id: uuid.UUID | None = None
    confidence_summary: dict | None = None
    message: str = TRANSCRIPTION_DRAFT_MESSAGE


def _get_project(db: Session, project_id: uuid.UUID, user: CurrentUser) -> Project:
    project = ProjectRepository(db).get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    return project


@router.post("/upload-audio", response_model=AudioUploadInitOut)
def upload_audio_init(
    project_id: uuid.UUID,
    body: AudioUploadInitIn,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_storage),
) -> AudioUploadInitOut:
    project = _get_project(db, project_id, user)
    result = init_audio_upload(
        db,
        storage,
        user,
        project,
        body.filename,
        body.size_bytes,
        rights_attestation=body.rights_attestation,
    )
    project.source_type = "audio_upload"
    return AudioUploadInitOut(
        upload_id=result.upload_id,
        upload_url=result.signed.url,
        method=result.signed.method,
        headers=result.signed.headers,
        expires_at=result.signed.expires_at,
        max_bytes=result.max_bytes,
        max_duration_seconds=get_settings().max_audio_seconds,
    )


@router.post("/upload-audio/confirm", status_code=202, response_model=AudioUploadConfirmOut)
def upload_audio_confirm(
    project_id: uuid.UUID,
    body: AudioUploadConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_storage),
    queue: QueueService = Depends(get_queue),
) -> AudioUploadConfirmOut:
    project = _get_project(db, project_id, user)
    record = confirm_upload(db, storage, user, body.upload_id)
    if record.project_id != project.id:
        raise ConflictError("Upload belongs to a different project.")
    if record.kind != "audio":
        raise ConflictError("Upload is not an audio file.")

    result = create_transcribe_audio_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )

    return AudioUploadConfirmOut(
        upload_id=record.id,
        status=record.upload_status,
        project_status=project.status,
        transcribe_job=JobBriefOut.model_validate(result.job),
    )


_OUTPUT_ID_FIELDS = {
    "transcribed_draft_midi": "draft_midi_output_id",
    "transcription_notes_json": "notes_json_output_id",
    "transcription_confidence_json": "confidence_json_output_id",
    "transcription_report_json": "report_json_output_id",
}


@router.get("/transcription", response_model=TranscriptionOut)
def get_transcription(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> TranscriptionOut:
    project = _get_project(db, project_id, user)
    out = TranscriptionOut(status=project.transcription_status or "none")

    outputs = OutputFileRepository(db).list_for_project(project_id, user.id)
    for output in outputs:
        field_name = _OUTPUT_ID_FIELDS.get(output.kind)
        if field_name and getattr(out, field_name) is None:  # newest first
            setattr(out, field_name, output.id)
        if output.kind == "transcription_confidence_json" and out.confidence_summary is None:
            meta = output.output_metadata or {}
            out.confidence_summary = meta.get("confidence_summary")
        if output.kind == "transcribed_draft_midi" and out.engine is None:
            out.engine = (output.output_metadata or {}).get("engine")
    return out
