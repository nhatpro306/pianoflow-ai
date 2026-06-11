"""Deterministic placeholder transcription engine.

NOT real AI transcription. It derives a small, repeatable draft melody from a
hash of the audio bytes so the full Audio → MIDI Beta pipeline (upload →
queue → worker → outputs → preview/sheet) is exercisable and testable
end-to-end before a real model lands. The confidence report says so loudly.

A real engine (e.g. Basic Pitch) replaces this behind the same
`TranscriptionEngine` interface — no API or worker changes.
"""

import hashlib
import io
import wave

from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.transcription.engine import TranscriptionError, TranscriptionResult

ENGINE_NAME = "placeholder_deterministic_v1"

_BPM = 90.0
# C-major pentatonic across two octaves — placeholder draft stays musical.
_PITCH_POOL = (48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72)
_MIN_NOTES = 8
_MAX_NOTES = 32
_MAX_DURATION_SECONDS = 180.0
_FALLBACK_BITRATE_BPS = 128_000  # duration heuristic for compressed audio


def _estimate_duration_seconds(audio_bytes: bytes, filename: str) -> float:
    if filename.lower().endswith(".wav"):
        try:
            with wave.open(io.BytesIO(audio_bytes)) as wav:
                frames = wav.getnframes()
                rate = wav.getframerate()
                if rate > 0:
                    return min(frames / rate, _MAX_DURATION_SECONDS)
        except (wave.Error, EOFError):
            pass  # malformed header — fall through to size heuristic
    estimated = len(audio_bytes) * 8 / _FALLBACK_BITRATE_BPS
    return min(max(estimated, 2.0), _MAX_DURATION_SECONDS)


def _wav_meta(audio_bytes: bytes, filename: str) -> dict:
    if not filename.lower().endswith(".wav"):
        return {}
    try:
        with wave.open(io.BytesIO(audio_bytes)) as wav:
            return {"sample_rate": wav.getframerate(), "channels": wav.getnchannels()}
    except (wave.Error, EOFError):
        return {}


class PlaceholderDeterministicEngine:
    name = ENGINE_NAME

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Audio is empty.", code="EMPTY_AUDIO")

        digest = hashlib.sha256(audio_bytes).digest()
        duration = _estimate_duration_seconds(audio_bytes, filename)

        note_count = _MIN_NOTES + digest[0] % (_MAX_NOTES - _MIN_NOTES + 1)
        beat = 60.0 / _BPM
        notes: list[Note] = []
        for i in range(note_count):
            pitch = _PITCH_POOL[digest[(i + 1) % len(digest)] % len(_PITCH_POOL)]
            velocity = 56 + digest[(i + 7) % len(digest)] % 48
            start = round(i * beat, 6)
            end = round(start + beat * 0.9, 6)
            notes.append(
                Note(
                    id=i,
                    pitch=pitch,
                    name=_pitch_name(pitch),
                    velocity=velocity,
                    start=start,
                    end=end,
                    duration=round(end - start, 6),
                    track=0,
                    hand="L" if pitch < 60 else "R",
                )
            )

        note_data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=_BPM,
            duration_sec=round(notes[-1].end, 6),
            time_signature="4/4",
            notes=notes,
            tracks=[{"index": 0, "name": "draft", "note_count": note_count}],
            meta={
                "source": "audio_transcription_draft",
                "engine": ENGINE_NAME,
                "hand_split": "pitch_heuristic",
            },
        )

        # Deterministic but honest pseudo-confidence: clearly low, clearly draft.
        confidence = {
            "overall_confidence": round(0.35 + (digest[2] % 20) / 100, 2),
            "pitch_confidence": round(0.40 + (digest[3] % 20) / 100, 2),
            "timing_confidence": round(0.30 + (digest[4] % 20) / 100, 2),
            "tempo_confidence": round(0.35 + (digest[5] % 20) / 100, 2),
            "warnings": [
                "Placeholder engine output — not real AI transcription.",
                "The generated MIDI is an editable draft and may need correction.",
            ],
        }
        report = {
            "engine": ENGINE_NAME,
            "engine_kind": "deterministic_placeholder",
            "is_real_transcription": False,
            "input_bytes": len(audio_bytes),
            "estimated_audio_duration_seconds": round(duration, 2),
            "draft_note_count": note_count,
            "bpm": _BPM,
            **_wav_meta(audio_bytes, filename),
        }

        return TranscriptionResult(
            status="completed",
            engine=ENGINE_NAME,
            duration_seconds=round(duration, 2),
            draft_midi_bytes=note_data_to_midi_bytes(note_data),
            notes=note_data,
            confidence=confidence,
            report=report,
        )


_NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")


def _pitch_name(pitch: int) -> str:
    return f"{_NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}"
