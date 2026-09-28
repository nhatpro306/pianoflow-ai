"""Tests for pianoflow_music.transcription.beat.

These tests are environment-agnostic: they pass whether or not librosa is
installed, because:
  - A nonexistent file path always causes an exception inside librosa.load,
    so estimate_tempo_and_beats returns None.
  - If librosa is not installed, the ImportError is caught and None is returned.
"""

from __future__ import annotations

import sys
import types

import numpy as np
import pytest

from pianoflow_music.transcription.beat import estimate_tempo_and_beats


def test_nonexistent_path_returns_none():
    """A path that cannot be read must yield None, never raise."""
    result = estimate_tempo_and_beats("does_not_exist.wav")
    assert result is None


def test_return_type_is_none_or_valid_tuple():
    """If a result is returned it must be a (float, list) tuple."""
    result = estimate_tempo_and_beats("does_not_exist.wav")
    # For a bad path the result is always None in any environment.
    assert result is None or (
        isinstance(result, tuple)
        and len(result) == 2
        and isinstance(result[0], float)
        and isinstance(result[1], list)
    )


# ---------------------------------------------------------------------------
# Tests for the new estimate_tempo_from_array function
# ---------------------------------------------------------------------------


def test_estimate_tempo_from_array_returns_known_tempo(monkeypatch):
    """When librosa.beat.beat_track returns a known BPM, the function returns it as float."""
    # Build a minimal fake librosa module.
    fake_librosa = types.ModuleType("librosa")
    fake_librosa_beat = types.ModuleType("librosa.beat")

    def fake_beat_track(y, sr, units):
        # Return a scalar tempo and an empty beat array — matches librosa API.
        return np.float64(128.0), np.array([])

    fake_librosa_beat.beat_track = fake_beat_track
    fake_librosa.beat = fake_librosa_beat

    monkeypatch.setitem(sys.modules, "librosa", fake_librosa)
    monkeypatch.setitem(sys.modules, "librosa.beat", fake_librosa_beat)

    from pianoflow_music.transcription.beat import estimate_tempo_from_array

    y = np.zeros(44100, dtype=np.float32)
    result = estimate_tempo_from_array(y, 44100)

    assert isinstance(result, float)
    assert result == 128.0


def test_estimate_tempo_from_array_handles_array_tempo(monkeypatch):
    """When librosa returns a 1-element array for tempo, the scalar is extracted correctly."""
    fake_librosa = types.ModuleType("librosa")
    fake_librosa_beat = types.ModuleType("librosa.beat")

    def fake_beat_track(y, sr, units):
        # Some librosa versions return a 1-element array.
        return np.array([95.5]), np.array([])

    fake_librosa_beat.beat_track = fake_beat_track
    fake_librosa.beat = fake_librosa_beat

    monkeypatch.setitem(sys.modules, "librosa", fake_librosa)
    monkeypatch.setitem(sys.modules, "librosa.beat", fake_librosa_beat)

    from pianoflow_music.transcription.beat import estimate_tempo_from_array

    y = np.zeros(44100, dtype=np.float32)
    result = estimate_tempo_from_array(y, 44100)

    assert isinstance(result, float)
    assert result == pytest.approx(95.5)


def test_estimate_tempo_from_array_reduces_stereo_to_mono(monkeypatch):
    """2-D stereo arrays are reduced to mono before passing to librosa."""
    received_y = []

    fake_librosa = types.ModuleType("librosa")
    fake_librosa_beat = types.ModuleType("librosa.beat")

    def fake_beat_track(y, sr, units):
        received_y.append(y)
        return np.float64(110.0), np.array([])

    fake_librosa_beat.beat_track = fake_beat_track
    fake_librosa.beat = fake_librosa_beat

    monkeypatch.setitem(sys.modules, "librosa", fake_librosa)
    monkeypatch.setitem(sys.modules, "librosa.beat", fake_librosa_beat)

    from pianoflow_music.transcription.beat import estimate_tempo_from_array

    # Stereo: shape (N, 2)
    y_stereo = np.ones((44100, 2), dtype=np.float32)
    result = estimate_tempo_from_array(y_stereo, 44100)

    assert result == pytest.approx(110.0)
    # The array passed to librosa must be 1-D.
    assert received_y[0].ndim == 1


def test_estimate_tempo_from_array_returns_none_on_import_error(monkeypatch):
    """Returns None when librosa is not installed (ImportError)."""
    # Remove librosa from sys.modules so the deferred import fails.
    monkeypatch.setitem(sys.modules, "librosa", None)  # None forces ImportError on import
    monkeypatch.setitem(sys.modules, "librosa.beat", None)

    from pianoflow_music.transcription.beat import estimate_tempo_from_array

    y = np.zeros(100, dtype=np.float32)
    result = estimate_tempo_from_array(y, 22050)
    assert result is None


def test_estimate_tempo_from_array_returns_none_on_internal_exception(monkeypatch):
    """Returns None when librosa.beat.beat_track raises any exception."""
    fake_librosa = types.ModuleType("librosa")
    fake_librosa_beat = types.ModuleType("librosa.beat")

    def fake_beat_track(y, sr, units):
        raise RuntimeError("GPU OOM")

    fake_librosa_beat.beat_track = fake_beat_track
    fake_librosa.beat = fake_librosa_beat

    monkeypatch.setitem(sys.modules, "librosa", fake_librosa)
    monkeypatch.setitem(sys.modules, "librosa.beat", fake_librosa_beat)

    from pianoflow_music.transcription.beat import estimate_tempo_from_array

    y = np.zeros(100, dtype=np.float32)
    result = estimate_tempo_from_array(y, 22050)
    assert result is None
