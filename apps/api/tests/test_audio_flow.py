"""Audio → MIDI Beta API flow tests."""

import io
import wave

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def wav_bytes() -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b"\x01\x02" * 16000)  # 2 seconds
    return buffer.getvalue()


def _create_project(client: TestClient, name: str = "Audio Song") -> str:
    response = client.post("/api/v1/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


def _init_audio(client: TestClient, project_id: str, data: bytes, **overrides):
    body = {
        "filename": "take.wav",
        "size_bytes": len(data),
        "rights_attestation": True,
        **overrides,
    }
    return client.post(f"/api/v1/projects/{project_id}/upload-audio", json=body)


def _upload_audio(client: TestClient, project_id: str, data: bytes):
    init = _init_audio(client, project_id, data)
    assert init.status_code == 200, init.text
    init_body = init.json()
    put = client.put(init_body["upload_url"], content=data, headers=init_body["headers"])
    assert put.status_code == 200, put.text
    return client.post(
        f"/api/v1/projects/{project_id}/upload-audio/confirm",
        json={"upload_id": init_body["upload_id"]},
    )


class TestAudioUploadInit:
    def test_rights_attestation_required(self, client: TestClient, wav_bytes: bytes) -> None:
        project_id = _create_project(client)
        response = _init_audio(client, project_id, wav_bytes, rights_attestation=False)
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "RIGHTS_ATTESTATION_REQUIRED"

        missing = client.post(
            f"/api/v1/projects/{project_id}/upload-audio",
            json={"filename": "take.wav", "size_bytes": len(wav_bytes)},
        )
        assert missing.status_code == 400
        assert missing.json()["error"]["code"] == "RIGHTS_ATTESTATION_REQUIRED"

    def test_unsupported_type_rejected(self, client: TestClient, wav_bytes: bytes) -> None:
        project_id = _create_project(client)
        response = _init_audio(client, project_id, wav_bytes, filename="take.flac")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "UNSUPPORTED_AUDIO_TYPE"

    def test_too_large_rejected(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.post(
            f"/api/v1/projects/{project_id}/upload-audio",
            json={
                "filename": "take.wav",
                "size_bytes": 200 * 1024 * 1024,
                "rights_attestation": True,
            },
        )
        assert response.status_code == 413
        assert response.json()["error"]["code"] == "AUDIO_FILE_TOO_LARGE"

    def test_unknown_project_404(self, client: TestClient, wav_bytes: bytes) -> None:
        response = _init_audio(client, "00000000-0000-0000-0000-000000000000", wav_bytes)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "PROJECT_NOT_FOUND"


class TestAudioConfirmAndJob:
    def test_confirm_enqueues_transcribe_job(self, client: TestClient, wav_bytes: bytes) -> None:
        project_id = _create_project(client)
        confirm = _upload_audio(client, project_id, wav_bytes)
        assert confirm.status_code == 202, confirm.text
        body = confirm.json()
        assert body["transcribe_job"]["job_type"] == "transcribe_audio"
        assert body["transcribe_job"]["status"] == "queued"
        assert body["project_status"] == "transcribing"

        job = client.get(f"/api/v1/jobs/{body['transcribe_job']['id']}")
        assert job.status_code == 200
        assert job.json()["job_type"] == "transcribe_audio"

        detail = client.get(f"/api/v1/projects/{project_id}")
        assert detail.json()["status"] == "transcribing"

    def test_manual_transcribe_endpoint_deduplicates(
        self, client: TestClient, wav_bytes: bytes
    ) -> None:
        project_id = _create_project(client)
        first = _upload_audio(client, project_id, wav_bytes).json()["transcribe_job"]
        second = client.post(f"/api/v1/projects/{project_id}/jobs/transcribe-audio")
        assert second.status_code == 200
        assert second.json()["id"] == first["id"]

    def test_transcribe_without_upload_conflicts(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.post(f"/api/v1/projects/{project_id}/jobs/transcribe-audio")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "NO_VALIDATED_UPLOAD"

    def test_parse_midi_ignores_audio_upload(self, client: TestClient, wav_bytes: bytes) -> None:
        project_id = _create_project(client)
        assert _upload_audio(client, project_id, wav_bytes).status_code == 202
        response = client.post(f"/api/v1/projects/{project_id}/jobs/parse-midi")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "NO_VALIDATED_UPLOAD"


class TestTranscriptionEndpoint:
    def test_transcription_status_none_initially(self, client: TestClient) -> None:
        project_id = _create_project(client)
        response = client.get(f"/api/v1/projects/{project_id}/transcription")
        assert response.status_code == 200
        assert response.json()["status"] == "none"

    def test_transcription_status_queued_after_confirm(
        self, client: TestClient, wav_bytes: bytes
    ) -> None:
        project_id = _create_project(client)
        _upload_audio(client, project_id, wav_bytes)
        response = client.get(f"/api/v1/projects/{project_id}/transcription")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "queued"
        assert "draft" in body["message"]

    def test_unknown_project_404(self, client: TestClient) -> None:
        response = client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000/transcription")
        assert response.status_code == 404


class TestTranscriptionLimit:
    def test_daily_limit_exceeded(self, client: TestClient, wav_bytes: bytes, monkeypatch) -> None:
        from app.core.config import get_settings

        monkeypatch.setattr(get_settings(), "transcriptions_per_day", 1)
        first_project = _create_project(client, "First")
        assert _upload_audio(client, first_project, wav_bytes).status_code == 202

        second_project = _create_project(client, "Second")
        init = _init_audio(client, second_project, wav_bytes)
        assert init.status_code == 200
        init_body = init.json()
        put = client.put(init_body["upload_url"], content=wav_bytes, headers=init_body["headers"])
        assert put.status_code == 200
        confirm = client.post(
            f"/api/v1/projects/{second_project}/upload-audio/confirm",
            json={"upload_id": init_body["upload_id"]},
        )
        assert confirm.status_code == 429
        assert confirm.json()["error"]["code"] == "TRANSCRIPTION_LIMIT_EXCEEDED"


class TestFeatureFlag:
    def test_disabled_flag_blocks_upload(
        self, client: TestClient, wav_bytes: bytes, monkeypatch
    ) -> None:
        from app.core.config import get_settings

        monkeypatch.setattr(get_settings(), "audio_transcription_enabled", False)
        project_id = _create_project(client)
        response = _init_audio(client, project_id, wav_bytes)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "AUDIO_TRANSCRIPTION_NOT_ENABLED"
