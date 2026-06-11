"""Job DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class JobOut(BaseModel):
    id: UUID
    project_id: UUID
    job_type: str
    status: str
    progress: int
    progress_message: str | None
    attempt: int
    error_type: str | None
    error_message: str | None
    settings_version: int | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    outputs: list["OutputOut"] = []

    model_config = {"from_attributes": True}


class JobBriefOut(BaseModel):
    id: UUID
    job_type: str
    status: str
    progress: int
    progress_message: str | None = None

    model_config = {"from_attributes": True}


class OutputOut(BaseModel):
    """Output metadata only — no URLs, no raw storage paths.

    Signed URLs are minted on demand via POST /outputs/{id}/download-url
    (downloadable kinds) or /stream-url (video kinds)."""

    id: UUID
    kind: str
    job_id: UUID
    content_type: str
    size_bytes: int
    metadata: dict | None = None
    downloadable: bool
    streamable: bool
    file_expires_at: datetime | None = None
    created_at: datetime


JobOut.model_rebuild()
