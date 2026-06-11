import pytest

from pianoflow_music.midi.errors import InvalidMidiError, TooLongError
from pianoflow_music.midi.validate import validate_midi_bytes


def test_valid_simple_midi_passes(simple_midi_bytes: bytes) -> None:
    result = validate_midi_bytes(simple_midi_bytes)
    assert result.note_on_count == 10
    assert result.track_count == 1
    assert 4.0 < result.duration_sec < 6.0  # 10 quarter notes at 120 BPM = 5 s


def test_invalid_bytes_rejected(invalid_midi_bytes: bytes) -> None:
    with pytest.raises(InvalidMidiError):
        validate_midi_bytes(invalid_midi_bytes)


def test_empty_bytes_rejected() -> None:
    with pytest.raises(InvalidMidiError):
        validate_midi_bytes(b"")


def test_truncated_header_rejected(simple_midi_bytes: bytes) -> None:
    with pytest.raises(InvalidMidiError):
        validate_midi_bytes(simple_midi_bytes[:10])


def test_long_song_rejected(long_midi_bytes: bytes) -> None:
    with pytest.raises(TooLongError):
        validate_midi_bytes(long_midi_bytes)


def test_long_song_accepted_with_raised_limit(long_midi_bytes: bytes) -> None:
    result = validate_midi_bytes(long_midi_bytes, max_duration_sec=100_000)
    assert result.note_on_count == 1300
