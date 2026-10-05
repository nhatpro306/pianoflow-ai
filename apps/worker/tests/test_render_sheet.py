"""Unit tests for render_sheet job handler and vector Grand Staff PDF generation."""

import io
import json
import os
import uuid

import mido


def _sample_midi_bytes() -> bytes:
    midi = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack()
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120), time=0))
    # 10 notes across both hands
    pitches = [60, 62, 64, 65, 67, 48, 50, 52, 53, 55]
    for pitch in pitches:
        track.append(mido.Message("note_on", note=pitch, velocity=80, time=0))
        track.append(mido.Message("note_off", note=pitch, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.tracks.append(track)
    buffer = io.BytesIO()
    midi.save(file=buffer)
    return buffer.getvalue()


def _setup_project(tmp_path, difficulty: str = "original"):
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'worker.db'}",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
        }
    )
    from app.config import get_settings
    from app.db import Base, Project, RenderJob, User, make_sessionmaker
    from app.storage import get_storage
    from pianoflow_music.midi.parse import parse_midi_bytes

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    job_id = uuid.uuid4()

    note_data = parse_midi_bytes(_sample_midi_bytes())
    notes_key = f"projects/{project_id}/notes/v2.json"
    get_storage().upload(
        notes_key,
        json.dumps(note_data.to_dict(), separators=(",", ":")).encode(),
        "application/json",
    )

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        project = Project(
            id=project_id,
            user_id=user_id,
            name="Moonlight Sonata",
            status="ready",
            analysis_summary={**note_data.summary(), "notes_key": notes_key},
        )
        db.add(project)
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="render_sheet",
                status="queued",
                settings_snapshot={"difficulty": difficulty},
            )
        )
        db.commit()

    return SessionMaker, job_id, project_id


def test_render_sheet_generates_vector_grand_staff_pdf(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup_project(tmp_path)

    from app.db import OutputFile, RenderJob
    from app.jobs.render_sheet import handle_render_sheet
    from app.storage import get_storage

    handle_render_sheet({"job_id": str(job_id), "job_type": "render_sheet"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "completed"
        assert job.progress == 100

        outputs = (
            db.query(OutputFile)
            .filter(OutputFile.project_id == project_id, OutputFile.job_id == job_id)
            .all()
        )
        assert len(outputs) == 2

        pdf_output = next(o for o in outputs if o.kind == "sheet_pdf")
        assert pdf_output.content_type == "application/pdf"
        assert pdf_output.output_metadata["source"] == "vector_grand_staff_engraver"
        assert pdf_output.output_metadata["difficulty"] == "original"

        # Verify storage content is a valid vector PDF 1.4 document
        storage = get_storage()
        pdf_bytes = storage.download(pdf_output.storage_key)
        assert pdf_bytes.startswith(b"%PDF-1.4\n")
        assert pdf_bytes.endswith(b"%%EOF\n")
        assert b"Moonlight Sonata" in pdf_bytes
        # Verify vector operators are present in stream
        assert b" m " in pdf_bytes or b" m\n" in pdf_bytes
        assert b" l " in pdf_bytes or b" l\n" in pdf_bytes
        assert b" c " in pdf_bytes or b" c\n" in pdf_bytes


def test_render_sheet_missing_notes_fails_cleanly(tmp_path) -> None:
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'worker.db'}",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
        }
    )
    from app.config import get_settings
    from app.db import Base, Project, RenderJob, User, make_sessionmaker
    from app.jobs.render_sheet import handle_render_sheet

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    job_id = uuid.uuid4()

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(
            Project(
                id=project_id,
                user_id=user_id,
                name="Empty Project",
                status="ready",
                analysis_summary={},  # no notes_key
            )
        )
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="render_sheet",
                status="queued",
            )
        )
        db.commit()

    handle_render_sheet({"job_id": str(job_id), "job_type": "render_sheet"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "failed"
        assert job.error_type == "NOTES_NOT_READY"
