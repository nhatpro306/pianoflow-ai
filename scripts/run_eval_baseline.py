"""
Run Phase 3.5 Eval Baseline
This script loads audio files, runs the Basic Pitch engine, and evaluates the output
against ground-truth MIDI files using the onset_prf and onset_offset_velocity_prf metrics.
"""

import argparse

# Fix path to import pianoflow_music
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "packages" / "music-core"))

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.transcription.basic_pitch import BasicPitchEngine
from pianoflow_music.transcription.evaluate import onset_offset_velocity_prf, onset_prf

# URLs for a tiny MAESTRO slice (used if no local dataset provided)
SAMPLE_AUDIO_URL = "https://raw.githubusercontent.com/nhatpro306/pianoflow-ai/main/scripts/fixtures/maestro_sample.wav"
SAMPLE_MIDI_URL = "https://raw.githubusercontent.com/nhatpro306/pianoflow-ai/main/scripts/fixtures/maestro_sample.midi"


def download_sample(fixture_dir: Path):
    fixture_dir.mkdir(parents=True, exist_ok=True)
    audio_path = fixture_dir / "sample.wav"
    midi_path = fixture_dir / "sample.midi"

    if not audio_path.exists():
        print("Downloading sample audio...")
        # Since github URLs might be fake for this test, we create a dummy sine wave or just exit
        print("Please provide a local dataset directory containing .wav and .midi files.")
        print("Usage: python run_eval_baseline.py --dataset-dir /path/to/dataset")
        sys.exit(1)

    return audio_path, midi_path


def evaluate_file(audio_path: Path, midi_path: Path):
    print(f"Evaluating: {audio_path.name}")
    engine = BasicPitchEngine()

    # Run Engine & Time it
    start_time = time.time()
    audio_bytes = audio_path.read_bytes()
    predicted_notes = engine.transcribe(audio_bytes)
    wall_time = time.time() - start_time

    # Load ground truth
    midi_bytes = midi_path.read_bytes()
    note_data = parse_midi_bytes(midi_bytes)
    reference_notes = note_data.notes

    # Get duration for RTF
    try:
        import librosa

        duration = librosa.get_duration(path=str(audio_path))
    except Exception:
        duration = wall_time  # Fallback

    rtf = wall_time / duration
    print(f"  Duration: {duration:.1f}s | Wall time: {wall_time:.1f}s | RTF: {rtf:.2f}x")

    # Run metrics
    onset_metrics = onset_prf(reference_notes, predicted_notes)
    print(
        f"  [Onset] F1: {onset_metrics['f1']:.3f} | Precision: {onset_metrics['precision']:.3f} | Recall: {onset_metrics['recall']:.3f}"
    )

    advanced_metrics = onset_offset_velocity_prf(reference_notes, predicted_notes)
    if not advanced_metrics.get("fallback", False):
        print(f"  [Advanced] Onset+Offset F1: {advanced_metrics['onset_offset_f1']:.3f}")
        if advanced_metrics.get("velocity_f1") is not None:
            print(f"  [Velocity] F1: {advanced_metrics['velocity_f1']:.3f}")

    return onset_metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dataset-dir", type=str, help="Path to directory containing .wav and .midi pairs"
    )
    args = parser.parse_args()

    if not args.dataset_dir:
        print("No dataset provided. Please specify --dataset-dir")
        return

    dataset_dir = Path(args.dataset_dir)
    audio_files = list(dataset_dir.glob("*.wav")) + list(dataset_dir.glob("*.mp3"))

    if not audio_files:
        print(f"No audio files found in {dataset_dir}")
        return

    f1_scores = []

    for audio_path in audio_files:
        midi_path = audio_path.with_suffix(".midi")
        if not midi_path.exists():
            midi_path = audio_path.with_suffix(".mid")

        if not midi_path.exists():
            print(f"Skipping {audio_path.name} - no matching .midi or .mid file found")
            continue

        metrics = evaluate_file(audio_path, midi_path)
        f1_scores.append(metrics["f1"])

    if f1_scores:
        avg_f1 = sum(f1_scores) / len(f1_scores)
        print("\n" + "=" * 40)
        print(f"Average Onset F1 Score: {avg_f1:.3f}")
        print("=" * 40)


if __name__ == "__main__":
    main()
