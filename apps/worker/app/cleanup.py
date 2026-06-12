"""Expired-output lifecycle sweep (Phase 10; RISKS.md §C2).

Outputs carry expires_at (set at creation, retention from config). The sweep
deletes the storage object first, then the row — a crash between the two
leaves only a row pointing at nothing, which the next sweep removes.
Bucket lifecycle rules are the backstop for objects that escape both.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select

from app.db import OutputFile, make_sessionmaker
from app.storage import ObjectNotFoundError, get_storage

logger = logging.getLogger(__name__)

_SWEEP_BATCH = 100


def cleanup_expired_outputs() -> int:
    """Delete expired output rows + objects. Returns the number removed."""
    SessionMaker = make_sessionmaker()
    storage = get_storage()
    removed = 0

    with SessionMaker() as db:
        expired = list(
            db.scalars(
                select(OutputFile)
                .where(OutputFile.expires_at.is_not(None))
                .where(OutputFile.expires_at < datetime.now(UTC))
                .limit(_SWEEP_BATCH)
            )
        )
        for output in expired:
            try:
                storage.delete(output.storage_key)
            except ObjectNotFoundError:
                pass  # already gone — row cleanup is what matters
            except Exception:
                logger.exception(
                    "output object delete failed; will retry next sweep",
                    extra={"event": "cleanup.delete_failed", "output_id": str(output.id)},
                )
                continue
            db.delete(output)
            removed += 1
        db.commit()

    if removed:
        logger.info(
            "expired outputs removed",
            extra={"event": "cleanup.swept", "removed": removed},
        )
    return removed
