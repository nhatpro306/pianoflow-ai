"""TranskunEngine tests.

``transkun`` is NOT installed in the test environment. All tests monkeypatch
``engine._run_model`` so the heavy inference dependency is never imported.

The ``_run_model`` seam contract:
    Returns ``(note_events, pedal_events, bpm)`` where:
      note_events  — list of ``(start_sec, end_sec, pitch, velocity_0to127)``
      pedal_events — list of ``(time_sec, value_0to127)``
      bpm          — float
"""

import io
import sys

import pytest

import pianoflow_music.transcription.transkun as tk_module
from pianoflow_music.transcription import TranscriptionError, TranskunEngine, get_engine
from pianoflow_music.transcription.transkun import ENGINE_NAME

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _note_events(
    count: int = 4,
    base_pitch: int = 60,
    velocity: int = 80,
) -> list[tuple]:
    """Return a list of (start_sec, end_sec, pitch, velocity_0to127) tuples."""
    events = []
    for i in range(count):
        start = float(i) * 0.5
        end = start + 0.4
        pitch = base_pitch + i
        events.append((start, end, pitch, velocity))
    return events


def _pedal_events() -> list[tuple]:
    """Return a minimal pedal event list: (time_sec, value_0to127)."""
    return [(0.1, 127), (0.9, 0), (1.5, 100)]


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def test_get_engine_transkun_returns_instance():
    engine = get_engine("transkun")
    assert isinstance(engine, TranskunEngine)
    assert engine.name == ENGINE_NAME


def test_get_engine_transkun_is_cheap():
    """Constructing the engine must not import the ``transkun`` package."""
    # Ensure transkun is not already imported (it shouldn't be in CI).
    assert "transkun" not in sys.modules
    engine = get_engine("transkun")
    assert isinstance(engine, TranskunEngine)
    # Still not imported — deferred import must stay inside _run_model only.
    assert "transkun" not in sys.modules


# ---------------------------------------------------------------------------
# Error cases — empty audio
# ---------------------------------------------------------------------------


def test_empty_audio_raises_before_model():
    """EMPTY_AUDIO must be raised without calling _run_model."""
    engine = TranskunEngine()

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
    engine = TranskunEngine()
    monkeypatch.setattr(engine, "_run_model", lambda path: ([], [], 120.0))

    with pytest.raises(TranscriptionError) as exc_info:
        engine.transcribe(b"audio", filename="silence.wav")
    assert exc_info.value.code == "NO_NOTES_DETECTED"


# ---------------------------------------------------------------------------
# Normal transcription
# ---------------------------------------------------------------------------


def test_transcribe_completed(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=5, base_pitch=60, velocity=100)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 130.0))

    result = engine.transcribe(b"fake_audio_data", filename="test.wav")

    assert result.status == "completed"
    assert result.engine == ENGINE_NAME
    assert result.report["is_real_transcription"] is True
    assert result.report["engine_kind"] == "ml_transkun"
    assert result.report["draft_note_count"] == 5
    assert result.report["bpm"] == 130.0


def test_transcribe_correct_note_count(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=8, base_pitch=60)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["draft_note_count"] == 8
    assert len(result.notes.notes) == 8


def test_transcribe_bpm_in_report(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 95.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] == 95.0


# ---------------------------------------------------------------------------
# Velocity clamping
# ---------------------------------------------------------------------------


def test_velocity_clamped_high(monkeypatch):
    """velocity > 127 must clamp to 127."""
    engine = TranskunEngine()
    events = [(0.0, 0.5, 64, 200)]
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.notes.notes[0].velocity == 127


def test_velocity_clamped_low(monkeypatch):
    """velocity 0 must clamp to at least 1."""
    engine = TranskunEngine()
    events = [(0.0, 0.5, 64, 0)]
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.notes.notes[0].velocity >= 1


# ---------------------------------------------------------------------------
# Tempo clamping
# ---------------------------------------------------------------------------


def test_tempo_clamped_high(monkeypatch):
    """bpm above 240 must clamp to 240 (actually falls back to 120)."""
    engine = TranskunEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 999.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] <= 240.0


def test_tempo_clamped_low(monkeypatch):
    """bpm below 40 must clamp (actually falls back to 120)."""
    engine = TranskunEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 5.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] >= 40.0


def test_tempo_valid_in_range(monkeypatch):
    """bpm in [40, 240] must be kept as-is (rounded to 2dp)."""
    engine = TranskunEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 176.5))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["bpm"] == 176.5


# ---------------------------------------------------------------------------
# Pedal / sustain
# ---------------------------------------------------------------------------


def test_pedal_events_populate_sustain(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=4)
    pedal = _pedal_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, pedal, 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.notes.sustain == [
        {"time": 0.1, "value": 127},
        {"time": 0.9, "value": 0},
        {"time": 1.5, "value": 100},
    ]


def test_report_has_pedal_true_when_pedal_present(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, _pedal_events(), 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["has_pedal"] is True


def test_report_has_pedal_false_when_no_pedal(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    assert result.report["has_pedal"] is False


def test_sustain_round_trips_into_midi(monkeypatch):
    """Sustain entries in NoteData.sustain reach the MIDI bytes (CC64).

    We verify the sustain data is present in NoteData and that MIDI bytes are
    produced (the write module already tests CC64 output).
    """
    engine = TranskunEngine()
    events = _note_events(count=4)
    pedal = [(0.1, 127), (0.5, 0)]
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, pedal, 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")

    # Sustain entries correctly populated in NoteData.
    assert len(result.notes.sustain) == 2
    assert result.notes.sustain[0] == {"time": 0.1, "value": 127}
    assert result.notes.sustain[1] == {"time": 0.5, "value": 0}

    # MIDI bytes are non-empty (CC64 is written by note_data_to_midi_bytes).
    assert isinstance(result.draft_midi_bytes, bytes)
    assert len(result.draft_midi_bytes) > 0

    # Verify CC64 data is present by checking MIDI bytes contain the CC64
    # control number (0x40 = 64) in a control_change message.
    import io

    import mido

    mid = mido.MidiFile(file=io.BytesIO(result.draft_midi_bytes))
    cc64_messages = [
        msg
        for track in mid.tracks
        for msg in track
        if msg.type == "control_change" and msg.control == 64
    ]
    assert len(cc64_messages) >= 1, "Expected CC64 sustain messages in MIDI output"


def test_sustain_value_clamped(monkeypatch):
    """Pedal values outside 0..127 must be clamped."""
    engine = TranskunEngine()
    events = _note_events(count=2)
    pedal = [(-0.1, -5), (0.5, 200)]  # time negative → kept as-is (rounded), value clamped
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, pedal, 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    values = [e["value"] for e in result.notes.sustain]
    assert all(0 <= v <= 127 for v in values), f"Unclamped sustain values: {values}"


# ---------------------------------------------------------------------------
# Confidence
# ---------------------------------------------------------------------------


def test_confidence_keys_all_in_range(monkeypatch):
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    conf = result.confidence
    for key in ("overall_confidence", "pitch_confidence", "timing_confidence", "tempo_confidence"):
        assert 0.0 <= conf[key] <= 1.0, f"{key}={conf[key]} out of range"


def test_confidence_warnings_present(monkeypatch):
    engine = TranskunEngine()
    events = _note_events()
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 120.0))

    result = engine.transcribe(b"audio", filename="clip.wav")
    warnings = result.confidence.get("warnings", [])
    assert len(warnings) >= 1
    assert any("beta" in w.lower() or "draft" in w.lower() for w in warnings)


# ---------------------------------------------------------------------------
# Q3 — Robust pedal extraction
# ---------------------------------------------------------------------------


def test_pedal_events_produce_cc64_in_midi():
    """Pedal events from _run_model must produce CC64 control_change in the MIDI."""
    import mido

    engine = TranskunEngine()

    # Inject fake _run_model: 1 note + 1 pedal event
    def fake_run_model(audio_path):
        note_events = [(0.0, 1.0, 60, 80)]
        pedal_events = [(0.1, 127), (0.9, 0)]
        return note_events, pedal_events, 120.0

    engine._run_model = fake_run_model
    result = engine.transcribe(b"fake_audio_bytes")

    midi = mido.MidiFile(file=io.BytesIO(result.draft_midi_bytes))
    cc64_messages = [
        msg
        for track in midi.tracks
        for msg in track
        if msg.type == "control_change" and msg.control == 64
    ]
    assert len(cc64_messages) >= 2, f"Expected CC64 messages, got: {cc64_messages}"
    assert result.notes.sustain != [], "sustain list must be non-empty"
    assert result.report["has_pedal"] is True


# ---------------------------------------------------------------------------
# Q4 — Real tempo + opt-in quantization
# ---------------------------------------------------------------------------


def test_tempo_from_fake_run_model():
    """When _run_model returns a valid BPM it should be used directly."""
    engine = TranskunEngine()

    def fake_run_model(audio_path):
        return [(0.0, 0.5, 60, 80)], [], 140.0

    engine._run_model = fake_run_model
    result = engine.transcribe(b"fake_audio_bytes")
    assert result.notes.bpm == 140.0
    assert result.report["tempo_source"] == "transkun_librosa"


def test_quantize_option_does_not_crash():
    """quantize=True with a valid bpm must not raise."""
    engine = TranskunEngine()

    def fake_run_model(audio_path):
        return [(0.0, 0.5, 60, 80), (0.6, 1.1, 64, 90)], [], 120.0

    engine._run_model = fake_run_model
    result = engine.transcribe(b"fake_audio_bytes", options={"quantize": True, "grid": "1/16"})
    assert result.status == "completed"
    assert len(result.notes.notes) >= 1


# ---------------------------------------------------------------------------
# L1 — no second file decode; _run_model returns bpm from decoded array
# ---------------------------------------------------------------------------


def test_tempo_source_transkun_librosa_when_bpm_in_range(monkeypatch):
    """_run_model returning 128.0 → tempo_source='transkun_librosa', bpm==128.0."""
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 128.0))

    result = engine.transcribe(b"fake_audio_bytes", filename="test.wav")

    assert result.report["tempo_source"] == "transkun_librosa"
    assert result.notes.bpm == pytest.approx(128.0)


def test_tempo_source_fallback_120_when_bpm_zero(monkeypatch):
    """_run_model returning 0.0 → fallback to 120.0, tempo_source='fallback_120'."""
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 0.0))

    result = engine.transcribe(b"fake_audio_bytes", filename="test.wav")

    assert result.report["tempo_source"] == "fallback_120"
    assert result.notes.bpm == 120.0


def test_tempo_confidence_0_8_for_transkun_librosa(monkeypatch):
    """tempo_confidence is 0.8 when tempo_source=='transkun_librosa'."""
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 100.0))

    result = engine.transcribe(b"fake_audio_bytes", filename="test.wav")

    assert result.confidence["tempo_confidence"] == 0.8


def test_tempo_confidence_0_5_for_fallback_120(monkeypatch):
    """tempo_confidence is 0.5 when bpm is out of range (fallback_120)."""
    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 0.0))

    result = engine.transcribe(b"fake_audio_bytes", filename="test.wav")

    assert result.confidence["tempo_confidence"] == 0.5


def test_no_estimate_tempo_and_beats_called_in_transcribe(monkeypatch):
    """transcribe() must never call estimate_tempo_and_beats (second file decode removed)."""
    import pianoflow_music.transcription.beat as beat_module

    def _should_never_be_called(path):
        raise AssertionError("estimate_tempo_and_beats must not be called (L1 removed it)")

    monkeypatch.setattr(beat_module, "estimate_tempo_and_beats", _should_never_be_called)

    engine = TranskunEngine()
    events = _note_events(count=4)
    monkeypatch.setattr(engine, "_run_model", lambda path: (events, [], 0.0))

    # Must complete without triggering the patched function, even when bpm=0.0 (fallback path).
    result = engine.transcribe(b"fake_audio_bytes", filename="test.wav")
    assert result.status == "completed"


# ---------------------------------------------------------------------------
# L2 — model singleton cache keyed by device
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=False)
def reset_tk_model_cache():
    """Reset the Transkun module-level model cache dict between tests."""
    original = dict(tk_module._model_cache)
    tk_module._model_cache.clear()
    yield
    tk_module._model_cache.clear()
    tk_module._model_cache.update(original)


def test_get_model_constructs_exactly_once_per_device(monkeypatch, reset_tk_model_cache):
    """_get_model('cpu') called twice must build the model only once."""
    build_count = 0

    class _FakeModel:
        fs = 44100

    def _fake_build(device):
        nonlocal build_count
        build_count += 1
        return _FakeModel()

    monkeypatch.setattr(tk_module, "_build_model", _fake_build)

    m1 = tk_module._get_model("cpu")
    m2 = tk_module._get_model("cpu")

    assert build_count == 1, f"Model built {build_count} times, expected 1 (cache miss on 2nd call)"
    assert m1 is m2, "Both calls must return the same cached instance for the same device"


def test_get_model_different_device_builds_again(monkeypatch, reset_tk_model_cache):
    """A second device key ('cuda') must trigger a new build."""
    build_count = 0

    class _FakeModel:
        fs = 44100

    def _fake_build(device):
        nonlocal build_count
        build_count += 1
        return _FakeModel()

    monkeypatch.setattr(tk_module, "_build_model", _fake_build)

    tk_module._get_model("cpu")
    tk_module._get_model("cuda")

    assert build_count == 2, f"Expected 2 builds (one per device), got {build_count}"


def test_get_model_cache_empty_after_reset(reset_tk_model_cache):
    """After the fixture resets the cache, _model_cache must be empty."""
    assert tk_module._model_cache == {}


def test_get_model_missing_dependency_raises_engine_unavailable(monkeypatch, reset_tk_model_cache):
    """If transkun deps cannot be imported, _get_model must raise ENGINE_UNAVAILABLE."""
    from pianoflow_music.transcription.engine import TranscriptionError

    def _raise_import_error(device):
        raise ImportError("transkun not installed")

    monkeypatch.setattr(tk_module, "_build_model", _raise_import_error)

    with pytest.raises(TranscriptionError) as exc_info:
        tk_module._get_model("cpu")
    assert exc_info.value.code == "ENGINE_UNAVAILABLE"


# ---------------------------------------------------------------------------
# L5 — GPU device selection + inference_mode
# ---------------------------------------------------------------------------


def _make_fake_torch(*, cuda_available: bool):
    """Build a minimal fake torch module for monkeypatching inside _run_model.

    Provides:
      - torch.cuda.is_available()          → cuda_available
      - torch.from_numpy(arr).to(device)   → the same array (passthrough)
      - torch.inference_mode()             → context manager that sets a flag
    """
    import contextlib
    import types

    fake_torch = types.ModuleType("torch")

    # cuda sub-module
    fake_cuda = types.ModuleType("torch.cuda")
    fake_cuda.is_available = lambda: cuda_available
    fake_torch.cuda = fake_cuda

    # Tensor stub: from_numpy returns an object with .to() that records device
    class _FakeTensor:
        def __init__(self, arr):
            self._arr = arr
            self.device_arg = None

        def to(self, device):
            self.device_arg = device
            return self

    fake_torch.from_numpy = lambda arr: _FakeTensor(arr)

    # inference_mode context manager stub
    @contextlib.contextmanager
    def _inference_mode():
        fake_torch._inference_mode_entered = True
        yield
        fake_torch._inference_mode_exited = True

    fake_torch.inference_mode = _inference_mode
    fake_torch._inference_mode_entered = False
    fake_torch._inference_mode_exited = False

    return fake_torch


class _FakeModel:
    """Minimal TransKun model stub."""

    fs = 44100
    _transcribe_device = None

    def transcribe(self, x, stepInSecond, segmentSizeInSecond, discardSecondHalf):
        _FakeModel._transcribe_device = getattr(x, "device_arg", None)

        # Return one raw note (positive pitch → note event) and no CC events.
        class _N:
            pass

        n = _N()
        n.pitch = 60
        n.start = 0.0
        n.end = 0.5
        n.velocity = 80
        return [n]


def _make_fake_audio_stack():
    """Return fake pydub, soxr, numpy that avoid real file I/O."""
    import types

    import numpy as np

    # pydub stub
    fake_pydub = types.ModuleType("pydub")

    class _FakeSeg:
        frame_rate = 44100
        channels = 1

        def get_array_of_samples(self):
            return np.zeros(100, dtype=np.int16).tolist()

    class _FakeAudioSegment:
        @staticmethod
        def from_file(path):
            return _FakeSeg()

    fake_pydub.AudioSegment = _FakeAudioSegment

    # soxr stub (no resample needed since fs matches)
    fake_soxr = types.ModuleType("soxr")
    fake_soxr.resample = lambda y, in_rate, out_rate: y

    return fake_pydub, fake_soxr, np


def test_run_model_selects_cuda_when_available(monkeypatch, reset_tk_model_cache):
    """When torch.cuda.is_available() is True, _run_model must call _get_model('cuda')."""
    import sys

    fake_torch = _make_fake_torch(cuda_available=True)
    fake_pydub, fake_soxr, np = _make_fake_audio_stack()

    # Record which device _get_model is called with.
    devices_requested = []
    model = _FakeModel()

    def _fake_get_model(device):
        devices_requested.append(device)
        return model

    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "numpy", np)
    monkeypatch.setitem(sys.modules, "pydub", fake_pydub)
    monkeypatch.setitem(sys.modules, "soxr", fake_soxr)
    monkeypatch.setattr(tk_module, "_get_model", _fake_get_model)

    # Also stub estimate_tempo_from_array to avoid real librosa import.
    import pianoflow_music.transcription.beat as beat_module

    monkeypatch.setattr(beat_module, "estimate_tempo_from_array", lambda y, fs: 120.0)

    engine = TranskunEngine()
    # Call _run_model directly; we need a real-enough path (string only — no file read).
    engine._run_model("fake_path.wav")

    assert devices_requested == ["cuda"], (
        f"Expected _get_model called with 'cuda', got {devices_requested}"
    )


def test_run_model_selects_cpu_when_cuda_unavailable(monkeypatch, reset_tk_model_cache):
    """When torch.cuda.is_available() is False, _run_model must call _get_model('cpu')."""
    import sys

    fake_torch = _make_fake_torch(cuda_available=False)
    fake_pydub, fake_soxr, np = _make_fake_audio_stack()

    devices_requested = []
    model = _FakeModel()

    def _fake_get_model(device):
        devices_requested.append(device)
        return model

    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "numpy", np)
    monkeypatch.setitem(sys.modules, "pydub", fake_pydub)
    monkeypatch.setitem(sys.modules, "soxr", fake_soxr)
    monkeypatch.setattr(tk_module, "_get_model", _fake_get_model)

    import pianoflow_music.transcription.beat as beat_module

    monkeypatch.setattr(beat_module, "estimate_tempo_from_array", lambda y, fs: 120.0)

    engine = TranskunEngine()
    engine._run_model("fake_path.wav")

    assert devices_requested == ["cpu"], (
        f"Expected _get_model called with 'cpu', got {devices_requested}"
    )


def test_run_model_uses_inference_mode_context(monkeypatch, reset_tk_model_cache):
    """model.transcribe(...) must be called inside torch.inference_mode() context."""
    import sys

    fake_torch = _make_fake_torch(cuda_available=False)
    fake_pydub, fake_soxr, np = _make_fake_audio_stack()

    # Track whether inference_mode was active when transcribe() ran.
    transcribe_saw_inference_mode = []

    class _TrackingModel(_FakeModel):
        def transcribe(self, x, stepInSecond, segmentSizeInSecond, discardSecondHalf):
            transcribe_saw_inference_mode.append(fake_torch._inference_mode_entered)
            return super().transcribe(x, stepInSecond, segmentSizeInSecond, discardSecondHalf)

    def _fake_get_model(device):
        return _TrackingModel()

    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "numpy", np)
    monkeypatch.setitem(sys.modules, "pydub", fake_pydub)
    monkeypatch.setitem(sys.modules, "soxr", fake_soxr)
    monkeypatch.setattr(tk_module, "_get_model", _fake_get_model)

    import pianoflow_music.transcription.beat as beat_module

    monkeypatch.setattr(beat_module, "estimate_tempo_from_array", lambda y, fs: 120.0)

    engine = TranskunEngine()
    engine._run_model("fake_path.wav")

    assert transcribe_saw_inference_mode == [True], (
        "model.transcribe() must run inside torch.inference_mode() — flag was not set"
    )
    assert fake_torch._inference_mode_exited is True, (
        "torch.inference_mode() context must have been exited after inference"
    )


def test_run_model_tensor_moved_to_selected_device(monkeypatch, reset_tk_model_cache):
    """The input tensor must be moved to the same device as the model (cuda when available)."""
    import sys

    fake_torch = _make_fake_torch(cuda_available=True)
    fake_pydub, fake_soxr, np = _make_fake_audio_stack()

    class _RecordingModel(_FakeModel):
        last_tensor_device = None

        def transcribe(self, x, stepInSecond, segmentSizeInSecond, discardSecondHalf):
            _RecordingModel.last_tensor_device = getattr(x, "device_arg", None)
            return super().transcribe(x, stepInSecond, segmentSizeInSecond, discardSecondHalf)

    def _fake_get_model(device):
        return _RecordingModel()

    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "numpy", np)
    monkeypatch.setitem(sys.modules, "pydub", fake_pydub)
    monkeypatch.setitem(sys.modules, "soxr", fake_soxr)
    monkeypatch.setattr(tk_module, "_get_model", _fake_get_model)

    import pianoflow_music.transcription.beat as beat_module

    monkeypatch.setattr(beat_module, "estimate_tempo_from_array", lambda y, fs: 120.0)

    engine = TranskunEngine()
    engine._run_model("fake_path.wav")

    assert _RecordingModel.last_tensor_device == "cuda", (
        f"Expected tensor on 'cuda', got {_RecordingModel.last_tensor_device}"
    )
