"""SQLAlchemy models (DATABASE.md §3).

Uses portable column types (sa.Uuid, sa.JSON) so the same models run on
Postgres (prod) and SQLite (fast tests). Phase 3 scope: users, projects,
uploaded_files. Jobs/outputs/settings tables arrive with their phases.
"""

import uuid
from datetime import UTC, date, datetime
from typing import ClassVar

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON


def utcnow() -> datetime:
    return datetime.now(UTC)


def utctoday() -> date:
    return datetime.now(UTC).date()


class Base(DeclarativeBase):
    type_annotation_map: ClassVar = {dict: JSON}


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120))
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False, default="midi_upload")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="created")
    analysis_summary: Mapped[dict | None] = mapped_column(JSON)
    preview_image_key: Mapped[str | None] = mapped_column(Text)
    # Audio → MIDI Beta: storage paths only — blobs live in object storage.
    transcription_status: Mapped[str | None] = mapped_column(String(20))
    draft_midi_path: Mapped[str | None] = mapped_column(Text)
    transcription_notes_json_path: Mapped[str | None] = mapped_column(Text)
    transcription_confidence_json_path: Mapped[str | None] = mapped_column(Text)
    transcription_report_json_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("idx_projects_user", "user_id", "created_at"),)


class RenderSettings(Base):
    """Settings v2 (VIDEO_TUTORIAL_SPEC.md §3). One row per project, lazily
    created with defaults on first read. `version` bumps on every PATCH so
    job snapshots can reference it."""

    __tablename__ = "render_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    resolution: Mapped[str] = mapped_column(String(10), nullable=False, default="720p")
    fps: Mapped[int] = mapped_column(nullable=False, default=30)
    speed_multiplier: Mapped[float] = mapped_column(nullable=False, default=1.0)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="original")
    show_note_names: Mapped[bool] = mapped_column(nullable=False, default=True)
    show_keyboard: Mapped[bool] = mapped_column(nullable=False, default=True)
    theme_preset: Mapped[str] = mapped_column(String(20), nullable=False, default="classic")
    colors: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    piano_sound: Mapped[str] = mapped_column(String(20), nullable=False, default="concert_grand")
    volume: Mapped[float] = mapped_column(nullable=False, default=0.8)
    reverb: Mapped[str] = mapped_column(String(10), nullable=False, default="light")
    glow_intensity: Mapped[float] = mapped_column(nullable=False, default=0.6)
    note_fall_speed: Mapped[float] = mapped_column(nullable=False, default=1.0)
    keyboard_size: Mapped[float] = mapped_column(nullable=False, default=1.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="midi")
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64))
    upload_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    duration_seconds: Mapped[float | None] = mapped_column()
    sample_rate: Mapped[int | None] = mapped_column(Integer)
    channels: Mapped[int | None] = mapped_column(SmallInteger)
    rights_attestation: Mapped[bool] = mapped_column(nullable=False, default=False)
    rights_attested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (Index("idx_uploaded_files_project", "project_id"),)


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    progress: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    progress_message: Mapped[str | None] = mapped_column(Text)
    settings_snapshot: Mapped[dict | None] = mapped_column(JSON)
    settings_version: Mapped[int | None] = mapped_column()
    attempt: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=3)
    error_type: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    queue_name: Mapped[str] = mapped_column(String(80), nullable=False, default="q_default")
    broker_message_id: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("idx_jobs_project", "project_id", "created_at"),
        Index("idx_jobs_status", "status"),
    )


class OutputFile(Base):
    __tablename__ = "output_files"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("render_jobs.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    output_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("idx_outputs_project", "project_id", "created_at"),
        Index("idx_outputs_expiry", "expires_at"),
    )


class UsageLimit(Base):
    """Per-user daily counters (DATABASE.md §3): row per (user, day) —
    counters reset by date, no cron needed."""

    __tablename__ = "usage_limits"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[date] = mapped_column(Date, nullable=False, default=utctoday)
    uploads_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    render_jobs_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    video_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_usage_user_day"),)


class ProjectEvent(Base):
    __tablename__ = "project_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    job_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)
    request_id: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (Index("idx_events_project", "project_id", "id"),)
