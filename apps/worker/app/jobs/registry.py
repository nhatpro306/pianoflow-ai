"""Job type → handler registry.

Phase 2: only the noop handler exists, proving the dispatch path.
Real handlers (parse_midi, render_video, ...) register here in Phases 5-8.
"""

import logging
from collections.abc import Callable

logger = logging.getLogger(__name__)

JobHandler = Callable[[dict], None]

_REGISTRY: dict[str, JobHandler] = {}


def register(job_type: str) -> Callable[[JobHandler], JobHandler]:
    def decorator(handler: JobHandler) -> JobHandler:
        if job_type in _REGISTRY:
            raise ValueError(f"Handler already registered for job_type={job_type!r}")
        _REGISTRY[job_type] = handler
        return handler

    return decorator


def get_handler(job_type: str) -> JobHandler | None:
    return _REGISTRY.get(job_type)


@register("noop")
def handle_noop(payload: dict) -> None:
    logger.info("noop job processed", extra={"event": "job.completed", "job_type": "noop"})


# Register real handlers.
from app.jobs import cleanup_expired as _cleanup_expired  # noqa: E402,F401
from app.jobs import parse_midi as _parse_midi  # noqa: E402,F401
from app.jobs import render_sheet as _render_sheet  # noqa: E402,F401
from app.jobs import render_video as _render_video  # noqa: E402,F401
from app.jobs import simplify_midi as _simplify_midi  # noqa: E402,F401
from app.jobs import transcribe_audio as _transcribe_audio  # noqa: E402,F401
