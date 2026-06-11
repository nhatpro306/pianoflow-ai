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
