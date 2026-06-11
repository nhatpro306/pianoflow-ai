"""audio transcription beta

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-12

Audio → MIDI Beta (docs 09/25): projects gain source_type + transcription
metadata (storage paths only — blobs live in object storage), uploaded_files
gain audio metadata + rights attestation.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("source_type", sa.String(40), nullable=False, server_default="midi_upload"),
    )
    op.add_column("projects", sa.Column("transcription_status", sa.String(20)))
    op.add_column("projects", sa.Column("draft_midi_path", sa.Text()))
    op.add_column("projects", sa.Column("transcription_notes_json_path", sa.Text()))
    op.add_column("projects", sa.Column("transcription_confidence_json_path", sa.Text()))
    op.add_column("projects", sa.Column("transcription_report_json_path", sa.Text()))

    op.add_column("uploaded_files", sa.Column("duration_seconds", sa.Float()))
    op.add_column("uploaded_files", sa.Column("sample_rate", sa.Integer()))
    op.add_column("uploaded_files", sa.Column("channels", sa.SmallInteger()))
    op.add_column(
        "uploaded_files",
        sa.Column("rights_attestation", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("uploaded_files", sa.Column("rights_attested_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("uploaded_files", "rights_attested_at")
    op.drop_column("uploaded_files", "rights_attestation")
    op.drop_column("uploaded_files", "channels")
    op.drop_column("uploaded_files", "sample_rate")
    op.drop_column("uploaded_files", "duration_seconds")

    op.drop_column("projects", "transcription_report_json_path")
    op.drop_column("projects", "transcription_confidence_json_path")
    op.drop_column("projects", "transcription_notes_json_path")
    op.drop_column("projects", "draft_midi_path")
    op.drop_column("projects", "transcription_status")
    op.drop_column("projects", "source_type")
