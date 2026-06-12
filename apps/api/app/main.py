"""FastAPI application factory.

Phase 2 scope: app boots, request_id middleware, health endpoints.
Routers for projects/jobs/etc. arrive in Phases 3-9 (docs/ROADMAP.md).
"""

import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import (
    audio,
    health,
    internal_storage,
    jobs,
    notes,
    outputs,
    projects,
    uploads,
)
from app.api.v1.routers import settings as settings_router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import setup_logging


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(service="api", level=settings.log_level)

    app = FastAPI(
        title="PianoFlow AI API",
        version="0.1.0",
        docs_url="/docs" if settings.env == "dev" else None,
    )

    cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    if settings.cors_allowed_origins:
        cors_origins.extend(settings.cors_allowed_origins.split(","))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

    install_error_handlers(app)
    app.include_router(health.router)
    app.include_router(projects.router)
    app.include_router(uploads.router)
    app.include_router(audio.router)
    app.include_router(notes.router)
    app.include_router(jobs.router)
    app.include_router(outputs.router)
    app.include_router(settings_router.router)
    if settings.storage_backend == "local":
        app.include_router(internal_storage.router)
    return app


app = create_app()

# AWS Lambda handler via Mangum — only used when deployed to Lambda.
# Lambda invokes `app.main.handler` (or whatever MANGUM_HANDLER points to).
try:
    from mangum import Mangum

    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = None
