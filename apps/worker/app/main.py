"""Worker consume loop."""

import json
import logging
import os
import shutil
import signal
import sys
import tempfile
import threading
import time
import uuid
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Literal

from app.config import get_settings
from app.jobs.base import RequeueJob
from app.jobs.registry import get_handler
from app.queue import MessageHeartbeat, QueueError, get_queue

logger = logging.getLogger(__name__)

POLL_TIMEOUT_SECONDS = 5
DEFAULT_JOB_VISIBILITY_SECONDS = 900

_shutdown = False


def _handle_signal(signum: int, frame: object) -> None:
    global _shutdown
    logger.info("shutdown signal received", extra={"event": "worker.shutdown_requested"})
    _shutdown = True


ProcessResult = Literal["ack", "drop", "requeue"]


def _should_skip_duplicate(payload: dict) -> bool:
    job_id_raw = payload.get("job_id")
    if not job_id_raw:
        return False
    try:
        job_id = uuid.UUID(str(job_id_raw))
    except (ValueError, TypeError):
        return False

    try:
        from app.db import RenderJob, make_sessionmaker

        SessionMaker = make_sessionmaker()
        with SessionMaker() as db:
            job = db.get(RenderJob, job_id)
            if job is None:
                return False
            if job.status == "completed":
                logger.info(
                    "job already completed, skipping duplicate",
                    extra={"event": "job.duplicate_completed_skip", "job_id": str(job_id)},
                )
                return True
            if job.status == "processing" and job.started_at is not None:
                now = datetime.now(UTC)
                started_at = (
                    job.started_at if job.started_at.tzinfo else job.started_at.replace(tzinfo=UTC)
                )
                elapsed = (now - started_at).total_seconds()
                if 0 <= elapsed <= 120:
                    logger.warning(
                        "job already processing within 120s, skipping duplicate execution",
                        extra={
                            "event": "job.duplicate_processing_skip",
                            "job_id": str(job_id),
                            "elapsed_seconds": elapsed,
                        },
                    )
                    return True
    except Exception:
        logger.debug("duplicate guard check skipped (db query error)")
    return False


def _record_worker_crash(payload: dict, exc: Exception) -> None:
    job_id_raw = payload.get("job_id")
    if not job_id_raw:
        return
    try:
        job_id = uuid.UUID(str(job_id_raw))
    except (ValueError, TypeError):
        return

    try:
        from app.db import ProjectEvent, RenderJob, make_sessionmaker

        SessionMaker = make_sessionmaker()
        with SessionMaker() as db:
            job = db.get(RenderJob, job_id)
            if job is not None and job.status != "completed":
                job.status = "failed"
                job.progress = 100
                job.error_type = "WORKER_CRASH"
                job.error_message = str(exc)
                job.finished_at = datetime.now(UTC)
                trace_id = payload.get("trace_id")
                db.add(
                    ProjectEvent(
                        project_id=job.project_id,
                        user_id=job.user_id,
                        job_id=job.id,
                        event_type="job.failed",
                        payload={
                            "job_type": job.job_type,
                            "error_type": "WORKER_CRASH",
                            "error": str(exc),
                        },
                        request_id=trace_id,
                    )
                )
                db.commit()
                logger.info(
                    "updated job status to failed after worker crash",
                    extra={"event": "job.marked_crashed", "job_id": str(job_id)},
                )
    except Exception:
        logger.exception(
            "failed to record worker crash in db",
            extra={"event": "job.record_crash_failed", "job_id": str(job_id_raw)},
        )


def process_payload(payload: dict) -> ProcessResult:
    job_type = payload.get("job_type", "")
    handler = get_handler(job_type)
    if handler is None:
        logger.error(
            "no handler for job type",
            extra={"event": "job.unknown_type", "job_type": job_type},
        )
        return "drop"

    if _should_skip_duplicate(payload):
        return "ack"

    try:
        handler(payload)
    except RequeueJob:
        logger.warning(
            "job requested retry",
            extra={"event": "job.retry_requested", "job_type": job_type},
        )
        return "requeue"
    except Exception as exc:
        logger.exception(
            "job handler crashed",
            extra={"event": "job.handler_crashed", "job_type": job_type},
        )
        _record_worker_crash(payload, exc)
        return "drop"
    return "ack"


def process_message(raw: bytes) -> None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("undecodable message dropped", extra={"event": "job.bad_payload"})
        return

    process_payload(payload)


def _start_health_server() -> None:
    """Serve /healthz when $PORT is set (Render free tier has no background
    workers — the worker deploys as a web service and must answer health
    checks). No-op for real background-worker deployments."""
    port = os.environ.get("PORT")
    if not port:
        return

    class _Health(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            status = 200 if self.path in ("/", "/healthz") else 404
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok","service":"worker"}')

        def log_message(self, format: str, *args: object) -> None:
            return  # keep health-check spam out of worker logs

    server = HTTPServer(("0.0.0.0", int(port)), _Health)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    logger.info("health server listening", extra={"event": "worker.health_server", "port": port})


def _cleanup_stale_temp_files(directories: list[Path] | None = None) -> int:
    """Clean up stale temporary files and directories on container start.

    Prevents disk leaks on small EC2/Render instances from previous crashes
    or abnormal terminations (e.g. /tmp/pf-*, /tmp/pf-video-*).
    """
    candidate_dirs = (
        directories if directories is not None else [Path(tempfile.gettempdir()), Path("/tmp")]
    )
    cleaned_count = 0
    seen_dirs: set[Path] = set()
    for base_dir in candidate_dirs:
        try:
            resolved = base_dir.resolve()
        except OSError:
            resolved = base_dir
        if resolved in seen_dirs or not base_dir.is_dir():
            continue
        seen_dirs.add(resolved)
        try:
            for item in base_dir.iterdir():
                if item.name.startswith("pf-"):
                    try:
                        if item.is_dir():
                            shutil.rmtree(item, ignore_errors=True)
                        else:
                            item.unlink(missing_ok=True)
                        cleaned_count += 1
                    except OSError as exc:
                        logger.debug(
                            "Failed to remove temp file %s: %s",
                            item,
                            exc,
                            extra={"event": "worker.temp_cleanup_failed", "path": str(item)},
                        )
        except OSError as exc:
            logger.debug(
                "Failed to list temp directory %s: %s",
                base_dir,
                exc,
                extra={"event": "worker.temp_list_failed", "dir": str(base_dir)},
            )

    if cleaned_count > 0:
        logger.info(
            "cleaned up stale temporary files on startup",
            extra={"event": "worker.stale_temp_cleaned", "count": cleaned_count},
        )
    return cleaned_count


def run() -> None:
    # Import here so tests can import process_message without logging setup side effects.
    from app.core_logging import setup_logging

    settings = get_settings()
    setup_logging(service="worker", level=settings.log_level)
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    _cleanup_stale_temp_files()
    _start_health_server()
    queue = get_queue()
    logger.info("worker started", extra={"event": "worker.started"})

    queue_names = settings.queue_name_list
    visibility_timeout = settings.job_visibility_seconds
    poll_wait = settings.poll_wait_seconds

    while not _shutdown:
        try:
            # Polling across configured queues.
            message = queue.receive(
                queue_names,
                visibility_timeout=visibility_timeout,
                wait_time_seconds=poll_wait,
            )
        except QueueError as exc:
            logger.warning(
                "queue poll error, retrying",
                extra={"event": "worker.poll_error", "error_type": type(exc).__name__},
            )
            time.sleep(1)
            continue
        if message is None:
            continue

        try:
            with MessageHeartbeat(
                queue=queue,
                message=message,
                interval_seconds=30.0,
                visibility_timeout=visibility_timeout,
            ):
                result = process_payload(message.body)
        except Exception as exc:
            logger.exception(
                "unexpected exception in message processing",
                extra={"event": "worker.unexpected_job_exception"},
            )
            _record_worker_crash(message.body, exc)
            result = "drop"

        if result == "ack":
            queue.ack(message)
        elif result == "requeue":
            queue.nack(message, requeue=True)
        else:
            queue.nack(message, requeue=False)

    logger.info("worker stopped", extra={"event": "worker.stopped"})


if __name__ == "__main__":
    sys.exit(run())
