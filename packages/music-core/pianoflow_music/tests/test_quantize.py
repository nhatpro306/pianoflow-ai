"""Tests for pianoflow_music.transcription.quantize."""

from __future__ import annotations

import math

import pytest

from pianoflow_music.notes.model import Note
from pianoflow_music.transcription.quantize import GRID_FRACTIONS, grid_step_sec, quantize_notes

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _note(start: float, end: float, pitch: int = 60, note_id: int = 0) -> Note:
    return Note(
        id=note_id,
        pitch=pitch,
        name="C4",
        velocity=80,
        start=start,
        end=end,
        duration=round(end - start, 6),
        track=0,
        hand="R",
    )


# ---------------------------------------------------------------------------
# grid_step_sec
# ---------------------------------------------------------------------------


class TestGridStepSec:
    def test_quarter_note_120bpm(self):
        # 1 beat = 0.5 s; quarter = 1 beat → 0.5 s
        assert math.isclose(grid_step_sec(120.0, "1/4"), 0.5)

    def test_eighth_note_120bpm(self):
        # 0.25 s
        assert math.isclose(grid_step_sec(120.0, "1/8"), 0.25)

    def test_sixteenth_note_120bpm(self):
        # 0.125 s
        assert math.isclose(grid_step_sec(120.0, "1/16"), 0.125)

    def test_thirtysecond_note_120bpm(self):
        # 0.0625 s
        assert math.isclose(grid_step_sec(120.0, "1/32"), 0.0625)

    def test_eighth_triplet_120bpm(self):
        # beat=0.5 s; (4/8)*0.5*(2/3) = 0.5*(2/3) = 1/3 ≈ 0.3333 s
        expected = (4 / 8) * (60.0 / 120.0) * (2 / 3)
        assert math.isclose(grid_step_sec(120.0, "1/8t"), expected)

    def test_sixteenth_triplet_120bpm(self):
        # (4/16)*0.5*(2/3) = 0.25*(2/3) ≈ 0.1667 s
        expected = (4 / 16) * (60.0 / 120.0) * (2 / 3)
        assert math.isclose(grid_step_sec(120.0, "1/16t"), expected)

    def test_different_bpm(self):
        # 60 bpm → beat = 1.0 s; 1/16 → 0.25 s
        assert math.isclose(grid_step_sec(60.0, "1/16"), 0.25)

    def test_raises_on_unknown_grid(self):
        with pytest.raises(ValueError, match="Unknown grid"):
            grid_step_sec(120.0, "1/7")

    def test_raises_on_zero_bpm(self):
        with pytest.raises(ValueError, match="bpm must be > 0"):
            grid_step_sec(0.0, "1/16")

    def test_raises_on_negative_bpm(self):
        with pytest.raises(ValueError, match="bpm must be > 0"):
            grid_step_sec(-120.0, "1/16")

    def test_all_fractions_in_constant_are_valid(self):
        for g in GRID_FRACTIONS:
            step = grid_step_sec(120.0, g)
            assert step > 0, f"grid {g!r} produced non-positive step"


# ---------------------------------------------------------------------------
# quantize_notes
# ---------------------------------------------------------------------------


class TestQuantizeNotes:
    def test_slightly_off_note_snapped(self):
        """A note slightly off-grid should be snapped to the grid position."""
        # 120 bpm, 1/16 grid → step = 0.125 s
        # Note starts at 0.005 s (should snap to 0.0)
        note = _note(start=0.005, end=0.405)
        result = quantize_notes([note], bpm=120.0, grid="1/16")
        assert len(result) == 1
        assert math.isclose(result[0].start, 0.0, abs_tol=1e-9)

    def test_already_on_grid_unchanged(self):
        """A note exactly on a grid position stays unchanged."""
        # starts exactly at 0.125 s (one 1/16 step at 120 bpm)
        note = _note(start=0.125, end=0.525)
        result = quantize_notes([note], bpm=120.0, grid="1/16")
        assert len(result) == 1
        assert math.isclose(result[0].start, 0.125, abs_tol=1e-9)

    def test_large_delta_leaves_note_unchanged(self):
        """Delta > max_shift_sec → note must not be moved."""
        # step = 0.125; start = 0.07 → nearest grid = 0.125; delta = 0.055
        # But max_shift_sec = 0.04 < 0.055 → leave unchanged.
        note = _note(start=0.07, end=0.47)
        result = quantize_notes([note], bpm=120.0, grid="1/16", max_shift_sec=0.04)
        assert len(result) == 1
        assert math.isclose(result[0].start, 0.07, abs_tol=1e-9)

    def test_strength_zero_leaves_unchanged(self):
        """strength=0 must never move any note."""
        note = _note(start=0.01, end=0.41)
        result = quantize_notes([note], bpm=120.0, grid="1/16", strength=0.0)
        assert len(result) == 1
        assert math.isclose(result[0].start, 0.01, abs_tol=1e-9)

    def test_duration_preserved(self):
        """Duration must remain unchanged even when note is shifted."""
        note = _note(start=0.003, end=0.303)
        original_duration = note.duration
        result = quantize_notes([note], bpm=120.0, grid="1/16")
        assert math.isclose(result[0].duration, original_duration, abs_tol=1e-9)

    def test_end_shifted_by_same_amount_as_start(self):
        """end - start before and after quantization must be equal."""
        note = _note(start=0.004, end=0.504)
        result = quantize_notes([note], bpm=120.0, grid="1/16")
        original_length = note.end - note.start
        new_length = result[0].end - result[0].start
        assert math.isclose(original_length, new_length, abs_tol=1e-9)

    def test_partial_strength(self):
        """strength=0.5 moves note halfway toward the grid."""
        # start=0.01; nearest grid=0.0; delta=-0.01; shift=-0.005
        note = _note(start=0.01, end=0.41)
        result = quantize_notes([note], bpm=120.0, grid="1/16", strength=0.5)
        assert math.isclose(result[0].start, 0.005, abs_tol=1e-6)

    def test_same_length_always(self):
        """Output length equals input length."""
        notes = [_note(start=i * 0.1, end=i * 0.1 + 0.09, note_id=i) for i in range(10)]
        result = quantize_notes(notes, bpm=120.0, grid="1/16")
        assert len(result) == len(notes)

    def test_no_mutation_of_input(self):
        """Original note objects must not be mutated."""
        note = _note(start=0.005, end=0.405)
        original_start = note.start
        quantize_notes([note], bpm=120.0, grid="1/16")
        assert note.start == original_start  # frozen dataclass — always true

    def test_other_fields_preserved(self):
        """All non-timing fields survive quantization."""
        note = _note(start=0.005, end=0.405, pitch=72, note_id=7)
        result = quantize_notes([note], bpm=120.0, grid="1/16")
        r = result[0]
        assert r.id == 7
        assert r.pitch == 72
        assert r.velocity == note.velocity
        assert r.name == note.name
        assert r.track == note.track
        assert r.hand == note.hand

    def test_empty_list(self):
        assert quantize_notes([], bpm=120.0) == []

    def test_triplet_grid(self):
        """1/8t grid step at 120 bpm ≈ 0.3333 s."""
        step = (4 / 8) * (60.0 / 120.0) * (2 / 3)  # ≈ 0.3333
        # Start near second triplet beat (step * 2 ≈ 0.6667)
        target = step * 2
        note = _note(start=target + 0.01, end=target + 0.41)
        result = quantize_notes([note], bpm=120.0, grid="1/8t")
        assert math.isclose(result[0].start, target, abs_tol=1e-5)

    def test_strength_clamped_above_1(self):
        """strength > 1.0 is silently clamped to 1.0 (full snap)."""
        note = _note(start=0.005, end=0.405)
        result = quantize_notes([note], bpm=120.0, grid="1/16", strength=5.0)
        # With strength=1 note snaps fully to 0.0
        assert math.isclose(result[0].start, 0.0, abs_tol=1e-9)
