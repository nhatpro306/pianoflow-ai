#!/bin/sh
# Starts the background worker then exec's uvicorn as PID 1.
# SIGTERM/SIGINT (from `docker stop` or Render) terminates uvicorn; the trap
# propagates shutdown to the worker so both exit cleanly.
set -e

(cd /repo/apps/worker && exec uv run --no-sync python -m app.main) &
WORKER_PID=$!

cleanup() {
    echo "Stopping worker (PID $WORKER_PID)..."
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
}
trap cleanup TERM INT EXIT

cd /repo/apps/api
exec uv run --no-sync uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${UVICORN_WORKERS:-1}"
