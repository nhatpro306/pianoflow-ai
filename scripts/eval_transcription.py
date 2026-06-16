#!/usr/bin/env python3
"""Transcription evaluation CLI.

Compare two NoteData JSON files (reference vs. predicted) and print onset+offset+velocity
metrics computed by ``onset_offset_velocity_prf``.

Usage
-----
    python scripts/eval_transcription.py --ref notes_ref.json --pred notes_pred.json

Optional live path (requires transkun + Modal — prints a helpful error if unavailable):

    python scripts/eval_transcription.py \\
        --ref notes_ref.json \\
        --audio clip.wav \\
        --engine transkun \\
        --live

The ``--live`` flag runs the transcription pipeline on *--audio* and uses the result as
the prediction, comparing it against *--ref*.  ``--pred`` is mutually exclusive with
``--live``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_notes_from_json(path: Path) -> list:
    """Load a NoteData JSON file and return a list of Note objects."""
    try:
        from pianoflow_music.notes.model import NoteData
    except ImportError as exc:
        print(f"ERROR: pianoflow_music package not importable: {exc}", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(path.read_text(encoding="utf-8"))
    note_data = NoteData.from_dict(raw)
    return note_data.notes


def _print_table(metrics: dict) -> None:
    """Print a formatted metrics table to stdout."""
    fallback = metrics.get("fallback", False)
    fallback_note = " (onset-only fallback — install mir_eval for full metrics)" if fallback else ""

    print()
    print(f"=== Transcription Eval{fallback_note} ===")
    print(f"Reference notes : {metrics.get('reference_count', '?')}")
    print(f"Predicted notes : {metrics.get('predicted_count', '?')}")
    print()

    if fallback:
        # onset_prf keys
        print(f"Onset P         : {metrics.get('precision', 0.0):.4f}")
        print(f"Onset R         : {metrics.get('recall', 0.0):.4f}")
        print(f"Onset F1        : {metrics.get('f1', 0.0):.4f}")
        print(f"True positives  : {metrics.get('true_positives', '?')}")
        print(f"False positives : {metrics.get('false_positives', '?')}")
        print(f"False negatives : {metrics.get('false_negatives', '?')}")
    else:
        oo_f1 = metrics.get("onset_offset_f1", 0.0)
        oo_p = metrics.get("onset_offset_precision", 0.0)
        oo_r = metrics.get("onset_offset_recall", 0.0)
        vel_f1 = metrics.get("velocity_f1")
        avg_overlap = metrics.get("avg_overlap", 0.0)

        print(f"Onset+offset F1 : {oo_f1:.4f}")
        print(f"Onset+offset P  : {oo_p:.4f}")
        print(f"Onset+offset R  : {oo_r:.4f}")
        if vel_f1 is not None:
            print(f"Velocity F1     : {vel_f1:.4f}")
        else:
            print("Velocity F1     : N/A (mir_eval version does not support velocity)")
        print(f"Avg overlap     : {avg_overlap:.4f}")

    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compare two NoteData JSON files and print transcription metrics.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--ref", required=True, type=Path, help="Path to reference NoteData JSON.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--pred",
        type=Path,
        help="Path to predicted NoteData JSON (offline comparison).",
    )
    group.add_argument(
        "--live",
        action="store_true",
        default=False,
        help="Run transcription live (requires --audio and --engine; needs transkun + Modal).",
    )
    parser.add_argument(
        "--audio",
        type=Path,
        default=None,
        help="Audio file to transcribe (used with --live).",
    )
    parser.add_argument(
        "--engine",
        default="transkun",
        choices=["transkun"],
        help="Transcription engine to use in live mode (default: transkun).",
    )
    parser.add_argument(
        "--onset-tol",
        type=float,
        default=0.05,
        help="Onset tolerance in seconds (default: 0.05).",
    )
    parser.add_argument(
        "--offset-ratio",
        type=float,
        default=0.2,
        help="Offset tolerance ratio (default: 0.2).",
    )
    parser.add_argument(
        "--velocity-tol",
        type=float,
        default=0.1,
        help="Velocity tolerance, normalised 0-1 (default: 0.1).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    # --- Resolve reference notes ------------------------------------------------
    ref_path: Path = args.ref
    if not ref_path.exists():
        print(f"ERROR: --ref file not found: {ref_path}", file=sys.stderr)
        return 1
    ref_notes = _load_notes_from_json(ref_path)

    # --- Resolve predicted notes ------------------------------------------------
    if args.live:
        # Live transcription path — requires transkun + Modal.
        audio_path: Path | None = args.audio
        if audio_path is None:
            print("ERROR: --live requires --audio <path>.", file=sys.stderr)
            return 1
        if not audio_path.exists():
            print(f"ERROR: --audio file not found: {audio_path}", file=sys.stderr)
            return 1

        try:
            # Import lazily so the script works without these heavy deps installed.
            from pianoflow_music.transcription.transkun import TranskunTranscriber
        except ImportError:
            print(
                "ERROR: --live mode requires transkun and Modal.\n"
                "  Install the transkun extra:  pip install pianoflow-music[transkun]\n"
                "  Then authenticate Modal:     modal setup",
                file=sys.stderr,
            )
            return 1

        print(f"Running {args.engine} transcription on {audio_path} …", flush=True)
        transcriber = TranskunTranscriber()
        try:
            result = transcriber.transcribe(str(audio_path))
        except Exception as exc:
            print(f"ERROR: Transcription failed: {exc}", file=sys.stderr)
            return 1
        pred_notes = result.notes
    else:
        pred_path: Path = args.pred
        if not pred_path.exists():
            print(f"ERROR: --pred file not found: {pred_path}", file=sys.stderr)
            return 1
        pred_notes = _load_notes_from_json(pred_path)

    # --- Evaluate ---------------------------------------------------------------
    try:
        from pianoflow_music.transcription.evaluate import onset_offset_velocity_prf
    except ImportError as exc:
        print(f"ERROR: could not import evaluate module: {exc}", file=sys.stderr)
        return 1

    metrics = onset_offset_velocity_prf(
        ref_notes,
        pred_notes,
        onset_tol=args.onset_tol,
        offset_ratio=args.offset_ratio,
        velocity_tol=args.velocity_tol,
    )

    _print_table(metrics)
    return 0


if __name__ == "__main__":
    sys.exit(main())
