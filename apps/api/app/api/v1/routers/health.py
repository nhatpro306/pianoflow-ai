"""Liveness and readiness endpoints.

/healthz : process is alive (no dependencies touched).
/readyz  : dependencies reachable (DB, queue). Used by deploy health checks.
"""

import redis
from fastapi import APIRouter, Response
from sqlalchemy import create_engine, text

from app.core.config import get_settings

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
def readyz(response: Response) -> dict:
    settings = get_settings()
    checks: dict[str, str] = {}

    try:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {type(exc).__name__}"

    try:
        r = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=2)
        r.ping()
        checks["queue"] = "ok"
    except Exception as exc:
        checks["queue"] = f"error: {type(exc).__name__}"

    ready = all(v == "ok" for v in checks.values())
    response.status_code = 200 if ready else 503
    return {"status": "ready" if ready else "not_ready", "checks": checks}
