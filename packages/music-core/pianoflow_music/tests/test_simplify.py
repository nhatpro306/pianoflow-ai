"""Property and unit tests for Phase 8 simplification (Beginner Mode).

Properties under test:
1. Melody (highest pitch per chord cluster per hand) is NEVER dropped.
2. Density caps hold: notes/beat ≤ cap for the given difficulty.
3. "original" difficulty is a no-op.
4. Simplified note count ≤ original note count.
"""

from __future__ import annotations

import math

import pytest

from pianoflow_music.notes.model import Note, NoteData
from pianoflow_music.simplify import simplify
from pianoflow_music.simplify.melody import chord_clusters, melody_note_ids
from pianoflow_music.simplify.reduce import reduce_notes
from pianoflow_music.simplify.rules import (
    CHORD_WINDOW_SEC,
    EASY_MAX_NOTES_PER_BEAT,
    VERY_EASY_MAX_NOTES_PER_BEAT,
)

# ── Helpers ──────────────────────────────────────────────────────────────────


def make_note(
    id: int,
    pitch: int,
    start: float,
    hand: str = "R",
    velocity: int = 80,
    duration: float = 0.4,
) -> Note:
    return Note(
        id=id,
        pitch=pitch,
        name=f"P{pitch}",
        velocity=velocity,
        start=start,
        end=start + duration,
        duration=duration,
        track=0,
        hand=hand,
    )


def make_note_data(notes: list[Note], bpm: float = 120.0) -> NoteData:
    return NoteData(
        schema_version=2,
        bpm=bpm,
        duration_sec=max((n.end for n in notes), default=0.0),
        time_signature="4/4",
        notes=notes,
    )


def _melody_pitches_at_time(notes: list[Note], hand: str) -> dict[float, int]:
    """Return {start_time: highest_pitch} for each chord cluster per hand."""
    hand_notes = [n for n in notes if n.hand == hand]
    result: dict[float, int] = {}
    for cluster in chord_clusters(hand_notes, CHORD_WINDOW_SEC):
        anchor = cluster[0].start
        result[anchor] = max(n.pitch for n in cluster)
    return result


# ── chord_clusters ───────────────────────────────────────────────────────────


def test_chord_clusters_empty() -> None:
    assert chord_clusters([]) == []


def test_chord_clusters_single_note() -> None:
    n = make_note(0, 60, 0.0)
    assert chord_clusters([n]) == [[n]]


def test_chord_clusters_groups_simultaneous() -> None:
    n1 = make_note(0, 60, 0.0)
    n2 = make_note(1, 64, 0.01)  # within window
    n3 = make_note(2, 67, 1.0)  # new beat
    clusters = chord_clusters([n1, n2, n3])
    assert len(clusters) == 2
    assert {n.id for n in clusters[0]} == {0, 1}
    assert clusters[1][0].id == 2


def test_chord_clusters_boundary() -> None:
    n1 = make_note(0, 60, 0.0)
    n2 = make_note(1, 64, CHORD_WINDOW_SEC)  # exactly at boundary → same cluster
    n3 = make_note(2, 67, CHORD_WINDOW_SEC + 0.001)  # just beyond → new cluster
    clusters = chord_clusters([n1, n2, n3])
    assert len(clusters) == 2


# ── melody_note_ids ──────────────────────────────────────────────────────────


def test_melody_note_ids_keeps_highest_pitch() -> None:
    notes = [
        make_note(0, 60, 0.0),  # lower — should NOT be protected
        make_note(1, 72, 0.0),  # higher — should be protected
        make_note(2, 65, 0.0),  # middle — should NOT be protected
    ]
    ids = melody_note_ids(notes)
    assert 1 in ids
    assert 0 not in ids
    assert 2 not in ids


def test_melody_note_ids_separate_hands() -> None:
    notes = [
        make_note(0, 72, 0.0, hand="R"),
        make_note(1, 48, 0.0, hand="L"),  # highest in L cluster
    ]
    ids = melody_note_ids(notes)
    assert ids == frozenset({0, 1})


# ── Property: melody never dropped ───────────────────────────────────────────


@pytest.mark.parametrize("difficulty", ["easy", "very_easy"])
def test_melody_never_dropped(difficulty: str) -> None:
    """Highest-pitch note at every chord cluster position must survive simplification."""
    notes = [
        # RH chord at beat 0
        make_note(0, 60, 0.0, hand="R"),
        make_note(1, 64, 0.0, hand="R"),
        make_note(2, 67, 0.0, hand="R"),
        make_note(3, 72, 0.0, hand="R"),  # ← melody, must survive
        # LH chord at beat 0
        make_note(4, 36, 0.01, hand="L"),  # ← bass
        make_note(5, 43, 0.01, hand="L"),
        make_note(6, 48, 0.01, hand="L"),
        # RH single note at beat 1
        make_note(7, 76, 0.5, hand="R"),  # ← sole note, must survive
    ]
    note_data = make_note_data(notes)
    result = simplify(note_data, difficulty)
    result_ids_original_pitch = {n.pitch for n in result.notes}

    assert 72 in result_ids_original_pitch, "RH melody (pitch 72) was dropped"
    assert 76 in result_ids_original_pitch, "Sole RH note (pitch 76) was dropped"
    assert 36 in result_ids_original_pitch, "LH bass (pitch 36) was dropped"


# ── Property: density caps hold ──────────────────────────────────────────────


def _max_notes_per_beat(notes: list[Note], bpm: float) -> float:
    if not notes or bpm <= 0:
        return 0.0
    beat_sec = 60.0 / bpm
    bins: dict[int, int] = {}
    for n in notes:
        idx = math.floor(n.start / beat_sec)
        bins[idx] = bins.get(idx, 0) + 1
    return max(bins.values())


def test_easy_density_cap() -> None:
    bpm = 120.0
    # Create 12 notes in beat 0 — well above easy cap of 6
    notes = [make_note(i, 48 + i, i * 0.001, hand="R" if i < 6 else "L") for i in range(12)]
    reduced = reduce_notes(notes, "easy", bpm)
    actual_max = _max_notes_per_beat(reduced, bpm)
    assert actual_max <= EASY_MAX_NOTES_PER_BEAT, (
        f"easy density cap exceeded: {actual_max} > {EASY_MAX_NOTES_PER_BEAT}"
    )


def test_very_easy_density_cap() -> None:
    bpm = 120.0
    notes = [make_note(i, 48 + i, i * 0.001, hand="R" if i < 6 else "L") for i in range(12)]
    reduced = reduce_notes(notes, "very_easy", bpm)
    actual_max = _max_notes_per_beat(reduced, bpm)
    assert actual_max <= VERY_EASY_MAX_NOTES_PER_BEAT, (
        f"very_easy density cap exceeded: {actual_max} > {VERY_EASY_MAX_NOTES_PER_BEAT}"
    )


# ── Property: simplified note count ≤ original ───────────────────────────────


@pytest.mark.parametrize("difficulty", ["easy", "very_easy"])
def test_simplify_never_adds_notes(difficulty: str) -> None:
    notes = [make_note(i, 48 + (i % 24), i * 0.1) for i in range(30)]
    note_data = make_note_data(notes)
    result = simplify(note_data, difficulty)
    assert len(result.notes) <= len(note_data.notes)


# ── "original" is a no-op ────────────────────────────────────────────────────


def test_original_difficulty_noop() -> None:
    notes = [make_note(i, 60 + i, i * 0.5) for i in range(5)]
    note_data = make_note_data(notes)
    result = simplify(note_data, "original")
    assert result is note_data


# ── Meta annotation ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("difficulty", ["easy", "very_easy"])
def test_meta_annotated(difficulty: str) -> None:
    notes = [make_note(0, 60, 0.0), make_note(1, 64, 0.0)]
    result = simplify(make_note_data(notes), difficulty)
    assert result.meta["simplified"] is True
    assert result.meta["difficulty"] == difficulty
    assert result.meta["original_note_count"] == 2


# ── A dense song (property-style exhaustive) ─────────────────────────────────


def test_dense_song_both_difficulties() -> None:
    """Simulate a 4-bar dense chord progression; all properties must hold."""
    bpm = 120.0
    beat_sec = 60.0 / bpm
    notes: list[Note] = []
    nid = 0
    for beat in range(16):  # 16 beats
        t = beat * beat_sec
        # RH: 4-note chord
        for semitone in [0, 4, 7, 12]:
            notes.append(make_note(nid, 60 + semitone, t + nid * 0.0005, hand="R"))
            nid += 1
        # LH: 3-note chord
        for semitone in [0, 7, 12]:
            notes.append(make_note(nid, 36 + semitone, t + nid * 0.0005, hand="L"))
            nid += 1

    note_data = make_note_data(notes, bpm=bpm)

    cases = [("easy", EASY_MAX_NOTES_PER_BEAT), ("very_easy", VERY_EASY_MAX_NOTES_PER_BEAT)]
    for diff, cap in cases:
        result = simplify(note_data, diff)

        # No notes added
        assert len(result.notes) <= len(note_data.notes)

        # Density cap
        actual_max = _max_notes_per_beat(result.notes, bpm)
        assert actual_max <= cap, f"{diff}: density {actual_max} exceeds cap {cap}"

        # Melody preserved: highest RH pitch at each beat (pitch 72) must survive
        result_pitches = {n.pitch for n in result.notes if n.hand == "R"}
        assert 72 in result_pitches, f"{diff}: RH melody pitch 72 was dropped"

        # Bass preserved: lowest LH pitch at each beat (pitch 36) must survive
        result_lh_pitches = {n.pitch for n in result.notes if n.hand == "L"}
        assert 36 in result_lh_pitches, f"{diff}: LH bass pitch 36 was dropped"
