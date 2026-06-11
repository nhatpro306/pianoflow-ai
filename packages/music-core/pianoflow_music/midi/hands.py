"""Left/right hand estimation heuristics (DESIGN.md §4 step 4).

- Exactly 2 note-bearing tracks → track convention: first = R, second = L.
- Otherwise → pitch split around middle C (60), adjusted per time-cluster so
  chords played by one hand are never split across hands.
Returned method string is stored in the analysis summary; the UI labels the
result as an estimate.
"""

from dataclasses import replace
from itertools import groupby

from pianoflow_music.notes.model import Note

MIDDLE_C = 60
CHORD_WINDOW_SEC = 0.03  # notes starting within 30 ms are treated as one chord


def estimate_hands(notes: list[Note]) -> tuple[list[Note], str]:
    if not notes:
        return notes, "none"

    note_tracks = sorted({note.track for note in notes})
    if len(note_tracks) == 2:
        right_track = note_tracks[0]
        assigned = [replace(note, hand="R" if note.track == right_track else "L") for note in notes]
        return assigned, "tracks"

    return _pitch_split(notes), "pitch_heuristic"


def _pitch_split(notes: list[Note]) -> list[Note]:
    """Split at middle C, but keep near-simultaneous chord clusters intact:
    a cluster goes entirely to the hand owning its pitch center of mass when
    its span is small enough to be played by one hand (≤ one octave)."""
    out: list[Note] = []
    ordered = sorted(notes, key=lambda n: n.start)

    cluster: list[Note] = []

    def flush() -> None:
        if not cluster:
            return
        pitches = [n.pitch for n in cluster]
        span = max(pitches) - min(pitches)
        if span <= 12:
            hand = "R" if (sum(pitches) / len(pitches)) >= MIDDLE_C else "L"
            out.extend(replace(n, hand=hand) for n in cluster)
        else:
            out.extend(replace(n, hand="R" if n.pitch >= MIDDLE_C else "L") for n in cluster)
        cluster.clear()

    for note in ordered:
        if cluster and note.start - cluster[0].start > CHORD_WINDOW_SEC:
            flush()
        cluster.append(note)
    flush()

    out.sort(key=lambda n: n.id)
    return out


def hand_counts(notes: list[Note]) -> dict[str, int]:
    return {hand: len(list(group)) for hand, group in groupby(sorted(n.hand for n in notes))}
