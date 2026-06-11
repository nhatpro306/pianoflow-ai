"""Chord-cluster grouping and melody-note identification."""

from __future__ import annotations

from pianoflow_music.notes.model import Note
from pianoflow_music.simplify.rules import CHORD_WINDOW_SEC


def chord_clusters(notes: list[Note], window_sec: float = CHORD_WINDOW_SEC) -> list[list[Note]]:
    """Group notes into clusters whose start times fall within *window_sec* of the first."""
    if not notes:
        return []
    ordered = sorted(notes, key=lambda n: n.start)
    clusters: list[list[Note]] = [[ordered[0]]]
    anchor = ordered[0].start
    for note in ordered[1:]:
        if note.start - anchor <= window_sec:
            clusters[-1].append(note)
        else:
            clusters.append([note])
            anchor = note.start
    return clusters


def melody_note_ids(notes: list[Note]) -> frozenset[int]:
    """Return IDs of notes that are the highest pitch in their chord cluster per hand.

    These are protected and must survive any density-reduction pass.
    """
    protected: set[int] = set()
    for hand in ("R", "L"):
        hand_notes = [n for n in notes if n.hand == hand]
        for cluster in chord_clusters(hand_notes):
            protected.add(max(cluster, key=lambda n: n.pitch).id)
    return frozenset(protected)


def select_cluster_notes(
    cluster: list[Note],
    hand: str,
    keep: int,
) -> set[int]:
    """Return the IDs of notes to keep from a single cluster for one hand.

    Right hand: top-*keep* pitches (melody on top).
    Left hand: outermost pitches (bass + optional inner) up to *keep* notes.
    """
    if not cluster:
        return set()
    if len(cluster) <= keep:
        return {n.id for n in cluster}

    if hand == "L":
        by_pitch = sorted(cluster, key=lambda n: n.pitch)
        # Always keep bass (lowest); add highest for keep>=2, etc.
        chosen = [by_pitch[0]]
        for i in range(len(by_pitch) - 1, 0, -1):
            if len(chosen) >= keep:
                break
            if by_pitch[i] not in chosen:
                chosen.append(by_pitch[i])
        return {n.id for n in chosen}
    else:
        # Right hand: keep top-N by pitch
        top = sorted(cluster, key=lambda n: n.pitch, reverse=True)[:keep]
        return {n.id for n in top}
