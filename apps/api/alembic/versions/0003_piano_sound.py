"""piano sound, volume, reverb on render_settings

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "render_settings",
        sa.Column("piano_sound", sa.String(20), nullable=False, server_default="concert_grand"),
    )
    op.add_column(
        "render_settings",
        sa.Column("volume", sa.Float(), nullable=False, server_default="0.8"),
    )
    op.add_column(
        "render_settings",
        sa.Column("reverb", sa.String(10), nullable=False, server_default="light"),
    )


def downgrade() -> None:
    op.drop_column("render_settings", "reverb")
    op.drop_column("render_settings", "volume")
    op.drop_column("render_settings", "piano_sound")
