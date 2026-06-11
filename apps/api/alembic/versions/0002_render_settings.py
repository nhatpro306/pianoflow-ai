"""render_settings v2

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "render_settings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("resolution", sa.String(10), nullable=False, server_default="720p"),
        sa.Column("fps", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("speed_multiplier", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="original"),
        sa.Column("show_note_names", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("show_keyboard", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("theme_preset", sa.String(20), nullable=False, server_default="classic"),
        sa.Column("colors", sa.JSON(), nullable=False),
        sa.Column("glow_intensity", sa.Float(), nullable=False, server_default="0.6"),
        sa.Column("note_fall_speed", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("keyboard_size", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("resolution IN ('720p','1080p')", name="chk_settings_resolution"),
        sa.CheckConstraint("fps IN (30,60)", name="chk_settings_fps"),
        sa.CheckConstraint(
            "speed_multiplier >= 0.25 AND speed_multiplier <= 2.0", name="chk_settings_speed"
        ),
    )


def downgrade() -> None:
    op.drop_table("render_settings")
