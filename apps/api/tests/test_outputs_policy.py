"""Output access policy tests (12_NO_TUTORIAL_DOWNLOAD_POLICY)."""

import uuid

from fastapi.testclient import TestClient


def _seed_output(client: TestClient, kind: str, content_type: str) -> tuple[str, str]:
    """Create project + completed job + output row directly (worker shortcut)."""
    from sqlalchemy import select

    from app.infrastructure.database.models import OutputFile, Project, RenderJob
    from app.infrastructure.database.session import get_sessionmaker
    from app.infrastructure.storage.factory import get_storage

    project = client.post("/api/v1/projects", json={"name": f"Policy {kind}"}).json()
    project_id = project["id"]

    storage_key = f"projects/{project_id}/outputs/test/{kind}.bin"
    get_storage().upload(storage_key, b"fake-bytes", content_type)

    with get_sessionmaker()() as db:
        user_id = db.scalar(select(Project).where(Project.id == uuid.UUID(project_id))).user_id
        job = RenderJob(
            project_id=uuid.UUID(project_id),
            user_id=user_id,
            job_type="render_sheet",
            status="completed",
        )
        db.add(job)
        db.flush()
        output = OutputFile(
            project_id=uuid.UUID(project_id),
            job_id=job.id,
            user_id=user_id,
            kind=kind,
            storage_key=storage_key,
            content_type=content_type,
            size_bytes=10,
        )
        db.add(output)
        db.commit()
        return project_id, str(output.id)


class TestOutputListing:
    def test_listing_is_metadata_only(self, client: TestClient) -> None:
        project_id, _ = _seed_output(client, "sheet_pdf", "application/pdf")
        response = client.get(f"/api/v1/projects/{project_id}/outputs")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert item["kind"] == "sheet_pdf"
        assert item["downloadable"] is True
        assert item["streamable"] is False
        assert "download_url" not in item
        assert "storage_key" not in item
        assert "storage" not in str(item)

    def test_video_listed_as_streaming_only(self, client: TestClient) -> None:
        project_id, _ = _seed_output(client, "video_mp4", "video/mp4")
        item = client.get(f"/api/v1/projects/{project_id}/outputs").json()["items"][0]
        assert item["downloadable"] is False
        assert item["streamable"] is True


class TestDownloadUrl:
    def test_pdf_download_url_minted(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "sheet_pdf", "application/pdf")
        response = client.post(f"/api/v1/outputs/{output_id}/download-url")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["download_url"].startswith("http")
        assert body["expires_at"]

        fetched = client.get(body["download_url"])
        assert fetched.status_code == 200
        assert fetched.content == b"fake-bytes"

    def test_draft_midi_downloadable(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "transcribed_draft_midi", "audio/midi")
        assert client.post(f"/api/v1/outputs/{output_id}/download-url").status_code == 200

    def test_video_download_blocked(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "video_mp4", "video/mp4")
        response = client.post(f"/api/v1/outputs/{output_id}/download-url")
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "DOWNLOAD_NOT_ALLOWED"

    def test_analysis_json_download_blocked(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "transcription_confidence_json", "application/json")
        assert client.post(f"/api/v1/outputs/{output_id}/download-url").status_code == 403

    def test_unknown_output_404(self, client: TestClient) -> None:
        response = client.post("/api/v1/outputs/00000000-0000-0000-0000-000000000000/download-url")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "OUTPUT_NOT_FOUND"


class TestStreamUrl:
    def test_video_stream_url_minted(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "video_mp4", "video/mp4")
        response = client.post(f"/api/v1/outputs/{output_id}/stream-url")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["stream_url"].startswith("http")
        assert body["expires_in_seconds"] == 300

    def test_pdf_stream_blocked(self, client: TestClient) -> None:
        _, output_id = _seed_output(client, "sheet_pdf", "application/pdf")
        response = client.post(f"/api/v1/outputs/{output_id}/stream-url")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "STREAM_NOT_AVAILABLE"
