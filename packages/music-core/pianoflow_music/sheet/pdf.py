"""Simple built-in PDF fallback for Phase 6.

This is not a professional engraver. It produces a readable one-page PDF with
metadata and note rows so the Phase 6 pipeline can be exercised before
MuseScore is introduced in the worker image.
"""

from pianoflow_music.notes.model import NoteData


def _pdf_text_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def note_data_to_simple_pdf(note_data: NoteData, title: str = "PianoFlow Sheet") -> bytes:
    lines = [
        title,
        "Auto-generated sheet preview - rhythm is approximate.",
        (
            f"BPM: {note_data.bpm:g}   Duration: {note_data.duration_sec:.2f}s   "
            f"Notes: {len(note_data.notes)}"
        ),
        "",
        "Start     End       Hand  Note",
    ]
    for note in note_data.notes[:42]:
        lines.append(f"{note.start:7.2f}  {note.end:7.2f}   {note.hand:>1}    {note.name}")
    if len(note_data.notes) > 42:
        lines.append(f"... {len(note_data.notes) - 42} more notes")

    text_ops = ["BT", "/F1 12 Tf", "72 760 Td", "14 TL"]
    for index, line in enumerate(lines):
        if index:
            text_ops.append("T*")
        text_ops.append(f"({_pdf_text_escape(line)}) Tj")
    text_ops.append("ET")
    stream = "\n".join(text_ops).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
        ),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_start = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
        ).encode()
    )
    return bytes(output)
