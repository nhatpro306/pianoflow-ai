"""Tests for separate_target_stem (Demucs wrapper).

``demucs`` and ``torch`` are NOT installed in the test environment.
All tests monkeypatch the internal seam so the heavy models are never
downloaded or executed in CI.

Monkeypatch strategy
--------------------
``separate_target_stem`` defers its imports inside the function body.
Tests inject fake ``demucs`` and ``torch`` modules into ``sys.modules``
before calling the function, which satisfies the ``try/except ImportError``
guard without touching real packages.
"""

from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock, patch

import pytest

from pianoflow_music.transcription.engine import TranscriptionError
from pianoflow_music.transcription.separate import separate_target_stem

# ---------------------------------------------------------------------------
# Helpers — fake module builders
# ---------------------------------------------------------------------------

_FAKE_WAV_BYTES = b"RIFF....WAVEfmt " + b"\x00" * 100  # minimal fake WAV


def _make_fake_torch(*, raise_oom: bool = False) -> types.ModuleType:
    """Build a minimal fake ``torch`` module for sys.modules injection."""
    torch_mod = types.ModuleType("torch")

    cuda_mod = types.ModuleType("torch.cuda")

    class _FakeOOM(Exception):
        """Fake torch.cuda.OutOfMemoryError."""

    cuda_mod.OutOfMemoryError = _FakeOOM
    cuda_mod.is_available = MagicMock(return_value=False)  # default: no GPU

    torch_mod.cuda = cuda_mod
    torch_mod.Tensor = MagicMock  # simple placeholder

    return torch_mod


def _make_fake_demucs(
    fake_wav_bytes: bytes = _FAKE_WAV_BYTES,
    *,
    stem_key: str = "other",
    raise_on_separate: Exception | None = None,
) -> types.ModuleType:
    """Build a minimal fake ``demucs.api`` module."""
    demucs_top = types.ModuleType("demucs")
    demucs_api = types.ModuleType("demucs.api")

    stem_tensor = MagicMock(name="stem_tensor")

    class _FakeSeparator:
        def __init__(self, **kwargs):
            self._kwargs = kwargs

        def separate_audio_file(self, path: str):
            if raise_on_separate is not None:
                raise raise_on_separate
            return (MagicMock(name="origin"), {stem_key: stem_tensor})

    demucs_api.Separator = _FakeSeparator

    def _fake_save_audio(tensor, path: str, *, samplerate: int = 44100) -> None:
        # Write fake WAV content to the output path.
        with open(path, "wb") as fh:
            fh.write(fake_wav_bytes)

    demucs_api.save_audio = _fake_save_audio

    demucs_top.api = demucs_api
    return demucs_top, demucs_api


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=False)
def clean_demucs_modules():
    """Ensure demucs / torch are not lingering in sys.modules between tests."""
    for key in list(sys.modules):
        if key in ("demucs", "demucs.api", "torch", "torch.cuda"):
            del sys.modules[key]
    yield
    for key in list(sys.modules):
        if key in ("demucs", "demucs.api", "torch", "torch.cuda"):
            del sys.modules[key]


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------


def test_success_returns_bytes(clean_demucs_modules):
    """Happy path: function returns the WAV bytes written by save_audio."""
    torch_mod = _make_fake_torch()
    demucs_top, demucs_api = _make_fake_demucs(fake_wav_bytes=_FAKE_WAV_BYTES)

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    result = separate_target_stem(b"fake_audio_input", stem="other", segment=7)

    assert isinstance(result, bytes)
    assert len(result) > 0
    assert result == _FAKE_WAV_BYTES


def test_success_with_custom_stem(clean_demucs_modules):
    """Custom stem name is forwarded to the separator correctly."""
    torch_mod = _make_fake_torch()
    demucs_top, demucs_api = _make_fake_demucs(stem_key="vocals")

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    result = separate_target_stem(b"fake_audio", stem="vocals")

    assert isinstance(result, bytes)


# ---------------------------------------------------------------------------
# ENGINE_UNAVAILABLE — demucs not installed
# ---------------------------------------------------------------------------


def test_engine_unavailable_when_demucs_missing(clean_demucs_modules):
    """If demucs cannot be imported, ENGINE_UNAVAILABLE must be raised."""
    # Ensure demucs is NOT in sys.modules so the import inside the function
    # naturally fails via ImportError.
    sys.modules.pop("demucs", None)
    sys.modules.pop("demucs.api", None)
    # Also make torch unavailable to ensure the ImportError path is hit first.
    sys.modules.pop("torch", None)
    sys.modules.pop("torch.cuda", None)

    # Patch builtins.__import__ would be complex; instead we patch the module
    # lookup so that "import demucs.api" raises ImportError.
    original_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__

    def _fake_import(name, *args, **kwargs):
        if name in ("demucs", "demucs.api", "torch"):
            raise ImportError(f"No module named '{name}'")
        return original_import(name, *args, **kwargs)

    with (
        patch("builtins.__import__", side_effect=_fake_import),
        pytest.raises(TranscriptionError) as exc_info,
    ):
        separate_target_stem(b"audio", stem="other")

    assert exc_info.value.code == "ENGINE_UNAVAILABLE"


def test_engine_unavailable_import_error_message(clean_demucs_modules):
    """ENGINE_UNAVAILABLE message must mention the 'separation' extra."""

    def _fake_import(name, *args, **kwargs):
        if name in ("demucs", "demucs.api", "torch"):
            raise ImportError(f"No module named '{name}'")
        if hasattr(__builtins__, "__import__"):
            return __builtins__.__import__(name, *args, **kwargs)
        return __import__(name, *args, **kwargs)

    with (
        patch("builtins.__import__", side_effect=_fake_import),
        pytest.raises(TranscriptionError) as exc_info,
    ):
        separate_target_stem(b"audio")

    assert "separation" in exc_info.value.message.lower()
    assert exc_info.value.code == "ENGINE_UNAVAILABLE"


# ---------------------------------------------------------------------------
# SEPARATION_FAILED — demucs runtime error
# ---------------------------------------------------------------------------


def test_separation_failed_on_demucs_runtime_error(clean_demucs_modules):
    """A generic runtime error from demucs maps to SEPARATION_FAILED."""
    torch_mod = _make_fake_torch()
    demucs_top, demucs_api = _make_fake_demucs(
        raise_on_separate=RuntimeError("demucs model exploded")
    )

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"bad_audio", stem="other")

    assert exc_info.value.code == "SEPARATION_FAILED"


def test_separation_failed_on_invalid_stem(clean_demucs_modules):
    """Requesting a stem that htdemucs doesn't produce → SEPARATION_FAILED."""
    torch_mod = _make_fake_torch()
    # Fake separator only returns "other"; requesting "piano" should fail.
    demucs_top, demucs_api = _make_fake_demucs(stem_key="other")

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"audio", stem="piano")  # "piano" not in htdemucs

    assert exc_info.value.code == "SEPARATION_FAILED"


# ---------------------------------------------------------------------------
# OOM → CPU fallback
# ---------------------------------------------------------------------------


def test_oom_falls_back_to_cpu(clean_demucs_modules):
    """torch.cuda.OutOfMemoryError on the first call must trigger a CPU retry."""
    torch_mod = _make_fake_torch()

    # Make CUDA appear available so the first attempt uses it.
    torch_mod.cuda.is_available = MagicMock(return_value=True)

    call_log: list[str] = []

    class _OOMThenSucceedSeparator:
        def __init__(self, *, device: str, **kwargs):
            self._device = device

        def separate_audio_file(self, path: str):
            call_log.append(self._device)
            if self._device == "cuda":
                # Raise the fake OOM the first time (GPU attempt).
                raise torch_mod.cuda.OutOfMemoryError("fake OOM")
            # CPU attempt succeeds.
            stem_tensor = MagicMock(name="stem_tensor")
            return (MagicMock(name="origin"), {"other": stem_tensor})

    demucs_top = types.ModuleType("demucs")
    demucs_api = types.ModuleType("demucs.api")
    demucs_api.Separator = _OOMThenSucceedSeparator

    def _fake_save_audio(tensor, path: str, *, samplerate: int = 44100) -> None:
        with open(path, "wb") as fh:
            fh.write(_FAKE_WAV_BYTES)

    demucs_api.save_audio = _fake_save_audio
    demucs_top.api = demucs_api

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    result = separate_target_stem(b"audio", stem="other")

    # Both GPU and CPU paths must have been attempted in that order.
    assert call_log == ["cuda", "cpu"], f"Unexpected call order: {call_log}"
    assert isinstance(result, bytes)
    assert result == _FAKE_WAV_BYTES


def test_oom_cpu_fallback_also_fails_raises_separation_failed(clean_demucs_modules):
    """If both GPU and CPU paths fail, SEPARATION_FAILED must be raised."""
    torch_mod = _make_fake_torch()
    torch_mod.cuda.is_available = MagicMock(return_value=True)

    class _AlwaysOOMSeparator:
        def __init__(self, *, device: str, **kwargs):
            self._device = device

        def separate_audio_file(self, path: str):
            if self._device == "cuda":
                raise torch_mod.cuda.OutOfMemoryError("GPU OOM")
            # CPU attempt also fails.
            raise RuntimeError("CPU also out of memory somehow")

    demucs_top = types.ModuleType("demucs")
    demucs_api = types.ModuleType("demucs.api")
    demucs_api.Separator = _AlwaysOOMSeparator
    demucs_api.save_audio = MagicMock()
    demucs_top.api = demucs_api

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.api"] = demucs_api

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"audio", stem="other")

    assert exc_info.value.code == "SEPARATION_FAILED"
