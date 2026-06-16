"""Pure onset-based evaluation metrics for comparing transcription engines.

No external dependencies — uses only the standard library and the project's
own ``Note`` model.  Designed for use in offline evaluation harnesses:

    from pianoflow_music.transcription.evaluate import onset_prf
    metrics = onset_prf(reference_notes, predicted_notes)

All inputs are ``list[Note]`` from ``pianoflow_music.notes.model``.
"""

from pianoflow_music.notes.model import Note


def onset_offset_velocity_prf(
    reference: list[Note],
    predicted: list[Note],
    *,
    onset_tol: float = 0.05,
    offset_ratio: float = 0.2,
    velocity_tol: float = 0.1,
) -> dict:
    """Onset+offset+velocity F1 via mir_eval (optional dependency).

    Falls back to onset-only metrics (onset_prf) when mir_eval is not installed.

    Args:
        reference: Ground-truth notes.
        predicted: Engine output notes.
        onset_tol: Onset tolerance in seconds (default 50 ms).
        offset_ratio: Offset tolerance as a ratio of the note duration (default 20 %).
        velocity_tol: Velocity tolerance, normalised 0-1 (default 0.1 ~= +-12.7 MIDI units).

    Returns:
        dict with keys:
            onset_offset_precision, onset_offset_recall, onset_offset_f1 — floats
            avg_overlap     — float (mean IoU overlap of matched note pairs)
            velocity_f1     — float or None (None when mir_eval version lacks the function)
            reference_count, predicted_count — int
            fallback        — bool (True when mir_eval is not installed)
        When fallback is True the dict also contains the keys produced by
        ``onset_prf`` (precision, recall, f1, …) and a ``fallback_reason`` string.
    """
    # Handle empty-array edge case first — avoids both mir_eval errors and fallback noise.
    if not reference or not predicted:
        both_empty = not reference and not predicted
        score = 1.0 if both_empty else 0.0
        return {
            "onset_offset_precision": score,
            "onset_offset_recall": score,
            "onset_offset_f1": score,
            "avg_overlap": 0.0,
            "velocity_f1": None,
            "reference_count": len(reference),
            "predicted_count": len(predicted),
            "fallback": False,
        }

    try:
        import mir_eval
        import numpy as np
    except ImportError:
        return {
            **onset_prf(reference, predicted, onset_tolerance_sec=onset_tol),
            "fallback": True,
            "fallback_reason": "mir_eval not installed",
        }

    def _to_arrays(
        notes: list[Note],
    ) -> tuple["np.ndarray", "np.ndarray", "np.ndarray"]:
        intervals = np.array([[n.start, n.end] for n in notes], dtype=float)
        pitches = np.array([n.pitch for n in notes], dtype=float)
        velocities = np.array([n.velocity / 127.0 for n in notes], dtype=float)
        return intervals, pitches, velocities

    ref_intervals, ref_pitches, ref_velocities = _to_arrays(reference)
    est_intervals, est_pitches, est_velocities = _to_arrays(predicted)

    # Onset + offset P/R/F1 (pitch tolerance 0.25 semitones → exact MIDI match).
    precision, recall, f1, avg_overlap = mir_eval.transcription.precision_recall_f1_overlap(
        ref_intervals,
        ref_pitches,
        est_intervals,
        est_pitches,
        onset_tolerance=onset_tol,
        offset_ratio=offset_ratio,
        pitch_tolerance=0.25,
    )

    # Velocity P/R/F1 (may not exist in older mir_eval builds).
    velocity_f1: float | None = None
    try:
        _vp, _vr, vf1, _vo = mir_eval.transcription_velocity.precision_recall_f1_overlap(
            ref_intervals,
            ref_pitches,
            ref_velocities,
            est_intervals,
            est_pitches,
            est_velocities,
            onset_tolerance=onset_tol,
            offset_ratio=offset_ratio,
            velocity_tolerance=velocity_tol,
        )
        velocity_f1 = float(vf1)
    except Exception:
        velocity_f1 = None

    return {
        "onset_offset_precision": float(precision),
        "onset_offset_recall": float(recall),
        "onset_offset_f1": float(f1),
        "avg_overlap": float(avg_overlap),
        "velocity_f1": velocity_f1,
        "reference_count": len(reference),
        "predicted_count": len(predicted),
        "fallback": False,
    }


def onset_prf(
    reference: list[Note],
    predicted: list[Note],
    *,
    onset_tolerance_sec: float = 0.05,
    match_pitch: bool = True,
) -> dict:
    """Compute onset-level precision, recall and F1 (standard AMT metric).

    A predicted note is a *true positive* when there exists an unused
    reference note whose onset (``start``) is within ``±onset_tolerance_sec``
    of the predicted onset **and** (when ``match_pitch`` is True) whose pitch
    is identical.  Each reference note may only be consumed once (greedy
    nearest-onset match).

    Args:
        reference: Ground-truth notes.
        predicted: Engine output notes.
        onset_tolerance_sec: Symmetric tolerance window in seconds (default 50 ms).
        match_pitch: When True, pitch must also match for a note to count as a TP.

    Returns:
        dict with keys:
            precision, recall, f1         — floats rounded to 4 decimal places
            true_positives, false_positives, false_negatives — int counts
            reference_count, predicted_count               — int
    """
    # Edge cases: both empty → perfect score; one empty → all zeros.
    if not reference and not predicted:
        return {
            "precision": 1.0,
            "recall": 1.0,
            "f1": 1.0,
            "true_positives": 0,
            "false_positives": 0,
            "false_negatives": 0,
            "reference_count": 0,
            "predicted_count": 0,
        }

    if not reference or not predicted:
        fp = len(predicted)
        fn = len(reference)
        return {
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "true_positives": 0,
            "false_positives": fp,
            "false_negatives": fn,
            "reference_count": len(reference),
            "predicted_count": len(predicted),
        }

    # Sort both lists by onset time for efficient scanning.
    ref_sorted = sorted(reference, key=lambda n: n.start)
    pred_sorted = sorted(predicted, key=lambda n: n.start)

    # Track which reference notes have already been consumed.
    ref_consumed: list[bool] = [False] * len(ref_sorted)

    true_positives = 0

    for pred_note in pred_sorted:
        best_idx: int | None = None
        best_gap = float("inf")

        for r_idx, ref_note in enumerate(ref_sorted):
            if ref_consumed[r_idx]:
                continue
            # Early exit: reference notes are sorted; if this reference onset
            # is already beyond tolerance we can stop scanning forward.
            onset_gap = abs(pred_note.start - ref_note.start)
            if ref_note.start > pred_note.start + onset_tolerance_sec:
                break
            if onset_gap > onset_tolerance_sec:
                continue
            if match_pitch and ref_note.pitch != pred_note.pitch:
                continue
            if onset_gap < best_gap:
                best_gap = onset_gap
                best_idx = r_idx

        if best_idx is not None:
            ref_consumed[best_idx] = True
            true_positives += 1

    false_positives = len(predicted) - true_positives
    false_negatives = len(reference) - true_positives

    precision = true_positives / len(predicted) if predicted else 0.0
    recall = true_positives / len(reference) if reference else 0.0
    f1 = 2.0 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "reference_count": len(reference),
        "predicted_count": len(predicted),
    }
