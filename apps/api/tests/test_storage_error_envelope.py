"""An adapter-boundary StorageError must surface as a 502 error envelope,
not a bare 500. Regression for the silent Supabase upload-sign failure
(wrong service-role key → RLS denial) that was opaque to clients."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import install_error_handlers
from app.infrastructure.storage.base import StorageError


def _app() -> FastAPI:
    app = FastAPI()
    install_error_handlers(app)

    @app.get("/boom")
    def boom() -> dict:
        raise StorageError("Supabase upload-sign failed (400): RLS denial")

    return app


def test_storage_error_returns_502_envelope() -> None:
    client = TestClient(_app(), raise_server_exceptions=False)
    response = client.get("/boom")
    assert response.status_code == 502
    body = response.json()
    assert body["error"]["code"] == "STORAGE_ERROR"
    assert "upload-sign" in body["error"]["message"]
