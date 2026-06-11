"""Audio → draft MIDI transcription (Beta).

Adapter boundary (09_AUDIO_TO_MIDI_PLAN §5-6): product code depends on
`TranscriptionEngine` only. Engines are swappable; the first shipped engine
is an honest deterministic placeholder, NOT real AI transcription.
"""

from pianoflow_music.transcription.engine import (
    TranscriptionEngine,
    TranscriptionError,
    TranscriptionResult,
    get_engine,
)
from pianoflow_music.transcription.placeholder import PlaceholderDeterministicEngine

__all__ = [
    "PlaceholderDeterministicEngine",
    "TranscriptionEngine",
    "TranscriptionError",
    "TranscriptionResult",
    "get_engine",
]
