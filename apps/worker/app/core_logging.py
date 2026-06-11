"""Structured JSON logging for the worker.

Deliberate thin duplicate of apps/api/app/core/logging.py — the apps stay
independently deployable (CODE_ARCHITECTURE.md §3); revisit extraction into a
shared infra package at Phase 11.
"""

import json
import logging
import sys
from datetime import UTC, datetime

_CONTEXT_FIELDS = (
    "request_id",
    "user_id",
    "project_id",
    "job_id",
    "job_type",
    "duration_ms",
    "error_type",
    "event",
)


class JsonFormatter(logging.Formatter):
    def __init__(self, service: str) -> None:
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "service": self.service,
            "message": record.getMessage(),
        }
        for field in _CONTEXT_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def setup_logging(service: str, level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter(service))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())
