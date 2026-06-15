"""Pipeline orchestrator: optional separation → transcription engine.

Chains source separation (optional) and a transcription engine into a single
callable.  Both dependencies are injected via keyword parameters so that tests
can substitute fakes without importing real models.
"""

from __future__ import annotations

from pianoflow_music.transcription.engine import TranscriptionResult


def run_pipeline(
    audio_bytes: bytes,
    *,
    engine: str = "transkun",
    separate: bool = False,
    options: dict | None = None,
    _separator=None,   # inject for tests
    _engine_factory=None,  # inject for tests
) -> TranscriptionResult:
    """Run the audio-to-MIDI transcription pipeline.

    Args:
        audio_bytes: Raw audio bytes to transcribe.
        engine: Engine name passed to ``get_engine()`` (default ``"transkun"``).
        separate: When ``True``, run source separation before transcription.
        options: Arbitrary options forwarded to both the separator and engine.
            ``options["stem"]`` controls which stem is extracted (default
            ``"other"``).
        _separator: Optional callable ``(bytes, *, stem: str) -> bytes`` that
            replaces ``separate_target_stem``.  Pass a fake here in tests.
        _engine_factory: Optional callable ``(engine_name: str) ->
            TranscriptionEngine`` that replaces ``get_engine``.  Pass a fake
            here in tests.

    Returns:
        The :class:`TranscriptionResult` produced by the engine, unchanged.
    """
    # ------------------------------------------------------------------
    # 1. Source separation (optional)
    # ------------------------------------------------------------------
    if separate:
        if _separator is None:
            from pianoflow_music.transcription.separate import separate_target_stem

            _separator = separate_target_stem

        stem = options.get("stem", "other") if options else "other"
        audio_bytes = _separator(audio_bytes, stem=stem)

    # ------------------------------------------------------------------
    # 2. Transcription
    # ------------------------------------------------------------------
    if _engine_factory is None:
        from pianoflow_music.transcription.engine import get_engine as _engine_factory

    transcription_engine = _engine_factory(engine)
    return transcription_engine.transcribe(audio_bytes, options=options)
