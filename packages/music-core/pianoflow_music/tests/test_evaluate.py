"""Tests for the onset-based evaluation harness (evaluate.py)."""

import pytest

from pianoflow_music.notes.model import Note
from pianoflow_music.transcription.evaluate import onset_prf

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _note(pitch: int, start: float, end: float | None = None) -> Note:
    """Minimal Note factory for evaluation tests."""
    if end is None:
        end = start + 0.4
    return Note(
        id=0,
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
# Edge cases: empty inputs
# ---------------------------------------------------------------------------


def test_both_empty_returns_perfect_score():
    result = onset_prf([], [])
    assert result["precision"] == 1.0
    assert result["recall"] == 1.0
    assert result["f1"] == 1.0
    assert result["true_positives"] == 0
    assert result["false_positives"] == 0
    assert result["false_negatives"] == 0


def test_empty_reference_all_false_positives():
    predicted = [_note(60, 0.0), _note(62, 0.5)]
    result = onset_prf([], predicted)
    assert result["precision"] == 0.0
    assert result["recall"] == 0.0
    assert result["f1"] == 0.0
    assert result["false_positives"] == 2
    assert result["false_negatives"] == 0


def test_empty_predicted_all_false_negatives():
    reference = [_note(60, 0.0), _note(62, 0.5)]
    result = onset_prf(reference, [])
    assert result["precision"] == 0.0
    assert result["recall"] == 0.0
    assert result["f1"] == 0.0
    assert result["false_positives"] == 0
    assert result["false_negatives"] == 2


# ---------------------------------------------------------------------------
# Perfect match
# ---------------------------------------------------------------------------


def test_perfect_match_returns_f1_one():
    notes = [_note(60, 0.0), _note(62, 0.5), _note(64, 1.0)]
    result = onset_prf(notes, notes)
    assert result["f1"] == 1.0
    assert result["precision"] == 1.0
    assert result["recall"] == 1.0
    assert result["true_positives"] == 3
    assert result["false_positives"] == 0
    assert result["false_negatives"] == 0


# ---------------------------------------------------------------------------
# All wrong pitch
# ---------------------------------------------------------------------------


def test_all_wrong_pitch_f1_zero():
    reference = [_note(60, 0.0), _note(62, 0.5)]
    predicted = [_note(61, 0.0), _note(63, 0.5)]  # different pitches
    result = onset_prf(reference, predicted, match_pitch=True)
    assert result["f1"] == 0.0
    assert result["true_positives"] == 0


def test_wrong_pitch_matched_when_match_pitch_false():
    reference = [_note(60, 0.0)]
    predicted = [_note(99, 0.0)]  # different pitch but same onset
    result = onset_prf(reference, predicted, match_pitch=False)
    assert result["f1"] == 1.0
    assert result["true_positives"] == 1


# ---------------------------------------------------------------------------
# Onset tolerance boundary conditions
# ---------------------------------------------------------------------------


def test_onset_just_inside_tolerance_is_matched():
    tolerance = 0.05
    reference = [_note(60, 0.0)]
    predicted = [_note(60, tolerance - 0.001)]  # just inside
    result = onset_prf(reference, predicted, onset_tolerance_sec=tolerance)
    assert result["true_positives"] == 1
    assert result["f1"] == 1.0


def test_onset_just_outside_tolerance_is_unmatched():
    tolerance = 0.05
    reference = [_note(60, 0.0)]
    predicted = [_note(60, tolerance + 0.001)]  # just outside
    result = onset_prf(reference, predicted, onset_tolerance_sec=tolerance)
    assert result["true_positives"] == 0
    assert result["f1"] == 0.0


def test_onset_exactly_at_tolerance_boundary_is_matched():
    """Onset exactly at the tolerance edge should still match (<=)."""
    tolerance = 0.05
    reference = [_note(60, 0.0)]
    predicted = [_note(60, tolerance)]
    result = onset_prf(reference, predicted, onset_tolerance_sec=tolerance)
    assert result["true_positives"] == 1


# ---------------------------------------------------------------------------
# Precision / recall degradation
# ---------------------------------------------------------------------------


def test_extra_predicted_notes_lower_precision():
    reference = [_note(60, 0.0)]
    predicted = [_note(60, 0.0), _note(62, 1.0), _note(64, 2.0)]  # 2 extra FPs
    result = onset_prf(reference, predicted)
    assert result["precision"] < 1.0
    assert result["true_positives"] == 1
    assert result["false_positives"] == 2
    assert result["recall"] == 1.0


def test_missing_notes_lower_recall():
    reference = [_note(60, 0.0), _note(62, 0.5), _note(64, 1.0)]
    predicted = [_note(60, 0.0)]  # only first note detected
    result = onset_prf(reference, predicted)
    assert result["recall"] < 1.0
    assert result["true_positives"] == 1
    assert result["false_negatives"] == 2
    assert result["precision"] == 1.0


# ---------------------------------------------------------------------------
# Counts
# ---------------------------------------------------------------------------


def test_reference_count_and_predicted_count():
    reference = [_note(60, i * 0.5) for i in range(5)]
    predicted = [_note(60, i * 0.5) for i in range(3)]
    result = onset_prf(reference, predicted)
    assert result["reference_count"] == 5
    assert result["predicted_count"] == 3


# ---------------------------------------------------------------------------
# F1 symmetry sanity check
# ---------------------------------------------------------------------------


def test_f1_is_harmonic_mean_of_p_and_r():
    reference = [_note(60, 0.0), _note(62, 0.5), _note(64, 1.0)]
    predicted = [_note(60, 0.0), _note(62, 0.5)]  # one miss
    result = onset_prf(reference, predicted)
    p, r = result["precision"], result["recall"]
    expected_f1 = round(2 * p * r / (p + r), 4) if (p + r) > 0 else 0.0
    assert result["f1"] == pytest.approx(expected_f1, abs=1e-4)


# ---------------------------------------------------------------------------
# No double-counting of reference notes
# ---------------------------------------------------------------------------


def test_single_reference_consumed_only_once():
    """Two predicted notes near the same reference onset → only one TP."""
    reference = [_note(60, 0.5)]
    predicted = [_note(60, 0.5), _note(60, 0.52)]  # both within 50 ms
    result = onset_prf(reference, predicted)
    assert result["true_positives"] == 1
    assert result["false_positives"] == 1
