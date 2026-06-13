"""Liveness, readiness, and internal metrics endpoints.

/healthz            : process is alive (no dependencies touched).
/readyz             : dependencies reachable (DB, queue). Used by deploy health checks.
/internal/metrics   : operational counters (no auth — internal network only in prod).
"""

import redis
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.database.models import OutputFile, Project, RenderJob, UploadedFile, User
from app.infrastructure.database.session import get_db

router = APIRouter()


def _require_metrics_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Gate /internal/metrics. With a token configured, a mismatching or
    missing header returns 404 so the endpoint's existence isn't disclosed.
    Open only when no token is set (local dev)."""
    token = get_settings().internal_metrics_token
    if token and x_internal_token != token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")


@router.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
def readyz(response: Response) -> dict:
    settings = get_settings()
    checks: dict[str, str] = {}

    try:
        from sqlalchemy import create_engine

        engine = create_engine(settings.database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        # Include the driver message (psycopg never echoes the password in its
        # errors) so connection problems are diagnosable without log access.
        detail = str(exc).splitlines()[0][:200] if str(exc) else ""
        checks["database"] = f"error: {type(exc).__name__}: {detail}".rstrip(": ")

    try:
        r = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=2)
        r.ping()
        checks["queue"] = "ok"
    except Exception as exc:
        checks["queue"] = f"error: {type(exc).__name__}"

    ready = all(v == "ok" for v in checks.values())
    response.status_code = 200 if ready else 503
    return {"status": "ready" if ready else "not_ready", "checks": checks}


@router.get("/internal/metrics", dependencies=[Depends(_require_metrics_token)])
def metrics(db: Session = Depends(get_db)) -> dict:
    users_total = db.scalar(select(func.count()).select_from(User)) or 0
    projects_total = (
        db.scalar(select(func.count()).select_from(Project).where(Project.deleted_at.is_(None)))
        or 0
    )
    uploads_total = db.scalar(select(func.count()).select_from(UploadedFile)) or 0

    jobs_by_status = dict(
        db.execute(select(RenderJob.status, func.count()).group_by(RenderJob.status)).all()
    )

    outputs_total = db.scalar(select(func.count()).select_from(OutputFile)) or 0
    storage_bytes = (
        db.scalar(select(func.coalesce(func.sum(OutputFile.size_bytes), 0)).select_from(OutputFile))
        or 0
    )

    return {
        "users_total": users_total,
        "projects_total": projects_total,
        "uploads_total": uploads_total,
        "jobs_by_status": jobs_by_status,
        "outputs_total": outputs_total,
        "storage_bytes_total": storage_bytes,
    }
