"""usage_limits table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-12

Phase 9: per-user daily counters for rate limiting / cost control
(DATABASE.md §3). Row per (user_id, day) — counters reset by date.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "usage_limits",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("uploads_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("render_jobs_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("video_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("storage_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "day", name="uq_usage_user_day"),
    )


def downgrade() -> None:
    op.drop_table("usage_limits")
