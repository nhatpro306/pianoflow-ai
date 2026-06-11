"""Deterministic test-fixture MIDI generator.

Run directly to (re)write the .mid files next to this script:
    uv run --directory packages/music-core python -m pianoflow_music.tests.fixtures.generate
Tests also build missing fixtures on demand via conftest.
"""

from pathlib import Path

import mido

FIXTURES_DIR = Path(__file__).parent

TICKS = 480  # ticks per beat; 120 BPM default tempo → 1 beat = 0.5 s


def _track(events: list[tuple[str, int, int, int]], *, tempo: bool = True) -> mido.MidiTrack:
    """events: (kind, note, velocity, delta_ticks). Tempo only on the first track
    of a file — set_tempo on later tracks is invalid type-1 MIDI."""
    track = mido.MidiTrack()
    if tempo:
        track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120), time=0))
    for kind, note, velocity, delta in events:
        track.append(mido.Message(kind, note=note, velocity=velocity, time=delta))
    track.append(mido.MetaMessage("end_of_track", time=0))
    return track


def make_simple() -> mido.MidiFile:
    """10 sequential quarter notes, C major scale-ish, single track."""
    midi = mido.MidiFile(ticks_per_beat=TICKS)
    pitches = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76]
    events = []
    for pitch in pitches:
        events.append(("note_on", pitch, 80, 0))
        events.append(("note_off", pitch, 0, TICKS))
    midi.tracks.append(_track(events))
    return midi


def make_chords() -> mido.MidiFile:
    """Two tracks (RH chords, LH bass) — exercises the track hand-split."""
    midi = mido.MidiFile(ticks_per_beat=TICKS)
    rh = []
    for chord in ([60, 64, 67], [62, 65, 69], [64, 67, 71], [65, 69, 72]):
        for pitch in chord:
            rh.append(("note_on", pitch, 90, 0))
        for i, pitch in enumerate(chord):
            rh.append(("note_off", pitch, 0, TICKS if i == 0 else 0))
    midi.tracks.append(_track(rh))

    lh = []
    for pitch in (36, 43, 40, 41):
        lh.append(("note_on", pitch, 70, 0))
        lh.append(("note_off", pitch, 0, TICKS))
    midi.tracks.append(_track(lh, tempo=False))
    return midi


def make_long_song() -> mido.MidiFile:
    """> 10 minutes — must be rejected by validate (TooLongError)."""
    midi = mido.MidiFile(ticks_per_beat=TICKS)
    events = []
    # 1300 half-notes at 120 BPM = 1300 s ≈ 21.7 min
    for i in range(1300):
        pitch = 60 + (i % 12)
        events.append(("note_on", pitch, 64, 0))
        events.append(("note_off", pitch, 0, TICKS * 2))
    midi.tracks.append(_track(events))
    return midi


def write_all(directory: Path = FIXTURES_DIR) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    make_simple().save(directory / "simple.mid")
    make_chords().save(directory / "chords.mid")
    make_long_song().save(directory / "long_song.mid")
    (directory / "invalid.mid").write_bytes(b"this is definitely not a midi file" * 10)


if __name__ == "__main__":
    write_all()
    print(f"fixtures written to {FIXTURES_DIR}")
