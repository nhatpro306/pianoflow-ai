"""daily usage tracking

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-12

Phase 9: per-user daily counters for rate limiting (uploads, render jobs,
video seconds, transcriptions).
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
        "daily_usage",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("uploads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("render_jobs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("video_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("transcriptions", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "date", name="uq_daily_usage_user_date"),
    )
    op.create_index("idx_daily_usage_user_date", "daily_usage", ["user_id", "date"])


def downgrade() -> None:
    op.drop_index("idx_daily_usage_user_date", "daily_usage")
    op.drop_table("daily_usage")
