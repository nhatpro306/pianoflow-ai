"""Note normalization (DESIGN.md §4 step 3).

- Drop zero/negative-duration notes.
- Drop notes outside the piano range (A0=21 .. C8=108), counting them.
- Merge exact duplicates (same pitch, start, end).
Note ids are reassigned to stay contiguous after filtering.
"""

from dataclasses import replace

from pianoflow_music.notes.model import PIANO_HIGHEST_PITCH, PIANO_LOWEST_PITCH, Note

MIN_DURATION_SEC = 0.001


def normalize_notes(notes: list[Note]) -> tuple[list[Note], int]:
    """Return (normalized notes, dropped count)."""
    seen: set[tuple[int, float, float]] = set()
    kept: list[Note] = []
    dropped = 0

    for note in notes:
        if note.duration < MIN_DURATION_SEC:
            dropped += 1
            continue
        if not (PIANO_LOWEST_PITCH <= note.pitch <= PIANO_HIGHEST_PITCH):
            dropped += 1
            continue
        key = (note.pitch, note.start, note.end)
        if key in seen:
            dropped += 1
            continue
        seen.add(key)
        kept.append(note)

    return [replace(note, id=i) for i, note in enumerate(kept)], dropped
