# Combined API + worker image — single container for cost-optimised deployment.
# Both processes share the rendering toolchain and one venv.
# Use infra/entrypoint.sh to run API (foreground) + worker (background).
# Worker deps are a strict subset of API deps, so one uv sync covers both.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Rendering toolchain — same as worker.Dockerfile.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fluidsynth fluid-soundfont-gm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/worker/pyproject.toml apps/worker/pyproject.toml
COPY packages/music-core/pyproject.toml packages/music-core/pyproject.toml

COPY packages/music-core packages/music-core
COPY apps/api apps/api
COPY apps/worker apps/worker

# pianoflow-api pulls in all of worker's deps; one sync is enough.
RUN uv sync --frozen --package pianoflow-api --no-dev

COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
