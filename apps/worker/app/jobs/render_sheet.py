"""render_sheet worker handler."""

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import OutputFile, Project, ProjectEvent, RenderJob, make_sessionmaker
from app.jobs.base import RequeueJob
from app.jobs.registry import register
from app.storage import ObjectNotFoundError, get_storage
from pianoflow_music.notes.model import NoteData
from pianoflow_music.sheet.musicxml import note_data_to_musicxml
from pianoflow_music.sheet.pdf import note_data_to_simple_pdf

logger = logging.getLogger(__name__)


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
    error_type: str,
    error_message: str,
    request_id: str | None,
) -> None:
    job.status = "failed"
    job.progress = 100
    job.error_type = error_type
    job.error_message = error_message
    job.finished_at = datetime.now(UTC)
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
    error_type: str,
    error_message: str,
    request_id: str | None,
) -> None:
    if job.attempt >= job.max_attempts:
        _fail_job(db, job, error_type, error_message, request_id)
        return
    job.status = "queued"
    job.progress = 0
    job.progress_message = "Retrying after transient failure"
    job.error_type = error_type
    job.error_message = error_message
    _event(
        db,
        job,
        "job.retried",
        {"job_type": job.job_type, "error_type": error_type, "attempt": job.attempt},
        request_id=request_id,
    )


@register("render_sheet")
def handle_render_sheet(payload: dict) -> None:
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
            _fail_job(db, job, "PROJECT_NOT_FOUND", "Project no longer exists.", request_id)
            db.commit()
            return

        summary = project.analysis_summary or {}
        snapshot = job.settings_snapshot or {}
        difficulty = snapshot.get("difficulty", "original")

        if difficulty in ("easy", "very_easy"):
            notes_key = (summary.get("simplified_notes") or {}).get(difficulty)
            if not notes_key:
                _fail_job(
                    db,
                    job,
                    "SIMPLIFIED_NOTES_NOT_READY",
                    f"Simplified notes ({difficulty}) not ready. Run simplify-midi first.",
                    request_id,
                )
                db.commit()
                return
        else:
            notes_key = summary.get("notes_key")
            if not notes_key:
                _fail_job(db, job, "NOTES_NOT_READY", "Parsed notes are not ready.", request_id)
                db.commit()
                return

        job.status = "processing"
        job.started_at = job.started_at or datetime.now(UTC)
        job.attempt += 1
        job.progress = 10
        job.progress_message = "Loading parsed notes"
        _event(db, job, "job.started", {"job_type": job.job_type}, request_id=request_id)
        db.commit()

        try:
            note_data = NoteData.from_dict(json.loads(storage.download(notes_key)))
            job.progress = 45
            job.progress_message = "Writing MusicXML"
            db.commit()
            musicxml = note_data_to_musicxml(note_data, title=project.name)
            job.progress = 75
            job.progress_message = "Writing PDF"
            db.commit()
            pdf = note_data_to_simple_pdf(note_data, title=project.name)
        except ObjectNotFoundError:
            _fail_job(
                db,
                job,
                "NOTES_OBJECT_MISSING",
                "Parsed notes object is missing from storage.",
                request_id,
            )
            db.commit()
            return
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                type(exc).__name__,
                "Could not render sheet outputs.",
                request_id,
            )
            db.commit()
            logger.exception(
                "sheet render transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        musicxml_key = f"projects/{job.project_id}/outputs/{job.id}/sheet.musicxml"
        pdf_key = f"projects/{job.project_id}/outputs/{job.id}/sheet.pdf"
        try:
            storage.upload(musicxml_key, musicxml, "application/vnd.recordare.musicxml+xml")
            storage.upload(pdf_key, pdf, "application/pdf")
            db.add(
                OutputFile(
                    project_id=job.project_id,
                    job_id=job.id,
                    user_id=job.user_id,
                    kind="sheet_musicxml",
                    storage_key=musicxml_key,
                    content_type="application/vnd.recordare.musicxml+xml",
                    size_bytes=len(musicxml),
                    output_metadata={"source": "pianoflow_music.sheet.musicxml"},
                )
            )
            db.add(
                OutputFile(
                    project_id=job.project_id,
                    job_id=job.id,
                    user_id=job.user_id,
                    kind="sheet_pdf",
                    storage_key=pdf_key,
                    content_type="application/pdf",
                    size_bytes=len(pdf),
                    output_metadata={"source": "simple_pdf_fallback"},
                )
            )
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                type(exc).__name__,
                "Could not persist sheet outputs.",
                request_id,
            )
            db.commit()
            logger.exception(
                "sheet output persist transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        job.status = "completed"
        job.progress = 100
        job.progress_message = "Sheet ready"
        job.finished_at = datetime.now(UTC)
        _event(db, job, "job.completed", {"job_type": job.job_type}, request_id=request_id)
        db.commit()
        logger.info(
            "sheet completed",
            extra={"event": "job.completed", "job_id": str(job.id), "job_type": "render_sheet"},
        )
