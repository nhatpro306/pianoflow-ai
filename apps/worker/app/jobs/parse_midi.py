"""parse_midi worker handler."""

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Project, ProjectEvent, RenderJob, get_uploaded_midi, make_sessionmaker
from app.jobs.base import RequeueJob
from app.jobs.registry import register
from app.storage import ObjectNotFoundError, get_storage
from pianoflow_music.midi.errors import MidiError
from pianoflow_music.midi.parse import parse_midi_bytes

logger = logging.getLogger(__name__)

NOTES_SCHEMA_VERSION = 2


def _event(
    db: Session,
    job: RenderJob,
    event_type: str,
    payload: dict | None = None,
    request_id: str | None = None,
) -> None:
    db.add(
        ProjectEvent(
            project_id=job.project_id,
            user_id=job.user_id,
            job_id=job.id,
            event_type=event_type,
            payload=payload,
            request_id=request_id,
        )
    )


def _fail_job(
    db: Session,
    job: RenderJob,
    project: Project | None,
    error_type: str,
    error_message: str,
    request_id: str | None,
) -> None:
    now = datetime.now(UTC)
    job.status = "failed"
    job.progress = 100
    job.error_type = error_type
    job.error_message = error_message
    job.finished_at = now
    if project is not None:
        project.status = "failed"
    _event(
        db,
        job,
        "job.failed",
        {"job_type": job.job_type, "error_type": error_type},
        request_id=request_id,
    )


def _retry_or_fail(
    db: Session,
    job: RenderJob,
    project: Project,
    error_type: str,
    error_message: str,
    request_id: str | None,
) -> None:
    if job.attempt >= job.max_attempts:
        _fail_job(db, job, project, error_type, error_message, request_id)
        return

    job.status = "queued"
    job.progress = 0
    job.progress_message = "Retrying after transient failure"
    job.error_type = error_type
    job.error_message = error_message
    project.status = "parsing"
    _event(
        db,
        job,
        "job.retried",
        {"job_type": job.job_type, "error_type": error_type, "attempt": job.attempt},
        request_id=request_id,
    )


@register("parse_midi")
def handle_parse_midi(payload: dict) -> None:
    job_id = uuid.UUID(str(payload["job_id"]))
    request_id = payload.get("trace_id")
    SessionMaker = make_sessionmaker()
    storage = get_storage()

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        if job is None:
            logger.error("job row missing", extra={"event": "job.missing", "job_id": str(job_id)})
            return
        if job.status == "completed":
            logger.info("job already completed", extra={"event": "job.idempotent_skip"})
            return

        project = db.scalar(
            select(Project).where(
                Project.id == job.project_id,
                Project.user_id == job.user_id,
                Project.deleted_at.is_(None),
            )
        )
        if project is None:
            _fail_job(db, job, None, "PROJECT_NOT_FOUND", "Project no longer exists.", request_id)
            db.commit()
            return

        upload = get_uploaded_midi(db, job.project_id, job.user_id)
        if upload is None:
            _fail_job(
                db, job, project, "NO_VALIDATED_UPLOAD", "No uploaded MIDI found.", request_id
            )
            db.commit()
            return

        now = datetime.now(UTC)
        job.status = "processing"
        job.started_at = job.started_at or now
        job.attempt += 1
        job.progress = 10
        job.progress_message = "Downloading MIDI"
        project.status = "parsing"
        _event(db, job, "job.started", {"job_type": job.job_type}, request_id=request_id)
        db.commit()

        try:
            midi_bytes = storage.download(upload.storage_key)
            job.progress = 35
            job.progress_message = "Parsing MIDI"
            db.commit()

            note_data = parse_midi_bytes(midi_bytes)
        except MidiError as exc:
            upload.upload_status = "rejected"
            upload.rejection_reason = exc.code
            _fail_job(db, job, project, exc.code, exc.message, request_id)
            db.commit()
            logger.warning(
                "parse failed",
                extra={"event": "job.failed", "job_id": str(job.id), "error_type": exc.code},
            )
            return
        except ObjectNotFoundError:
            _fail_job(
                db,
                job,
                project,
                "SOURCE_MIDI_MISSING",
                "Uploaded MIDI object is missing from storage.",
                request_id,
            )
            db.commit()
            return
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                project,
                type(exc).__name__,
                "Unexpected parse worker failure.",
                request_id,
            )
            db.commit()
            logger.exception(
                "parse worker transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        notes_key = f"projects/{job.project_id}/notes/v{NOTES_SCHEMA_VERSION}.json"
        try:
            payload_bytes = json.dumps(note_data.to_dict(), separators=(",", ":")).encode()
            storage.upload(notes_key, payload_bytes, "application/json")

            summary = note_data.summary()
            summary["notes_key"] = notes_key
            summary["notes_schema_version"] = NOTES_SCHEMA_VERSION
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                project,
                type(exc).__name__,
                "Could not persist parsed notes.",
                request_id,
            )
            db.commit()
            logger.exception(
                "parse output persist transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        upload.upload_status = "validated"
        project.analysis_summary = summary
        project.status = "ready"
        job.status = "completed"
        job.progress = 100
        job.progress_message = "Notes ready"
        job.finished_at = datetime.now(UTC)
        _event(db, job, "job.completed", {"job_type": job.job_type}, request_id=request_id)
        db.commit()
        logger.info(
            "parse completed",
            extra={"event": "job.completed", "job_id": str(job.id), "job_type": "parse_midi"},
        )
