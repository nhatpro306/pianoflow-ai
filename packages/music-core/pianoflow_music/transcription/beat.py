"""Beat tracking via librosa — thin wrapper with deferred import.

librosa is an *optional* dependency (``transcription-beat`` extra).  If it
is not installed, :func:`estimate_tempo_and_beats` returns ``None`` instead
of raising, so callers degrade gracefully.
"""

from __future__ import annotations

import numpy as np


def estimate_tempo_and_beats(audio_path: str) -> tuple[float, list[float]] | None:
    """Estimate tempo (BPM) and beat positions from an audio file.

    Uses ``librosa.beat.beat_track`` internally.  librosa is imported
    **inside** this function so the module is cheap to import and the
    dependency is truly optional.

    Args:
        audio_path: Path to a readable audio file (WAV, MP3, …).

    Returns:
        ``(tempo_bpm, beat_times_seconds)`` on success, or ``None`` if
        librosa is not installed or any error occurs (including a file that
        cannot be decoded).
    """
    try:
        import librosa
    except ImportError:
        return None

    try:
        y, sr = librosa.load(audio_path)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="time")
        return (float(tempo), [float(t) for t in beat_frames])
    except Exception:
        return None


def estimate_tempo_from_array(y: np.ndarray, sr: int) -> float | None:
    """Estimate tempo (BPM) from a decoded mono/stereo audio array.

    Uses ``librosa.beat.beat_track`` internally.  librosa is imported
    **inside** this function so the module is cheap to import and the
    dependency is truly optional.

    If ``y`` is 2-D (stereo), it is reduced to mono by averaging across
    channels before being passed to librosa.

    Args:
        y: Audio samples as a NumPy array.  Shape ``(N,)`` for mono or
           ``(N, C)`` for multi-channel audio.
        sr: Sample rate of ``y`` in Hz.

    Returns:
        Tempo in BPM as a ``float`` on success, or ``None`` if librosa is
        not installed or any error occurs.
    """
    try:
        import librosa
    except ImportError:
        return None

    try:
        mono = y.mean(axis=1) if y.ndim == 2 else y
        tempo, _beat_frames = librosa.beat.beat_track(y=mono, sr=sr, units="time")
        # tempo may be a scalar or a 1-element array depending on librosa version.
        if hasattr(tempo, "__len__"):
            tempo = tempo[0]
        return float(tempo)
    except Exception:
        return None
