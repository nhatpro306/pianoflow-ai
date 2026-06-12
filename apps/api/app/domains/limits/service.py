"""Daily usage limits (Phase 9; RISKS.md §6 cost controls).

Counters live in usage_limits (row per user per UTC day — DATABASE.md §3).
Check-and-increment happens inside the caller's transaction: if the request
fails later and rolls back, the increment rolls back with it.
"""

import math
import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import RateLimitedError
from app.infrastructure.database.repositories import UsageLimitRepository


def check_and_count_upload(db: Session, user_id: uuid.UUID) -> None:
    settings = get_settings()
    usage = UsageLimitRepository(db).get_or_create_today(user_id)
    if usage.uploads_count >= settings.uploads_per_day:
        raise RateLimitedError(
            f"Daily upload limit reached ({settings.uploads_per_day}/day). Try again tomorrow.",
            code="UPLOAD_LIMIT_EXCEEDED",
        )
    usage.uploads_count += 1
    db.flush()


def check_and_count_render_job(db: Session, user_id: uuid.UUID, video_seconds: float = 0.0) -> None:
    """Charge one render job (and optional video seconds) against today's caps."""
    settings = get_settings()
    usage = UsageLimitRepository(db).get_or_create_today(user_id)

    if usage.render_jobs_count >= settings.render_jobs_per_day:
        raise RateLimitedError(
            f"Daily job limit reached ({settings.render_jobs_per_day}/day). Try again tomorrow.",
            code="JOB_LIMIT_EXCEEDED",
        )

    seconds = math.ceil(video_seconds)
    if seconds > 0 and usage.video_seconds + seconds > settings.video_seconds_per_day:
        raise RateLimitedError(
            "Daily video rendering budget reached. Try again tomorrow.",
            code="VIDEO_SECONDS_LIMIT_EXCEEDED",
        )

    usage.render_jobs_count += 1
    usage.video_seconds += seconds
    db.flush()
