"""Note-density reduction — chord-cluster pass then density-cap pass."""

from __future__ import annotations

import math

from pianoflow_music.notes.model import Note
from pianoflow_music.simplify.melody import chord_clusters, melody_note_ids, select_cluster_notes
from pianoflow_music.simplify.rules import (
    EASY_MAX_NOTES_PER_BEAT,
    EASY_NOTES_PER_CLUSTER,
    VERY_EASY_MAX_NOTES_PER_BEAT,
    VERY_EASY_NOTES_PER_CLUSTER,
)


def _cluster_reduce(notes: list[Note], notes_per_cluster: int) -> list[Note]:
    """First pass: keep at most *notes_per_cluster* notes per chord cluster per hand."""
    keep_ids: set[int] = set()
    for hand in ("R", "L"):
        hand_notes = [n for n in notes if n.hand == hand]
        for cluster in chord_clusters(hand_notes):
            keep_ids |= select_cluster_notes(cluster, hand, notes_per_cluster)
    return [n for n in notes if n.id in keep_ids]


def _density_cap(notes: list[Note], max_per_beat: float, bpm: float) -> list[Note]:
    """Second pass: enforce a notes-per-beat cap, never dropping melody notes."""
    if bpm <= 0 or max_per_beat <= 0:
        return notes

    beat_sec = 60.0 / bpm
    protected = melody_note_ids(notes)

    # Bin notes by beat index.
    bins: dict[int, list[Note]] = {}
    for note in notes:
        beat_idx = math.floor(note.start / beat_sec)
        bins.setdefault(beat_idx, []).append(note)

    kept: list[Note] = []
    for beat_notes in bins.values():
        cap = int(max_per_beat)
        if len(beat_notes) <= cap:
            kept.extend(beat_notes)
            continue
        # Always keep melody notes; fill remaining slots with highest-velocity notes.
        melody = [n for n in beat_notes if n.id in protected]
        others = [n for n in beat_notes if n.id not in protected]
        slots = max(0, cap - len(melody))
        others_sorted = sorted(others, key=lambda n: n.velocity, reverse=True)
        kept.extend(melody)
        kept.extend(others_sorted[:slots])

    return kept


def reduce_notes(notes: list[Note], difficulty: str, bpm: float) -> list[Note]:
    """Return a simplified note list for the given difficulty.

    Guarantees:
    - Melody (highest pitch per chord cluster per hand) is never dropped.
    - Note density stays within the cap for the chosen difficulty.
    """
    if difficulty == "easy":
        npc = EASY_NOTES_PER_CLUSTER
        cap = EASY_MAX_NOTES_PER_BEAT
    elif difficulty == "very_easy":
        npc = VERY_EASY_NOTES_PER_CLUSTER
        cap = VERY_EASY_MAX_NOTES_PER_BEAT
    else:
        return list(notes)

    reduced = _cluster_reduce(notes, npc)
    capped = _density_cap(reduced, cap, bpm)
    return sorted(capped, key=lambda n: (n.start, n.pitch))
