"""Application error hierarchy → error envelope (API.md §0)."""

from datetime import UTC, datetime, timedelta

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


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


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


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


def _seconds_to_utc_midnight() -> int:
    now = datetime.now(UTC)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(1, int((tomorrow - now).total_seconds()))


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        # Daily limits reset at UTC midnight (API.md §0: 429 carries Retry-After).
        headers = (
            {"Retry-After": str(_seconds_to_utc_midnight())} if exc.status_code == 429 else None
        )
        return JSONResponse(
            status_code=exc.status_code,
            headers=headers,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )
