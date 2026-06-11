"""Structural validation of MIDI bytes before full parsing.

Never trust extension or Content-Type: check magic bytes and structure.
Limits guard against pathological files (RISKS.md T4).
"""

import io
from dataclasses import dataclass

import mido

from pianoflow_music.midi.errors import (
    EmptyMidiError,
    InvalidMidiError,
    TooLongError,
    TooManyNotesError,
)

MIDI_MAGIC = b"MThd"

DEFAULT_MAX_DURATION_SEC = 600.0
DEFAULT_MAX_NOTES = 50_000
DEFAULT_MAX_TRACKS = 32


@dataclass(frozen=True)
class ValidationResult:
    duration_sec: float
    track_count: int
    note_on_count: int


def validate_midi_bytes(
    data: bytes,
    *,
    max_duration_sec: float = DEFAULT_MAX_DURATION_SEC,
    max_notes: int = DEFAULT_MAX_NOTES,
    max_tracks: int = DEFAULT_MAX_TRACKS,
) -> ValidationResult:
    """Raise a MidiError subclass on any problem; return basic stats otherwise."""
    if not data.startswith(MIDI_MAGIC):
        raise InvalidMidiError("File is not a valid MIDI file (missing MThd header).")

    try:
        midi = mido.MidiFile(file=io.BytesIO(data))
    except Exception as exc:
        raise InvalidMidiError(f"MIDI file could not be parsed: {type(exc).__name__}") from exc

    if len(midi.tracks) == 0:
        raise EmptyMidiError("MIDI file contains no tracks.")
    if len(midi.tracks) > max_tracks:
        raise TooManyNotesError(f"MIDI file has {len(midi.tracks)} tracks (max {max_tracks}).")

    note_on_count = sum(
        1 for track in midi.tracks for msg in track if msg.type == "note_on" and msg.velocity > 0
    )
    if note_on_count == 0:
        raise EmptyMidiError("MIDI file contains no notes.")
    if note_on_count > max_notes:
        raise TooManyNotesError(f"MIDI file has {note_on_count} notes (max {max_notes}).")

    try:
        duration = midi.length
    except ValueError as exc:  # asynchronous (type 2) files have no defined length
        raise InvalidMidiError("Unsupported MIDI file type (no defined duration).") from exc
    if duration > max_duration_sec:
        raise TooLongError(f"Song is {duration:.0f}s long (max {max_duration_sec:.0f}s).")

    return ValidationResult(
        duration_sec=duration,
        track_count=len(midi.tracks),
        note_on_count=note_on_count,
    )
