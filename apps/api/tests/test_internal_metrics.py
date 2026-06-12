"""Internal metrics endpoint tests (Phase 10)."""

from fastapi.testclient import TestClient


def test_metrics_open_in_dev_without_token(client: TestClient) -> None:
    response = client.get("/internal/metrics")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["window_hours"] == 24
    assert "jobs_by_status" in body
    assert "queue_depths" in body
    assert body["totals"]["users"] >= 0


def test_metrics_counts_jobs(client: TestClient) -> None:
    project = client.post("/api/v1/projects", json={"name": "Metrics Song"})
    assert project.status_code == 201

    body = client.get("/internal/metrics").json()
    assert body["totals"]["projects"] >= 1


def test_metrics_requires_matching_token_when_configured(client: TestClient, monkeypatch) -> None:
    from app.core.config import get_settings

    monkeypatch.setenv("INTERNAL_METRICS_TOKEN", "metrics-secret")
    get_settings.cache_clear()
    try:
        denied = client.get("/internal/metrics")
        assert denied.status_code == 403

        wrong = client.get("/internal/metrics", headers={"X-Internal-Token": "nope"})
        assert wrong.status_code == 403

        allowed = client.get("/internal/metrics", headers={"X-Internal-Token": "metrics-secret"})
        assert allowed.status_code == 200
    finally:
        monkeypatch.delenv("INTERNAL_METRICS_TOKEN", raising=False)
        get_settings.cache_clear()
