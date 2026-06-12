"""Phase 8 Beginner Mode API tests: simplify job, chaining, difficulty notes."""

import json
import uuid

from fastapi.testclient import TestClient


def _create_project(client: TestClient, name: str = "Simplify Song") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


def _make_ready(client: TestClient, simple_midi_bytes: bytes) -> str:
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
    return project_id


def _set_difficulty(client: TestClient, project_id: str, difficulty: str) -> None:
    response = client.patch(
        f"/api/v1/projects/{project_id}/settings", json={"difficulty": difficulty}
    )
    assert response.status_code == 200, response.text


def _job_types_for_project(project_id: str) -> list[str]:
    from app.infrastructure.database.models import RenderJob
    from app.infrastructure.database.session import get_sessionmaker

    with get_sessionmaker()() as db:
        rows = (
            db.query(RenderJob)
            .filter(RenderJob.project_id == uuid.UUID(project_id))
            .order_by(RenderJob.created_at)
            .all()
        )
        return [row.job_type for row in rows]


class TestSimplifyEndpoint:
    def test_rejects_original_difficulty(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        response = client.post(f"/api/v1/projects/{project_id}/jobs/simplify-midi")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVALID_DIFFICULTY"

    def test_requires_ready_notes(self, client: TestClient) -> None:
        project_id = _create_project(client)
        _set_difficulty(client, project_id, "easy")
        response = client.post(f"/api/v1/projects/{project_id}/jobs/simplify-midi")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "NOTES_NOT_READY"

    def test_enqueues_and_deduplicates(self, client: TestClient, simple_midi_bytes: bytes) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        _set_difficulty(client, project_id, "easy")

        first = client.post(f"/api/v1/projects/{project_id}/jobs/simplify-midi")
        assert first.status_code == 201, first.text
        body = first.json()
        assert body["job_type"] == "simplify_midi"
        assert body["status"] == "queued"

        second = client.post(f"/api/v1/projects/{project_id}/jobs/simplify-midi")
        assert second.status_code == 200
        assert second.json()["id"] == body["id"]


class TestJobChaining:
    def test_render_video_chains_simplify_when_missing(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        _set_difficulty(client, project_id, "easy")

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-video")
        assert response.status_code == 201, response.text
        assert response.json()["job_type"] == "render_video"

        # simplify_midi was auto-enqueued ahead of render_video (FIFO queue).
        assert _job_types_for_project(project_id) == ["simplify_midi", "render_video"]

    def test_render_sheet_chains_simplify_when_missing(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        _set_difficulty(client, project_id, "very_easy")

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert response.status_code == 201, response.text
        assert _job_types_for_project(project_id) == ["simplify_midi", "render_sheet"]

    def test_no_chain_when_simplified_notes_exist(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from app.infrastructure.database.models import Project
        from app.infrastructure.database.session import get_sessionmaker

        project_id = _make_ready(client, simple_midi_bytes)
        _set_difficulty(client, project_id, "easy")

        with get_sessionmaker()() as db:
            project = db.get(Project, uuid.UUID(project_id))
            project.analysis_summary = {
                **project.analysis_summary,
                "simplified_notes": {"easy": f"projects/{project_id}/notes/v2_easy.json"},
            }
            db.commit()

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-video")
        assert response.status_code == 201, response.text
        assert _job_types_for_project(project_id) == ["render_video"]

    def test_no_chain_at_original_difficulty(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-video")
        assert response.status_code == 201, response.text
        assert _job_types_for_project(project_id) == ["render_video"]


class TestDifficultyNotes:
    def test_simplified_notes_409_until_generated(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        response = client.get(f"/api/v1/projects/{project_id}/notes?difficulty=easy")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "SIMPLIFIED_NOTES_NOT_READY"

    def test_simplified_notes_served_when_present(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from app.infrastructure.database.models import Project
        from app.infrastructure.database.session import get_sessionmaker
        from app.infrastructure.storage.factory import get_storage
        from pianoflow_music.midi.parse import parse_midi_bytes
        from pianoflow_music.simplify import simplify

        project_id = _make_ready(client, simple_midi_bytes)
        note_data = parse_midi_bytes(simple_midi_bytes)
        simplified = simplify(note_data, "easy")
        simplified_key = f"projects/{project_id}/notes/v2_easy.json"
        get_storage().upload(
            simplified_key,
            json.dumps(simplified.to_dict(), separators=(",", ":")).encode(),
            "application/json",
        )
        with get_sessionmaker()() as db:
            project = db.get(Project, uuid.UUID(project_id))
            project.analysis_summary = {
                **project.analysis_summary,
                "simplified_notes": {"easy": simplified_key},
            }
            db.commit()

        response = client.get(f"/api/v1/projects/{project_id}/notes?difficulty=easy")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["meta"]["difficulty"] == "easy"
        assert len(body["notes"]) <= len(note_data.notes)

    def test_original_notes_unaffected(self, client: TestClient, simple_midi_bytes: bytes) -> None:
        project_id = _make_ready(client, simple_midi_bytes)
        response = client.get(f"/api/v1/projects/{project_id}/notes")
        assert response.status_code == 200
