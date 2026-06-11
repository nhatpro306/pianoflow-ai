import io
import os
from collections.abc import Iterator

import mido
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path) -> Iterator[TestClient]:
    """App wired to a throwaway SQLite DB and tmp local storage."""
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'test.db'}",
            "QUEUE_BACKEND": "memory",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
            "AUTH_MODE": "dev",
            "API_BASE_URL": "http://testserver",
            "ENV": "dev",
        }
    )

    # Reset cached singletons so each test gets fresh config/engine/storage.
    from app.core.config import get_settings
    from app.infrastructure.database.session import get_engine, get_sessionmaker
    from app.infrastructure.queue.factory import get_queue
    from app.infrastructure.storage.factory import get_storage

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    get_queue.cache_clear()
    get_storage.cache_clear()

    from app.infrastructure.database.models import Base
    from app.main import create_app

    Base.metadata.create_all(get_engine())

    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def simple_midi_bytes() -> bytes:
    """10 quarter notes at 120 BPM — mirrors music-core's simple.mid fixture."""
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
