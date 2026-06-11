"""Pydantic DTOs for project routes (API.md §1)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.domains.jobs.schemas import JobBriefOut


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectOut(BaseModel):
    id: UUID
    name: str
    status: str
    analysis_summary: dict | None
    active_jobs: list[JobBriefOut] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    next_cursor: str | None = None
