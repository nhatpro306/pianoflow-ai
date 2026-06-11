"""Single-timeline speed scaling (VIDEO_TUTORIAL_SPEC.md §4).

One pure function: t' = t / speed_multiplier. Preview clock, frame renderer
and audio renderer all consume the same scaled timeline, so drift is
structurally impossible in export.
"""

from dataclasses import replace

from pianoflow_music.notes.model import NoteData

SPEED_MIN = 0.25
SPEED_MAX = 2.0


def clamp_speed(multiplier: float) -> float:
    return min(max(multiplier, SPEED_MIN), SPEED_MAX)


def apply_speed(note_data: NoteData, speed_multiplier: float) -> NoteData:
    """Return a copy of note_data with all event times divided by the
    multiplier (2.0 = twice as fast = half the timestamps)."""
    factor = 1.0 / clamp_speed(speed_multiplier)
    if factor == 1.0:
        return note_data

    notes = [
        replace(
            note,
            start=note.start * factor,
            end=note.end * factor,
            duration=note.duration * factor,
        )
        for note in note_data.notes
    ]
    sustain = [{**event, "time": event["time"] * factor} for event in note_data.sustain]
    tempo_map = [
        {**entry, "time": entry["time"] * factor} if "time" in entry else dict(entry)
        for entry in note_data.tempo_map
    ]
    return NoteData(
        schema_version=note_data.schema_version,
        bpm=note_data.bpm,
        duration_sec=note_data.duration_sec * factor,
        time_signature=note_data.time_signature,
        notes=notes,
        tempo_map=tempo_map,
        tracks=note_data.tracks,
        meta={**note_data.meta, "speed_multiplier": clamp_speed(speed_multiplier)},
        sustain=sustain,
    )
