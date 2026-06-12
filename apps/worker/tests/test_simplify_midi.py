"""simplify_midi handler tests (Phase 8 Beginner Mode)."""

import io
import json
import os
import uuid

import mido


def _dense_midi_bytes() -> bytes:
    """4 beats of 4-note chords — dense enough that simplification removes notes."""
    midi = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack()
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120), time=0))
    for _ in range(4):
        for pitch in (60, 64, 67, 72):
            track.append(mido.Message("note_on", note=pitch, velocity=80, time=0))
        track.append(mido.Message("note_off", note=60, velocity=0, time=480))
        for pitch in (64, 67, 72):
            track.append(mido.Message("note_off", note=pitch, velocity=0, time=0))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.tracks.append(track)
    buffer = io.BytesIO()
    midi.save(file=buffer)
    return buffer.getvalue()


def _setup_ready_project(tmp_path, difficulty: str = "easy"):
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

    note_data = parse_midi_bytes(_dense_midi_bytes())
    notes_key = f"projects/{project_id}/notes/v2.json"
    get_storage().upload(
        notes_key,
        json.dumps(note_data.to_dict(), separators=(",", ":")).encode(),
        "application/json",
    )

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(
            Project(
                id=project_id,
                user_id=user_id,
                name="Dense Song",
                status="ready",
                analysis_summary={**note_data.summary(), "notes_key": notes_key},
            )
        )
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="simplify_midi",
                status="queued",
                settings_snapshot={"difficulty": difficulty},
            )
        )
        db.commit()
    return SessionMaker, job_id, project_id, len(note_data.notes)


def test_simplify_midi_creates_outputs(tmp_path) -> None:
    SessionMaker, job_id, project_id, original_count = _setup_ready_project(tmp_path, "easy")

    from app.db import OutputFile, Project, RenderJob
    from app.jobs import simplify_midi
    from app.storage import get_storage
    from pianoflow_music.notes.model import NoteData

    simplify_midi.handle_simplify_midi({"job_id": str(job_id), "job_type": "simplify_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "completed", job.error_message

        # Downloadable simplified MIDI output registered
        output = db.query(OutputFile).filter(OutputFile.job_id == job_id).one()
        assert output.kind == "simplified_midi"
        assert output.content_type == "audio/midi"
        assert get_storage().download(output.storage_key)[:4] == b"MThd"

        # Simplified notes key recorded for render jobs to consume
        project = db.get(Project, project_id)
        simplified_key = project.analysis_summary["simplified_notes"]["easy"]
        simplified = NoteData.from_dict(json.loads(get_storage().download(simplified_key)))
        assert len(simplified.notes) < original_count
        assert simplified.meta["simplified"] is True
        assert simplified.meta["difficulty"] == "easy"


def test_simplify_midi_very_easy_reduces_more(tmp_path) -> None:
    SessionMaker, job_id, project_id, original_count = _setup_ready_project(tmp_path, "very_easy")

    from app.db import Project, RenderJob
    from app.jobs import simplify_midi
    from app.storage import get_storage
    from pianoflow_music.notes.model import NoteData

    simplify_midi.handle_simplify_midi({"job_id": str(job_id), "job_type": "simplify_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job.status == "completed", job.error_message
        project = db.get(Project, project_id)
        simplified_key = project.analysis_summary["simplified_notes"]["very_easy"]
        simplified = NoteData.from_dict(json.loads(get_storage().download(simplified_key)))
        # 4-note RH chords reduce to 1 note each at very_easy
        assert len(simplified.notes) <= original_count // 2


def test_simplify_midi_rejects_original_difficulty(tmp_path) -> None:
    SessionMaker, job_id, _, _ = _setup_ready_project(tmp_path, "original")

    from app.db import RenderJob
    from app.jobs import simplify_midi

    simplify_midi.handle_simplify_midi({"job_id": str(job_id), "job_type": "simplify_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job.status == "failed"
        assert job.error_type == "INVALID_DIFFICULTY"


def test_simplify_midi_fails_without_notes(tmp_path) -> None:
    SessionMaker, job_id, project_id, _ = _setup_ready_project(tmp_path)

    from app.db import Project, RenderJob
    from app.jobs import simplify_midi

    with SessionMaker() as db:
        project = db.get(Project, project_id)
        project.analysis_summary = {}
        db.commit()

    simplify_midi.handle_simplify_midi({"job_id": str(job_id), "job_type": "simplify_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job.status == "failed"
        assert job.error_type == "NOTES_NOT_READY"


def test_render_video_requires_simplified_notes_for_easy(tmp_path) -> None:
    """A render_video job with difficulty=easy fails fast if simplify hasn't run."""
    SessionMaker, _, project_id, _ = _setup_ready_project(tmp_path)

    from app.db import RenderJob
    from app.jobs import render_video

    video_job_id = uuid.uuid4()
    with SessionMaker() as db:
        job = db.query(RenderJob).first()
        db.add(
            RenderJob(
                id=video_job_id,
                project_id=project_id,
                user_id=job.user_id,
                job_type="render_video",
                status="queued",
                settings_snapshot={"difficulty": "easy", "resolution": "720p", "fps": 30},
            )
        )
        db.commit()

    render_video.handle_render_video({"job_id": str(video_job_id), "job_type": "render_video"})

    with SessionMaker() as db:
        job = db.get(RenderJob, video_job_id)
        assert job.status == "failed"
        assert job.error_type == "SIMPLIFIED_NOTES_NOT_READY"
