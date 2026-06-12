"""Shared job-control exceptions and output helpers."""

from datetime import UTC, datetime, timedelta

from app.config import get_settings


class RequeueJob(Exception):
    """Handler requests broker redelivery after persisting retry state."""


def output_expiry() -> datetime:
    """expires_at for generated outputs (RISKS.md §C2: 30-day retention)."""
    return datetime.now(UTC) + timedelta(days=get_settings().output_retention_days)
