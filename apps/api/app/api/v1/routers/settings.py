"""Render settings endpoints (API.md §2, settings v2 per VIDEO_TUTORIAL_SPEC.md)."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.security import CurrentUser, get_current_user
from app.domains.settings.schemas import SettingsOut, SettingsPatch
from app.domains.settings.service import apply_patch, get_or_create_settings
from app.infrastructure.database.repositories import ProjectRepository
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/api/v1/projects/{project_id}/settings", tags=["settings"])


def _require_project(db: Session, project_id: uuid.UUID, user: CurrentUser) -> None:
    if ProjectRepository(db).get(project_id, user.id) is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )


@router.get("", response_model=SettingsOut)
def get_settings_route(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SettingsOut:
    _require_project(db, project_id, user)
    return SettingsOut.model_validate(get_or_create_settings(db, project_id))


@router.patch("", response_model=SettingsOut)
def patch_settings_route(
    project_id: uuid.UUID,
    patch: SettingsPatch,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SettingsOut:
    _require_project(db, project_id, user)
    settings = get_or_create_settings(db, project_id)
    return SettingsOut.model_validate(apply_patch(db, settings, patch))
