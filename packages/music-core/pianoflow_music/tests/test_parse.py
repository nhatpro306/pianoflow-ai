import pytest

from pianoflow_music.midi.errors import InvalidMidiError
from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.notes.model import NoteData


def test_parse_simple_extracts_known_notes(simple_midi_bytes: bytes) -> None:
    data = parse_midi_bytes(simple_midi_bytes)

    assert data.schema_version == 2
    assert data.bpm == pytest.approx(120.0)
    assert data.time_signature == "4/4"
    assert len(data.notes) == 10

    first = data.notes[0]
    assert first.pitch == 60
    assert first.name == "C4"
    assert first.velocity == 80
    assert first.start == pytest.approx(0.0)
    assert first.end == pytest.approx(0.5, abs=0.01)  # quarter note at 120 BPM

    # Sequential, contiguous ids, monotonic starts.
    assert [n.id for n in data.notes] == list(range(10))
    starts = [n.start for n in data.notes]
    assert starts == sorted(starts)


def test_parse_chords_two_track_hand_split(chords_midi_bytes: bytes) -> None:
    data = parse_midi_bytes(chords_midi_bytes)

    assert data.meta["hand_split"] == "tracks"
    rh = [n for n in data.notes if n.hand == "R"]
    lh = [n for n in data.notes if n.hand == "L"]
    assert len(rh) == 12  # 4 chords x 3 notes
    assert len(lh) == 4
    assert all(n.pitch >= 60 for n in rh)
    assert all(n.pitch <= 43 for n in lh)


def test_parse_single_track_uses_pitch_heuristic(simple_midi_bytes: bytes) -> None:
    data = parse_midi_bytes(simple_midi_bytes)
    assert data.meta["hand_split"] == "pitch_heuristic"
    # All fixture notes are >= C4, so everything lands in the right hand.
    assert all(n.hand == "R" for n in data.notes)


def test_parse_rejects_invalid(invalid_midi_bytes: bytes) -> None:
    with pytest.raises(InvalidMidiError):
        parse_midi_bytes(invalid_midi_bytes)


def test_roundtrip_dict_serialization(chords_midi_bytes: bytes) -> None:
    data = parse_midi_bytes(chords_midi_bytes)
    restored = NoteData.from_dict(data.to_dict())
    assert restored == data


def test_summary_shape(chords_midi_bytes: bytes) -> None:
    summary = parse_midi_bytes(chords_midi_bytes).summary()
    assert summary["note_count"] == 16
    assert summary["track_count"] == 2
    assert summary["pitch_min"] == 36
    assert summary["pitch_max"] == 72
    assert summary["hand_split"] == "tracks"
