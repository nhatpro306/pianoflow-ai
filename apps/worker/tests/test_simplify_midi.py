import json
import os
import uuid

from pianoflow_music.midi.parse import parse_midi_bytes

from .test_parse_midi import _simple_midi_bytes


def _setup_ready_simplify_project(tmp_path):
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

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    job_id = uuid.uuid4()
    note_data = parse_midi_bytes(_simple_midi_bytes())
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
                name="Song",
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
                settings_snapshot={"difficulty": "easy"},
            )
        )
        db.commit()
    return SessionMaker, job_id, project_id


def test_simplify_midi_outputs_midi_and_notes(tmp_path) -> None:
    SessionMaker, job_id, project_id = _setup_ready_simplify_project(tmp_path)

    from app.db import OutputFile, Project, RenderJob
    from app.jobs.simplify_midi import handle_simplify_midi
    from app.storage import get_storage

    handle_simplify_midi({"job_id": str(job_id), "job_type": "simplify_midi"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        project = db.get(Project, project_id)
        assert job is not None
        assert project is not None
        assert job.status == "completed"
        notes_key = project.analysis_summary["simplified_notes_keys"]["easy"]
        notes = json.loads(get_storage().download(notes_key))
        assert notes["meta"]["simplification"]["difficulty"] == "easy"
        outputs = (
            db.query(OutputFile)
            .filter(OutputFile.project_id == project_id, OutputFile.job_id == job_id)
            .all()
        )
        assert [output.kind for output in outputs] == ["simplified_midi"]
        assert outputs[0].output_metadata["download_allowed"] is True
