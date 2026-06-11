"""transcribe_audio handler tests."""

import io
import os
import uuid
import wave


def _wav_bytes(seconds: float = 2.0, rate: int = 8000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"\x01\x02" * int(rate * seconds))
    return buffer.getvalue()


def _setup(tmp_path, audio_bytes: bytes, rights_attestation: bool = True):
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'worker.db'}",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
        }
    )
    from app.config import get_settings
    from app.db import Base, Project, RenderJob, UploadedFile, User, make_sessionmaker
    from app.storage import get_storage

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    upload_id = uuid.uuid4()
    job_id = uuid.uuid4()
    storage_key = f"projects/{project_id}/uploads/{upload_id.hex}.wav"
    get_storage().upload(storage_key, audio_bytes, "audio/wav")

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(
            Project(
                id=project_id,
                user_id=user_id,
                name="Recording",
                status="transcribing",
                source_type="audio_upload",
                transcription_status="queued",
            )
        )
        db.add(
            UploadedFile(
                id=upload_id,
                project_id=project_id,
                user_id=user_id,
                kind="audio",
                storage_key=storage_key,
                original_name="take.wav",
                content_type="audio/wav",
                size_bytes=len(audio_bytes),
                upload_status="uploaded",
                rights_attestation=rights_attestation,
            )
        )
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="transcribe_audio",
                status="queued",
                queue_name="q_audio",
            )
        )
        db.commit()
    return SessionMaker, job_id, project_id


EXPECTED_KINDS = {
    "transcribed_draft_midi",
    "transcription_notes_json",
    "transcription_confidence_json",
    "transcription_report_json",
}


def test_transcribe_audio_creates_draft_outputs(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, _wav_bytes())

    from app.db import OutputFile, Project, RenderJob
    from app.jobs.transcribe_audio import handle_transcribe_audio
    from app.storage import get_storage

    handle_transcribe_audio({"job_id": str(job_id), "job_type": "transcribe_audio"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None and project is not None
        assert job.status == "completed"
        assert project.status == "ready"
        assert project.transcription_status == "completed"
        assert project.draft_midi_path
        assert project.transcription_confidence_json_path

        outputs = db.query(OutputFile).filter(OutputFile.job_id == job_id).all()
        assert {output.kind for output in outputs} == EXPECTED_KINDS
        assert all(output.size_bytes > 0 for output in outputs)

        confidence = next(o for o in outputs if o.kind == "transcription_confidence_json")
        assert confidence.output_metadata["confidence_summary"]["overall"] is not None

        draft = next(o for o in outputs if o.kind == "transcribed_draft_midi")
        midi_bytes = get_storage().download(draft.storage_key)
        assert midi_bytes[:4] == b"MThd"


def test_transcribe_audio_fails_without_rights_attestation(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, _wav_bytes(), rights_attestation=False)

    from app.db import Project, RenderJob
    from app.jobs.transcribe_audio import handle_transcribe_audio

    handle_transcribe_audio({"job_id": str(job_id), "job_type": "transcribe_audio"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None and project is not None
        assert job.status == "failed"
        assert job.error_type == "RIGHTS_ATTESTATION_REQUIRED"
        assert project.transcription_status == "failed"


def test_transcribe_audio_fails_when_audio_object_missing(tmp_path) -> None:
    SessionMaker, job_id, _ = _setup(tmp_path, _wav_bytes())

    from app.db import RenderJob, UploadedFile
    from app.jobs.transcribe_audio import handle_transcribe_audio
    from app.storage import LocalStorageService, get_storage

    storage = get_storage()
    assert isinstance(storage, LocalStorageService)
    with SessionMaker() as db:
        upload = db.query(UploadedFile).one()
        (storage.root / upload.storage_key).unlink()

    handle_transcribe_audio({"job_id": str(job_id), "job_type": "transcribe_audio"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "failed"
        assert job.error_type == "SOURCE_AUDIO_MISSING"


def test_transcribe_audio_requeues_transient_failure(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, _ = _setup(tmp_path, _wav_bytes())

    from app.jobs import transcribe_audio
    from app.jobs.base import RequeueJob

    def _boom(name: str = "default"):
        raise RuntimeError("engine briefly unavailable")

    monkeypatch.setattr(transcribe_audio, "get_engine", _boom)

    try:
        transcribe_audio.handle_transcribe_audio(
            {"job_id": str(job_id), "job_type": "transcribe_audio"}
        )
    except RequeueJob:
        pass
    else:
        raise AssertionError("expected RequeueJob")

    from app.db import RenderJob

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "queued"
        assert job.attempt == 1
