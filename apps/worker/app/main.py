"""Worker consume loop."""

import json
import logging
import os
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
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


def run() -> None:
    # Import here so tests can import process_message without logging setup side effects.
    from app.core_logging import setup_logging

    settings = get_settings()
    setup_logging(service="worker", level=settings.log_level)
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    _start_health_server()
    queue = get_queue()
    logger.info("worker started", extra={"event": "worker.started"})

    queue_names = settings.queue_name_list

    while not _shutdown:
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
