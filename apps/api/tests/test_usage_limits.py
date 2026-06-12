"""Daily usage limit tests (Phase 9): uploads/day, jobs/day, video-seconds/day."""

import json
import uuid

from fastapi.testclient import TestClient


def _create_project(client: TestClient, name: str = "Limit Song") -> str:
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
        project.status = "ready"
        project.analysis_summary = {**note_data.summary(), "notes_key": notes_key}
        db.commit()
    return project_id


def _set_usage(client: TestClient, **counters) -> None:
    """Pre-load today's usage row for the dev user at the given counters."""
    from sqlalchemy import select

    from app.core.security import DEV_USER_EMAIL
    from app.infrastructure.database.models import User
    from app.infrastructure.database.repositories import UsageLimitRepository
    from app.infrastructure.database.session import get_sessionmaker

    # Ensure the dev user exists (created lazily on first request).
    client.get("/api/v1/projects")
    with get_sessionmaker()() as db:
        user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
        usage = UsageLimitRepository(db).get_or_create_today(user.id)
        for key, value in counters.items():
            setattr(usage, key, value)
        db.commit()


class TestUploadLimit:
    def test_upload_blocked_at_cap(self, client: TestClient) -> None:
        from app.core.config import get_settings

        _set_usage(client, uploads_count=get_settings().uploads_per_day)
        project_id = _create_project(client)
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "song.mid", "size_bytes": 100},
        )
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "UPLOAD_LIMIT_EXCEEDED"

    def test_upload_counts_toward_cap(self, client: TestClient) -> None:
        from sqlalchemy import select

        from app.core.security import DEV_USER_EMAIL
        from app.infrastructure.database.models import UsageLimit, User
        from app.infrastructure.database.session import get_sessionmaker

        project_id = _create_project(client)
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-midi",
            json={"filename": "song.mid", "size_bytes": 100},
        )
        assert response.status_code == 200, response.text

        with get_sessionmaker()() as db:
            user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
            usage = db.scalar(select(UsageLimit).where(UsageLimit.user_id == user.id))
            assert usage is not None
            assert usage.uploads_count == 1


class TestRenderJobLimit:
    def test_job_blocked_at_cap(self, client: TestClient, simple_midi_bytes: bytes) -> None:
        from app.core.config import get_settings

        project_id = _make_ready(client, simple_midi_bytes)
        _set_usage(client, render_jobs_count=get_settings().render_jobs_per_day)

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "JOB_LIMIT_EXCEEDED"

    def test_video_seconds_budget_blocked(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from app.core.config import get_settings

        project_id = _make_ready(client, simple_midi_bytes)
        _set_usage(client, video_seconds=get_settings().video_seconds_per_day)

        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-video")
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "VIDEO_SECONDS_LIMIT_EXCEEDED"

    def test_video_charges_scaled_duration(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from sqlalchemy import select

        from app.core.security import DEV_USER_EMAIL
        from app.infrastructure.database.models import UsageLimit, User
        from app.infrastructure.database.session import get_sessionmaker

        project_id = _make_ready(client, simple_midi_bytes)
        response = client.post(f"/api/v1/projects/{project_id}/jobs/render-video")
        assert response.status_code == 201, response.text

        with get_sessionmaker()() as db:
            user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
            usage = db.scalar(select(UsageLimit).where(UsageLimit.user_id == user.id))
            assert usage.render_jobs_count == 1
            assert usage.video_seconds >= 1  # ceil of the song duration

    def test_dedup_does_not_double_charge(
        self, client: TestClient, simple_midi_bytes: bytes
    ) -> None:
        from sqlalchemy import select

        from app.core.security import DEV_USER_EMAIL
        from app.infrastructure.database.models import UsageLimit, User
        from app.infrastructure.database.session import get_sessionmaker

        project_id = _make_ready(client, simple_midi_bytes)
        first = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert first.status_code == 201
        second = client.post(f"/api/v1/projects/{project_id}/jobs/render-sheet")
        assert second.status_code == 200  # deduped

        with get_sessionmaker()() as db:
            user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
            usage = db.scalar(select(UsageLimit).where(UsageLimit.user_id == user.id))
            assert usage.render_jobs_count == 1
