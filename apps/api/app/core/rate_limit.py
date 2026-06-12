"""Daily rate-limit dependencies (Phase 9).

Each factory returns a FastAPI dependency that checks the user's daily counter
against the configured cap and raises 429 if exceeded.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import CurrentUser, get_current_user
from app.infrastructure.database.repositories import DailyUsageRepository
from app.infrastructure.database.session import get_db

_LIMIT_MAP = {
    "uploads": "uploads_per_day",
    "render_jobs": "render_jobs_per_day",
    "video_seconds": "video_seconds_per_day",
    "transcriptions": "transcriptions_per_day",
}


def _check_limit(
    field: str,
    db: Session,
    user: CurrentUser,
) -> None:
    settings = get_settings()
    cap = getattr(settings, _LIMIT_MAP[field])
    usage = DailyUsageRepository(db).get_or_create_today(user.id)
    current = getattr(usage, field)
    if current >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily {field} limit reached ({cap}).",
        )


def require_upload_quota(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    _check_limit("uploads", db, user)
    return user


def require_render_quota(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    _check_limit("render_jobs", db, user)
    return user


def require_transcription_quota(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    _check_limit("transcriptions", db, user)
    return user


def record_usage(db: Session, user_id, field: str, amount: int = 1) -> None:
    DailyUsageRepository(db).increment(user_id, field, amount)
