# Heavyweight image: rendering toolchain lives here, not in the API image.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# FFmpeg now; MuseScore added in Phase 6 (sheet generation).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/worker/pyproject.toml apps/worker/pyproject.toml
COPY packages/music-core/pyproject.toml packages/music-core/pyproject.toml

COPY packages/music-core packages/music-core
COPY apps/worker apps/worker

RUN uv sync --frozen --package pianoflow-worker --no-dev

WORKDIR /repo/apps/worker
CMD ["uv", "run", "--no-sync", "python", "-m", "app.main"]
