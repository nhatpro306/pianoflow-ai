#!/usr/bin/env python
"""Pre-bake demo examples: audio → notes JSON + MIDI.

Usage:
    python scripts/prebake_examples.py path/to/clip1.wav path/to/clip2.mp3 ...

Outputs to apps/web/public/examples/<stem>.json and <stem>.mid
Requires: pianoflow-music[transkun] or pianoflow-music[basic-pitch] extra installed.
Engine defaults to TRANSCRIPTION_ENGINE env var or "basic_pitch".
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/prebake_examples.py <audio_file> [<audio_file> ...]")
        print("Example: python scripts/prebake_examples.py clips/beethoven.wav clips/bach.mp3")
        sys.exit(1)

    engine = os.environ.get("TRANSCRIPTION_ENGINE", "basic_pitch")

    # Resolve output directory relative to this script's repo root
    repo_root = Path(__file__).resolve().parent.parent
    out_dir = repo_root / "apps" / "web" / "public" / "examples"
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {out_dir}")
    print(f"Transcription engine: {engine}\n")

    # Import pipeline lazily so we fail fast with a clear message if not installed
    try:
        from pianoflow_music.transcription.pipeline import run_pipeline
    except ImportError as exc:
        print(
            f"ERROR: Could not import pianoflow_music. "
            f"Install it with:\n"
            f"  uv pip install -e packages/music-core[{engine}]\n"
            f"Details: {exc}"
        )
        sys.exit(1)

    audio_paths = [Path(p) for p in sys.argv[1:]]
    errors: list[tuple[Path, str]] = []

    for audio_path in audio_paths:
        if not audio_path.exists():
            print(f"  SKIP  {audio_path} — file not found")
            errors.append((audio_path, "file not found"))
            continue

        stem = audio_path.stem
        json_out = out_dir / f"{stem}.json"
        midi_out = out_dir / f"{stem}.mid"

        print(f"  Processing: {audio_path.name}")
        try:
            audio_bytes = audio_path.read_bytes()
            result = run_pipeline(audio_bytes, engine=engine, separate=False)
        except Exception as exc:
            msg = f"transcription failed: {exc}"
            print(f"  FAIL  {audio_path.name} — {msg}")
            errors.append((audio_path, msg))
            continue

        notes_dict = result.notes.to_dict()
        json_out.write_text(json.dumps(notes_dict, indent=2), encoding="utf-8")
        print(f"  OK    {json_out.relative_to(repo_root)}  ({len(result.notes.notes)} notes)")

        midi_out.write_bytes(result.draft_midi_bytes)
        print(f"  OK    {midi_out.relative_to(repo_root)}  ({len(result.draft_midi_bytes)} bytes)")

    if errors:
        print(f"\n{len(errors)} file(s) failed:")
        for path, reason in errors:
            print(f"  {path}: {reason}")
        sys.exit(1)

    print(f"\nDone — {len(audio_paths) - len(errors)} file(s) processed.")


if __name__ == "__main__":
    main()
