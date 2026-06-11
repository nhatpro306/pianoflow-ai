"""Stable error codes for MIDI processing (DESIGN.md §4, API.md §0)."""


class MidiError(Exception):
    """Base for all MIDI processing failures. Permanent — never retried."""

    code = "MIDI_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidMidiError(MidiError):
    code = "INVALID_MIDI"


class EmptyMidiError(MidiError):
    code = "EMPTY_MIDI"


class TooLongError(MidiError):
    code = "TOO_LONG"


class TooManyNotesError(MidiError):
    code = "TOO_MANY_NOTES"
