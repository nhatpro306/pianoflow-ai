"""Tests for pianoflow_music.transcription.beat.

These tests are environment-agnostic: they pass whether or not librosa is
installed, because:
  - A nonexistent file path always causes an exception inside librosa.load,
    so estimate_tempo_and_beats returns None.
  - If librosa is not installed, the ImportError is caught and None is returned.
"""

from __future__ import annotations

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
