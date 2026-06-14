"""Application error hierarchy → error envelope (API.md §0)."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.infrastructure.storage.base import StorageError

logger = logging.getLogger(__name__)


class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code


class ValidationAppError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class FileTooLargeError(AppError):
    status_code = 413
    code = "FILE_TOO_LARGE"


class InvalidMidiAppError(AppError):
    status_code = 422
    code = "INVALID_MIDI"


class RateLimitedError(AppError):
    status_code = 429
    code = "RATE_LIMITED"


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )

    @app.exception_handler(StorageError)
    async def storage_error_handler(request: Request, exc: StorageError) -> JSONResponse:
        # An adapter-boundary failure (Supabase/S3/local). Previously these
        # escaped as a bare 500 "Internal Server Error" with no machine code —
        # opaque to the client and easy to miss in logs. Surface a stable code
        # and the upstream detail so misconfig (e.g. a wrong service-role key
        # → RLS denial) is diagnosable.
        request_id = getattr(request.state, "request_id", None)
        logger.error("storage_error request_id=%s detail=%s", request_id, exc)
        return JSONResponse(
            status_code=502,
            content={
                "error": {
                    "code": "STORAGE_ERROR",
                    "message": str(exc),
                    "request_id": request_id,
                }
            },
        )
