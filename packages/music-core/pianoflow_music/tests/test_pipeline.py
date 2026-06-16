"""Tests for the pipeline orchestrator (run_pipeline).

All tests use injected fakes — no real models or I/O.
"""

from __future__ import annotations

from pianoflow_music.notes.model import NoteData
from pianoflow_music.transcription.engine import TranscriptionResult
from pianoflow_music.transcription.pipeline import run_pipeline

# ---------------------------------------------------------------------------
# Helpers / fakes
# ---------------------------------------------------------------------------

_ORIGINAL_AUDIO = b"original_audio"
_SEPARATED_AUDIO = b"separated_audio"


def _make_result(engine_name: str = "fake") -> TranscriptionResult:
    """Build a minimal TranscriptionResult for assertion purposes."""
    return TranscriptionResult(
        status="completed",
        engine=engine_name,
        duration_seconds=1.0,
        draft_midi_bytes=b"MIDI",
        notes=NoteData(
            schema_version=2,
            bpm=120.0,
            duration_sec=1.0,
            time_signature="4/4",
            notes=[],
            sustain=[],
        ),
    )


class _FakeSeparator:
    """Records calls and returns a fixed bytes value."""

    def __init__(self, output: bytes = _SEPARATED_AUDIO) -> None:
        self.calls: list[dict] = []
        self._output = output

    def __call__(self, audio_bytes: bytes, *, stem: str = "other") -> bytes:
        self.calls.append({"audio_bytes": audio_bytes, "stem": stem})
        return self._output


class _FakeEngine:
    """Records the audio bytes it received and returns a fixed result."""

    def __init__(self, result: TranscriptionResult | None = None) -> None:
        self.transcribe_calls: list[dict] = []
        self._result = result or _make_result()

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        self.transcribe_calls.append({"audio_bytes": audio_bytes, "options": options})
        return self._result


class _FakeEngineFactory:
    """Returns a _FakeEngine; records which engine name was requested."""

    def __init__(self, engine: _FakeEngine | None = None) -> None:
        self._engine = engine or _FakeEngine()
        self.requested_names: list[str] = []

    def __call__(self, name: str) -> _FakeEngine:
        self.requested_names.append(name)
        return self._engine

    @property
    def engine(self) -> _FakeEngine:
        return self._engine


# ---------------------------------------------------------------------------
# Tests — separate=False (default)
# ---------------------------------------------------------------------------


def test_no_separation_by_default():
    """Separator must NOT be called when separate=False."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, _separator=sep, _engine_factory=factory)

    assert sep.calls == [], "Separator must not be called when separate=False"


def test_engine_receives_original_audio_when_no_separation():
    """Engine must receive the original audio bytes when separation is off."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=False, _separator=sep, _engine_factory=factory)

    assert factory.engine.transcribe_calls[0]["audio_bytes"] == _ORIGINAL_AUDIO


def test_result_returned_unchanged_without_separation():
    """run_pipeline must return the TranscriptionResult exactly as-is."""
    expected = _make_result("my_engine")
    factory = _FakeEngineFactory(_FakeEngine(result=expected))

    result = run_pipeline(_ORIGINAL_AUDIO, _engine_factory=factory)

    assert result is expected


# ---------------------------------------------------------------------------
# Tests — separate=True
# ---------------------------------------------------------------------------


def test_separator_called_when_separate_true():
    """Separator must be called exactly once when separate=True."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    assert len(sep.calls) == 1, "Separator must be called exactly once"


def test_separator_receives_original_audio():
    """Separator's first argument must be the original audio bytes."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    assert sep.calls[0]["audio_bytes"] == _ORIGINAL_AUDIO


def test_engine_receives_separated_audio():
    """Engine must receive the separator's output, NOT the original audio."""
    sep = _FakeSeparator(output=_SEPARATED_AUDIO)
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    engine_input = factory.engine.transcribe_calls[0]["audio_bytes"]
    assert engine_input == _SEPARATED_AUDIO, (
        f"Engine should receive separated audio {_SEPARATED_AUDIO!r}, got {engine_input!r}"
    )


def test_engine_does_not_receive_original_audio_when_separated():
    """Engine must NOT receive the original audio when separation ran."""
    sep = _FakeSeparator(output=_SEPARATED_AUDIO)
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    engine_input = factory.engine.transcribe_calls[0]["audio_bytes"]
    assert engine_input != _ORIGINAL_AUDIO, "Engine must not see original audio after separation"


def test_separator_called_before_engine():
    """Verify ordering: separator must run before engine.

    We achieve this by making the separator raise if the engine has already
    been called — which can never happen in the correct implementation.
    """
    call_order: list[str] = []

    class _OrderedSep:
        def __call__(self, audio_bytes: bytes, *, stem: str = "other") -> bytes:
            assert call_order == [], "Separator must be called before the engine"
            call_order.append("separator")
            return _SEPARATED_AUDIO

    class _OrderedEngine:
        def transcribe(
            self,
            audio_bytes: bytes,
            *,
            filename: str = "",
            options: dict | None = None,
        ) -> TranscriptionResult:
            assert call_order == ["separator"], "Engine must be called after the separator"
            call_order.append("engine")
            return _make_result()

    run_pipeline(
        _ORIGINAL_AUDIO,
        separate=True,
        _separator=_OrderedSep(),
        _engine_factory=lambda _: _OrderedEngine(),
    )

    assert call_order == ["separator", "engine"]


def test_result_returned_unchanged_with_separation():
    """run_pipeline must return the TranscriptionResult as-is after separation."""
    expected = _make_result("transkun")
    sep = _FakeSeparator()
    factory = _FakeEngineFactory(_FakeEngine(result=expected))

    result = run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    assert result is expected


# ---------------------------------------------------------------------------
# Tests — stem option forwarding
# ---------------------------------------------------------------------------


def test_default_stem_is_other():
    """Without options, separator must be called with stem='other'."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, separate=True, _separator=sep, _engine_factory=factory)

    assert sep.calls[0]["stem"] == "other"


def test_custom_stem_forwarded():
    """options['stem'] must be forwarded to the separator."""
    sep = _FakeSeparator()
    factory = _FakeEngineFactory()

    run_pipeline(
        _ORIGINAL_AUDIO,
        separate=True,
        options={"stem": "piano"},
        _separator=sep,
        _engine_factory=factory,
    )

    assert sep.calls[0]["stem"] == "piano"


# ---------------------------------------------------------------------------
# Tests — engine name forwarding
# ---------------------------------------------------------------------------


def test_engine_name_forwarded_to_factory():
    """The engine name must be passed to the engine factory."""
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, engine="basic_pitch", _engine_factory=factory)

    assert factory.requested_names == ["basic_pitch"]


def test_default_engine_is_transkun():
    """Default engine name must be 'transkun'."""
    factory = _FakeEngineFactory()

    run_pipeline(_ORIGINAL_AUDIO, _engine_factory=factory)

    assert factory.requested_names == ["transkun"]
