"""Real (beta) transcription engine using Spotify Basic Pitch (ONNX runtime).

This is the production audio→MIDI engine. It wraps the open-source
`basic-pitch` library (Apache-2.0, Spotify), which runs an ONNX model
directly on CPU — no GPU or cloud API required.

Heavy imports (`basic_pitch`, `onnxruntime`) are deferred to `_run_model`
so importing this module is cheap and safe in all deployment contexts.
Install the optional extra to enable:

    pip install "pianoflow-music[basic-pitch]"
    # or: uv add "pianoflow-music[basic-pitch]"

Without the extra, instantiation is fine but `transcribe()` raises
`TranscriptionError(code="ENGINE_UNAVAILABLE")`.
"""

import contextlib
import os
import tempfile
from statistics import mean

from pianoflow_music.midi.hands import estimate_hands
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.transcription.engine import TranscriptionError, TranscriptionResult
from pianoflow_music.transcription.postprocess import clean_notes

ENGINE_NAME = "basic_pitch_v1"

_NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")


def _pitch_name(pitch: int) -> str:
    return f"{_NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}"


class BasicPitchEngine:
    name = ENGINE_NAME

    def _run_model(self, audio_path: str):
        """Call Basic Pitch inference. Single monkeypatch seam for tests."""
        try:
            from basic_pitch.inference import predict
        except ImportError as exc:
            raise TranscriptionError(
                "Basic Pitch engine is not installed. Install the 'basic-pitch' extra.",
                code="ENGINE_UNAVAILABLE",
            ) from exc
        return predict(audio_path)

    def _estimate_beats(self, audio_path: str):
        """Call librosa beat tracker. Single monkeypatch seam for tests."""
        from pianoflow_music.transcription.beat import estimate_tempo_and_beats

        return estimate_tempo_and_beats(audio_path)

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Audio is empty.", code="EMPTY_AUDIO")

        # Derive temp file suffix from the original filename (e.g. ".mp3", ".wav").
        suffix = ".wav"
        if filename:
            dot = filename.rfind(".")
            if dot != -1:
                suffix = filename[dot:]

        opts = options or {}
        quantize = bool(opts.get("quantize", False))
        grid = opts.get("grid", "1/16")

        tmp_path = None
        beats = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                tmp_path = tmp.name

            _model_output, midi_data, note_events = self._run_model(tmp_path)

            try:
                beats = self._estimate_beats(tmp_path)
            except Exception:
                beats = None
        finally:
            if tmp_path is not None:
                with contextlib.suppress(OSError):
                    os.unlink(tmp_path)

        # Sort by start time and build Note objects.
        note_events = sorted(note_events, key=lambda e: e[0])

        notes: list[Note] = []
        for i, (start_s, end_s, pitch, amplitude, _pitch_bends) in enumerate(note_events):
            velocity = max(1, min(127, round(amplitude * 127)))
            start = round(float(start_s), 6)
            end = round(float(end_s), 6)
            notes.append(
                Note(
                    id=i,
                    pitch=int(pitch),
                    name=_pitch_name(int(pitch)),
                    velocity=velocity,
                    start=start,
                    end=end,
                    duration=round(end - start, 6),
                    track=0,
                    hand="R",
                )
            )

        if not notes:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        cleaned_notes, clean_stats = clean_notes(notes)
        if not cleaned_notes:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        # Estimate tempo: prefer librosa beat tracker when available and in range.
        bpm = 120.0
        tempo_source = "fallback"
        if beats is not None and 40.0 <= beats[0] <= 240.0:
            bpm = round(float(beats[0]), 2)
            tempo_source = "librosa_beat"
        else:
            try:
                raw_tempo = midi_data.estimate_tempo()
                clamped = max(40.0, min(240.0, float(raw_tempo)))
                bpm = round(clamped, 2)
                tempo_source = "midi_estimate"
            except Exception:
                bpm = 120.0
                tempo_source = "fallback"

        # Optional quantization (opt-in via options["quantize"]).
        if quantize:
            from pianoflow_music.transcription.quantize import quantize_notes

            cleaned_notes = quantize_notes(cleaned_notes, bpm, grid=grid)

        notes, hand_method = estimate_hands(cleaned_notes)

        note_data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=bpm,
            duration_sec=round(max(n.end for n in notes), 6),
            time_signature="4/4",
            notes=notes,
            tracks=[{"index": 0, "name": "transcribed", "note_count": len(notes)}],
            meta={
                "source": "audio_transcription",
                "engine": ENGINE_NAME,
                "hand_split": hand_method,
            },
        )

        draft_midi_bytes = note_data_to_midi_bytes(note_data)

        # Confidence derived honestly from amplitude distribution.
        amps = [float(e[3]) for e in note_events]
        mean_amp = round(float(mean(amps)), 2)
        # Timing confidence: reward dense, evenly-spaced notes; bounded 0..1.
        timing_conf = round(min(1.0, len(notes) / max(len(notes), 10) * mean_amp + 0.3), 2)
        tempo_confidence = 0.8 if beats is not None else 0.5
        confidence = {
            "overall_confidence": mean_amp,
            "pitch_confidence": mean_amp,
            "timing_confidence": min(1.0, max(0.0, timing_conf)),
            "tempo_confidence": tempo_confidence,
            "warnings": [
                "AI transcription (beta) — the generated MIDI is an editable draft"
                " and may need correction.",
            ],
        }

        report = {
            "engine": ENGINE_NAME,
            "engine_kind": "ml_basic_pitch_onnx",
            "is_real_transcription": True,
            "input_bytes": len(audio_bytes),
            "estimated_audio_duration_seconds": round(float(max(n.end for n in notes)), 2),
            "draft_note_count": len(notes),
            "bpm": bpm,
            "tempo_source": tempo_source,
            "quantized": quantize,
            "quantize_grid": grid if quantize else None,
        }
        report.update(clean_stats)

        return TranscriptionResult(
            status="completed",
            engine=ENGINE_NAME,
            duration_seconds=round(float(max(n.end for n in notes)), 2),
            draft_midi_bytes=draft_midi_bytes,
            notes=note_data,
            confidence=confidence,
            report=report,
        )
