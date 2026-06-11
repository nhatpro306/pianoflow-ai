"""Upload domain: 2-phase direct-to-storage uploads (API.md §2).

Phase 1: validate request metadata, mint server-generated key, return signed
PUT URL. Phase 2: confirm object landed, mark uploaded, hand off to the
follow-up job (parse_midi for MIDI, transcribe_audio for Beta audio).
"""

import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import (
    ConflictError,
    FileTooLargeError,
    ForbiddenError,
    ValidationAppError,
)
from app.core.security import CurrentUser
from app.infrastructure.database.models import Project, UploadedFile
from app.infrastructure.database.repositories import UploadedFileRepository
from app.infrastructure.storage.base import SignedUrl, StorageService

_ALLOWED_EXTENSIONS = (".mid", ".midi")
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._ -]")

MIDI_CONTENT_TYPE = "audio/midi"

# Audio → MIDI Beta (docs 09 §11).
AUDIO_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
}


def sanitize_filename(name: str) -> str:
    cleaned = _SAFE_NAME.sub("_", name).strip() or "upload.mid"
    return cleaned[:255]


@dataclass(frozen=True)
class UploadInit:
    upload_id: uuid.UUID
    signed: SignedUrl
    max_bytes: int


def init_upload(
    db: Session,
    storage: StorageService,
    user: CurrentUser,
    project: Project,
    filename: str,
    size_bytes: int,
) -> UploadInit:
    settings = get_settings()

    if not filename.lower().endswith(_ALLOWED_EXTENSIONS):
        raise ValidationAppError("Only .mid / .midi files are accepted.")
    if size_bytes <= 0:
        raise ValidationAppError("size_bytes must be positive.")
    if size_bytes > settings.max_midi_bytes:
        raise FileTooLargeError(f"File is {size_bytes} bytes (max {settings.max_midi_bytes}).")

    files = UploadedFileRepository(db)
    if files.get_validated_for_project(project.id, user.id) is not None:
        raise ConflictError("Project already has an uploaded MIDI (one source file per project).")

    # Server-generated key — original filename is display metadata only.
    storage_key = f"projects/{project.id}/uploads/{uuid.uuid4().hex}.mid"
    record = files.create(
        project_id=project.id,
        user_id=user.id,
        kind="midi",
        storage_key=storage_key,
        original_name=sanitize_filename(filename),
        content_type=MIDI_CONTENT_TYPE,
        size_bytes=size_bytes,
        upload_status="pending",
    )

    signed = storage.create_signed_upload_url(
        key=storage_key,
        content_type=MIDI_CONTENT_TYPE,
        max_bytes=settings.max_midi_bytes,
    )
    return UploadInit(upload_id=record.id, signed=signed, max_bytes=settings.max_midi_bytes)


def init_audio_upload(
    db: Session,
    storage: StorageService,
    user: CurrentUser,
    project: Project,
    filename: str,
    size_bytes: int,
    rights_attestation: bool,
) -> UploadInit:
    """Beta audio upload. Same two-phase pattern as MIDI, plus mandatory
    rights attestation (11_SECURITY_COMPLIANCE)."""
    settings = get_settings()

    if not settings.audio_transcription_enabled:
        raise ForbiddenError(
            "Audio transcription is not enabled.", code="AUDIO_TRANSCRIPTION_NOT_ENABLED"
        )
    if not rights_attestation:
        raise ValidationAppError(
            "You must confirm you own this file or have permission to process it.",
            code="RIGHTS_ATTESTATION_REQUIRED",
        )
    extension = next((ext for ext in AUDIO_TYPES if filename.lower().endswith(ext)), None)
    if extension is None:
        raise ValidationAppError(
            "Only .wav / .mp3 / .m4a files are accepted in the Beta.",
            code="UNSUPPORTED_AUDIO_TYPE",
        )
    if size_bytes <= 0:
        raise ValidationAppError("size_bytes must be positive.")
    if size_bytes > settings.max_audio_bytes:
        raise FileTooLargeError(
            f"File is {size_bytes} bytes (max {settings.max_audio_bytes}).",
            code="AUDIO_FILE_TOO_LARGE",
        )

    files = UploadedFileRepository(db)
    if files.get_validated_for_project(project.id, user.id) is not None:
        raise ConflictError("Project already has an uploaded source file.")

    content_type = AUDIO_TYPES[extension]
    storage_key = f"projects/{project.id}/uploads/{uuid.uuid4().hex}{extension}"
    record = files.create(
        project_id=project.id,
        user_id=user.id,
        kind="audio",
        storage_key=storage_key,
        original_name=sanitize_filename(filename),
        content_type=content_type,
        size_bytes=size_bytes,
        upload_status="pending",
        rights_attestation=True,
        rights_attested_at=datetime.now(UTC),
    )

    signed = storage.create_signed_upload_url(
        key=storage_key,
        content_type=content_type,
        max_bytes=settings.max_audio_bytes,
    )
    return UploadInit(upload_id=record.id, signed=signed, max_bytes=settings.max_audio_bytes)


def _max_bytes_for(record: UploadedFile) -> int:
    settings = get_settings()
    return settings.max_audio_bytes if record.kind == "audio" else settings.max_midi_bytes


def confirm_upload(
    db: Session,
    storage: StorageService,
    user: CurrentUser,
    upload_id: uuid.UUID,
) -> UploadedFile:
    record = UploadedFileRepository(db).get(upload_id, user.id)
    if record is None:
        raise ValidationAppError("Unknown upload_id.")
    if record.upload_status not in ("pending", "uploaded"):
        raise ConflictError(f"Upload is in state {record.upload_status!r}.")
    if not storage.exists(record.storage_key):
        raise ConflictError("File was never uploaded to the signed URL.")

    actual_size = storage.size(record.storage_key)
    if actual_size > _max_bytes_for(record):
        record.upload_status = "rejected"
        record.rejection_reason = "FILE_TOO_LARGE"
        db.flush()
        storage.delete(record.storage_key)
        raise FileTooLargeError(f"Uploaded object is {actual_size} bytes.")

    record.size_bytes = actual_size
    record.upload_status = "uploaded"
    db.flush()
    return record
