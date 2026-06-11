"""NoteData → Standard MIDI File bytes (VIDEO_TUTORIAL_SPEC.md §5).

Used by the worker to build the speed-scaled MIDI that FluidSynth renders to
WAV. Velocities preserved; CC64 sustain events written with scaled times.
Times in NoteData are absolute seconds — written at a fixed tempo so
seconds→ticks is exact.
"""

import io

import mido

from pianoflow_music.notes.model import NoteData

_TICKS_PER_BEAT = 480
_DEFAULT_BPM = 120.0


def note_data_to_midi_bytes(note_data: NoteData) -> bytes:
    # Carrier tempo: event times are already absolute seconds, so any tempo is
    # timing-exact — using the source bpm keeps round-trips reporting it.
    bpm = note_data.bpm if note_data.bpm > 0 else _DEFAULT_BPM
    midi = mido.MidiFile(ticks_per_beat=_TICKS_PER_BEAT)
    track = mido.MidiTrack()
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm), time=0))

    seconds_per_tick = 60.0 / (bpm * _TICKS_PER_BEAT)

    # (tick, order, message). Order: note_off(0) < control(1) < note_on(2)
    # at the same tick, so same-pitch retriggers never produce stuck notes.
    events: list[tuple[int, int, mido.Message]] = []
    for note in note_data.notes:
        velocity = min(max(note.velocity, 1), 127)
        events.append(
            (
                round(note.start / seconds_per_tick),
                2,
                mido.Message("note_on", note=note.pitch, velocity=velocity, time=0),
            )
        )
        events.append(
            (
                round(note.end / seconds_per_tick),
                0,
                mido.Message("note_off", note=note.pitch, velocity=0, time=0),
            )
        )
    for event in note_data.sustain:
        events.append(
            (
                round(event["time"] / seconds_per_tick),
                1,
                mido.Message("control_change", control=64, value=int(event["value"]), time=0),
            )
        )

    events.sort(key=lambda item: (item[0], item[1]))

    last_tick = 0
    for tick, _, message in events:
        message.time = max(tick - last_tick, 0)
        track.append(message)
        last_tick = tick
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.tracks.append(track)

    buffer = io.BytesIO()
    midi.save(file=buffer)
    return buffer.getvalue()
