"""Beat tracking via librosa — thin wrapper with deferred import.

librosa is an *optional* dependency (``transcription-beat`` extra).  If it
is not installed, :func:`estimate_tempo_and_beats` returns ``None`` instead
of raising, so callers degrade gracefully.
"""

from __future__ import annotations


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
