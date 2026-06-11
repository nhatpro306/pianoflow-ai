"""TranscriptionEngine port.

music-core is pure (no I/O), so engines consume audio bytes and return
bytes/dicts; the worker maps results onto storage keys and DB rows. This is
the in-process equivalent of the path-based contract in docs 09 §6.
"""

from dataclasses import dataclass, field
from typing import Protocol

from pianoflow_music.notes.model import NoteData


class TranscriptionError(Exception):
    """Engine-boundary error — engine internals never leak past it."""

    def __init__(self, message: str, code: str = "TRANSCRIPTION_FAILED") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass(frozen=True)
class TranscriptionResult:
    status: str  # "completed" | "failed"
    engine: str
    duration_seconds: float
    draft_midi_bytes: bytes
    notes: NoteData
    confidence: dict = field(default_factory=dict)
    report: dict = field(default_factory=dict)


class TranscriptionEngine(Protocol):
    name: str

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult: ...


def get_engine(name: str = "placeholder") -> TranscriptionEngine:
    """Engine factory. Real engines (Basic Pitch, MT3, external API) register
    here behind the same interface — product code never imports them directly."""
    if name in ("placeholder", "default"):
        from pianoflow_music.transcription.placeholder import PlaceholderDeterministicEngine

        return PlaceholderDeterministicEngine()
    raise TranscriptionError(f"Unknown transcription engine: {name!r}", code="UNKNOWN_ENGINE")
