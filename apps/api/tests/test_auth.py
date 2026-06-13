"""Phase 9 — authentication + ownership isolation tests."""

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

JWT_SECRET = "test-supabase-jwt-secret"


def _make_token(
    sub: str | None = None,
    email: str = "alice@example.com",
    expired: bool = False,
    secret: str = JWT_SECRET,
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": sub or str(uuid.uuid4()),
        "email": email,
        "aud": "authenticated",
        "iat": now,
        "exp": now + timedelta(hours=-1 if expired else 1),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture()
def supabase_client(tmp_path) -> Iterator[TestClient]:
    """App in AUTH_MODE=supabase with throwaway SQLite DB."""
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'test.db'}",
            "QUEUE_BACKEND": "memory",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
            "AUTH_MODE": "supabase",
            "SUPABASE_JWT_SECRET": JWT_SECRET,
            "API_BASE_URL": "http://testserver",
            "ENV": "dev",
        }
    )

    from app.core.config import get_settings
    from app.infrastructure.database.session import get_engine, get_sessionmaker
    from app.infrastructure.queue.factory import get_queue
    from app.infrastructure.storage.factory import get_storage

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    get_queue.cache_clear()
    get_storage.cache_clear()

    from app.infrastructure.database.models import Base
    from app.main import create_app

    Base.metadata.create_all(get_engine())

    with TestClient(create_app()) as tc:
        yield tc


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestJWTAuth:
    def test_no_header_returns_401(self, supabase_client: TestClient):
        r = supabase_client.get("/api/v1/projects")
        assert r.status_code == 401

    def test_expired_token_returns_401(self, supabase_client: TestClient):
        token = _make_token(expired=True)
        r = supabase_client.get("/api/v1/projects", headers=_auth(token))
        assert r.status_code == 401
        assert "expired" in r.json()["detail"].lower()

    def test_invalid_token_returns_401(self, supabase_client: TestClient):
        r = supabase_client.get("/api/v1/projects", headers=_auth("not-a-jwt"))
        assert r.status_code == 401

    def test_wrong_secret_returns_401(self, supabase_client: TestClient):
        token = _make_token(secret="wrong-secret")
        r = supabase_client.get("/api/v1/projects", headers=_auth(token))
        assert r.status_code == 401

    def test_valid_token_creates_user_and_returns_200(self, supabase_client: TestClient):
        token = _make_token(email="newuser@example.com")
        r = supabase_client.get("/api/v1/projects", headers=_auth(token))
        assert r.status_code == 200

    def test_health_no_auth_required(self, supabase_client: TestClient):
        r = supabase_client.get("/healthz")
        assert r.status_code == 200


class TestAsymmetricJWT:
    """New Supabase projects sign with ES256; verified via JWKS."""

    @pytest.fixture()
    def ec_keypair(self):
        from cryptography.hazmat.primitives.asymmetric import ec

        private_key = ec.generate_private_key(ec.SECP256R1())
        return private_key, private_key.public_key()

    def _es256_token(self, private_key, email: str = "es@example.com") -> str:
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "email": email,
                "aud": "authenticated",
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            private_key,
            algorithm="ES256",
            headers={"kid": "test-key"},
        )

    def test_es256_token_verified_via_jwks(
        self, supabase_client: TestClient, ec_keypair, monkeypatch
    ):
        private_key, public_key = ec_keypair

        class FakeSigningKey:
            key = public_key

        class FakeJWKSClient:
            def get_signing_key_from_jwt(self, token):
                return FakeSigningKey()

        from app.core import security

        monkeypatch.setattr(security, "_jwks_client", lambda url: FakeJWKSClient())
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        from app.core.config import get_settings

        get_settings.cache_clear()

        token = self._es256_token(private_key)
        r = supabase_client.get("/api/v1/projects", headers=_auth(token))
        assert r.status_code == 200

    def test_es256_wrong_key_returns_401(
        self, supabase_client: TestClient, ec_keypair, monkeypatch
    ):
        from cryptography.hazmat.primitives.asymmetric import ec

        private_key, _ = ec_keypair
        other_public = ec.generate_private_key(ec.SECP256R1()).public_key()

        class FakeSigningKey:
            key = other_public

        class FakeJWKSClient:
            def get_signing_key_from_jwt(self, token):
                return FakeSigningKey()

        from app.core import security

        monkeypatch.setattr(security, "_jwks_client", lambda url: FakeJWKSClient())
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        from app.core.config import get_settings

        get_settings.cache_clear()

        token = self._es256_token(private_key)
        r = supabase_client.get("/api/v1/projects", headers=_auth(token))
        assert r.status_code == 401


class TestOwnershipIsolation:
    """User B cannot see user A's projects/jobs/outputs."""

    def _create_project(self, client: TestClient, token: str) -> str:
        r = client.post(
            "/api/v1/projects",
            json={"name": "My Song"},
            headers=_auth(token),
        )
        assert r.status_code == 201, r.text
        return r.json()["id"]

    def test_cross_user_project_returns_404(self, supabase_client: TestClient):
        alice_token = _make_token(email="alice@test.com")
        bob_token = _make_token(email="bob@test.com")

        project_id = self._create_project(supabase_client, alice_token)

        r = supabase_client.get(
            f"/api/v1/projects/{project_id}",
            headers=_auth(bob_token),
        )
        assert r.status_code == 404

    def test_cross_user_project_list_empty(self, supabase_client: TestClient):
        alice_token = _make_token(email="alice2@test.com")
        bob_token = _make_token(email="bob2@test.com")

        self._create_project(supabase_client, alice_token)

        r = supabase_client.get("/api/v1/projects", headers=_auth(bob_token))
        assert r.status_code == 200
        assert r.json()["items"] == []


class TestRateLimits:
    """Daily usage caps return 429."""

    def test_upload_limit_returns_429(self, supabase_client: TestClient):
        token = _make_token(email="ratelimit@test.com")

        # Create project first
        r = supabase_client.post(
            "/api/v1/projects",
            json={"name": "Rate test"},
            headers=_auth(token),
        )
        assert r.status_code == 201
        project_id = r.json()["id"]

        # Exhaust upload quota by writing directly to daily_usage table
        from app.core.config import get_settings
        from app.infrastructure.database.session import get_sessionmaker

        settings = get_settings()
        session_factory = get_sessionmaker()
        with session_factory() as db:
            from app.infrastructure.database.repositories import (
                DailyUsageRepository,
                UserRepository,
            )

            user = UserRepository(db).get_or_create_by_email("ratelimit@test.com")
            usage = DailyUsageRepository(db).get_or_create_today(user.id)
            usage.uploads = settings.uploads_per_day
            db.commit()

        # Next upload-confirm should 429
        init_r = supabase_client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "test.mid", "size_bytes": 100},
            headers=_auth(token),
        )
        assert init_r.status_code == 200

        confirm_r = supabase_client.post(
            f"/api/v1/projects/{project_id}/upload-midi/confirm",
            json={"upload_id": init_r.json()["upload_id"]},
            headers=_auth(token),
        )
        assert confirm_r.status_code == 429
