"""Draft-MIDI cleanup for raw transcription output (pure, no I/O).

ML transcribers (e.g. Basic Pitch) emit characteristic artifacts on solo
piano: stray out-of-range pitches, the same note fragmented into several
short events, near-duplicate overlaps, and very short low-velocity "ghost"
notes. These pure functions clean those up before hand estimation so the
draft MIDI the user edits is closer to the performance.

Every function takes and returns ``list[Note]`` and never mutates its input
(``Note`` is frozen). ``clean_notes`` orchestrates the passes and reassigns
sequential ids so downstream consumers keep their 0..n-1 invariant.
"""

from dataclasses import replace

from pianoflow_music.notes.model import PIANO_HIGHEST_PITCH, PIANO_LOWEST_PITCH, Note

# Tuned for Basic Pitch on solo piano. Conservative on purpose: cleanup must
# never invent or erase real notes, only fold obvious artifacts.
MERGE_GAP_SEC = 0.05  # same-pitch notes within 50 ms (or overlapping) are one note
GHOST_MAX_DURATION_SEC = 0.04  # shorter than this AND quiet -> drop
GHOST_MAX_VELOCITY = 18  # velocity below this counts as "quiet" for ghost test


def clip_to_piano_range(notes: list[Note]) -> list[Note]:
    """Drop notes outside the 88-key piano range (A0..C8)."""
    return [n for n in notes if PIANO_LOWEST_PITCH <= n.pitch <= PIANO_HIGHEST_PITCH]


def merge_same_pitch(notes: list[Note], gap_sec: float = MERGE_GAP_SEC) -> list[Note]:
    """Fold fragmented / overlapping same-pitch notes into single notes.

    Two consecutive notes of the same pitch merge when the gap between the end
    of one and the start of the next is ``<= gap_sec`` (overlaps are negative
    gaps and always merge). The merged note spans both and keeps the louder
    velocity.
    """
    if not notes:
        return []

    by_pitch: dict[int, list[Note]] = {}
    for note in notes:
        by_pitch.setdefault(note.pitch, []).append(note)

    merged: list[Note] = []
    for pitch_notes in by_pitch.values():
        ordered = sorted(pitch_notes, key=lambda n: n.start)
        current = ordered[0]
        for nxt in ordered[1:]:
            if nxt.start - current.end <= gap_sec:
                end = max(current.end, nxt.end)
                current = replace(
                    current,
                    end=round(end, 6),
                    duration=round(end - current.start, 6),
                    velocity=max(current.velocity, nxt.velocity),
                )
            else:
                merged.append(current)
                current = nxt
        merged.append(current)

    merged.sort(key=lambda n: (n.start, n.pitch))
    return merged


def drop_ghost_notes(
    notes: list[Note],
    max_duration_sec: float = GHOST_MAX_DURATION_SEC,
    max_velocity: int = GHOST_MAX_VELOCITY,
) -> list[Note]:
    """Remove ultra-short, quiet notes that are almost always artifacts."""
    return [n for n in notes if not (n.duration < max_duration_sec and n.velocity < max_velocity)]


def clean_notes(
    notes: list[Note],
    *,
    gap_sec: float = MERGE_GAP_SEC,
    ghost_max_duration_sec: float = GHOST_MAX_DURATION_SEC,
    ghost_max_velocity: int = GHOST_MAX_VELOCITY,
) -> tuple[list[Note], dict[str, int]]:
    """Run the full cleanup pipeline and report what changed.

    Returns ``(cleaned_notes, stats)`` where stats counts how many notes were
    removed by each pass. Ids are reassigned 0..n-1 in start-time order.
    """
    raw_count = len(notes)

    in_range = clip_to_piano_range(notes)
    out_of_range = raw_count - len(in_range)

    merged = merge_same_pitch(in_range, gap_sec=gap_sec)
    merged_away = len(in_range) - len(merged)

    kept = drop_ghost_notes(
        merged, max_duration_sec=ghost_max_duration_sec, max_velocity=ghost_max_velocity
    )
    ghosts_dropped = len(merged) - len(kept)

    kept.sort(key=lambda n: (n.start, n.pitch))
    cleaned = [replace(n, id=i) for i, n in enumerate(kept)]

    stats = {
        "raw_note_count": raw_count,
        "out_of_range_dropped": out_of_range,
        "notes_merged": merged_away,
        "ghosts_dropped": ghosts_dropped,
        "clean_note_count": len(cleaned),
    }
    return cleaned, stats
