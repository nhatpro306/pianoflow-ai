"""Parsed notes for the piano-roll preview (API.md §2)."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.security import CurrentUser, get_current_user
from app.infrastructure.database.repositories import ProjectRepository
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.base import ObjectNotFoundError, StorageService
from app.infrastructure.storage.factory import get_storage

router = APIRouter(prefix="/api/v1/projects/{project_id}", tags=["notes"])

INLINE_MAX_BYTES = 1_000_000  # larger payloads return a signed URL instead


@router.get("/notes")
def get_notes(
    project_id: uuid.UUID,
    difficulty: Literal["original", "easy", "very_easy"] = Query(default="original"),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
    storage: StorageService = Depends(get_storage),
):
    project = ProjectRepository(db).get(project_id, user.id)
    if project is None:
        raise NotFoundError(
            "Project does not exist or you do not have access.", code="PROJECT_NOT_FOUND"
        )

    if project.status != "ready":
        raise ConflictError(
            "Notes are not ready yet (parse pending or failed).", code="NOTES_NOT_READY"
        )

    summary = project.analysis_summary or {}

    if difficulty in ("easy", "very_easy"):
        notes_key = (summary.get("simplified_notes") or {}).get(difficulty)
        if not notes_key:
            raise ConflictError(
                f"Simplified notes ({difficulty}) are not ready. Run simplify-midi first.",
                code="SIMPLIFIED_NOTES_NOT_READY",
            )
    else:
        notes_key = summary.get("notes_key")
        if not notes_key:
            raise ConflictError(
                "Notes are not ready yet (parse pending or failed).", code="NOTES_NOT_READY"
            )

    try:
        if storage.size(notes_key) > INLINE_MAX_BYTES:
            signed = storage.create_signed_download_url(notes_key)
            return {"notes_url": signed.url, "expires_at": signed.expires_at}
        payload = storage.download(notes_key)
    except ObjectNotFoundError as exc:
        raise NotFoundError("Notes object missing from storage.") from exc

    return Response(content=payload, media_type="application/json")
