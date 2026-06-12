"""Rule-based beginner simplification.

This is intentionally conservative: keep the top melodic note at every onset,
reduce dense chords, and cap repeated-note density without changing key, tempo,
or timing. It is not an arrangement engine.
"""

from dataclasses import replace
from typing import Literal

from pianoflow_music.notes.model import Note, NoteData

Difficulty = Literal["easy", "very_easy"]
DIFFICULTIES = ("easy", "very_easy")

_START_GRID = 0.03


def simplify_note_data(note_data: NoteData, difficulty: Difficulty) -> NoteData:
    if difficulty not in DIFFICULTIES:
        raise ValueError(f"unsupported difficulty {difficulty!r}")

    selected: list[Note] = []
    for group in _onset_groups(note_data.notes):
        selected.extend(_select_group(group, difficulty))

    selected = _apply_density_cap(selected, difficulty)
    selected = sorted(selected, key=lambda note: (note.start, note.pitch))
    renumbered = [
        replace(note, id=index, duration=round(note.end - note.start, 5))
        for index, note in enumerate(selected)
    ]

    return NoteData(
        schema_version=note_data.schema_version,
        bpm=note_data.bpm,
        duration_sec=max((note.end for note in renumbered), default=0.0),
        time_signature=note_data.time_signature,
        notes=renumbered,
        tempo_map=list(note_data.tempo_map),
        tracks=[{"index": 0, "name": f"Simplified {difficulty}", "note_count": len(renumbered)}],
        meta={
            **note_data.meta,
            "simplification": {
                "difficulty": difficulty,
                "algorithm": "melody-preserve-chord-density-v1",
                "source_note_count": len(note_data.notes),
                "output_note_count": len(renumbered),
            },
        },
        sustain=_filter_sustain(note_data.sustain, renumbered),
    )


def _onset_groups(notes: list[Note]) -> list[list[Note]]:
    groups: dict[int, list[Note]] = {}
    for note in notes:
        bucket = round(note.start / _START_GRID)
        groups.setdefault(bucket, []).append(note)
    return [groups[key] for key in sorted(groups)]


def _select_group(group: list[Note], difficulty: Difficulty) -> list[Note]:
    ordered = sorted(group, key=lambda note: (note.pitch, note.velocity), reverse=True)
    melody = ordered[0]
    left = sorted((note for note in group if note.hand == "L"), key=lambda note: note.pitch)
    right = sorted((note for note in group if note.hand == "R"), key=lambda note: note.pitch)

    chosen = {melody.id: melody}
    if difficulty == "easy":
        for note in right[-2:]:
            chosen[note.id] = note
        if left:
            chosen[left[0].id] = left[0]
    elif left and melody.hand == "R":
        chosen[left[0].id] = left[0]

    max_notes = 3 if difficulty == "easy" else 2
    return sorted(chosen.values(), key=lambda note: note.pitch, reverse=True)[:max_notes]


def _apply_density_cap(notes: list[Note], difficulty: Difficulty) -> list[Note]:
    min_gap = 0.12 if difficulty == "easy" else 0.22
    kept: list[Note] = []
    last_by_hand: dict[str, float] = {}
    melody_by_onset = {
        round(note.start / _START_GRID): max(group, key=lambda item: item.pitch).id
        for group in _onset_groups(notes)
        for note in group
    }
    for note in sorted(notes, key=lambda item: (item.start, -item.pitch)):
        bucket = round(note.start / _START_GRID)
        is_melody = melody_by_onset[bucket] == note.id
        last = last_by_hand.get(note.hand)
        if is_melody or last is None or note.start - last >= min_gap:
            kept.append(note)
            last_by_hand[note.hand] = note.start
    return kept


def _filter_sustain(sustain: list[dict], notes: list[Note]) -> list[dict]:
    if not notes:
        return []
    end = max(note.end for note in notes)
    return [event for event in sustain if float(event.get("time", 0.0)) <= end + 0.1]
