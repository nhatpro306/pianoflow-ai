"""BasicPitchEngine tests.

`basic_pitch` is NOT installed in the test environment. All tests monkeypatch
`engine._run_model` so the heavy inference dependency is never imported.
"""

import pytest

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.transcription import BasicPitchEngine, TranscriptionError, get_engine
from pianoflow_music.transcription.basic_pitch import ENGINE_NAME
import pianoflow_music.transcription.basic_pitch as bp_module

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


# ---------------------------------------------------------------------------
# L1 — primary tempo source is midi_estimate, no librosa second decode
# ---------------------------------------------------------------------------


def test_tempo_source_is_midi_estimate_when_in_range(monkeypatch):
    """midi_data.estimate_tempo() in [40,240] → tempo_source='midi_estimate'."""
    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda path: (None, _FakeMidiData(tempo=132.0), events),
    )

    result = engine.transcribe(b"audio", filename="clip.wav")

    assert result.report["tempo_source"] == "midi_estimate"
    assert result.report["bpm"] == 132.0
    assert result.notes.bpm == 132.0


def test_tempo_source_is_fallback_when_estimate_tempo_raises(monkeypatch):
    """If estimate_tempo() raises → tempo_source='fallback', bpm=120.0."""

    class _BrokenMidi:
        def estimate_tempo(self):
            raise RuntimeError("no data")

    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _BrokenMidi(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")

    assert result.report["tempo_source"] == "fallback"
    assert result.report["bpm"] == 120.0


def test_tempo_confidence_is_0_6_for_midi_estimate(monkeypatch):
    """tempo_confidence must be 0.6 when tempo_source=='midi_estimate'."""
    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda path: (None, _FakeMidiData(tempo=100.0), events),
    )

    result = engine.transcribe(b"audio", filename="clip.wav")

    assert result.confidence["tempo_confidence"] == 0.6


def test_tempo_confidence_is_0_5_for_fallback(monkeypatch):
    """tempo_confidence must be 0.5 when estimate_tempo() raises (fallback path)."""

    class _BrokenMidi:
        def estimate_tempo(self):
            raise RuntimeError("no data")

    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (None, _BrokenMidi(), events))

    result = engine.transcribe(b"audio", filename="clip.wav")

    assert result.confidence["tempo_confidence"] == 0.5


def test_no_librosa_decode_path_invoked(monkeypatch):
    """The engine must NOT call estimate_tempo_and_beats (the second-decode path)."""
    import pianoflow_music.transcription.beat as beat_module

    def _should_never_be_called(path):
        raise AssertionError("estimate_tempo_and_beats must not be called (double decode removed)")

    monkeypatch.setattr(beat_module, "estimate_tempo_and_beats", _should_never_be_called)

    engine = BasicPitchEngine()
    events = _note_events()
    monkeypatch.setattr(
        engine,
        "_run_model",
        lambda path: (None, _FakeMidiData(tempo=120.0), events),
    )

    # Must complete without triggering the patched function.
    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.status == "completed"


# ---------------------------------------------------------------------------
# L2 — model singleton cache
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=False)
def reset_bp_model_cache():
    """Reset the Basic Pitch module-level model cache between tests."""
    original = bp_module._cached_model
    bp_module._cached_model = None
    yield
    bp_module._cached_model = original


def test_get_model_constructs_exactly_once(monkeypatch, reset_bp_model_cache):
    """_get_model() called twice must build the Model only once."""
    build_count = 0

    class _FakeModel:
        pass

    def _fake_model_constructor(_sentinel=None):
        nonlocal build_count
        build_count += 1
        return _FakeModel()

    # Patch the Model class inside basic_pitch.inference via the helper
    monkeypatch.setattr(bp_module, "_build_model", _fake_model_constructor)

    m1 = bp_module._get_model()
    m2 = bp_module._get_model()

    assert build_count == 1, f"Model built {build_count} times, expected 1 (cache miss on 2nd call)"
    assert m1 is m2, "Both calls must return the same cached instance"


def test_get_model_cache_is_none_after_reset(reset_bp_model_cache):
    """After the fixture resets the cache, _cached_model must be None."""
    assert bp_module._cached_model is None


def test_get_model_missing_dependency_raises_engine_unavailable(
    monkeypatch, reset_bp_model_cache
):
    """If basic_pitch cannot be imported, _get_model must raise ENGINE_UNAVAILABLE."""
    from pianoflow_music.transcription.engine import TranscriptionError

    def _raise_import_error(_sentinel=None):
        raise ImportError("basic_pitch not installed")

    monkeypatch.setattr(bp_module, "_build_model", _raise_import_error)

    with pytest.raises(TranscriptionError) as exc_info:
        bp_module._get_model()
    assert exc_info.value.code == "ENGINE_UNAVAILABLE"


def test_run_model_uses_cached_model(monkeypatch, reset_bp_model_cache):
    """_run_model must pass the cached model to predict, not rebuild it."""
    build_count = 0

    class _FakeModel:
        pass

    def _fake_build(_sentinel=None):
        nonlocal build_count
        build_count += 1
        return _FakeModel()

    received_models = []

    def _fake_predict(audio_path, model_or_model_path):
        received_models.append(model_or_model_path)
        fake_midi = _FakeMidiData(120.0)
        events = _note_events(count=2)
        return (None, fake_midi, events)

    monkeypatch.setattr(bp_module, "_build_model", _fake_build)
    monkeypatch.setattr(bp_module, "_predict", _fake_predict)

    engine = BasicPitchEngine()
    engine._run_model("/tmp/a.wav")
    engine._run_model("/tmp/b.wav")

    assert build_count == 1, "Model must only be built once across multiple _run_model calls"
    assert len(received_models) == 2
    assert received_models[0] is received_models[1], "Both calls must pass the same model instance"
