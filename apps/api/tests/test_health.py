from fastapi.testclient import TestClient

from app.main import create_app


def test_healthz_returns_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_request_id_header_is_set() -> None:
    client = TestClient(create_app())
    response = client.get("/healthz")
    assert response.headers["x-request-id"].startswith("req_")


def test_request_id_is_propagated_when_provided() -> None:
    client = TestClient(create_app())
    response = client.get("/healthz", headers={"x-request-id": "req_test123"})
    assert response.headers["x-request-id"] == "req_test123"


class TestDatabaseUrlEncoding:
    """DB URL password percent-encoding (generated passwords with /, @, +)."""

    def test_special_chars_encoded(self):
        from app.core.config import _encode_pg_password

        out = _encode_pg_password(
            "postgresql+psycopg://postgres.abc:pa/ss+w@rd@aws-1.pooler.supabase.com:5432/postgres"
        )
        assert out == (
            "postgresql+psycopg://postgres.abc:pa%2Fss%2Bw%40rd"
            "@aws-1.pooler.supabase.com:5432/postgres"
        )

    def test_plain_password_unchanged(self):
        from app.core.config import _encode_pg_password

        url = "postgresql+psycopg://pianoflow:pianoflow@localhost:5432/pianoflow"
        assert _encode_pg_password(url) == url

    def test_non_postgres_unchanged(self):
        from app.core.config import _encode_pg_password

        assert _encode_pg_password("sqlite:////tmp/x.db") == "sqlite:////tmp/x.db"

    def test_db_password_injected_and_encoded(self, monkeypatch):
        monkeypatch.setenv(
            "DATABASE_URL",
            "postgresql+psycopg://postgres.abc@aws-1.pooler.supabase.com:5432/postgres",
        )
        monkeypatch.setenv("DB_PASSWORD", "pa/ss+w@rd")
        from app.core.config import Settings

        s = Settings()
        assert s.database_url == (
            "postgresql+psycopg://postgres.abc:pa%2Fss%2Bw%40rd"
            "@aws-1.pooler.supabase.com:5432/postgres"
        )
