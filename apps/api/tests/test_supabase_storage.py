"""Supabase storage adapter tests (httpx.MockTransport — no network)."""

import json

import httpx
import pytest

from app.infrastructure.storage.base import ObjectNotFoundError, StorageError
from app.infrastructure.storage.supabase import SupabaseStorageService

SUPABASE_URL = "https://example.supabase.co"


def _service(handler) -> SupabaseStorageService:
    return SupabaseStorageService(
        url=SUPABASE_URL,
        service_role_key="service-role-test-key",
        transport=httpx.MockTransport(handler),
    )


class TestBucketRouting:
    def test_keys_route_to_expected_buckets(self) -> None:
        seen: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            seen.append(request.url.path)
            return httpx.Response(200)

        service = _service(handler)
        service.upload("projects/p1/uploads/a.mid", b"x", "audio/midi")
        service.upload("projects/p1/outputs/j1/sheet.pdf", b"x", "application/pdf")
        service.upload("projects/p1/analysis/notes.json", b"x", "application/json")

        assert seen[0].startswith("/storage/v1/object/pianoflow-sources/")
        assert seen[1].startswith("/storage/v1/object/pianoflow-outputs/")
        assert seen[2].startswith("/storage/v1/object/pianoflow-analysis/")


class TestObjectOperations:
    def test_upload_sends_service_role_and_upsert(self) -> None:
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["auth"] = request.headers["Authorization"]
            captured["upsert"] = request.headers["x-upsert"]
            captured["content_type"] = request.headers["Content-Type"]
            return httpx.Response(200)

        _service(handler).upload("projects/p/uploads/a.mid", b"data", "audio/midi")
        assert captured["auth"] == "Bearer service-role-test-key"
        assert captured["upsert"] == "true"
        assert captured["content_type"] == "audio/midi"

    def test_download_returns_bytes_and_maps_404(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if "missing" in request.url.path:
                return httpx.Response(404)
            return httpx.Response(200, content=b"object-bytes")

        service = _service(handler)
        assert service.download("projects/p/uploads/a.mid") == b"object-bytes"
        with pytest.raises(ObjectNotFoundError):
            service.download("projects/p/uploads/missing.mid")

    def test_exists_and_size(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if "missing" in request.url.path:
                return httpx.Response(404)
            return httpx.Response(200, headers={"Content-Length": "1234"})

        service = _service(handler)
        assert service.exists("projects/p/uploads/a.mid") is True
        assert service.exists("projects/p/uploads/missing.mid") is False
        assert service.size("projects/p/uploads/a.mid") == 1234

    def test_server_error_wrapped_as_storage_error(self) -> None:
        service = _service(lambda request: httpx.Response(500))
        with pytest.raises(StorageError):
            service.upload("projects/p/uploads/a.mid", b"x", "audio/midi")


class TestSignedUrls:
    def test_signed_upload_url(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.url.path.startswith("/storage/v1/object/upload/sign/pianoflow-sources/")
            return httpx.Response(
                200, json={"url": "/object/upload/sign/pianoflow-sources/k?token=abc"}
            )

        signed = _service(handler).create_signed_upload_url(
            "projects/p/uploads/a.mid", "audio/midi", max_bytes=100
        )
        assert signed.method == "PUT"
        assert signed.url.startswith(f"{SUPABASE_URL}/storage/v1/object/upload/sign/")
        assert "token=abc" in signed.url

    def test_signed_download_url(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            assert body == {"expiresIn": 300}
            return httpx.Response(
                200, json={"signedURL": "/object/sign/pianoflow-outputs/k?token=xyz"}
            )

        signed = _service(handler).create_signed_download_url(
            "projects/p/outputs/j/sheet.pdf", expires_in=300
        )
        assert signed.method == "GET"
        assert "token=xyz" in signed.url


def test_missing_credentials_rejected() -> None:
    with pytest.raises(StorageError):
        SupabaseStorageService(url="", service_role_key="")
