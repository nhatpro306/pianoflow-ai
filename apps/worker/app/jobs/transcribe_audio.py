"""transcribe_audio worker handler (Audio → MIDI Beta).

Downloads the rights-attested audio, runs the TranscriptionEngine adapter,
uploads draft MIDI + notes/confidence/report JSON to object storage, inserts
output_files rows, and stamps transcription paths/status on the project.
Postgres stores metadata and storage keys only.
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import (
    OutputFile,
    Project,
    ProjectEvent,
    RenderJob,
    get_uploaded_audio,
    make_sessionmaker,
)
from app.jobs.base import RequeueJob, output_expiry
from app.jobs.registry import register
from app.storage import ObjectNotFoundError, get_storage
from pianoflow_music.transcription import TranscriptionError, get_engine

logger = logging.getLogger(__name__)

DRAFT_MESSAGE = "AI transcription is an editable draft and may need correction."


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
    job.status = "failed"
    job.progress = 100
    job.error_type = error_type
    job.error_message = error_message
    job.finished_at = datetime.now(UTC)
    if project is not None:
        project.status = "failed"
        project.transcription_status = "failed"
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
    project.transcription_status = "queued"
    _event(
        db,
        job,
        "job.retried",
        {"job_type": job.job_type, "error_type": error_type, "attempt": job.attempt},
        request_id=request_id,
    )


@register("transcribe_audio")
def handle_transcribe_audio(payload: dict) -> None:
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

        upload = get_uploaded_audio(db, job.project_id, job.user_id)
        if upload is None:
            _fail_job(
                db, job, project, "NO_VALIDATED_UPLOAD", "No uploaded audio found.", request_id
            )
            db.commit()
            return
        if not upload.rights_attestation:
            _fail_job(
                db,
                job,
                project,
                "RIGHTS_ATTESTATION_REQUIRED",
                "Audio upload is missing rights attestation.",
                request_id,
            )
            db.commit()
            return

        job.status = "processing"
        job.started_at = job.started_at or datetime.now(UTC)
        job.attempt += 1
        job.progress = 10
        job.progress_message = "Downloading audio"
        project.status = "transcribing"
        project.transcription_status = "processing"
        _event(db, job, "job.started", {"job_type": job.job_type}, request_id=request_id)
        db.commit()

        try:
            audio_bytes = storage.download(upload.storage_key)
            job.progress = 35
            job.progress_message = "Transcribing audio to draft MIDI"
            db.commit()

            engine = get_engine("default")
            result = engine.transcribe(audio_bytes, filename=upload.original_name)
        except ObjectNotFoundError:
            _fail_job(
                db,
                job,
                project,
                "SOURCE_AUDIO_MISSING",
                "Uploaded audio object is missing from storage.",
                request_id,
            )
            db.commit()
            return
        except TranscriptionError as exc:
            _fail_job(db, job, project, exc.code, exc.message, request_id)
            db.commit()
            logger.warning(
                "transcription failed",
                extra={"event": "job.failed", "job_id": str(job.id), "error_type": exc.code},
            )
            return
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                project,
                type(exc).__name__,
                "Unexpected transcription worker failure.",
                request_id,
            )
            db.commit()
            logger.exception(
                "transcription transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        prefix = f"projects/{job.project_id}"
        draft_midi_key = f"{prefix}/outputs/{job.id}/transcribed_draft.mid"
        notes_key = f"{prefix}/analysis/transcription_notes.json"
        confidence_key = f"{prefix}/analysis/transcription_confidence.json"
        report_key = f"{prefix}/analysis/transcription_report.json"

        notes_bytes = json.dumps(result.notes.to_dict(), separators=(",", ":")).encode()
        confidence_bytes = json.dumps(result.confidence, separators=(",", ":")).encode()
        report_bytes = json.dumps(result.report, separators=(",", ":")).encode()

        confidence_summary = {
            "overall": result.confidence.get("overall_confidence"),
            "pitch": result.confidence.get("pitch_confidence"),
            "timing": result.confidence.get("timing_confidence"),
        }

        try:
            job.progress = 70
            job.progress_message = "Uploading draft outputs"
            db.commit()

            storage.upload(draft_midi_key, result.draft_midi_bytes, "audio/midi")
            storage.upload(notes_key, notes_bytes, "application/json")
            storage.upload(confidence_key, confidence_bytes, "application/json")
            storage.upload(report_key, report_bytes, "application/json")

            outputs = (
                ("transcribed_draft_midi", draft_midi_key, "audio/midi", result.draft_midi_bytes),
                ("transcription_notes_json", notes_key, "application/json", notes_bytes),
                (
                    "transcription_confidence_json",
                    confidence_key,
                    "application/json",
                    confidence_bytes,
                ),
                ("transcription_report_json", report_key, "application/json", report_bytes),
            )
            for kind, key, content_type, data in outputs:
                metadata: dict = {"engine": result.engine, "message": DRAFT_MESSAGE}
                if kind == "transcription_confidence_json":
                    metadata["confidence_summary"] = confidence_summary
                db.add(
                    OutputFile(
                        project_id=job.project_id,
                        job_id=job.id,
                        user_id=job.user_id,
                        expires_at=output_expiry(),
                        kind=kind,
                        storage_key=key,
                        content_type=content_type,
                        size_bytes=len(data),
                        output_metadata=metadata,
                    )
                )
        except Exception as exc:
            _retry_or_fail(
                db,
                job,
                project,
                type(exc).__name__,
                "Could not persist transcription outputs.",
                request_id,
            )
            db.commit()
            logger.exception(
                "transcription persist transient failure",
                extra={"event": "job.retried", "job_id": str(job.id)},
            )
            if job.status == "queued":
                raise RequeueJob from exc
            return

        upload.upload_status = "validated"
        upload.duration_seconds = result.duration_seconds
        if result.report.get("sample_rate"):
            upload.sample_rate = result.report["sample_rate"]
        if result.report.get("channels"):
            upload.channels = result.report["channels"]

        project.draft_midi_path = draft_midi_key
        project.transcription_notes_json_path = notes_key
        project.transcription_confidence_json_path = confidence_key
        project.transcription_report_json_path = report_key
        project.transcription_status = "completed"
        project.status = "ready"
        # Draft notes feed the existing preview/sheet pipeline.
        summary = result.notes.summary()
        summary["notes_key"] = notes_key
        summary["notes_schema_version"] = result.notes.schema_version
        summary["source"] = "audio_transcription_draft"
        project.analysis_summary = summary

        job.status = "completed"
        job.progress = 100
        job.progress_message = "Draft MIDI ready"
        job.finished_at = datetime.now(UTC)
        _event(db, job, "job.completed", {"job_type": job.job_type}, request_id=request_id)
        db.commit()
        logger.info(
            "transcription completed",
            extra={
                "event": "job.completed",
                "job_id": str(job.id),
                "job_type": "transcribe_audio",
            },
        )
