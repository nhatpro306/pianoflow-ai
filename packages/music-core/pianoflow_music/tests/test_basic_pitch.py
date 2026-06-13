"""BasicPitchEngine tests.

`basic_pitch` is NOT installed in the test environment. All tests monkeypatch
`engine._run_model` so the heavy inference dependency is never imported.
"""

import pytest

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.transcription import BasicPitchEngine, TranscriptionError, get_engine
from pianoflow_music.transcription.basic_pitch import ENGINE_NAME

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class _FakeMidiData:
    """Minimal stub that satisfies midi_data.estimate_tempo()."""

    def __init__(self, tempo: float = 120.0) -> None:
        self._tempo = tempo

    def estimate_tempo(self) -> float:
        return self._tempo


def _note_events(
    count: int = 4,
    base_pitch: int = 60,
    amplitude: float = 0.8,
) -> list[tuple]:
    """Return a list of (start, end, pitch, amplitude, []) tuples."""
    events = []
    for i in range(count):
        start = float(i) * 0.5
        end = start + 0.4
        pitch = base_pitch + i
        events.append((start, end, pitch, amplitude, []))
    return events


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def test_get_engine_basic_pitch_returns_instance():
    engine = get_engine("basic_pitch")
    assert isinstance(engine, BasicPitchEngine)
    assert engine.name == ENGINE_NAME


def test_get_engine_basic_pitch_is_cheap(monkeypatch):
    """Constructing the engine must not import basic_pitch."""
    import sys

    # basic_pitch should not be importable in this env; confirm it isn't there.
    assert "basic_pitch" not in sys.modules
    engine = get_engine("basic_pitch")
    assert isinstance(engine, BasicPitchEngine)
    # Still not imported.
    assert "basic_pitch" not in sys.modules


# ---------------------------------------------------------------------------
# Normal transcription
# ---------------------------------------------------------------------------


def test_transcribe_completed(monkeypatch):
    engine = BasicPitchEngine()
    events = _note_events(count=5, base_pitch=60, amplitude=0.7)
    fake_midi = _FakeMidiData(tempo=130.0)
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, fake_midi, events))

    result = engine.transcribe(b"fake_audio_data", filename="test.wav")

    assert result.status == "completed"
    assert result.engine == ENGINE_NAME
    assert result.report["is_real_transcription"] is True
    assert result.report["engine_kind"] == "ml_basic_pitch_onnx"
    assert result.report["draft_note_count"] == 5
    assert result.report["bpm"] == 130.0


def test_transcribe_note_ids_sequential(monkeypatch):
    engine = BasicPitchEngine()
    events = _note_events(count=6)
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.mp3")

    ids = [note.id for note in result.notes.notes]
    assert ids == list(range(6))


def test_transcribe_hand_assignment(monkeypatch):
    engine = BasicPitchEngine()
    # pitch 59 → L, pitch 60 → R
    events = [
        (0.0, 0.4, 59, 0.8, []),
        (0.5, 0.9, 60, 0.8, []),
    ]
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    notes = result.notes.notes
    assert notes[0].hand == "L"  # pitch 59 < 60
    assert notes[1].hand == "R"  # pitch 60 >= 60


def test_transcribe_velocity_clamped_high(monkeypatch):
    """amplitude > 1.0 must clamp to 127."""
    engine = BasicPitchEngine()
    events = [(0.0, 0.5, 64, 2.0, [])]  # amplitude way above 1.0
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.notes.notes[0].velocity == 127


def test_transcribe_velocity_clamped_low(monkeypatch):
    """amplitude near 0 must clamp to at least 1."""
    engine = BasicPitchEngine()
    events = [(0.0, 0.5, 64, 0.0, [])]
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.notes.notes[0].velocity >= 1


def test_transcribe_confidence_values_in_range(monkeypatch):
    engine = BasicPitchEngine()
    events = _note_events(count=4, amplitude=0.6)
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    conf = result.confidence
    for key in ("overall_confidence", "pitch_confidence", "timing_confidence", "tempo_confidence"):
        assert 0.0 <= conf[key] <= 1.0, f"{key}={conf[key]} out of range"


def test_transcribe_warnings_present(monkeypatch):
    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert len(result.confidence["warnings"]) >= 1
    assert any("beta" in w.lower() or "draft" in w.lower() for w in result.confidence["warnings"])


# ---------------------------------------------------------------------------
# MIDI round-trip
# ---------------------------------------------------------------------------


def test_draft_midi_round_trips(monkeypatch):
    engine = BasicPitchEngine()
    events = _note_events(count=8, base_pitch=60, amplitude=0.75)
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), events))

    result = engine.transcribe(b"audio_bytes", filename="clip.wav")
    assert isinstance(result.draft_midi_bytes, bytes)
    assert len(result.draft_midi_bytes) > 0

    parsed = parse_midi_bytes(result.draft_midi_bytes)
    assert len(parsed.notes) == len(result.notes.notes)


# ---------------------------------------------------------------------------
# Error cases — empty audio (before _run_model is called)
# ---------------------------------------------------------------------------


def test_empty_audio_raises_before_model():
    """EMPTY_AUDIO must be raised without calling _run_model."""
    engine = BasicPitchEngine()

    def _should_not_be_called(path):
        raise AssertionError("_run_model must not be called for empty audio")

    engine._run_model = _should_not_be_called

    with pytest.raises(TranscriptionError) as exc_info:
        engine.transcribe(b"", filename="empty.wav")
    assert exc_info.value.code == "EMPTY_AUDIO"


# ---------------------------------------------------------------------------
# Error cases — zero note events
# ---------------------------------------------------------------------------


def test_zero_notes_raises_no_notes_detected(monkeypatch):
    engine = BasicPitchEngine()
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _FakeMidiData(), []))

    with pytest.raises(TranscriptionError) as exc_info:
        engine.transcribe(b"audio", filename="silence.wav")
    assert exc_info.value.code == "NO_NOTES_DETECTED"


# ---------------------------------------------------------------------------
# Tempo clamping
# ---------------------------------------------------------------------------


def test_tempo_clamped_high(monkeypatch):
    """Absurd estimated tempo (e.g. 999 bpm) is clamped to 240."""
    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda path: (None, _FakeMidiData(tempo=999.0), events),
    )

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] <= 240.0


def test_tempo_clamped_low(monkeypatch):
    """Absurd low tempo (e.g. 5 bpm) is clamped to 40."""
    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda path: (None, _FakeMidiData(tempo=5.0), events),
    )

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] >= 40.0


def test_tempo_fallback_on_exception(monkeypatch):
    """If estimate_tempo() raises, bpm falls back to 120.0."""

    class _BrokenMidi:
        def estimate_tempo(self):
            raise RuntimeError("sparse data")

    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _BrokenMidi(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] == 120.0
