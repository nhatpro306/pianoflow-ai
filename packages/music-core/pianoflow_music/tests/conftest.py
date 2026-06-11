from pathlib import Path

import pytest

from pianoflow_music.tests.fixtures.generate import FIXTURES_DIR, write_all

_NAMES = ("simple.mid", "chords.mid", "long_song.mid", "invalid.mid")


@pytest.fixture(scope="session", autouse=True)
def ensure_fixtures() -> None:
    if not all((FIXTURES_DIR / name).exists() for name in _NAMES):
        write_all()


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    return FIXTURES_DIR


@pytest.fixture(scope="session")
def simple_midi_bytes() -> bytes:
    return (FIXTURES_DIR / "simple.mid").read_bytes()


@pytest.fixture(scope="session")
def chords_midi_bytes() -> bytes:
    return (FIXTURES_DIR / "chords.mid").read_bytes()


@pytest.fixture(scope="session")
def long_midi_bytes() -> bytes:
    return (FIXTURES_DIR / "long_song.mid").read_bytes()


@pytest.fixture(scope="session")
def invalid_midi_bytes() -> bytes:
    return (FIXTURES_DIR / "invalid.mid").read_bytes()
