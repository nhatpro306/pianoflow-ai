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
