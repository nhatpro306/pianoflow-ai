"""Upload/job API flow tests."""

import json
import uuid

from fastapi.testclient import TestClient


def _create_project(client: TestClient, name: str = "Test Song") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


def _upload(client: TestClient, project_id: str, data: bytes, filename: str = "song.mid") -> dict:
    init = client.post(
        f"/api/v1/projects/{project_id}/upload-midi",
        json={"filename": filename, "size_bytes": len(data)},
    )
    assert init.status_code == 200, init.text
    init_body = init.json()

    put = client.put(init_body["upload_url"], content=data, headers=init_body["headers"])
    assert put.status_code == 200, put.text

    return client.post(
        f"/api/v1/projects/{project_id}/upload-midi/confirm",
        json={"upload_id": init_body["upload_id"]},
    )


class TestGoldenPath:
    def test_confirm_enqueues_parse_job(self, client: TestClient, simple_midi_bytes: bytes) -> None:
        project_id = _create_project(client)

        confirm = _upload(client, project_id, simple_midi_bytes)
        assert confirm.status_code == 202, confirm.text
        body = confirm.json()
        assert body["status"] == "validated_pending"
        assert body["project_status"] == "parsing"
        assert body["parse_job"]["job_type"] == "parse_midi"
        assert body["parse_job"]["status"] == "queued"

        job = client.get(f"/api/v1/jobs/{body['parse_job']['id']}")
        assert job.status_code == 200
        assert job.json()["status"] == "queued"

        detail = client.get(f"/api/v1/projects/{project_id}")
        assert detail.json()["status"] == "parsing"
        assert detail.json()["active_jobs"][0]["id"] == body["parse_job"]["id"]

        notes = client.get(f"/api/v1/projects/{project_id}/notes")
        assert notes.status_code == 409
        assert notes.json()["error"]["code"] == "NOTES_NOT_READY"

    def test_render_sheet_enqueue_requires_ready_notes(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "NOTES_NOT_READY"

    def test_render_sheet_enqueue_for_ready_project(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from app.infrastructure.database.models import Project
        from app.infrastructure.database.session import get_sessionmaker
        from app.infrastructure.storage.factory import get_storage
        from pianoflow_music.midi.parse import parse_midi_bytes

        project_id = _create_project(client)
        notes_key = f"projects/{project_id}/notes/v2.json"
        note_data = parse_midi_bytes(simple_midi_bytes)
        get_storage().upload(
            notes_key,
            json.dumps(note_data.to_dict(), separators=(",", ":")).encode(),
            "application/json",
        )
        with get_sessionmaker()() as db:
            project = db.get(Project, uuid.UUID(project_id))
            assert project is not None
            project.status = "ready"
            project.analysis_summary = {**note_data.summary(), "notes_key": notes_key}
            db.commit()

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["job_type"] == "render_sheet"
        assert body["status"] == "queued"


class TestErrorPaths:
    def test_invalid_midi_rejected_on_confirm(self, client: TestClient) -> None:
        project_id = _create_project(client)
        confirm = _upload(client, project_id, b"garbage bytes, not midi at all")
        assert confirm.status_code == 202
        assert confirm.json()["parse_job"]["status"] == "queued"

        detail = client.get(f"/api/v1/projects/{project_id}")
        assert detail.json()["status"] == "parsing"

    def test_wrong_extension_rejected(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "song.mp3", "size_bytes": 100},
        )
        assert response.status_code == 400

    def test_oversize_rejected_at_init(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "song.mid", "size_bytes": 100 * 1024 * 1024},
        )
        assert response.status_code == 413
        assert response.json()["error"]["code"] == "FILE_TOO_LARGE"

    def test_notes_not_ready_before_upload(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.get(f"/api/v1/projects/{project_id}/notes")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "NOTES_NOT_READY"

    def test_unknown_project_404(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_tampered_signature_rejected(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _create_project(client)
        init = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "song.mid", "size_bytes": len(simple_midi_bytes)},
        ).json()
        tampered = init["upload_url"][:-4] + "0000"
        put = client.put(tampered, content=simple_midi_bytes)
        assert put.status_code == 403

    def test_second_upload_conflicts(self, client: TestClient, simple_midi_bytes: bytes) -> None:
        project_id = _create_project(client)
        confirm = _upload(client, project_id, simple_midi_bytes)
        assert confirm.status_code == 202
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "again.mid", "size_bytes": 100},
        )
        assert response.status_code == 409

    def test_manual_parse_endpoint_deduplicates_live_job(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _create_project(client)
        first = _upload(client, project_id, simple_midi_bytes).json()["parse_job"]
        second = client.post(f"/api/v1/projects/{project_id}/jobs/parse-midi")
        assert second.status_code == 200
        assert second.json()["id"] == first["id"]


class TestProjectCrud:
    def test_list_and_delete(self, client: TestClient) -> None:
        project_id = _create_project(client, "To Delete")
        assert any(
            item["id"] == project_id for item in client.get("/api/v1/projects").json()["items"]
        )

        assert client.delete(f"/api/v1/projects/{project_id}").status_code == 204
        assert client.get(f"/api/v1/projects/{project_id}").status_code == 404
