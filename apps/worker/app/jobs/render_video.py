"""render_video worker handler (VIDEO_TUTORIAL_SPEC.md §5-6, §8).

Single-timeline model: speed scales event times once (music-core
video/timeline.py); the frame renderer and FluidSynth audio both consume the
scaled timeline, so AV drift is structurally impossible. Output: H.264+AAC
MP4, streaming-only (kind video_mp4 — never downloadable).
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audio import AudioRenderError, get_audio_renderer
from app.db import OutputFile, Project, ProjectEvent, RenderJob, make_sessionmaker
from app.jobs.base import RequeueJob
from app.jobs.registry import register
from app.storage import ObjectNotFoundError, get_storage
from app.video_encode import VideoEncodeError, get_video_encoder
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import NoteData
from pianoflow_music.video.frames import RESOLUTIONS, FrameRenderer, RenderConfig
from pianoflow_music.video.timeline import apply_speed, clamp_speed

logger = logging.getLogger(__name__)

_PROGRESS_FRAMES_START = 10
_PROGRESS_FRAMES_END = 85


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


def _render_settings(snapshot: dict | None) -> RenderConfig:
    snapshot = snapshot or {}
    fps = int(snapshot.get("fps", 30))
    return RenderConfig(
        resolution=str(snapshot.get("resolution", "720p")),
        fps=fps if fps in (30, 60) else 30,
        colors=dict(snapshot.get("colors") or {}),
        glow_intensity=float(snapshot.get("glow_intensity", 0.6)),
        keyboard_size=float(snapshot.get("keyboard_size", 1.0)),
        note_fall_speed=float(snapshot.get("note_fall_speed", 1.0)),
    )


@register("render_video")
def handle_render_video(payload: dict) -> None:
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
        job.progress = 2
        job.progress_message = "Preparing timeline & layout"
        _event(db, job, "job.started", {"job_type": job.job_type}, request_id=request_id)
        db.commit()

        speed = clamp_speed(float(snapshot.get("speed_multiplier", 1.0)))
        config = _render_settings(snapshot)

        try:
            note_data = NoteData.from_dict(json.loads(storage.download(notes_key)))
            scaled = apply_speed(note_data, speed)

            job.progress = 5
            job.progress_message = "Rendering piano audio"
            db.commit()
            wav_bytes = get_audio_renderer().render_wav(note_data_to_midi_bytes(scaled))
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
        except AudioRenderError as exc:
            # Permanent per spec §9 — missing synth/soundfont won't fix itself.
            _fail_job(db, job, exc.code, str(exc), request_id)
            db.commit()
            return
        except Exception as exc:
            _retry_or_fail(
                db, job, type(exc).__name__, "Could not prepare video render.", request_id
            )
            db.commit()
            if job.status == "queued":
                raise RequeueJob from exc
            return

        renderer = FrameRenderer(scaled, config)
        width, height = RESOLUTIONS[config.resolution]
        total = renderer.total_frames

        def frame_stream():
            span = _PROGRESS_FRAMES_END - _PROGRESS_FRAMES_START
            step = max(total // 20, 1)
            for index in range(total):
                if index % step == 0:
                    job.progress = _PROGRESS_FRAMES_START + span * index // total
                    job.progress_message = f"Drawing frames ({100 * index // total}%)"
                    db.commit()
                yield renderer.render_frame(index)

        try:
            mp4_bytes = get_video_encoder().encode(
                frame_stream(), width, height, config.fps, wav_bytes
            )
        except VideoEncodeError as exc:
            _fail_job(db, job, exc.code, str(exc), request_id)
            db.commit()
            return
        except Exception as exc:
            _retry_or_fail(db, job, type(exc).__name__, "Video encoding crashed.", request_id)
            db.commit()
            if job.status == "queued":
                raise RequeueJob from exc
            return

        job.progress = 90
        job.progress_message = "Combining audio and video"
        db.commit()

        video_key = f"projects/{job.project_id}/outputs/{job.id}/tutorial.mp4"
        try:
            job.progress = 95
            job.progress_message = "Finalizing MP4"
            db.commit()
            storage.upload(video_key, mp4_bytes, "video/mp4")
            db.add(
                OutputFile(
                    project_id=job.project_id,
                    job_id=job.id,
                    user_id=job.user_id,
                    kind="video_mp4",
                    storage_key=video_key,
                    content_type="video/mp4",
                    size_bytes=len(mp4_bytes),
                    output_metadata={
                        "resolution": config.resolution,
                        "fps": config.fps,
                        "speed_multiplier": speed,
                        "duration_sec": scaled.duration_sec,
                        "download_allowed": False,
                        "streaming_only": True,
                        "access_policy": "private_streaming",
                    },
                )
            )
        except Exception as exc:
            _retry_or_fail(
                db, job, type(exc).__name__, "Could not persist video output.", request_id
            )
            db.commit()
            if job.status == "queued":
                raise RequeueJob from exc
            return

        job.status = "completed"
        job.progress = 100
        job.progress_message = "Tutorial video ready"
        job.finished_at = datetime.now(UTC)
        _event(db, job, "job.completed", {"job_type": job.job_type}, request_id=request_id)
        db.commit()
        logger.info(
            "video completed",
            extra={"event": "job.completed", "job_id": str(job.id), "job_type": "render_video"},
        )
