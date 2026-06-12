"""Expired-output lifecycle sweep tests (Phase 10)."""

import os
import uuid
from datetime import UTC, datetime, timedelta


def _setup(tmp_path):
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'worker.db'}",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
        }
    )
    from app.config import get_settings
    from app.db import Base, OutputFile, Project, RenderJob, User, make_sessionmaker
    from app.storage import get_storage

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    job_id = uuid.uuid4()
    storage = get_storage()

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(Project(id=project_id, user_id=user_id, name="Song", status="ready"))
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="render_sheet",
                status="completed",
            )
        )
        db.commit()

    def add_output(key: str, expires_at, upload: bool = True) -> uuid.UUID:
        output_id = uuid.uuid4()
        if upload:
            storage.upload(key, b"data", "application/pdf")
        with SessionMaker() as db:
            db.add(
                OutputFile(
                    id=output_id,
                    project_id=project_id,
                    job_id=job_id,
                    user_id=user_id,
                    kind="sheet_pdf",
                    storage_key=key,
                    content_type="application/pdf",
                    size_bytes=4,
                    expires_at=expires_at,
                )
            )
            db.commit()
        return output_id

    return SessionMaker, storage, add_output


def test_sweep_removes_expired_and_keeps_live(tmp_path) -> None:
    SessionMaker, storage, add_output = _setup(tmp_path)

    from app.cleanup import cleanup_expired_outputs
    from app.db import OutputFile
    from app.storage import ObjectNotFoundError

    now = datetime.now(UTC)
    expired_id = add_output("projects/x/outputs/a/old.pdf", now - timedelta(days=1))
    live_id = add_output("projects/x/outputs/b/new.pdf", now + timedelta(days=29))
    no_expiry_id = add_output("projects/x/outputs/c/keep.pdf", None)

    removed = cleanup_expired_outputs()
    assert removed == 1

    with SessionMaker() as db:
        assert db.get(OutputFile, expired_id) is None
        assert db.get(OutputFile, live_id) is not None
        assert db.get(OutputFile, no_expiry_id) is not None

    # Expired object gone from storage; live ones remain.
    try:
        storage.download("projects/x/outputs/a/old.pdf")
        raise AssertionError("expired object should be deleted")
    except ObjectNotFoundError:
        pass
    assert storage.download("projects/x/outputs/b/new.pdf") == b"data"


def test_sweep_handles_already_missing_object(tmp_path) -> None:
    SessionMaker, _, add_output = _setup(tmp_path)

    from app.cleanup import cleanup_expired_outputs
    from app.db import OutputFile

    orphan_row = add_output(
        "projects/x/outputs/gone/missing.pdf",
        datetime.now(UTC) - timedelta(days=2),
        upload=False,
    )

    assert cleanup_expired_outputs() == 1
    with SessionMaker() as db:
        assert db.get(OutputFile, orphan_row) is None


def test_handlers_set_expiry(tmp_path) -> None:
    """Newly created outputs carry expires_at ≈ now + retention."""
    from app.jobs.base import output_expiry

    expiry = output_expiry()
    delta = expiry - datetime.now(UTC)
    assert timedelta(days=29) < delta <= timedelta(days=30)
