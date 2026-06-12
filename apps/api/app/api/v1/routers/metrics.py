"""Internal metrics summary (Phase 10; DESIGN.md §metrics).

Protected by a shared token outside dev: callers send
`X-Internal-Token: <INTERNAL_METRICS_TOKEN>`. Good enough for an uptime
check + portfolio dashboard; CloudWatch replaces this at the AWS stage.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ForbiddenError
from app.infrastructure.database.models import OutputFile, Project, RenderJob, User
from app.infrastructure.database.session import get_db
from app.infrastructure.queue.base import QueueError, QueueService
from app.infrastructure.queue.factory import get_queue

router = APIRouter(prefix="/internal", tags=["internal"])

_QUEUES = ("q_default", "q_audio")


def _require_token(request: Request) -> None:
    settings = get_settings()
    if settings.env == "dev" and not settings.internal_metrics_token:
        return
    token = request.headers.get("X-Internal-Token", "")
    if not settings.internal_metrics_token or token != settings.internal_metrics_token:
        raise ForbiddenError("Internal metrics require a valid token.", code="FORBIDDEN")


@router.get("/metrics")
def internal_metrics(
    request: Request,
    db: Session = Depends(get_db),
    queue: QueueService = Depends(get_queue),
) -> dict:
    _require_token(request)
    since = datetime.now(UTC) - timedelta(hours=24)

    job_counts = {
        status: count
        for status, count in db.execute(
            select(RenderJob.status, func.count())
            .where(RenderJob.created_at >= since)
            .group_by(RenderJob.status)
        )
    }
    failures_by_type = {
        (error_type or "UNKNOWN"): count
        for error_type, count in db.execute(
            select(RenderJob.error_type, func.count())
            .where(RenderJob.created_at >= since, RenderJob.status == "failed")
            .group_by(RenderJob.error_type)
        )
    }

    queue_depths: dict[str, int | None] = {}
    for name in _QUEUES:
        try:
            queue_depths[name] = queue.depth(name)
        except (QueueError, NotImplementedError):
            queue_depths[name] = None

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "window_hours": 24,
        "jobs_by_status": job_counts,
        "failures_by_type": failures_by_type,
        "queue_depths": queue_depths,
        "totals": {
            "users": db.scalar(select(func.count()).select_from(User)),
            "projects": db.scalar(
                select(func.count()).select_from(Project).where(Project.deleted_at.is_(None))
            ),
            "output_files": db.scalar(select(func.count()).select_from(OutputFile)),
            "output_bytes": int(
                db.scalar(select(func.coalesce(func.sum(OutputFile.size_bytes), 0)))
            ),
        },
    }
