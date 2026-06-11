"""Project CRUD (API.md §1)."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.security import CurrentUser, get_current_user
from app.domains.jobs.schemas import JobBriefOut
from app.domains.projects.schemas import ProjectCreate, ProjectListOut, ProjectOut
from app.infrastructure.database.models import Project
from app.infrastructure.database.repositories import JobRepository, ProjectRepository
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _project_out(db: Session, project: Project, include_jobs: bool = False) -> ProjectOut:
    active_jobs = []
    if include_jobs:
        active_jobs = [
            JobBriefOut.model_validate(job)
            for job in JobRepository(db).live_for_project(project.id, project.user_id)
        ]
    return ProjectOut(
        id=project.id,
        name=project.name,
        status=project.status,
        analysis_summary=project.analysis_summary,
        active_jobs=active_jobs,
        created_at=project.created_at,
    )


@router.post("", status_code=201, response_model=ProjectOut)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectOut:
    project = ProjectRepository(db).create(user_id=user.id, name=body.name)
    return _project_out(db, project)


@router.get("", response_model=ProjectListOut)
def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectListOut:
    projects = ProjectRepository(db).list_for_user(user.id, limit=limit)
    return ProjectListOut(items=[_project_out(db, p) for p in projects])


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectOut:
    project = ProjectRepository(db).get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    return _project_out(db, project, include_jobs=True)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> None:
    repo = ProjectRepository(db)
    project = repo.get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    repo.soft_delete(project)
