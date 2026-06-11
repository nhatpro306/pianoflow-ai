"""Public API for the beginner-mode simplification pipeline (Phase 8)."""

from __future__ import annotations

from dataclasses import replace

from pianoflow_music.notes.model import NoteData
from pianoflow_music.simplify.reduce import reduce_notes


def simplify(note_data: NoteData, difficulty: str) -> NoteData:
    """Return a new NoteData with notes simplified for *difficulty*.

    *difficulty* must be "easy" or "very_easy"; "original" is a no-op.
    The returned object shares the same schema_version, bpm, and timing as
    the input — only the note list changes.
    """
    if difficulty not in ("easy", "very_easy"):
        return note_data

    simplified_notes = reduce_notes(note_data.notes, difficulty, note_data.bpm)

    # Re-sequence IDs so downstream renderers get a contiguous list.
    renumbered = [
        type(n)(
            id=i,
            pitch=n.pitch,
            name=n.name,
            velocity=n.velocity,
            start=n.start,
            end=n.end,
            duration=n.duration,
            track=n.track,
            hand=n.hand,
        )
        for i, n in enumerate(simplified_notes)
    ]

    return replace(
        note_data,
        notes=renumbered,
        meta={
            **note_data.meta,
            "simplified": True,
            "difficulty": difficulty,
            "original_note_count": len(note_data.notes),
        },
    )
