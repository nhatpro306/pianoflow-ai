"""Transkun piano transcription engine adapter (Beta / scaffold).

Transkun (https://github.com/Yujia-Yan/Transkun) is a piano-specific
automatic music transcription model that produces both note events and
sustain-pedal (CC64) events with higher accuracy than general-purpose
transcribers.

Heavy imports are deferred to ``_run_model`` so importing this module is
cheap and safe in all deployment contexts.  Install the optional extra to
enable:

    pip install "pianoflow-music[transkun]"
    # or: uv add "pianoflow-music[transkun]"

Without the extra, instantiation is fine but ``transcribe()`` raises
``TranscriptionError(code="ENGINE_UNAVAILABLE")``.

``_run_model`` contract (the monkeypatch seam used by tests):
  Returns ``(note_events, pedal_events, bpm)`` where:
    note_events  — list of ``(start_sec, end_sec, pitch, velocity_0to127)``
    pedal_events — list of ``(time_sec, value_0to127)``
    bpm          — float
"""

import contextlib
import os
import tempfile

from pianoflow_music.midi.hands import estimate_hands
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.transcription.engine import TranscriptionError, TranscriptionResult
from pianoflow_music.transcription.postprocess import clean_notes

ENGINE_NAME = "transkun_v1"

_NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

_BPM_MIN = 40.0
_BPM_MAX = 240.0
_BPM_FALLBACK = 120.0

# Constant confidence baseline — transkun does not expose per-note probabilities
# in this scaffold so we use a fixed value that reflects the model's known accuracy.
_BASE_CONFIDENCE = 0.7
_TEMPO_CONFIDENCE = 0.6


def _pitch_name(pitch: int) -> str:
    """Return scientific pitch name for a MIDI pitch number, e.g. 60 → 'C4'."""
    return f"{_NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}"


class TranskunEngine:
    name = ENGINE_NAME

    def _run_model(self, audio_path: str) -> tuple[list[tuple], list[tuple], float]:
        """Call Transkun inference. Single monkeypatch seam for tests.

        Returns normalised ``(note_events, pedal_events, bpm)``:
          note_events  — list of ``(start_sec, end_sec, pitch, velocity_0to127)``
          pedal_events — list of ``(time_sec, value_0to127)``
          bpm          — float

        TODO: when the real Transkun Python API surface is confirmed, map its
        output to the normalised shape above and remove the ENGINE_UNAVAILABLE
        guard below.  The normalised contract must be preserved so tests that
        monkeypatch this seam continue to work unchanged.
        """
        try:
            import transkun  # noqa: F401
        except ImportError as exc:
            raise TranscriptionError(
                "Transkun engine is not installed. Install the 'transkun' extra.",
                code="ENGINE_UNAVAILABLE",
            ) from exc

        # TODO: call the real transkun API here and map its output to the
        # normalised (note_events, pedal_events, bpm) shape before returning.
        # Until the mapping is implemented we raise ENGINE_UNAVAILABLE so the
        # scaffold never silently produces wrong data.
        raise TranscriptionError(
            "Transkun engine is installed but the output mapping is not yet implemented. "
            "See transkun.py TODO.",
            code="ENGINE_UNAVAILABLE",
        )

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Audio is empty.", code="EMPTY_AUDIO")

        # Derive temp-file suffix from the original filename (e.g. ".mp3", ".wav").
        suffix = ".wav"
        if filename:
            dot = filename.rfind(".")
            if dot != -1:
                suffix = filename[dot:]

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                tmp_path = tmp.name

            note_events, pedal_events, bpm = self._run_model(tmp_path)
        finally:
            if tmp_path is not None:
                with contextlib.suppress(OSError):
                    os.unlink(tmp_path)

        # Build raw Note list from normalised note_events.
        raw_notes: list[Note] = []
        for i, (start_s, end_s, pitch, velocity_raw) in enumerate(note_events):
            velocity = max(1, min(127, int(velocity_raw)))
            start = round(float(start_s), 6)
            end = round(float(end_s), 6)
            raw_notes.append(
                Note(
                    id=i,
                    pitch=int(pitch),
                    name=_pitch_name(int(pitch)),
                    velocity=velocity,
                    start=start,
                    end=end,
                    duration=round(end - start, 6),
                    track=0,
                    hand="R",  # placeholder — estimate_hands assigns real values below
                )
            )

        if not raw_notes:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        cleaned, clean_stats = clean_notes(raw_notes)
        if not cleaned:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        notes, hand_method = estimate_hands(cleaned)

        # Clamp bpm to [40, 240]; fall back to 120 if out of range.
        bpm = round(float(bpm), 2) if _BPM_MIN <= float(bpm) <= _BPM_MAX else _BPM_FALLBACK

        # Build sustain list from normalised pedal_events.
        sustain = [
            {"time": round(float(t), 6), "value": int(max(0, min(127, v)))} for t, v in pedal_events
        ]

        duration_sec = max(n.end for n in notes)

        note_data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=bpm,
            duration_sec=duration_sec,
            time_signature="4/4",
            notes=notes,
            tracks=[{"index": 0, "name": "transcribed", "note_count": len(notes)}],
            meta={
                "source": "audio_transcription",
                "engine": ENGINE_NAME,
                "hand_split": hand_method,
            },
            sustain=sustain,
        )

        draft_midi_bytes = note_data_to_midi_bytes(note_data)

        confidence = {
            "overall_confidence": _BASE_CONFIDENCE,
            "pitch_confidence": _BASE_CONFIDENCE,
            "timing_confidence": _BASE_CONFIDENCE,
            "tempo_confidence": _TEMPO_CONFIDENCE,
            "warnings": [
                "AI transcription (beta) — the generated MIDI is an editable draft"
                " and may need correction.",
            ],
        }

        report: dict = {
            "engine": ENGINE_NAME,
            "engine_kind": "ml_transkun",
            "is_real_transcription": True,
            "input_bytes": len(audio_bytes),
            "draft_note_count": len(notes),
            "bpm": bpm,
            "has_pedal": bool(sustain),
        }
        report.update(clean_stats)

        return TranscriptionResult(
            status="completed",
            engine=ENGINE_NAME,
            duration_seconds=round(duration_sec, 2),
            draft_midi_bytes=draft_midi_bytes,
            notes=note_data,
            confidence=confidence,
            report=report,
        )
