from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.sheet.musicxml import note_data_to_musicxml
from pianoflow_music.sheet.pdf import note_data_to_simple_pdf


def test_musicxml_export_contains_parts_and_notes(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    payload = note_data_to_musicxml(note_data, title="Simple")
    assert payload.startswith(b'<?xml version="1.0"')
    assert b'<score-partwise version="3.1">' in payload
    assert b"<work-title>Simple</work-title>" in payload
    assert payload.count(b"<note>") == 10


def test_simple_pdf_export_is_pdf(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    payload = note_data_to_simple_pdf(note_data, title="Simple")
    assert payload.startswith(b"%PDF-1.4")
    assert b"Auto-generated sheet preview" in payload
    assert b"%%EOF" in payload
