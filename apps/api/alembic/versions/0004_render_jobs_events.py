"""render_jobs and project_events

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "render_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_type", sa.String(40), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("progress", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("progress_message", sa.Text()),
        sa.Column("settings_snapshot", sa.JSON()),
        sa.Column("settings_version", sa.Integer()),
        sa.Column("attempt", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("error_type", sa.String(80)),
        sa.Column("error_message", sa.Text()),
        sa.Column("queue_name", sa.String(80), nullable=False, server_default="q_default"),
        sa.Column("broker_message_id", sa.String(120)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_jobs_project", "render_jobs", ["project_id", "created_at"])
    op.create_index("idx_jobs_status", "render_jobs", ["status"])
    op.create_index(
        "uq_jobs_live",
        "render_jobs",
        ["project_id", "job_type", "settings_version"],
        unique=True,
        postgresql_where=sa.text("status IN ('queued','processing')"),
        sqlite_where=sa.text("status IN ('queued','processing')"),
    )

    op.create_table(
        "project_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid()),
        sa.Column("job_id", sa.Uuid()),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON()),
        sa.Column("request_id", sa.String(80)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_events_project", "project_events", ["project_id", "id"])


def downgrade() -> None:
    op.drop_table("project_events")
    op.drop_index("uq_jobs_live", table_name="render_jobs")
    op.drop_index("idx_jobs_status", table_name="render_jobs")
    op.drop_index("idx_jobs_project", table_name="render_jobs")
    op.drop_table("render_jobs")
