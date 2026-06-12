"""AUTH_MODE=supabase JWT verification + ownership scoping audit (Phase 9).

Tokens are minted locally with the same HS256 secret the server is configured
with — exactly how Supabase signs access tokens.
"""

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

TEST_SECRET = "test-jwt-secret-not-production-0123456789abcdef"


@pytest.fixture()
def auth_client(tmp_path) -> Iterator[TestClient]:
    """App in AUTH_MODE=supabase against a throwaway DB."""
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'test.db'}",
            "QUEUE_BACKEND": "memory",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
            "AUTH_MODE": "supabase",
            "SUPABASE_JWT_SECRET": TEST_SECRET,
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

    with TestClient(create_app()) as test_client:
        yield test_client


def mint_token(
    user_id: uuid.UUID | None = None,
    email: str = "user@example.test",
    secret: str = TEST_SECRET,
    expires_in: timedelta = timedelta(hours=1),
    audience: str = "authenticated",
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id or uuid.uuid4()),
            "email": email,
            "aud": audience,
            "iat": now,
            "exp": now + expires_in,
        },
        secret,
        algorithm="HS256",
    )


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestTokenVerification:
    def test_no_token_401(self, auth_client: TestClient) -> None:
        response = auth_client.get("/api/v1/projects")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "TOKEN_MISSING"

    def test_valid_token_creates_user_and_works(self, auth_client: TestClient) -> None:
        user_id = uuid.uuid4()
        token = mint_token(user_id, email="alice@example.test")

        created = auth_client.post(
            "/api/v1/projects", json={"name": "Alice Song"}, headers=auth_headers(token)
        )
        assert created.status_code == 201, created.text

        from app.infrastructure.database.models import User
        from app.infrastructure.database.session import get_sessionmaker

        with get_sessionmaker()() as db:
            user = db.get(User, user_id)
            assert user is not None
            assert user.email == "alice@example.test"

    def test_wrong_signature_401(self, auth_client: TestClient) -> None:
        token = mint_token(secret="some-other-secret-0123456789abcdefghij")
        response = auth_client.get("/api/v1/projects", headers=auth_headers(token))
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "TOKEN_INVALID"

    def test_expired_token_401(self, auth_client: TestClient) -> None:
        token = mint_token(expires_in=timedelta(hours=-1))
        response = auth_client.get("/api/v1/projects", headers=auth_headers(token))
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "TOKEN_EXPIRED"

    def test_wrong_audience_401(self, auth_client: TestClient) -> None:
        token = mint_token(audience="anon")
        response = auth_client.get("/api/v1/projects", headers=auth_headers(token))
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "TOKEN_INVALID"

    def test_non_uuid_sub_401(self, auth_client: TestClient) -> None:
        now = datetime.now(UTC)
        token = jwt.encode(
            {
                "sub": "not-a-uuid",
                "email": "x@example.test",
                "aud": "authenticated",
                "exp": now + timedelta(hours=1),
            },
            TEST_SECRET,
            algorithm="HS256",
        )
        response = auth_client.get("/api/v1/projects", headers=auth_headers(token))
        assert response.status_code == 401

    def test_email_change_synced(self, auth_client: TestClient) -> None:
        user_id = uuid.uuid4()
        auth_client.get(
            "/api/v1/projects", headers=auth_headers(mint_token(user_id, "old@example.test"))
        )
        auth_client.get(
            "/api/v1/projects", headers=auth_headers(mint_token(user_id, "new@example.test"))
        )

        from app.infrastructure.database.models import User
        from app.infrastructure.database.session import get_sessionmaker

        with get_sessionmaker()() as db:
            assert db.get(User, user_id).email == "new@example.test"


class TestCrossUserIsolation:
    """Ownership scoping audit: user B gets 404 on every user-A resource."""

    def _setup_project_for_a(self, auth_client: TestClient, token_a: str) -> str:
        response = auth_client.post(
            "/api/v1/projects", json={"name": "A's Song"}, headers=auth_headers(token_a)
        )
        assert response.status_code == 201
        return response.json()["id"]

    def test_cross_user_404_on_all_project_surfaces(self, auth_client: TestClient) -> None:
        token_a = mint_token(uuid.uuid4(), "a@example.test")
        token_b = mint_token(uuid.uuid4(), "b@example.test")
        project_id = self._setup_project_for_a(auth_client, token_a)
        headers_b = auth_headers(token_b)

        surfaces = [
            ("GET", f"/api/v1/projects/{project_id}"),
            ("GET", f"/api/v1/projects/{project_id}/notes"),
            ("GET", f"/api/v1/projects/{project_id}/settings"),
            ("PATCH", f"/api/v1/projects/{project_id}/settings"),
            ("GET", f"/api/v1/projects/{project_id}/outputs"),
            ("POST", f"/api/v1/projects/{project_id}/jobs/parse-midi"),
            ("POST", f"/api/v1/projects/{project_id}/jobs/render-sheet"),
            ("POST", f"/api/v1/projects/{project_id}/jobs/render-video"),
            ("POST", f"/api/v1/projects/{project_id}/jobs/simplify-midi"),
            ("DELETE", f"/api/v1/projects/{project_id}"),
        ]
        for method, url in surfaces:
            response = auth_client.request(
                method, url, headers=headers_b, json={} if method == "PATCH" else None
            )
            assert response.status_code == 404, f"{method} {url} → {response.status_code}"

        # And the project never appears in B's list.
        listing = auth_client.get("/api/v1/projects", headers=headers_b)
        assert all(item["id"] != project_id for item in listing.json()["items"])

        # Owner still has full access.
        assert (
            auth_client.get(
                f"/api/v1/projects/{project_id}", headers=auth_headers(token_a)
            ).status_code
            == 200
        )

    def test_cross_user_404_on_jobs_and_outputs(self, auth_client: TestClient) -> None:
        token_a = mint_token(uuid.uuid4(), "a2@example.test")
        token_b = mint_token(uuid.uuid4(), "b2@example.test")
        project_id = self._setup_project_for_a(auth_client, token_a)

        # No upload exists, so the manual parse endpoint would 409 —
        # create A's job row directly instead.
        from app.infrastructure.database.models import Project, RenderJob
        from app.infrastructure.database.session import get_sessionmaker

        job_id = uuid.uuid4()
        with get_sessionmaker()() as db:
            owner_id = db.get(Project, uuid.UUID(project_id)).user_id
            db.add(
                RenderJob(
                    id=job_id,
                    project_id=uuid.UUID(project_id),
                    user_id=owner_id,
                    job_type="parse_midi",
                    status="queued",
                )
            )
            db.commit()

        response = auth_client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers(token_b))
        assert response.status_code == 404

        assert (
            auth_client.get(f"/api/v1/jobs/{job_id}", headers=auth_headers(token_a)).status_code
            == 200
        )
