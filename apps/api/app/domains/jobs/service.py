"""Job creation and enqueue rules."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser
from app.domains.settings.schemas import SettingsOut
from app.domains.settings.service import get_or_create_settings
from app.infrastructure.database.models import Project, RenderJob
from app.infrastructure.database.repositories import (
    JobRepository,
    ProjectEventRepository,
    UploadedFileRepository,
)
from app.infrastructure.queue.base import QueueError, QueueService

PARSE_MIDI = "parse_midi"
RENDER_SHEET = "render_sheet"
TRANSCRIBE_AUDIO = "transcribe_audio"
DEFAULT_QUEUE = "q_default"


class EnqueueError(AppError):
    status_code = 500
    code = "QUEUE_ENQUEUE_FAILED"


@dataclass(frozen=True)
class EnqueuedJob:
    job: RenderJob
    created: bool


def _settings_snapshot(db: Session, project_id: uuid.UUID) -> tuple[int, dict]:
    settings = get_or_create_settings(db, project_id)
    return settings.version, SettingsOut.model_validate(settings).model_dump(mode="json")


def create_parse_midi_job(
    db: Session,
    queue: QueueService,
    project: Project,
    user: CurrentUser,
    request_id: str | None = None,
) -> EnqueuedJob:
    upload = UploadedFileRepository(db).get_validated_for_project(project.id, user.id, kind="midi")
    if upload is None:
        raise ConflictError("No uploaded MIDI exists for this project.", code="NO_VALIDATED_UPLOAD")

    settings_version, snapshot = _settings_snapshot(db, project.id)
    jobs = JobRepository(db)
    duplicate = jobs.find_live_duplicate(project.id, user.id, PARSE_MIDI, settings_version)
    if duplicate is not None:
        return EnqueuedJob(job=duplicate, created=False)

    job = jobs.create(
        project_id=project.id,
        user_id=user.id,
        job_type=PARSE_MIDI,
        status="queued",
        progress=0,
        progress_message="Waiting in queue",
        settings_snapshot=snapshot,
        settings_version=settings_version,
        queue_name=DEFAULT_QUEUE,
    )
    project.status = "parsing"
    ProjectEventRepository(db).append(
        project_id=project.id,
        user_id=user.id,
        job_id=job.id,
        event_type="job.enqueued",
        payload={"job_type": PARSE_MIDI},
        request_id=request_id,
    )
    db.flush()

    payload = {
        "job_id": str(job.id),
        "job_type": PARSE_MIDI,
        "project_id": str(project.id),
        "user_id": str(user.id),
        "attempt": job.attempt + 1,
        "settings_version": settings_version,
        "queue_name": DEFAULT_QUEUE,
        "created_at": datetime.now(UTC).isoformat(),
        "trace_id": request_id,
    }
    try:
        message_id = queue.enqueue(DEFAULT_QUEUE, payload)
    except QueueError as exc:
        job.status = "failed"
        job.error_type = "QUEUE_ENQUEUE_FAILED"
        job.error_message = "Could not enqueue parse job."
        job.finished_at = datetime.now(UTC)
        project.status = "failed"
        db.flush()
        raise EnqueueError("Could not enqueue parse job.") from exc

    job.broker_message_id = message_id
    db.flush()
    return EnqueuedJob(job=job, created=True)


def create_render_sheet_job(
    db: Session,
    queue: QueueService,
    project: Project,
    user: CurrentUser,
    request_id: str | None = None,
) -> EnqueuedJob:
    if project.status != "ready" or not (project.analysis_summary or {}).get("notes_key"):
        raise ConflictError("Notes are not ready yet.", code="NOTES_NOT_READY")

    settings_version, snapshot = _settings_snapshot(db, project.id)
    jobs = JobRepository(db)
    duplicate = jobs.find_live_duplicate(project.id, user.id, RENDER_SHEET, settings_version)
    if duplicate is not None:
        return EnqueuedJob(job=duplicate, created=False)

    job = jobs.create(
        project_id=project.id,
        user_id=user.id,
        job_type=RENDER_SHEET,
        status="queued",
        progress=0,
        progress_message="Waiting in queue",
        settings_snapshot=snapshot,
        settings_version=settings_version,
        queue_name=DEFAULT_QUEUE,
    )
    ProjectEventRepository(db).append(
        project_id=project.id,
        user_id=user.id,
        job_id=job.id,
        event_type="job.enqueued",
        payload={"job_type": RENDER_SHEET},
        request_id=request_id,
    )
    db.flush()

    payload = {
        "job_id": str(job.id),
        "job_type": RENDER_SHEET,
        "project_id": str(project.id),
        "user_id": str(user.id),
        "attempt": job.attempt + 1,
        "settings_version": settings_version,
        "queue_name": DEFAULT_QUEUE,
        "created_at": datetime.now(UTC).isoformat(),
        "trace_id": request_id,
    }
    try:
        message_id = queue.enqueue(DEFAULT_QUEUE, payload)
    except QueueError as exc:
        job.status = "failed"
        job.error_type = "QUEUE_ENQUEUE_FAILED"
        job.error_message = "Could not enqueue sheet job."
        job.finished_at = datetime.now(UTC)
        db.flush()
        raise EnqueueError("Could not enqueue sheet job.") from exc

    job.broker_message_id = message_id
    db.flush()
    return EnqueuedJob(job=job, created=True)


def create_transcribe_audio_job(
    db: Session,
    queue: QueueService,
    project: Project,
    user: CurrentUser,
    request_id: str | None = None,
) -> EnqueuedJob:
    """Audio → MIDI Beta. Enqueues on the dedicated audio queue (queue.audio);
    transcription always runs in the worker, never in the API process."""
    settings = get_settings()
    if not settings.audio_transcription_enabled:
        raise ForbiddenError(
            "Audio transcription is not enabled.", code="AUDIO_TRANSCRIPTION_NOT_ENABLED"
        )

    upload = UploadedFileRepository(db).get_validated_for_project(project.id, user.id, kind="audio")
    if upload is None:
        raise ConflictError(
            "No uploaded audio exists for this project.", code="NO_VALIDATED_UPLOAD"
        )
    if not upload.rights_attestation:
        raise ConflictError(
            "Audio upload is missing rights attestation.", code="RIGHTS_ATTESTATION_REQUIRED"
        )

    settings_version, snapshot = _settings_snapshot(db, project.id)
    jobs = JobRepository(db)
    duplicate = jobs.find_live_duplicate(project.id, user.id, TRANSCRIBE_AUDIO, settings_version)
    if duplicate is not None:
        return EnqueuedJob(job=duplicate, created=False)

    audio_queue = settings.audio_queue_name
    job = jobs.create(
        project_id=project.id,
        user_id=user.id,
        job_type=TRANSCRIBE_AUDIO,
        status="queued",
        progress=0,
        progress_message="Waiting in audio queue",
        settings_snapshot=snapshot,
        settings_version=settings_version,
        queue_name=audio_queue,
    )
    project.status = "transcribing"
    project.transcription_status = "queued"
    ProjectEventRepository(db).append(
        project_id=project.id,
        user_id=user.id,
        job_id=job.id,
        event_type="job.enqueued",
        payload={"job_type": TRANSCRIBE_AUDIO},
        request_id=request_id,
    )
    db.flush()

    payload = {
        "job_id": str(job.id),
        "job_type": TRANSCRIBE_AUDIO,
        "project_id": str(project.id),
        "user_id": str(user.id),
        "attempt": job.attempt + 1,
        "settings_version": settings_version,
        "queue_name": audio_queue,
        "created_at": datetime.now(UTC).isoformat(),
        "trace_id": request_id,
    }
    try:
        message_id = queue.enqueue(audio_queue, payload)
    except QueueError as exc:
        job.status = "failed"
        job.error_type = "QUEUE_ENQUEUE_FAILED"
        job.error_message = "Could not enqueue transcription job."
        job.finished_at = datetime.now(UTC)
        project.status = "failed"
        project.transcription_status = "failed"
        db.flush()
        raise EnqueueError("Could not enqueue transcription job.") from exc

    job.broker_message_id = message_id
    db.flush()
    return EnqueuedJob(job=job, created=True)


def require_job(db: Session, job_id: uuid.UUID, user_id: uuid.UUID) -> RenderJob:
    job = JobRepository(db).get(job_id, user_id)
    if job is None:
        raise NotFoundError("Job does not exist or you do not have access.", code="JOB_NOT_FOUND")
    return job
