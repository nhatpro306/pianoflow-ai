"""Worker consume loop."""

import json
import logging
import signal
import sys
import time
from typing import Literal

from app.config import get_settings
from app.jobs.base import RequeueJob
from app.jobs.registry import get_handler
from app.queue import QueueError, get_queue

logger = logging.getLogger(__name__)

POLL_TIMEOUT_SECONDS = 5

_shutdown = False


def _handle_signal(signum: int, frame: object) -> None:
    global _shutdown
    logger.info("shutdown signal received", extra={"event": "worker.shutdown_requested"})
    _shutdown = True


ProcessResult = Literal["ack", "drop", "requeue"]


def process_payload(payload: dict) -> ProcessResult:
    job_type = payload.get("job_type", "")
    handler = get_handler(job_type)
    if handler is None:
        logger.error(
            "no handler for job type",
            extra={"event": "job.unknown_type", "job_type": job_type},
        )
        return "drop"

    try:
        handler(payload)
    except RequeueJob:
        logger.warning(
            "job requested retry",
            extra={"event": "job.retry_requested", "job_type": job_type},
        )
        return "requeue"
    except Exception:
        logger.exception(
            "job handler crashed",
            extra={"event": "job.handler_crashed", "job_type": job_type},
        )
        return "drop"
    return "ack"


def process_message(raw: bytes) -> None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("undecodable message dropped", extra={"event": "job.bad_payload"})
        return

    process_payload(payload)


def run() -> None:
    # Import here so tests can import process_message without logging setup side effects.
    from app.core_logging import setup_logging

    settings = get_settings()
    setup_logging(service="worker", level=settings.log_level)
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    queue = get_queue()
    logger.info("worker started", extra={"event": "worker.started"})

    queue_names = settings.queue_name_list
    last_cleanup = 0.0  # run a sweep on the first idle moment after boot

    while not _shutdown:
        # Lifecycle sweep between polls (RISKS.md §C2) — cheap no-op when
        # nothing has expired; never lets a sweep failure kill the loop.
        if time.monotonic() - last_cleanup >= settings.cleanup_interval_seconds or not last_cleanup:
            last_cleanup = time.monotonic()
            try:
                from app.cleanup import cleanup_expired_outputs

                cleanup_expired_outputs()
            except Exception:
                logger.exception("cleanup sweep failed", extra={"event": "cleanup.failed"})

        try:
            # Single blocking pop across all queues (BLPOP key order = priority).
            message = queue.receive(queue_names, visibility_timeout=POLL_TIMEOUT_SECONDS)
        except QueueError as exc:
            logger.warning(
                "queue poll error, retrying",
                extra={"event": "worker.poll_error", "error_type": type(exc).__name__},
            )
            time.sleep(1)
            continue
        if message is None:
            continue
        result = process_payload(message.body)
        if result == "ack":
            queue.ack(message)
        elif result == "requeue":
            queue.nack(message, requeue=True)
        else:
            queue.nack(message, requeue=False)

    logger.info("worker stopped", extra={"event": "worker.stopped"})


if __name__ == "__main__":
    sys.exit(run())
