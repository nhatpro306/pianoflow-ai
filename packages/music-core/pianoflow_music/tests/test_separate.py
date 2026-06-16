"""Tests for separate_target_stem (Demucs wrapper).

``demucs`` and ``torch`` are NOT installed in the test environment.
All tests monkeypatch the internal seam so the heavy models are never
downloaded or executed in CI.

Monkeypatch strategy
--------------------
``separate_target_stem`` defers its imports inside the function body.
Tests inject fake ``demucs.pretrained``, ``demucs.apply``, ``demucs.audio``,
and ``torch`` modules into ``sys.modules`` before calling the function, which
satisfies the ``try/except ImportError`` guard without touching real packages.
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

_HTDEMUCS_SOURCES = ["drums", "bass", "other", "vocals", "guitar", "piano"]


def _make_fake_torch(*, cuda_available: bool = False) -> types.ModuleType:
    """Build a minimal fake ``torch`` module for sys.modules injection."""
    torch_mod = types.ModuleType("torch")

    cuda_mod = types.ModuleType("torch.cuda")

    class _FakeOOM(Exception):
        """Fake torch.cuda.OutOfMemoryError."""

    cuda_mod.OutOfMemoryError = _FakeOOM
    cuda_mod.is_available = MagicMock(return_value=cuda_available)

    torch_mod.cuda = cuda_mod
    torch_mod.Tensor = MagicMock  # simple placeholder

    return torch_mod


def _make_fake_model(*, sources: list[str] = _HTDEMUCS_SOURCES) -> MagicMock:
    """Build a fake htdemucs model object."""
    model = MagicMock(name="htdemucs_model")
    model.sources = sources
    model.samplerate = 44100
    model.audio_channels = 2
    model.eval = MagicMock(return_value=None)
    model.to = MagicMock(return_value=model)
    return model


def _make_fake_demucs_modules(
    fake_wav_bytes: bytes = _FAKE_WAV_BYTES,
    *,
    apply_model_side_effect=None,
    model: MagicMock | None = None,
) -> dict[str, types.ModuleType]:
    """Build fake demucs.pretrained, demucs.apply, demucs.audio modules.

    Returns a dict mapping module name → module, ready for sys.modules injection.
    """
    if model is None:
        model = _make_fake_model()

    demucs_top = types.ModuleType("demucs")

    # demucs.pretrained
    demucs_pretrained = types.ModuleType("demucs.pretrained")
    demucs_pretrained.get_model = MagicMock(return_value=model)

    # demucs.apply — apply_model returns sources[0] indexable object
    demucs_apply = types.ModuleType("demucs.apply")
    if apply_model_side_effect is not None:
        demucs_apply.apply_model = MagicMock(side_effect=apply_model_side_effect)
    else:
        # Default: return a MagicMock that supports [0] and further indexing.
        # The real code does: apply_model(...)[0], then sources * ref.std() + ref.mean(),
        # then sources[stem_index]. MagicMock handles all of these automatically.
        demucs_apply.apply_model = MagicMock(return_value=MagicMock(name="apply_result"))

    # demucs.audio — AudioFile and save_audio
    demucs_audio = types.ModuleType("demucs.audio")

    audio_file_instance = MagicMock(name="AudioFile_instance")
    # read() returns a MagicMock that supports .mean(0), arithmetic, and [None] indexing
    audio_file_instance.read = MagicMock(return_value=MagicMock(name="wav_tensor"))

    AudioFileMock = MagicMock(name="AudioFile", return_value=audio_file_instance)
    demucs_audio.AudioFile = AudioFileMock

    def _fake_save_audio(tensor, path: str, *, samplerate: int = 44100) -> None:
        with open(path, "wb") as fh:
            fh.write(fake_wav_bytes)

    demucs_audio.save_audio = _fake_save_audio

    demucs_top.pretrained = demucs_pretrained
    demucs_top.apply = demucs_apply
    demucs_top.audio = demucs_audio

    return {
        "demucs": demucs_top,
        "demucs.pretrained": demucs_pretrained,
        "demucs.apply": demucs_apply,
        "demucs.audio": demucs_audio,
    }


_DEMUCS_MODULE_KEYS = (
    "demucs",
    "demucs.pretrained",
    "demucs.apply",
    "demucs.audio",
    "torch",
    "torch.cuda",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=False)
def clean_demucs_modules():
    """Ensure demucs / torch are not lingering in sys.modules between tests."""
    for key in list(sys.modules):
        if key in _DEMUCS_MODULE_KEYS:
            del sys.modules[key]
    yield
    for key in list(sys.modules):
        if key in _DEMUCS_MODULE_KEYS:
            del sys.modules[key]


def _inject_modules(torch_mod: types.ModuleType, demucs_mods: dict[str, types.ModuleType]) -> None:
    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    for name, mod in demucs_mods.items():
        sys.modules[name] = mod


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------


def test_success_returns_bytes(clean_demucs_modules):
    """Happy path: function returns the WAV bytes written by save_audio."""
    torch_mod = _make_fake_torch()
    demucs_mods = _make_fake_demucs_modules(fake_wav_bytes=_FAKE_WAV_BYTES)
    _inject_modules(torch_mod, demucs_mods)

    result = separate_target_stem(b"fake_audio_input", stem="other", segment=7)

    assert isinstance(result, bytes)
    assert len(result) > 0
    assert result == _FAKE_WAV_BYTES


def test_success_with_custom_stem(clean_demucs_modules):
    """Custom stem name is forwarded to the separator correctly."""
    torch_mod = _make_fake_torch()
    # "vocals" must be in model.sources — it is (default list includes it)
    demucs_mods = _make_fake_demucs_modules()
    _inject_modules(torch_mod, demucs_mods)

    result = separate_target_stem(b"fake_audio", stem="vocals")

    assert isinstance(result, bytes)


# ---------------------------------------------------------------------------
# ENGINE_UNAVAILABLE — demucs not installed
# ---------------------------------------------------------------------------


def test_engine_unavailable_when_demucs_missing(clean_demucs_modules):
    """If demucs cannot be imported, ENGINE_UNAVAILABLE must be raised."""
    # Ensure demucs/torch are NOT in sys.modules so imports inside the function fail.
    for key in _DEMUCS_MODULE_KEYS:
        sys.modules.pop(key, None)

    original_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__

    def _fake_import(name, *args, **kwargs):
        if name in ("demucs", "demucs.pretrained", "demucs.apply", "demucs.audio", "torch"):
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
        if name in ("demucs", "demucs.pretrained", "demucs.apply", "demucs.audio", "torch"):
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
    """A generic runtime error from apply_model maps to SEPARATION_FAILED."""
    torch_mod = _make_fake_torch()
    demucs_mods = _make_fake_demucs_modules(
        apply_model_side_effect=RuntimeError("demucs model exploded")
    )
    _inject_modules(torch_mod, demucs_mods)

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"bad_audio", stem="other")

    assert exc_info.value.code == "SEPARATION_FAILED"


def test_separation_failed_on_invalid_stem(clean_demucs_modules):
    """Requesting a stem that no model produces → SEPARATION_FAILED."""
    torch_mod = _make_fake_torch()
    demucs_mods = _make_fake_demucs_modules()
    _inject_modules(torch_mod, demucs_mods)

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"audio", stem="keys")  # "keys" is not a valid stem

    assert exc_info.value.code == "SEPARATION_FAILED"


# ---------------------------------------------------------------------------
# OOM → CPU fallback
# ---------------------------------------------------------------------------


def test_oom_falls_back_to_cpu(clean_demucs_modules):
    """torch.cuda.OutOfMemoryError on the first call must trigger a CPU retry."""
    torch_mod = _make_fake_torch(cuda_available=True)

    call_log: list[str] = []

    def _apply_model_side_effect(model, wav, device, segment, overlap, progress):
        call_log.append(device)
        if device == "cuda":
            raise torch_mod.cuda.OutOfMemoryError("fake OOM")
        # CPU attempt succeeds — return a MagicMock supporting [0] and indexing.
        return MagicMock(name="apply_result_cpu")

    fake_wav_bytes_local = _FAKE_WAV_BYTES

    demucs_top = types.ModuleType("demucs")
    demucs_pretrained = types.ModuleType("demucs.pretrained")
    fake_model = _make_fake_model()
    demucs_pretrained.get_model = MagicMock(return_value=fake_model)

    demucs_apply = types.ModuleType("demucs.apply")
    demucs_apply.apply_model = _apply_model_side_effect

    demucs_audio = types.ModuleType("demucs.audio")
    audio_file_instance = MagicMock(name="AudioFile_instance")
    audio_file_instance.read = MagicMock(return_value=MagicMock(name="wav_tensor"))
    demucs_audio.AudioFile = MagicMock(return_value=audio_file_instance)

    def _fake_save_audio(tensor, path: str, *, samplerate: int = 44100) -> None:
        with open(path, "wb") as fh:
            fh.write(fake_wav_bytes_local)

    demucs_audio.save_audio = _fake_save_audio

    demucs_top.pretrained = demucs_pretrained
    demucs_top.apply = demucs_apply
    demucs_top.audio = demucs_audio

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.pretrained"] = demucs_pretrained
    sys.modules["demucs.apply"] = demucs_apply
    sys.modules["demucs.audio"] = demucs_audio

    result = separate_target_stem(b"audio", stem="other")

    # Both GPU and CPU paths must have been attempted in that order.
    assert call_log == ["cuda", "cpu"], f"Unexpected call order: {call_log}"
    assert isinstance(result, bytes)
    assert result == _FAKE_WAV_BYTES


def test_oom_cpu_fallback_also_fails_raises_separation_failed(clean_demucs_modules):
    """If both GPU and CPU paths fail, SEPARATION_FAILED must be raised."""
    torch_mod = _make_fake_torch(cuda_available=True)

    def _apply_model_side_effect(model, wav, device, segment, overlap, progress):
        if device == "cuda":
            raise torch_mod.cuda.OutOfMemoryError("GPU OOM")
        raise RuntimeError("CPU also out of memory somehow")

    demucs_top = types.ModuleType("demucs")
    demucs_pretrained = types.ModuleType("demucs.pretrained")
    fake_model = _make_fake_model()
    demucs_pretrained.get_model = MagicMock(return_value=fake_model)

    demucs_apply = types.ModuleType("demucs.apply")
    demucs_apply.apply_model = _apply_model_side_effect

    demucs_audio = types.ModuleType("demucs.audio")
    audio_file_instance = MagicMock(name="AudioFile_instance")
    audio_file_instance.read = MagicMock(return_value=MagicMock(name="wav_tensor"))
    demucs_audio.AudioFile = MagicMock(return_value=audio_file_instance)
    demucs_audio.save_audio = MagicMock()

    demucs_top.pretrained = demucs_pretrained
    demucs_top.apply = demucs_apply
    demucs_top.audio = demucs_audio

    sys.modules["torch"] = torch_mod
    sys.modules["torch.cuda"] = torch_mod.cuda
    sys.modules["demucs"] = demucs_top
    sys.modules["demucs.pretrained"] = demucs_pretrained
    sys.modules["demucs.apply"] = demucs_apply
    sys.modules["demucs.audio"] = demucs_audio

    with pytest.raises(TranscriptionError) as exc_info:
        separate_target_stem(b"audio", stem="other")

    assert exc_info.value.code == "SEPARATION_FAILED"


# ---------------------------------------------------------------------------
# Model auto-selection
# ---------------------------------------------------------------------------


def _make_demucs_mods_with_get_model_log(
    call_log: list[str],
) -> dict[str, types.ModuleType]:
    """Build fake demucs modules whose get_model records the model name called."""
    model = _make_fake_model()

    def _get_model(name: str):
        call_log.append(name)
        return model

    demucs_top = types.ModuleType("demucs")
    demucs_pretrained = types.ModuleType("demucs.pretrained")
    demucs_pretrained.get_model = _get_model

    demucs_apply = types.ModuleType("demucs.apply")
    demucs_apply.apply_model = MagicMock(return_value=MagicMock(name="apply_result"))

    demucs_audio = types.ModuleType("demucs.audio")
    audio_file_instance = MagicMock(name="AudioFile_instance")
    audio_file_instance.read = MagicMock(return_value=MagicMock(name="wav_tensor"))
    demucs_audio.AudioFile = MagicMock(return_value=audio_file_instance)

    def _fake_save(tensor, path: str, *, samplerate: int = 44100) -> None:
        with open(path, "wb") as fh:
            fh.write(_FAKE_WAV_BYTES)

    demucs_audio.save_audio = _fake_save

    demucs_top.pretrained = demucs_pretrained
    demucs_top.apply = demucs_apply
    demucs_top.audio = demucs_audio

    return {
        "demucs": demucs_top,
        "demucs.pretrained": demucs_pretrained,
        "demucs.apply": demucs_apply,
        "demucs.audio": demucs_audio,
    }


def test_piano_stem_autoselects_6s_model(clean_demucs_modules):
    """stem='piano' with no explicit model must call get_model('htdemucs_6s')."""
    call_log: list[str] = []
    torch_mod = _make_fake_torch()
    demucs_mods = _make_demucs_mods_with_get_model_log(call_log)
    _inject_modules(torch_mod, demucs_mods)

    separate_target_stem(b"fake_audio", stem="piano")

    assert call_log == ["htdemucs_6s"], f"Expected htdemucs_6s, got: {call_log}"


def test_other_stem_uses_default_model(clean_demucs_modules):
    """stem='other' with no explicit model must call get_model('htdemucs')."""
    call_log: list[str] = []
    torch_mod = _make_fake_torch()
    demucs_mods = _make_demucs_mods_with_get_model_log(call_log)
    _inject_modules(torch_mod, demucs_mods)

    separate_target_stem(b"fake_audio", stem="other")

    assert call_log == ["htdemucs"], f"Expected htdemucs, got: {call_log}"


def test_explicit_model_overrides_autoselect(clean_demucs_modules):
    """Passing model='htdemucs' must be used even when stem='piano'."""
    call_log: list[str] = []
    torch_mod = _make_fake_torch()
    # Use the 6-stem model object so 'piano' is in sources, but we expect
    # get_model to be called with the explicit override 'htdemucs'.
    demucs_mods = _make_demucs_mods_with_get_model_log(call_log)
    # The fake model already has 'piano' in sources (from _HTDEMUCS_SOURCES), but
    # we expect a SEPARATION_FAILED because real htdemucs doesn't have piano.
    # Here we just care that get_model was called with the explicit name.
    _inject_modules(torch_mod, demucs_mods)

    # This will succeed (fake model has piano in sources) — we only assert the
    # model name that was requested.
    separate_target_stem(b"fake_audio", stem="piano", model="htdemucs")

    assert call_log == ["htdemucs"], f"Expected htdemucs explicit override, got: {call_log}"
