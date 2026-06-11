"""MIDI bytes → NoteData (the canonical notes JSON model).

Pipeline (DESIGN.md §4): validate → parse (pretty_midi) → normalize → hands.
"""

import io

import pretty_midi

from pianoflow_music.midi.hands import estimate_hands
from pianoflow_music.midi.normalize import normalize_notes
from pianoflow_music.midi.validate import validate_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData


def parse_midi_bytes(data: bytes) -> NoteData:
    """Parse validated MIDI bytes into NoteData. Raises MidiError subclasses."""
    validate_midi_bytes(data)

    pm = pretty_midi.PrettyMIDI(io.BytesIO(data))

    # Dominant tempo (MVP); full tempo map stored alongside.
    tempo_times, tempi = pm.get_tempo_changes()
    bpm = float(pm.estimate_tempo()) if len(tempi) == 0 else float(tempi[0])
    tempo_map = [
        {"time": float(t), "bpm": float(b)} for t, b in zip(tempo_times, tempi, strict=True)
    ]

    if pm.time_signature_changes:
        ts = pm.time_signature_changes[0]
        time_signature = f"{ts.numerator}/{ts.denominator}"
    else:
        time_signature = "4/4"

    raw: list[tuple[int, pretty_midi.Note]] = []
    tracks_meta = []
    for track_index, instrument in enumerate(pm.instruments):
        if instrument.is_drum:
            continue
        tracks_meta.append(
            {
                "index": track_index,
                "name": instrument.name or f"Track {track_index}",
                "note_count": len(instrument.notes),
            }
        )
        raw.extend((track_index, note) for note in instrument.notes)

    raw.sort(key=lambda item: (item[1].start, item[1].pitch))

    # Sustain pedal (CC64) events across all non-drum instruments, time-sorted.
    # Per-note MIDI channel is not preserved (pretty_midi merges channels per
    # instrument); track index is the hand/voice identity in this app.
    sustain = sorted(
        (
            {"time": round(float(cc.time), 5), "value": int(cc.value)}
            for instrument in pm.instruments
            if not instrument.is_drum
            for cc in instrument.control_changes
            if cc.number == 64
        ),
        key=lambda event: event["time"],
    )

    notes = [
        Note(
            id=i,
            pitch=int(n.pitch),
            name=pretty_midi.note_number_to_name(int(n.pitch)),
            velocity=int(n.velocity),
            start=round(float(n.start), 5),
            end=round(float(n.end), 5),
            duration=round(float(n.end - n.start), 5),
            track=track_index,
            hand="R",  # placeholder; estimate_hands assigns properly below
        )
        for i, (track_index, n) in enumerate(raw)
    ]

    notes, dropped = normalize_notes(notes)
    notes, hand_split_method = estimate_hands(notes)

    return NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=round(bpm, 3),
        duration_sec=round(float(pm.get_end_time()), 3),
        time_signature=time_signature,
        notes=notes,
        tempo_map=tempo_map,
        tracks=tracks_meta,
        meta={"hand_split": hand_split_method, "dropped_notes": dropped},
        sustain=sustain,
    )
