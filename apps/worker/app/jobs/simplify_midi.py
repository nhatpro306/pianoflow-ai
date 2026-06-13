"""simplify_midi worker handler."""

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
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import NoteData
from pianoflow_music.simplify import simplify_note_data

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


@register("simplify_midi")
def handle_simplify_midi(payload: dict) -> None:
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
        notes_key = summary.get("notes_key")
        if not notes_key:
            _fail_job(db, job, "NOTES_NOT_READY", "Parsed notes are not ready.", request_id)
            db.commit()
            return

        snapshot = job.settings_snapshot or {}
        difficulty = str(snapshot.get("difficulty", "original"))
        if difficulty == "original":
            _fail_job(
                db,
                job,
                "INVALID_DIFFICULTY",
                "Simplification requires easy or very_easy difficulty.",
                request_id,
            )
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
            job.progress = 50
            job.progress_message = "Applying beginner rules"
            db.commit()
            simplified = simplify_note_data(note_data, difficulty)  # type: ignore[arg-type]
            midi_bytes = note_data_to_midi_bytes(simplified)
            notes_bytes = json.dumps(
                simplified.to_dict(), separators=(",", ":"), ensure_ascii=False
            ).encode()
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
        except ValueError as exc:
            _fail_job(db, job, "INVALID_DIFFICULTY", str(exc), request_id)
            db.commit()
            return
        except Exception as exc:
            _retry_or_fail(db, job, type(exc).__name__, "Could not simplify MIDI.", request_id)
            db.commit()
            if job.status == "queued":
                raise RequeueJob from exc
            return

        notes_out_key = f"projects/{job.project_id}/notes/v2.simplified-{difficulty}.json"
        midi_key = f"projects/{job.project_id}/outputs/{job.id}/simplified-{difficulty}.mid"
        try:
            job.progress = 80
            job.progress_message = "Saving simplified files"
            db.commit()
            storage.upload(notes_out_key, notes_bytes, "application/json")
            storage.upload(midi_key, midi_bytes, "audio/midi")

            summary = dict(project.analysis_summary or {})
            simplified_notes = dict(summary.get("simplified_notes_keys") or {})
            simplified_notes[difficulty] = notes_out_key
            summary["simplified_notes_keys"] = simplified_notes
            summary.setdefault("simplified_note_counts", {})[difficulty] = len(simplified.notes)
            project.analysis_summary = summary

            db.add(
                OutputFile(
                    project_id=job.project_id,
                    job_id=job.id,
                    user_id=job.user_id,
                    kind="simplified_midi",
                    storage_key=midi_key,
                    content_type="audio/midi",
                    size_bytes=len(midi_bytes),
                    output_metadata={
                        "difficulty": difficulty,
                        "download_allowed": True,
                        "source_note_count": len(note_data.notes),
                        "output_note_count": len(simplified.notes),
                    },
                )
            )
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                type(exc).__name__,
                "Could not persist simplified MIDI.",
                request_id,
            )
            db.commit()
            if job.status == "queued":
                raise RequeueJob from exc
            return

        job.status = "completed"
        job.progress = 100
        job.progress_message = "Beginner version ready"
        job.finished_at = datetime.now(UTC)
        _event(db, job, "job.completed", {"job_type": job.job_type}, request_id=request_id)
        db.commit()
        logger.info(
            "simplify completed",
            extra={"event": "job.completed", "job_id": str(job.id), "job_type": "simplify_midi"},
        )
