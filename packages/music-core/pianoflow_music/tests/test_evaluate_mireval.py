"""Tests for onset_offset_velocity_prf — works with or without mir_eval installed."""

from __future__ import annotations

import builtins
from unittest.mock import patch

import pytest

from pianoflow_music.notes.model import Note
from pianoflow_music.transcription.evaluate import onset_offset_velocity_prf

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _note(pitch: int, start: float, end: float | None = None, velocity: int = 80) -> Note:
    """Minimal Note factory for mir_eval evaluation tests."""
    if end is None:
        end = start + 0.4
    return Note(
        id=0,
        pitch=pitch,
        name="C4",
        velocity=velocity,
        start=start,
        end=end,
        duration=round(end - start, 6),
        track=0,
        hand="R",
    )


# ---------------------------------------------------------------------------
# Fallback path (mir_eval not installed)
# ---------------------------------------------------------------------------


def test_fallback_when_mireval_missing():
    """When mir_eval cannot be imported, fall back to onset_prf metrics."""
    ref = [_note(60, 0.0), _note(62, 0.5)]
    pred = [_note(60, 0.0), _note(62, 0.5)]

    _real_import = builtins.__import__

    def _block_mir_eval(name: str, *args, **kwargs):
        if name == "mir_eval":
            raise ImportError("mir_eval blocked for test")
        return _real_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=_block_mir_eval):
        result = onset_offset_velocity_prf(ref, pred)

    assert result["fallback"] is True
    assert result["fallback_reason"] == "mir_eval not installed"
    # onset_prf keys must be present in the fallback dict
    assert "f1" in result
    assert "precision" in result
    assert "recall" in result


# ---------------------------------------------------------------------------
# Empty-array edge cases (no mir_eval call, pure Python path)
# ---------------------------------------------------------------------------


def test_empty_reference_and_predicted_returns_perfect():
    """Both lists empty → precision/recall/f1 all 1.0 (nothing to get wrong)."""
    result = onset_offset_velocity_prf([], [])
    assert result["onset_offset_precision"] == 1.0
    assert result["onset_offset_recall"] == 1.0
    assert result["onset_offset_f1"] == 1.0
    assert result["reference_count"] == 0
    assert result["predicted_count"] == 0
    assert result["fallback"] is False


def test_empty_reference_returns_zeros():
    """Reference empty, predictions non-empty → all-zero scores."""
    pred = [_note(60, 0.0), _note(62, 0.5)]
    result = onset_offset_velocity_prf([], pred)
    assert result["onset_offset_precision"] == 0.0
    assert result["onset_offset_recall"] == 0.0
    assert result["onset_offset_f1"] == 0.0
    assert result["predicted_count"] == 2
    assert result["reference_count"] == 0
    assert result["fallback"] is False


def test_empty_predicted_returns_zeros():
    """Predictions empty, reference non-empty → all-zero scores."""
    ref = [_note(60, 0.0), _note(62, 0.5)]
    result = onset_offset_velocity_prf(ref, [])
    assert result["onset_offset_precision"] == 0.0
    assert result["onset_offset_recall"] == 0.0
    assert result["onset_offset_f1"] == 0.0
    assert result["reference_count"] == 2
    assert result["predicted_count"] == 0
    assert result["fallback"] is False


# ---------------------------------------------------------------------------
# mir_eval-dependent tests (skipped when mir_eval not installed)
# ---------------------------------------------------------------------------


def test_identical_notes_perfect_score():
    """Identical reference and predicted notes → onset_offset_f1 == 1.0."""
    pytest.importorskip("mir_eval", reason="mir_eval not installed")
    notes = [_note(60 + i, i * 0.5, i * 0.5 + 0.4) for i in range(5)]
    result = onset_offset_velocity_prf(notes, notes)
    assert result["onset_offset_f1"] == pytest.approx(1.0, abs=1e-6)
    assert result["fallback"] is False


def test_completely_wrong_notes_zero_score():
    """Different pitch → no matches → onset_offset_f1 == 0.0."""
    pytest.importorskip("mir_eval", reason="mir_eval not installed")
    ref = [_note(60, 0.0, 0.4)]
    pred = [_note(72, 0.0, 0.4)]  # pitch 12 semitones off — no match
    result = onset_offset_velocity_prf(ref, pred)
    assert result["onset_offset_f1"] == pytest.approx(0.0, abs=1e-6)
    assert result["fallback"] is False


def test_result_keys_present_with_mireval():
    """All expected keys are present when mir_eval is available."""
    pytest.importorskip("mir_eval", reason="mir_eval not installed")
    notes = [_note(60, 0.0)]
    result = onset_offset_velocity_prf(notes, notes)
    expected_keys = {
        "onset_offset_precision",
        "onset_offset_recall",
        "onset_offset_f1",
        "avg_overlap",
        "velocity_f1",
        "reference_count",
        "predicted_count",
        "fallback",
    }
    assert expected_keys.issubset(result.keys())
