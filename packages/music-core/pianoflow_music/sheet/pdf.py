"""PDF export facade."""

from __future__ import annotations

from pianoflow_music.notes.model import NoteData
from pianoflow_music.sheet.engraver import GrandStaffEngraver


def note_data_to_pdf(
    note_data: NoteData,
    title: str = "PianoFlow Sheet",
    composer: str | None = None,
) -> bytes:
    """Generate high-resolution vector Grand Staff sheet music PDF."""
    engraver = GrandStaffEngraver(note_data, title=title, composer=composer)
    return engraver.render_pdf()


def note_data_to_simple_pdf(
    note_data: NoteData,
    title: str = "PianoFlow Sheet",
    composer: str | None = None,
) -> bytes:
    """Backward compatibility alias pointing to the vector engraver."""
    return note_data_to_pdf(note_data, title=title, composer=composer)
