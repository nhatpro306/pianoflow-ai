# Slim image: API never renders, so no FFmpeg/MuseScore here (DESIGN.md §1.1).
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /repo

# Workspace metadata first for layer caching.
COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/worker/pyproject.toml apps/worker/pyproject.toml
COPY packages/music-core/pyproject.toml packages/music-core/pyproject.toml

COPY packages/music-core packages/music-core
COPY apps/api apps/api

RUN uv sync --frozen --package pianoflow-api --no-dev

WORKDIR /repo/apps/api
EXPOSE 8000
CMD ["sh", "-c", "if [ -n \"$AWS_LAMBDA_RUNTIME_API\" ]; then exec /repo/.venv/bin/python -m awslambdaric app.main.handler; else exec /repo/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000; fi"]
