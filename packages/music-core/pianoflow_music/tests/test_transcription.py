"""Placeholder transcription engine tests."""

import io
import wave

import pytest

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.transcription import (
    PlaceholderDeterministicEngine,
    TranscriptionError,
    get_engine,
)


def _wav_bytes(seconds: float = 2.0, rate: int = 8000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"\x01\x02" * int(rate * seconds))
    return buffer.getvalue()


def test_factory_returns_placeholder():
    assert isinstance(get_engine("default"), PlaceholderDeterministicEngine)
    with pytest.raises(TranscriptionError):
        get_engine("does-not-exist")


def test_transcribe_is_deterministic():
    engine = PlaceholderDeterministicEngine()
    audio = _wav_bytes()
    a = engine.transcribe(audio, filename="take.wav")
    b = engine.transcribe(audio, filename="take.wav")
    assert a.draft_midi_bytes == b.draft_midi_bytes
    assert a.notes.to_dict() == b.notes.to_dict()
    assert a.confidence == b.confidence


def test_draft_midi_round_trips_through_parser():
    result = PlaceholderDeterministicEngine().transcribe(_wav_bytes(), filename="take.wav")
    parsed = parse_midi_bytes(result.draft_midi_bytes)
    assert len(parsed.notes) == len(result.notes.notes)
    assert parsed.bpm == pytest.approx(90.0, abs=1.0)


def test_wav_duration_and_meta_extracted():
    result = PlaceholderDeterministicEngine().transcribe(
        _wav_bytes(seconds=3.0, rate=8000), filename="take.wav"
    )
    assert result.duration_seconds == pytest.approx(3.0, abs=0.1)
    assert result.report["sample_rate"] == 8000
    assert result.report["channels"] == 1


def test_report_is_honest_about_placeholder():
    result = PlaceholderDeterministicEngine().transcribe(b"x" * 4000, filename="clip.mp3")
    assert result.report["is_real_transcription"] is False
    assert result.engine == "placeholder_deterministic_v1"
    assert any("Placeholder" in w for w in result.confidence["warnings"])
    assert result.confidence["overall_confidence"] < 0.6


def test_empty_audio_rejected():
    with pytest.raises(TranscriptionError):
        PlaceholderDeterministicEngine().transcribe(b"", filename="empty.wav")
