import io
import json
import os
import uuid

import mido


def _simple_midi_bytes() -> bytes:
    midi = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack()
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120), time=0))
    for pitch in (60, 62, 64, 65, 67, 69, 71, 72, 74, 76):
        track.append(mido.Message("note_on", note=pitch, velocity=80, time=0))
        track.append(mido.Message("note_off", note=pitch, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.tracks.append(track)
    buffer = io.BytesIO()
    midi.save(file=buffer)
    return buffer.getvalue()


def _setup(tmp_path, midi_bytes: bytes):
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
    storage_key = f"projects/{project_id}/uploads/{upload_id.hex}.mid"
    get_storage().upload(storage_key, midi_bytes, "audio/midi")

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(Project(id=project_id, user_id=user_id, name="Song", status="parsing"))
        db.add(
            UploadedFile(
                id=upload_id,
                project_id=project_id,
                user_id=user_id,
                storage_key=storage_key,
                original_name="song.mid",
                content_type="audio/midi",
                size_bytes=len(midi_bytes),
                upload_status="uploaded",
            )
        )
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="parse_midi",
                status="queued",
            )
        )
        db.commit()
    return SessionMaker, job_id, project_id


def _setup_ready_project(tmp_path, midi_bytes: bytes):
    SessionMaker, _, project_id = _setup(tmp_path, midi_bytes)
    from app.db import Project, RenderJob
    from app.storage import get_storage
    from pianoflow_music.midi.parse import parse_midi_bytes

    note_data = parse_midi_bytes(midi_bytes)
    notes_key = f"projects/{project_id}/notes/v2.json"
    get_storage().upload(
        notes_key,
        json.dumps(note_data.to_dict(), separators=(",", ":")).encode(),
        "application/json",
    )
    sheet_job_id = uuid.uuid4()
    with SessionMaker() as db:
        project = db.get(Project, project_id)
        assert project is not None
        project.status = "ready"
        project.analysis_summary = {**note_data.summary(), "notes_key": notes_key}
        db.add(
            RenderJob(
                id=sheet_job_id,
                project_id=project_id,
                user_id=project.user_id,
                job_type="render_sheet",
                status="queued",
            )
        )
        db.commit()
    return SessionMaker, sheet_job_id, project_id


def test_parse_midi_handler_completes_job(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, _simple_midi_bytes())

    from app.db import Project, RenderJob
    from app.jobs.parse_midi import handle_parse_midi
    from app.storage import get_storage

    handle_parse_midi({"job_id": str(job_id), "job_type": "parse_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None
        assert project is not None
        assert job.status == "completed"
        assert job.progress == 100
        assert project.status == "ready"
        assert project.analysis_summary["note_count"] == 10
        notes = get_storage().download(project.analysis_summary["notes_key"])
        assert b'"name":"C4"' in notes


def test_parse_midi_handler_marks_invalid_midi_failed(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, b"not midi")

    from app.db import Project, RenderJob
    from app.jobs.parse_midi import handle_parse_midi

    handle_parse_midi({"job_id": str(job_id), "job_type": "parse_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None
        assert project is not None
        assert job.status == "failed"
        assert job.error_type == "INVALID_MIDI"
        assert project.status == "failed"


def test_parse_midi_handler_requeues_transient_failure(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, _simple_midi_bytes())

    from app.db import Project, RenderJob
    from app.jobs import parse_midi
    from app.jobs.base import RequeueJob

    def _boom(data: bytes):
        raise RuntimeError("temporary parse crash")

    monkeypatch.setattr(parse_midi, "parse_midi_bytes", _boom)

    try:
        parse_midi.handle_parse_midi({"job_id": str(job_id), "job_type": "parse_midi"})
    except RequeueJob:
        pass
    else:
        raise AssertionError("expected RequeueJob")

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None
        assert project is not None
        assert job.status == "queued"
        assert job.attempt == 1
        assert job.error_type == "RuntimeError"
        assert project.status == "parsing"


def test_parse_midi_handler_fails_after_max_attempts(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, project_id = _setup(tmp_path, _simple_midi_bytes())

    from app.db import Project, RenderJob
    from app.jobs import parse_midi

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        job.attempt = job.max_attempts - 1
        db.commit()

    def _boom(data: bytes):
        raise RuntimeError("permanent crash")

    monkeypatch.setattr(parse_midi, "parse_midi_bytes", _boom)
    parse_midi.handle_parse_midi({"job_id": str(job_id), "job_type": "parse_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None
        assert project is not None
        assert job.status == "failed"
        assert job.attempt == job.max_attempts
        assert job.error_type == "RuntimeError"
        assert project.status == "failed"


def test_render_sheet_handler_outputs_pdf_and_musicxml(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup_ready_project(tmp_path, _simple_midi_bytes())

    from app.db import OutputFile, RenderJob
    from app.jobs.render_sheet import handle_render_sheet

    handle_render_sheet({"job_id": str(job_id), "job_type": "render_sheet"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "completed"
        outputs = (
            db.query(OutputFile)
            .filter(OutputFile.project_id == project_id, OutputFile.job_id == job_id)
            .all()
        )
        assert {output.kind for output in outputs} == {"sheet_pdf", "sheet_musicxml"}
        assert all(output.size_bytes > 0 for output in outputs)
