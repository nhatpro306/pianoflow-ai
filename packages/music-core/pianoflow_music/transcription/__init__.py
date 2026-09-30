"""Audio → draft MIDI transcription (Beta).

Adapter boundary (09_AUDIO_TO_MIDI_PLAN §5-6): product code depends on
`TranscriptionEngine` only. Engines are swappable; the first shipped engine
is an honest deterministic placeholder, NOT real AI transcription.
"""

from pianoflow_music.transcription.basic_pitch import BasicPitchEngine
from pianoflow_music.transcription.engine import (
    TranscriptionEngine,
    TranscriptionError,
    TranscriptionResult,
    get_engine,
)
from pianoflow_music.transcription.placeholder import PlaceholderDeterministicEngine
from pianoflow_music.transcription.transkun import TranskunEngine
from pianoflow_music.transcription.yourmt3 import YourMT3Engine

__all__ = [
    "BasicPitchEngine",
    "PlaceholderDeterministicEngine",
    "TranscriptionEngine",
    "TranscriptionError",
    "TranscriptionResult",
    "TranskunEngine",
    "YourMT3Engine",
    "get_engine",
]
