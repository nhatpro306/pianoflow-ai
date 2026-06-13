"""Concrete repositories. Every user-facing query is ownership-scoped:
methods take user_id and filter on it — there is no unscoped variant
(DESIGN.md §8)."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    DailyUsage,
    OutputFile,
    Project,
    ProjectEvent,
    RenderJob,
    UploadedFile,
    User,
)


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_by_email(self, email: str, display_name: str | None = None) -> User:
        user = self.db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, display_name=display_name)
            self.db.add(user)
            self.db.flush()
        return user

    def get_or_create_by_sub(
        self, sub: uuid.UUID, email: str, display_name: str | None = None
    ) -> User:
        user = self.db.get(User, sub)
        if user is None:
            user = User(id=sub, email=email, display_name=display_name)
            self.db.add(user)
            self.db.flush()
        elif user.email != email:
            user.email = email
        return user


class ProjectRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, user_id: uuid.UUID, name: str) -> Project:
        project = Project(user_id=user_id, name=name)
        self.db.add(project)
        self.db.flush()
        return project

    def get(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Project | None:
        return self.db.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.user_id == user_id,
                Project.deleted_at.is_(None),
            )
        )

    def list_for_user(self, user_id: uuid.UUID, limit: int = 20) -> list[Project]:
        return list(
            self.db.scalars(
                select(Project)
                .where(Project.user_id == user_id, Project.deleted_at.is_(None))
                .order_by(Project.created_at.desc())
                .limit(limit)
            )
        )

    def soft_delete(self, project: Project) -> None:
        project.deleted_at = datetime.now(UTC)
        self.db.flush()


class UploadedFileRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **fields) -> UploadedFile:
        record = UploadedFile(**fields)
        self.db.add(record)
        self.db.flush()
        return record

    def get(self, upload_id: uuid.UUID, user_id: uuid.UUID) -> UploadedFile | None:
        return self.db.scalar(
            select(UploadedFile).where(
                UploadedFile.id == upload_id, UploadedFile.user_id == user_id
            )
        )

    def get_validated_for_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID, kind: str | None = None
    ) -> UploadedFile | None:
        statement = select(UploadedFile).where(
            UploadedFile.project_id == project_id,
            UploadedFile.user_id == user_id,
            UploadedFile.upload_status.in_(["uploaded", "validated"]),
        )
        if kind is not None:
            statement = statement.where(UploadedFile.kind == kind)
        return self.db.scalar(statement)


class JobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **fields) -> RenderJob:
        job = RenderJob(**fields)
        self.db.add(job)
        self.db.flush()
        return job

    def get(self, job_id: uuid.UUID, user_id: uuid.UUID) -> RenderJob | None:
        return self.db.scalar(
            select(RenderJob).where(RenderJob.id == job_id, RenderJob.user_id == user_id)
        )

    def find_live_duplicate(
        self, project_id: uuid.UUID, user_id: uuid.UUID, job_type: str, settings_version: int | None
    ) -> RenderJob | None:
        return self.db.scalar(
            select(RenderJob)
            .where(
                RenderJob.project_id == project_id,
                RenderJob.user_id == user_id,
                RenderJob.job_type == job_type,
                RenderJob.settings_version == settings_version,
                RenderJob.status.in_(["queued", "processing"]),
            )
            .order_by(RenderJob.created_at.desc())
        )

    def count_created_since(self, user_id: uuid.UUID, job_type: str, since: datetime) -> int:
        return self.db.scalar(
            select(func.count())
            .select_from(RenderJob)
            .where(
                RenderJob.user_id == user_id,
                RenderJob.job_type == job_type,
                RenderJob.created_at >= since,
            )
        )

    def live_for_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> list[RenderJob]:
        return list(
            self.db.scalars(
                select(RenderJob)
                .where(
                    RenderJob.project_id == project_id,
                    RenderJob.user_id == user_id,
                    RenderJob.status.in_(["queued", "processing"]),
                )
                .order_by(RenderJob.created_at.desc())
            )
        )


class OutputFileRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **fields) -> OutputFile:
        output = OutputFile(**fields)
        self.db.add(output)
        self.db.flush()
        return output

    def get(self, output_id: uuid.UUID, user_id: uuid.UUID) -> OutputFile | None:
        return self.db.scalar(
            select(OutputFile).where(OutputFile.id == output_id, OutputFile.user_id == user_id)
        )

    def list_for_project(
        self, project_id: uuid.UUID, user_id: uuid.UUID, kind: str | None = None
    ) -> list[OutputFile]:
        statement = select(OutputFile).where(
            OutputFile.project_id == project_id,
            OutputFile.user_id == user_id,
        )
        if kind is not None:
            statement = statement.where(OutputFile.kind == kind)
        return list(self.db.scalars(statement.order_by(OutputFile.created_at.desc())))

    def list_for_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> list[OutputFile]:
        return list(
            self.db.scalars(
                select(OutputFile)
                .where(OutputFile.job_id == job_id, OutputFile.user_id == user_id)
                .order_by(OutputFile.created_at.desc())
            )
        )


class ProjectEventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def append(
        self,
        project_id: uuid.UUID,
        event_type: str,
        user_id: uuid.UUID | None = None,
        job_id: uuid.UUID | None = None,
        payload: dict | None = None,
        request_id: str | None = None,
    ) -> ProjectEvent:
        event = ProjectEvent(
            project_id=project_id,
            user_id=user_id,
            job_id=job_id,
            event_type=event_type,
            payload=payload,
            request_id=request_id,
        )
        self.db.add(event)
        self.db.flush()
        return event


class DailyUsageRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_today(self, user_id: uuid.UUID) -> DailyUsage:
        today = date.today()
        row = self.db.scalar(
            select(DailyUsage).where(DailyUsage.user_id == user_id, DailyUsage.date == today)
        )
        if row is None:
            row = DailyUsage(user_id=user_id, date=today)
            self.db.add(row)
            self.db.flush()
        return row

    def increment(self, user_id: uuid.UUID, field: str, amount: int = 1) -> DailyUsage:
        row = self.get_or_create_today(user_id)
        setattr(row, field, getattr(row, field) + amount)
        self.db.flush()
        return row
