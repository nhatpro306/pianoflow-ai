"""Signed-URL endpoints backing the LOCAL storage backend only.

In supabase/s3 modes the client PUTs/GETs directly against the cloud
provider and these routes are not mounted. HMAC tokens are minted by
LocalStorageService (infrastructure/storage/signing.py).
"""

from fastapi import APIRouter, Query, Request, Response

from app.core.config import get_settings
from app.core.errors import AppError, FileTooLargeError, NotFoundError
from app.infrastructure.storage.base import ObjectNotFoundError
from app.infrastructure.storage.factory import get_storage
from app.infrastructure.storage.signing import verify

router = APIRouter(prefix="/internal/storage", tags=["internal"])


class SignatureError(AppError):
    status_code = 403
    code = "BAD_SIGNATURE"


@router.put("/{key:path}")
async def signed_upload(
    key: str,
    request: Request,
    exp: int = Query(...),
    max: int = Query(...),
    sig: str = Query(...),
) -> dict:
    settings = get_settings()
    if not verify(settings.storage_signing_secret, "PUT", key, exp, max, sig):
        raise SignatureError("Invalid or expired upload signature.")

    body = await request.body()
    if max and len(body) > max:
        raise FileTooLargeError(f"Body is {len(body)} bytes (max {max}).")

    storage = get_storage()
    stored = storage.upload(
        key, body, request.headers.get("content-type", "application/octet-stream")
    )
    return {"key": stored.key, "size_bytes": stored.size_bytes}


@router.get("/{key:path}")
def signed_download(
    key: str,
    exp: int = Query(...),
    sig: str = Query(...),
) -> Response:
    settings = get_settings()
    if not verify(settings.storage_signing_secret, "GET", key, exp, 0, sig):
        raise SignatureError("Invalid or expired download signature.")

    storage = get_storage()
    try:
        payload = storage.download(key)
    except ObjectNotFoundError as exc:
        raise NotFoundError("Object not found.") from exc

    return Response(content=payload, media_type="application/octet-stream")
