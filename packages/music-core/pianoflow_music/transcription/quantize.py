"""Timing quantization — snap note onsets to a tempo grid.

Pure Python, no external dependencies.  All operations are non-mutating;
notes are returned via ``dataclasses.replace``.
"""

from __future__ import annotations

import dataclasses

from pianoflow_music.notes.model import Note

# Supported grid fractions (triplets end with "t").
GRID_FRACTIONS: set[str] = {"1/4", "1/8", "1/16", "1/32", "1/8t", "1/16t"}


def grid_step_sec(bpm: float, grid: str) -> float:
    """Return the duration of one grid step in seconds.

    One beat = one quarter note = ``60 / bpm`` seconds.

    For plain fractions ``"1/N"``:  ``step = (4 / N) * beat_sec``
    For triplet fractions ``"1/Nt"``: ``step = (4 / N) * beat_sec * (2/3)``

    Args:
        bpm: Tempo in beats per minute.  Must be > 0.
        grid: One of :data:`GRID_FRACTIONS`.

    Returns:
        Step duration in seconds.

    Raises:
        ValueError: If *bpm* ≤ 0 or *grid* is not in :data:`GRID_FRACTIONS`.
    """
    if bpm <= 0:
        raise ValueError(f"bpm must be > 0, got {bpm!r}")
    if grid not in GRID_FRACTIONS:
        raise ValueError(f"Unknown grid {grid!r}. Valid values: {GRID_FRACTIONS}")

    beat_sec = 60.0 / bpm

    if grid.endswith("t"):
        # Triplet: e.g. "1/8t" → N=8
        n = int(grid[2:-1])
        return (4.0 / n) * beat_sec * (2.0 / 3.0)
    else:
        # Plain: e.g. "1/16" → N=16
        n = int(grid[2:])
        return (4.0 / n) * beat_sec


def quantize_notes(
    notes: list[Note],
    bpm: float,
    *,
    grid: str = "1/16",
    strength: float = 1.0,
    max_shift_sec: float = 0.12,
) -> list[Note]:
    """Snap note onsets to the nearest tempo grid position.

    For each note:
    * Compute the nearest grid time for its ``start``:
      ``target = round(start / step) * step``
    * ``delta = target - start``
    * If ``abs(delta) > max_shift_sec``, leave the note unchanged (preserve
      rubato / unusual timing).
    * Otherwise shift ``start`` by ``delta * strength`` (strength clamped to
      ``[0, 1]``).  Shift ``end`` by the **same** amount so duration is
      preserved.
    * Rounds ``start``, ``end``, and ``duration`` to 6 decimal places.

    Notes are never reordered or dropped; the returned list has the same
    length as *notes*.  The input list is not mutated.

    Args:
        notes: Notes to quantize (frozen dataclasses).
        bpm: Tempo in beats per minute.
        grid: Grid fraction — one of :data:`GRID_FRACTIONS`.
        strength: How far to shift toward the grid target (0 = no change,
            1 = snap fully).  Values outside ``[0, 1]`` are clamped.
        max_shift_sec: Maximum allowed shift.  Notes whose nearest grid
            position is farther away than this are left unchanged.

    Returns:
        New list of :class:`~pianoflow_music.notes.model.Note` instances.
    """
    strength = max(0.0, min(1.0, strength))
    step = grid_step_sec(bpm, grid)

    result: list[Note] = []
    for note in notes:
        target = round(note.start / step) * step
        delta = target - note.start

        if abs(delta) > max_shift_sec:
            result.append(note)
            continue

        shift = delta * strength
        new_start = round(note.start + shift, 6)
        new_end = round(note.end + shift, 6)
        new_duration = round(note.duration, 6)  # duration unchanged

        result.append(
            dataclasses.replace(note, start=new_start, end=new_end, duration=new_duration)
        )

    return result
