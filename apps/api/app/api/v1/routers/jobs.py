"""Job creation/status routes."""

import uuid

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.v1.routers.outputs import output_out
from app.core.errors import NotFoundError
from app.core.rate_limit import record_usage, require_render_quota, require_transcription_quota
from app.core.security import CurrentUser, get_current_user
from app.domains.jobs.schemas import JobOut
from app.domains.jobs.service import (
    create_parse_midi_job,
    create_render_sheet_job,
    create_render_video_job,
    create_simplify_midi_job,
    create_transcribe_audio_job,
    require_job,
)
from app.infrastructure.database.repositories import OutputFileRepository, ProjectRepository
from app.infrastructure.database.session import get_db
from app.infrastructure.queue.base import QueueService
from app.infrastructure.queue.factory import get_queue

router = APIRouter(prefix="/api/v1", tags=["jobs"])


def _get_project(db: Session, project_id: uuid.UUID, user: CurrentUser):
    project = ProjectRepository(db).get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )
    return project


@router.post("/projects/{project_id}/jobs/parse-midi", status_code=201, response_model=JobOut)
def enqueue_parse_midi(
    project_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    queue: QueueService = Depends(get_queue),
) -> JobOut:
    project = _get_project(db, project_id, user)
    result = create_parse_midi_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )
    if not result.created:
        response.status_code = 200
    return _job_out(db, result.job, user.id)


@router.post("/projects/{project_id}/jobs/render-sheet", status_code=201, response_model=JobOut)
def enqueue_render_sheet(
    project_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_render_quota),
    queue: QueueService = Depends(get_queue),
) -> JobOut:
    project = _get_project(db, project_id, user)
    result = create_render_sheet_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )
    if result.created:
        record_usage(db, user.id, "render_jobs")
    else:
        response.status_code = 200
    return _job_out(db, result.job, user.id)


@router.post("/projects/{project_id}/jobs/render-video", status_code=201, response_model=JobOut)
def enqueue_render_video(
    project_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_render_quota),
    queue: QueueService = Depends(get_queue),
) -> JobOut:
    project = _get_project(db, project_id, user)
    result = create_render_video_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )
    if result.created:
        record_usage(db, user.id, "render_jobs")
    else:
        response.status_code = 200
    return _job_out(db, result.job, user.id)


@router.post("/projects/{project_id}/jobs/simplify-midi", status_code=201, response_model=JobOut)
def enqueue_simplify_midi(
    project_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    queue: QueueService = Depends(get_queue),
) -> JobOut:
    project = _get_project(db, project_id, user)
    result = create_simplify_midi_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )
    if not result.created:
        response.status_code = 200
    return _job_out(db, result.job, user.id)


@router.post("/projects/{project_id}/jobs/transcribe-audio", status_code=201, response_model=JobOut)
def enqueue_transcribe_audio(
    project_id: uuid.UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_transcription_quota),
    queue: QueueService = Depends(get_queue),
) -> JobOut:
    project = _get_project(db, project_id, user)
    result = create_transcribe_audio_job(
        db,
        queue,
        project,
        user,
        request_id=getattr(request.state, "request_id", None),
    )
    if result.created:
        record_usage(db, user.id, "transcriptions")
    else:
        response.status_code = 200
    return _job_out(db, result.job, user.id)


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> JobOut:
    return _job_out(db, require_job(db, job_id, user.id), user.id)


def _job_out(db: Session, job, user_id: uuid.UUID) -> JobOut:
    # Metadata only — clients mint URLs via POST /outputs/{id}/download-url.
    outputs = [
        output_out(output) for output in OutputFileRepository(db).list_for_job(job.id, user_id)
    ]
    data = JobOut.model_validate(job)
    data.outputs = outputs
    return data
