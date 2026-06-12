"""Expired output cleanup worker handler.

Deletes output_files rows past their expires_at + removes storage objects.
Enqueue via POST /internal/cleanup or cron trigger.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select

from app.db import OutputFile, make_sessionmaker
from app.jobs.registry import register
from app.storage import get_storage

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


@register("cleanup_expired")
def handle_cleanup_expired(payload: dict) -> None:
    storage = get_storage()
    session_factory = make_sessionmaker()
    now = datetime.now(UTC)
    deleted_count = 0

    with session_factory() as db:
        expired = list(
            db.scalars(
                select(OutputFile)
                .where(OutputFile.expires_at.isnot(None), OutputFile.expires_at <= now)
                .limit(BATCH_SIZE)
            )
        )

        for output in expired:
            try:
                storage.delete(output.storage_key)
            except Exception:
                logger.warning(
                    "Failed to delete storage object %s, removing DB row anyway",
                    output.storage_key,
                )
            db.delete(output)
            deleted_count += 1

        db.commit()

    logger.info(
        "Cleanup completed",
        extra={
            "event": "cleanup.done",
            "deleted": deleted_count,
            "remaining": len(expired) == BATCH_SIZE,
        },
    )
