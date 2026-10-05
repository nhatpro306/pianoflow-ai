from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.notes.model import Note, NoteData
from pianoflow_music.sheet.musicxml import note_data_to_musicxml
from pianoflow_music.sheet.pdf import note_data_to_pdf, note_data_to_simple_pdf


def test_musicxml_export_contains_parts_and_notes(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    payload = note_data_to_musicxml(note_data, title="Simple")
    assert payload.startswith(b'<?xml version="1.0"')
    assert b'<score-partwise version="3.1">' in payload
    assert b"<work-title>Simple</work-title>" in payload
    assert payload.count(b"<note>") == 10


def test_vector_pdf_valid_structure(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    pdf = note_data_to_pdf(note_data, title="Canon in D", composer="Pachelbel")

    assert pdf.startswith(b"%PDF-1.4\n")
    assert pdf.endswith(b"%%EOF\n")
    assert b"/Type /Catalog" in pdf
    assert b"/Type /Pages" in pdf
    assert b"/Type /Page" in pdf
    assert b"/Type /Font" in pdf
    assert b"xref\n0 " in pdf
    assert b"trailer\n" in pdf
    assert b"startxref\n" in pdf
    assert b"Canon in D" in pdf
    assert b"Pachelbel" in pdf


def test_vector_pdf_contains_grand_staff_operators(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    pdf = note_data_to_pdf(note_data, title="Operator Test")

    # Check vector construction and painting operators
    # m = moveto, l = lineto, c = curveto, re = rectangle, f = fill, s = stroke
    assert b" m " in pdf or b" m\n" in pdf
    assert b" l " in pdf or b" l\n" in pdf
    assert b" c " in pdf or b" c\n" in pdf
    assert b" re " in pdf or b" re\n" in pdf
    assert b" f\n" in pdf or b" f " in pdf
    assert b" s\n" in pdf or b" s " in pdf

    # Check font references and tempo marking
    assert b"/F1" in pdf  # Helvetica
    assert b"/F2" in pdf  # Helvetica-Bold
    assert b"/F3" in pdf  # Helvetica-Oblique
    assert b"BPM" in pdf


def test_vector_pdf_ledger_lines_middle_c() -> None:
    # Construct NoteData containing Middle C (MIDI 60) in RH and LH
    c4_right = Note(
        id=1,
        pitch=60,
        name="C4",
        velocity=80,
        start=0.0,
        end=1.0,
        duration=1.0,
        track=0,
        hand="R",
    )
    c4_left = Note(
        id=2,
        pitch=60,
        name="C4",
        velocity=80,
        start=1.0,
        end=2.0,
        duration=1.0,
        track=0,
        hand="L",
    )
    high_c = Note(
        id=3,
        pitch=84,  # C6 (high note with ledger lines)
        name="C6",
        velocity=80,
        start=2.0,
        end=3.0,
        duration=1.0,
        track=0,
        hand="R",
    )
    low_c = Note(
        id=4,
        pitch=36,  # C2 (low note with ledger lines)
        name="C2",
        velocity=80,
        start=3.0,
        end=4.0,
        duration=1.0,
        track=0,
        hand="L",
    )
    note_data = NoteData(
        schema_version=2,
        bpm=120.0,
        duration_sec=4.0,
        time_signature="4/4",
        notes=[c4_right, c4_left, high_c, low_c],
    )

    pdf = note_data_to_pdf(note_data, title="Ledger Line Test")
    assert pdf.startswith(b"%PDF-1.4")

    # In System 0 on Page 1:
    # Treble Line 1 Y_T = 600.0. Middle C offset is -2 -> ledger line at Y_T - 7.0 = 593.00
    # Bass Line 1 Y_B = 520.0. Middle C offset is 10 -> ledger line at Y_B + 35.0 = 555.00
    assert b"593.00 l s" in pdf
    assert b"555.00 l s" in pdf


def test_vector_pdf_multi_page_pagination() -> None:
    # 20 measures at 120 BPM in 4/4 = 40.0 seconds
    # With 2 measures per system, 20 measures = 10 systems.
    # Page 1 holds 3 systems, Page 2 holds 4 systems, Page 3 holds 3 systems -> 3 pages.
    notes = [
        Note(
            id=i,
            pitch=60 + (i % 12),
            name=f"N{i}",
            velocity=80,
            start=float(i * 2),
            end=float(i * 2 + 1),
            duration=1.0,
            track=0,
            hand="R" if i % 2 == 0 else "L",
        )
        for i in range(20)
    ]
    note_data = NoteData(
        schema_version=2,
        bpm=120.0,
        duration_sec=40.0,
        time_signature="4/4",
        notes=notes,
    )

    pdf = note_data_to_pdf(note_data, title="Multi-Page Score")
    assert pdf.startswith(b"%PDF-1.4")
    # Verify multiple pages exist in the Pages catalog
    assert b"/Count 3" in pdf or b"/Count 2" in pdf
    assert pdf.count(b"/Type /Page") >= 3  # Multiple page objects
    assert b"Page 2" in pdf


def test_backward_compatibility_alias(simple_midi_bytes: bytes) -> None:
    note_data = parse_midi_bytes(simple_midi_bytes)
    pdf_from_simple = note_data_to_simple_pdf(note_data, title="Alias Test")
    pdf_from_vector = note_data_to_pdf(note_data, title="Alias Test")

    assert pdf_from_simple.startswith(b"%PDF-1.4")
    assert pdf_from_simple.endswith(b"%%EOF\n")
    assert pdf_from_simple == pdf_from_vector


def test_fractional_time_signatures() -> None:
    note = Note(
        id=1,
        pitch=60,
        name="C4",
        velocity=80,
        start=0.0,
        end=0.5,
        duration=0.5,
        track=0,
        hand="R",
    )
    for ts in ["3/4", "6/8", "3/8", "9/8", "C", "C|"]:
        nd = NoteData(
            schema_version=2,
            bpm=100.0,
            duration_sec=5.0,
            time_signature=ts,
            notes=[note],
        )
        pdf = note_data_to_pdf(nd, title=f"Time Signature {ts}")
        assert pdf.startswith(b"%PDF-1.4")
        assert pdf.endswith(b"%%EOF\n")
