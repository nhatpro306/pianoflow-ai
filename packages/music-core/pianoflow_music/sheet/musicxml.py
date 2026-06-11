"""Minimal MusicXML export for Phase 6.

This intentionally avoids engraving dependencies. Worker adapters can pass the
same MusicXML to MuseScore later; tests keep this pure and deterministic.
"""

from html import escape

from pianoflow_music.notes.model import Note, NoteData

_STEPS = ("C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B")
_ALTERS = (0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0)

DIVISIONS = 480


def _pitch(note: Note) -> str:
    pitch_class = note.pitch % 12
    octave = note.pitch // 12 - 1
    alter = _ALTERS[pitch_class]
    alter_xml = f"<alter>{alter}</alter>" if alter else ""
    return f"<pitch><step>{_STEPS[pitch_class]}</step>{alter_xml}<octave>{octave}</octave></pitch>"


def _duration(note: Note, bpm: float) -> int:
    quarter_seconds = 60 / bpm if bpm > 0 else 0.5
    quarter_length = max(note.duration / quarter_seconds, 1 / 16)
    return max(1, round(quarter_length * DIVISIONS))


def _part(notes: list[Note], bpm: float, clef: str) -> str:
    sign, line = ("G", 2) if clef == "treble" else ("F", 4)
    note_xml = []
    for note in notes:
        note_xml.append(
            "<note>"
            f"{_pitch(note)}"
            f"<duration>{_duration(note, bpm)}</duration>"
            "<voice>1</voice>"
            "<type>quarter</type>"
            "</note>"
        )

    return (
        '<measure number="1">'
        "<attributes>"
        f"<divisions>{DIVISIONS}</divisions>"
        "<key><fifths>0</fifths></key>"
        "<time><beats>4</beats><beat-type>4</beat-type></time>"
        f"<clef><sign>{sign}</sign><line>{line}</line></clef>"
        "</attributes>"
        f"{''.join(note_xml)}"
        "</measure>"
    )


def note_data_to_musicxml(note_data: NoteData, title: str = "PianoFlow Sheet") -> bytes:
    right = [note for note in note_data.notes if note.hand == "R"]
    left = [note for note in note_data.notes if note.hand == "L"]
    if not right and not left:
        right = note_data.notes

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<score-partwise version="3.1">'
        "<work>"
        f"<work-title>{escape(title)}</work-title>"
        "</work>"
        "<part-list>"
        '<score-part id="P1"><part-name>Right hand</part-name></score-part>'
        '<score-part id="P2"><part-name>Left hand</part-name></score-part>'
        "</part-list>"
        f'<part id="P1">{_part(right, note_data.bpm, "treble")}</part>'
        f'<part id="P2">{_part(left, note_data.bpm, "bass")}</part>'
        "</score-partwise>"
    )
    return xml.encode("utf-8")
