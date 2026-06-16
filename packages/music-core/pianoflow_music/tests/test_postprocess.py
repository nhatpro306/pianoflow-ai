"""Tests for pianoflow_music.transcription.postprocess (pure, no I/O)."""

import pytest

from pianoflow_music.notes.model import PIANO_HIGHEST_PITCH, PIANO_LOWEST_PITCH, Note
from pianoflow_music.transcription.postprocess import (
    calibrate_velocity,
    clean_notes,
    clip_to_piano_range,
    drop_ghost_notes,
    merge_same_pitch,
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def make_note(
    *,
    id: int = 0,
    pitch: int = 60,
    velocity: int = 80,
    start: float = 0.0,
    end: float = 0.5,
    hand: str = "R",
) -> Note:
    return Note(
        id=id,
        pitch=pitch,
        name="C4",
        velocity=velocity,
        start=start,
        end=end,
        duration=round(end - start, 6),
        track=0,
        hand=hand,
    )


# ---------------------------------------------------------------------------
# clip_to_piano_range
# ---------------------------------------------------------------------------


class TestClipToPianoRange:
    def test_drops_below_range(self):
        note = make_note(pitch=10)
        assert clip_to_piano_range([note]) == []

    def test_drops_above_range(self):
        note = make_note(pitch=120)
        assert clip_to_piano_range([note]) == []

    def test_keeps_lowest_piano_pitch(self):
        note = make_note(pitch=PIANO_LOWEST_PITCH)  # 21
        result = clip_to_piano_range([note])
        assert len(result) == 1
        assert result[0].pitch == 21

    def test_keeps_middle_pitch(self):
        note = make_note(pitch=60)
        result = clip_to_piano_range([note])
        assert len(result) == 1
        assert result[0].pitch == 60

    def test_keeps_highest_piano_pitch(self):
        note = make_note(pitch=PIANO_HIGHEST_PITCH)  # 108
        result = clip_to_piano_range([note])
        assert len(result) == 1
        assert result[0].pitch == 108

    def test_mixed_notes(self):
        notes = [
            make_note(id=0, pitch=10),  # out
            make_note(id=1, pitch=21),  # in
            make_note(id=2, pitch=60),  # in
            make_note(id=3, pitch=108),  # in
            make_note(id=4, pitch=120),  # out
        ]
        result = clip_to_piano_range(notes)
        pitches = [n.pitch for n in result]
        assert pitches == [21, 60, 108]

    def test_empty_list(self):
        assert clip_to_piano_range([]) == []


# ---------------------------------------------------------------------------
# merge_same_pitch
# ---------------------------------------------------------------------------


class TestMergeSamePitch:
    def test_merges_notes_within_gap(self):
        """Two same-pitch notes with a 0.02s gap (< MERGE_GAP_SEC=0.05) merge."""
        n1 = make_note(id=0, pitch=60, velocity=70, start=0.0, end=0.4)
        n2 = make_note(id=1, pitch=60, velocity=90, start=0.42, end=0.8)
        result = merge_same_pitch([n1, n2])
        assert len(result) == 1
        m = result[0]
        assert m.start == pytest.approx(0.0)
        assert m.end == pytest.approx(0.8)
        assert m.velocity == 90  # max of 70, 90

    def test_merges_overlapping_notes(self):
        """Overlapping same-pitch notes (negative gap) always merge."""
        n1 = make_note(id=0, pitch=60, velocity=60, start=0.0, end=0.5)
        n2 = make_note(id=1, pitch=60, velocity=80, start=0.3, end=0.9)
        result = merge_same_pitch([n1, n2])
        assert len(result) == 1
        assert result[0].end == pytest.approx(0.9)

    def test_does_not_merge_notes_far_apart(self):
        """Two same-pitch notes 1.0s apart are kept separate."""
        n1 = make_note(id=0, pitch=60, start=0.0, end=0.4)
        n2 = make_note(id=1, pitch=60, start=1.4, end=1.8)
        result = merge_same_pitch([n1, n2])
        assert len(result) == 2

    def test_different_pitch_notes_never_merge(self):
        """Notes of different pitches starting at the same time stay separate."""
        n1 = make_note(id=0, pitch=60, start=0.0, end=0.5)
        n2 = make_note(id=1, pitch=61, start=0.0, end=0.5)
        result = merge_same_pitch([n1, n2])
        assert len(result) == 2
        pitches = {n.pitch for n in result}
        assert pitches == {60, 61}

    def test_empty_list(self):
        assert merge_same_pitch([]) == []

    def test_merged_duration_is_consistent(self):
        """Merged note's duration == end - start."""
        n1 = make_note(id=0, pitch=60, start=0.0, end=0.3)
        n2 = make_note(id=1, pitch=60, start=0.32, end=0.7)
        result = merge_same_pitch([n1, n2])
        assert len(result) == 1
        m = result[0]
        assert m.duration == pytest.approx(m.end - m.start, abs=1e-5)


# ---------------------------------------------------------------------------
# drop_ghost_notes
# ---------------------------------------------------------------------------


class TestDropGhostNotes:
    def test_drops_short_quiet_note(self):
        """duration=0.02 (<0.04) and velocity=10 (<18) -> dropped."""
        ghost = make_note(id=0, pitch=60, velocity=10, start=0.0, end=0.02)
        result = drop_ghost_notes([ghost])
        assert result == []

    def test_keeps_short_loud_note(self):
        """duration=0.02 but velocity=100 -> kept (not quiet enough)."""
        n = make_note(id=0, pitch=60, velocity=100, start=0.0, end=0.02)
        result = drop_ghost_notes([n])
        assert len(result) == 1

    def test_keeps_long_quiet_note(self):
        """duration=0.5 and velocity=10 -> kept (not short enough)."""
        n = make_note(id=0, pitch=60, velocity=10, start=0.0, end=0.5)
        result = drop_ghost_notes([n])
        assert len(result) == 1

    def test_keeps_normal_note(self):
        n = make_note(id=0, pitch=60, velocity=80, start=0.0, end=0.4)
        result = drop_ghost_notes([n])
        assert len(result) == 1

    def test_empty_list(self):
        assert drop_ghost_notes([]) == []


# ---------------------------------------------------------------------------
# clean_notes
# ---------------------------------------------------------------------------


class TestCleanNotes:
    def _make_clean_notes_input(self):
        """Three normal notes, one out-of-range, one ghost."""
        return [
            make_note(id=0, pitch=60, velocity=80, start=0.0, end=0.4),  # keep
            make_note(id=1, pitch=62, velocity=80, start=0.5, end=0.9),  # keep
            make_note(id=2, pitch=64, velocity=80, start=1.0, end=1.4),  # keep
            make_note(id=3, pitch=10, velocity=80, start=1.5, end=1.9),  # out of range
            make_note(id=4, pitch=60, velocity=5, start=2.0, end=2.02),  # ghost (short + quiet)
        ]

    def test_returns_tuple_of_notes_and_stats(self):
        notes = self._make_clean_notes_input()
        result = clean_notes(notes)
        assert isinstance(result, tuple)
        assert len(result) == 2
        cleaned, stats = result
        assert isinstance(cleaned, list)
        assert isinstance(stats, dict)

    def test_stats_has_expected_keys(self):
        notes = self._make_clean_notes_input()
        _, stats = clean_notes(notes)
        expected_keys = {
            "raw_note_count",
            "out_of_range_dropped",
            "notes_merged",
            "ghosts_dropped",
            "clean_note_count",
        }
        assert expected_keys == set(stats.keys())

    def test_sequential_ids_reassigned(self):
        notes = self._make_clean_notes_input()
        cleaned, _ = clean_notes(notes)
        ids = [n.id for n in cleaned]
        assert ids == list(range(len(cleaned)))

    def test_counts_reflect_drops(self):
        notes = self._make_clean_notes_input()
        cleaned, stats = clean_notes(notes)
        assert stats["raw_note_count"] == 5
        assert stats["out_of_range_dropped"] == 1  # pitch 10
        assert stats["ghosts_dropped"] == 1  # short+quiet note
        assert stats["clean_note_count"] == len(cleaned)
        assert stats["clean_note_count"] == 3

    def test_merge_counted_in_stats(self):
        """Two same-pitch notes within the gap contribute to notes_merged."""
        n1 = make_note(id=0, pitch=60, velocity=70, start=0.0, end=0.4)
        n2 = make_note(id=1, pitch=60, velocity=90, start=0.42, end=0.8)
        _, stats = clean_notes([n1, n2])
        assert stats["notes_merged"] == 1  # two notes → one (1 removed)
        assert stats["clean_note_count"] == 1

    def test_ids_start_at_zero_in_start_order(self):
        """Ids are assigned 0..n-1 sorted by (start, pitch)."""
        notes = [
            make_note(id=99, pitch=64, start=1.0, end=1.4),
            make_note(id=50, pitch=60, start=0.0, end=0.4),
            make_note(id=10, pitch=62, start=0.5, end=0.9),
        ]
        cleaned, _ = clean_notes(notes)
        # Should be ordered by start time, ids 0, 1, 2
        assert [n.id for n in cleaned] == [0, 1, 2]
        assert [n.pitch for n in cleaned] == [60, 62, 64]

    def test_empty_input(self):
        cleaned, stats = clean_notes([])
        assert cleaned == []
        assert stats["raw_note_count"] == 0
        assert stats["clean_note_count"] == 0


# ---------------------------------------------------------------------------
# calibrate_velocity tests
# ---------------------------------------------------------------------------


def test_calibrate_velocity_spreads_range():
    """After calibration, min/max velocities should be near out_min/out_max."""
    notes = [
        Note(
            id=i,
            pitch=60,
            name="C4",
            velocity=v,
            start=float(i),
            end=float(i) + 0.5,
            duration=0.5,
            track=0,
            hand="R",
        )
        for i, v in enumerate([40, 50, 60, 70, 80, 90, 100])
    ]
    calibrated = calibrate_velocity(notes, out_min=20, out_max=120)
    vels = [n.velocity for n in calibrated]
    assert min(vels) <= 25, f"min velocity should be near 20, got {min(vels)}"
    assert max(vels) >= 115, f"max velocity should be near 120, got {max(vels)}"


def test_calibrate_velocity_does_not_mutate():
    """Input notes must not be modified."""
    notes = [
        Note(
            id=i,
            pitch=60,
            name="C4",
            velocity=50 + i * 10,
            start=float(i),
            end=float(i) + 0.5,
            duration=0.5,
            track=0,
            hand="R",
        )
        for i in range(5)
    ]
    original_vels = [n.velocity for n in notes]
    calibrate_velocity(notes)
    assert [n.velocity for n in notes] == original_vels


def test_calibrate_velocity_single_note_unchanged():
    """Single note must be returned unchanged."""
    note = Note(
        id=0, pitch=60, name="C4", velocity=64, start=0.0, end=0.5, duration=0.5, track=0, hand="R"
    )
    result = calibrate_velocity([note])
    assert result[0].velocity == 64


def test_calibrate_velocity_uniform_unchanged():
    """All-same-velocity input must be returned unchanged (no divide-by-zero)."""
    notes = [
        Note(
            id=i,
            pitch=60,
            name="C4",
            velocity=64,
            start=float(i),
            end=float(i) + 0.5,
            duration=0.5,
            track=0,
            hand="R",
        )
        for i in range(4)
    ]
    result = calibrate_velocity(notes)
    assert all(n.velocity == 64 for n in result)
