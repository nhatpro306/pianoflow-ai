from dataclasses import replace

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import Note, NoteData
from pianoflow_music.simplify import simplify_note_data


def _dense_notes() -> NoteData:
    notes: list[Note] = []
    note_id = 0
    for onset in (0.0, 0.1, 0.2, 0.3):
        for pitch, hand in ((48, "L"), (52, "L"), (60, "R"), (64, "R"), (67, "R")):
            notes.append(
                Note(
                    id=note_id,
                    pitch=pitch,
                    name="C4",
                    velocity=80,
                    start=onset,
                    end=onset + 0.4,
                    duration=0.4,
                    track=0,
                    hand=hand,
                )
            )
            note_id += 1
    return NoteData(
        schema_version=2,
        bpm=120,
        duration_sec=1.0,
        time_signature="4/4",
        notes=notes,
        tracks=[{"index": 0, "name": "Dense", "note_count": len(notes)}],
    )


def test_simplify_never_increases_note_count() -> None:
    source = _dense_notes()
    assert len(simplify_note_data(source, "easy").notes) <= len(source.notes)
    assert len(simplify_note_data(source, "very_easy").notes) <= len(source.notes)


def test_simplify_preserves_top_melody_at_each_onset() -> None:
    source = _dense_notes()
    for difficulty in ("easy", "very_easy"):
        simplified = simplify_note_data(source, difficulty)
        for onset in {note.start for note in source.notes}:
            source_top = max(note.pitch for note in source.notes if note.start == onset)
            kept = [note.pitch for note in simplified.notes if note.start == onset]
            assert source_top in kept


def test_very_easy_is_no_denser_than_easy() -> None:
    source = _dense_notes()
    assert len(simplify_note_data(source, "very_easy").notes) <= len(
        simplify_note_data(source, "easy").notes
    )


def test_simplified_midi_round_trips(simple_midi_bytes: bytes) -> None:
    source = parse_midi_bytes(simple_midi_bytes)
    simplified = simplify_note_data(source, "easy")
    reparsed = parse_midi_bytes(note_data_to_midi_bytes(simplified))
    assert len(reparsed.notes) == len(simplified.notes)
    assert reparsed.duration_sec > 0


def test_simplify_rejects_original_difficulty() -> None:
    source = replace(_dense_notes())
    try:
        simplify_note_data(source, "original")  # type: ignore[arg-type]
    except ValueError:
        return
    raise AssertionError("expected ValueError")
