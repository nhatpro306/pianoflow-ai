from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData


def test_note_is_immutable_value_object() -> None:
    note = Note(
        id=0,
        pitch=60,
        name="C4",
        velocity=80,
        start=0.0,
        end=0.5,
        duration=0.5,
        track=0,
        hand="R",
    )
    assert note.name == "C4"


def test_notedata_defaults() -> None:
    data = NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=120.0,
        duration_sec=0.0,
        time_signature="4/4",
    )
    assert data.notes == []
    assert data.schema_version == SCHEMA_VERSION
    assert data.sustain == []
