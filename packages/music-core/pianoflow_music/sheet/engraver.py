"""Pure Python Vector Grand Staff PDF Engraver.

Produces publication-grade Western Grand Staff notation in standard PDF 1.4
without any external binary dependencies.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from pianoflow_music.notes.model import Note, NoteData


def _pdf_text_escape(value: str) -> str:
    """Escapes literal parentheses and backslashes for PDF string literals."""
    # Convert unicode punctuation to ASCII equivalents
    replacements = {
        "\u2022": "-",
        "\u2014": "--",
        "\u2013": "-",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
    }
    clean = value
    for orig, rep in replacements.items():
        clean = clean.replace(orig, rep)
    clean = clean.encode("latin-1", errors="replace").decode("latin-1")
    return clean.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_rotated_ellipse_path(
    cx: float, cy: float, a: float = 4.8, b: float = 3.2, angle_deg: float = 18.0
) -> str:
    """Generates a cubic Bezier path for a rotated ellipse centered at (cx, cy)."""
    rad = math.radians(angle_deg)
    cos_t, sin_t = math.cos(rad), math.sin(rad)
    kappa = 0.55228475

    # 4-quadrant Bezier control points for unrotated unit-like ellipse
    pts = [
        (a, 0.0),
        (a, kappa * b),
        (kappa * a, b),
        (0.0, b),
        (-kappa * a, b),
        (-a, kappa * b),
        (-a, 0.0),
        (-a, -kappa * b),
        (-kappa * a, -b),
        (0.0, -b),
        (kappa * a, -b),
        (a, -kappa * b),
        (a, 0.0),
    ]
    # Rotate and translate to (cx, cy)
    t_pts = [(cx + x * cos_t - y * sin_t, cy + x * sin_t + y * cos_t) for x, y in pts]

    ops = [f"{t_pts[0][0]:.2f} {t_pts[0][1]:.2f} m"]
    for i in range(1, len(t_pts), 3):
        p1, p2, p3 = t_pts[i], t_pts[i + 1], t_pts[i + 2]
        ops.append(f"{p1[0]:.2f} {p1[1]:.2f} {p2[0]:.2f} {p2[1]:.2f} {p3[0]:.2f} {p3[1]:.2f} c")
    return " ".join(ops)


# Diatonic step lookup table: (step_name, step_offset_within_octave, accidental)
DIATONIC_STEP_SHARPS = [
    ("C", 0, None),
    ("C", 0, "sharp"),
    ("D", 1, None),
    ("D", 1, "sharp"),
    ("E", 2, None),
    ("F", 3, None),
    ("F", 3, "sharp"),
    ("G", 4, None),
    ("G", 4, "sharp"),
    ("A", 5, None),
    ("A", 5, "sharp"),
    ("B", 6, None),
]

DIATONIC_STEP_FLATS = [
    ("C", 0, None),
    ("D", 1, "flat"),
    ("D", 1, None),
    ("E", 2, "flat"),
    ("E", 2, None),
    ("F", 3, None),
    ("G", 4, "flat"),
    ("G", 4, None),
    ("A", 5, "flat"),
    ("A", 5, None),
    ("B", 6, "flat"),
    ("B", 6, None),
]


@dataclass(frozen=True)
class DiatonicNote:
    pitch: int
    name: str
    start: float
    end: float
    duration: float
    hand: str
    octave: int
    step_offset: int
    diatonic_step: int
    accidental: str | None
    staff_offset: int  # in half-spaces from staff bottom line
    is_hollow: bool
    is_whole: bool
    duration_beats: float
    stem_direction: str  # "up" | "down"


@dataclass
class EngravedMeasure:
    index: int
    start_time: float
    end_time: float
    treble_notes: list[DiatonicNote]
    bass_notes: list[DiatonicNote]


@dataclass
class EngravedSystem:
    index: int
    measures: list[EngravedMeasure]


@dataclass
class EngravedPage:
    page_number: int
    is_first_page: bool
    systems: list[EngravedSystem]


def parse_time_signature(ts_str: str | None) -> tuple[int, int, str]:
    """Parse time signature string into (numerator, denominator, display_symbol)."""
    if not ts_str:
        return (4, 4, "4/4")
    ts_clean = ts_str.strip()
    if ts_clean.upper() in ("C", "COMMON"):
        return (4, 4, "C")
    if ts_clean.upper() in ("C|", "CUT", "ALLA_BREVE"):
        return (2, 2, "C|")
    if "/" in ts_clean:
        parts = ts_clean.split("/", 1)
        try:
            num = int(parts[0].strip())
            den = int(parts[1].strip())
            if num > 0 and den > 0:
                return (num, den, f"{num}/{den}")
        except ValueError:
            pass
    return (4, 4, "4/4")


class GrandStaffEngraver:
    """Renders NoteData into valid PDF 1.4 byte streams."""

    PAGE_WIDTH = 612.0
    PAGE_HEIGHT = 792.0
    MARGIN_LEFT = 36.0
    MARGIN_RIGHT = 36.0
    MARGIN_TOP = 36.0
    MARGIN_BOTTOM = 36.0
    CONTENT_WIDTH = 540.0
    STAFF_LINE_SPACING = 7.0
    STAFF_HEIGHT = 28.0
    INTER_STAFF_GAP = 52.0
    SYSTEM_HEIGHT = 108.0

    def __init__(
        self,
        note_data: NoteData,
        title: str = "PianoFlow Sheet",
        composer: str | None = None,
        measures_per_system: int = 2,
    ) -> None:
        self.note_data = note_data
        self.title = title or "PianoFlow Sheet"
        meta = note_data.meta
        default_comp = meta.get("composer") or meta.get("artist") or "PianoFlow AI"
        self.composer = composer or default_comp
        self.measures_per_system = max(1, measures_per_system)

        bpm = note_data.bpm if note_data.bpm > 0 else 120.0
        self.bpm = bpm
        self.num, self.den, self.ts_display = parse_time_signature(note_data.time_signature)

        # Seconds per quarter-note beat
        self.seconds_per_beat = 60.0 / bpm
        # Measure duration in seconds
        self.measure_duration_sec = (self.num * (4.0 / self.den)) * self.seconds_per_beat

    def _convert_note(self, note: Note) -> DiatonicNote:
        """Converts raw MIDI Note to DiatonicNote with staff offsets and glyph types."""
        pitch = max(21, min(108, note.pitch))
        octave = (pitch // 12) - 1
        pitch_class = pitch % 12

        # Choose flat vs sharp based on note name
        is_flat_name = "b" in note.name or "♭" in note.name
        table = DIATONIC_STEP_FLATS if is_flat_name else DIATONIC_STEP_SHARPS
        _, step_offset, accidental = table[pitch_class]

        diatonic_step = octave * 7 + step_offset

        # Determine hand / clef
        hand = note.hand if note.hand in ("L", "R") else ("R" if pitch >= 60 else "L")

        # Treble reference: E4 = diatonic_step 30
        # Bass reference: G2 = diatonic_step 18
        staff_offset = diatonic_step - 30 if hand == "R" else diatonic_step - 18

        duration = max(0.01, note.duration)
        duration_beats = duration / self.seconds_per_beat
        is_hollow = duration_beats >= 1.75
        is_whole = duration_beats >= 3.5

        # Stem direction: offset < 4 stems up, offset >= 4 stems down
        stem_direction = "up" if staff_offset < 4 else "down"

        return DiatonicNote(
            pitch=pitch,
            name=note.name,
            start=note.start,
            end=note.end,
            duration=duration,
            hand=hand,
            octave=octave,
            step_offset=step_offset,
            diatonic_step=diatonic_step,
            accidental=accidental,
            staff_offset=staff_offset,
            is_hollow=is_hollow,
            is_whole=is_whole,
            duration_beats=duration_beats,
            stem_direction=stem_direction,
        )

    def _partition_measures(self) -> list[EngravedMeasure]:
        """Partitions notes into metrical measures."""
        diatonic_notes = [self._convert_note(n) for n in self.note_data.notes]
        diatonic_notes.sort(key=lambda n: (n.start, n.pitch))

        max_time = self.note_data.duration_sec
        if diatonic_notes:
            max_time = max(max_time, max(n.end for n in diatonic_notes))
        max_time = max(max_time, self.measure_duration_sec)

        total_measures = max(1, math.ceil(max_time / self.measure_duration_sec))

        # Bucket notes into measures
        measures_map: dict[int, tuple[list[DiatonicNote], list[DiatonicNote]]] = {
            i: ([], []) for i in range(total_measures)
        }

        for dn in diatonic_notes:
            m_idx = int(dn.start // self.measure_duration_sec)
            if m_idx >= total_measures:
                m_idx = total_measures - 1
            if m_idx < 0:
                m_idx = 0
            treble_list, bass_list = measures_map[m_idx]
            if dn.hand == "R":
                treble_list.append(dn)
            else:
                bass_list.append(dn)

        measures: list[EngravedMeasure] = []
        for i in range(total_measures):
            t_notes, b_notes = measures_map[i]
            m_start = i * self.measure_duration_sec
            m_end = (i + 1) * self.measure_duration_sec
            measures.append(
                EngravedMeasure(
                    index=i,
                    start_time=m_start,
                    end_time=m_end,
                    treble_notes=t_notes,
                    bass_notes=b_notes,
                )
            )

        return measures

    def _layout_pages(self, measures: list[EngravedMeasure]) -> list[EngravedPage]:
        """Arranges measures into systems and systems into multi-page layout."""
        # Group measures into systems
        systems: list[EngravedSystem] = []
        for i in range(0, len(measures), self.measures_per_system):
            chunk = measures[i : i + self.measures_per_system]
            systems.append(EngravedSystem(index=len(systems), measures=chunk))

        if not systems:
            systems.append(EngravedSystem(index=0, measures=[]))

        # Page 1 holds up to 3 systems; subsequent pages hold up to 4 systems
        pages: list[EngravedPage] = []
        curr_sys_idx = 0
        page_num = 1

        while curr_sys_idx < len(systems):
            is_first = page_num == 1
            cap = 3 if is_first else 4
            sys_chunk = systems[curr_sys_idx : curr_sys_idx + cap]
            pages.append(
                EngravedPage(
                    page_number=page_num,
                    is_first_page=is_first,
                    systems=sys_chunk,
                )
            )
            curr_sys_idx += len(sys_chunk)
            page_num += 1

        return pages

    def _render_page_stream(self, page: EngravedPage, total_measures_count: int) -> bytes:
        """Emits PDF vector and text operations for a single engraved page."""
        ops: list[str] = []

        # Color: set default stroke and fill to solid black
        ops.append("0.0 0.0 0.0 RG")
        ops.append("0.0 0.0 0.0 rg")

        if page.is_first_page:
            # First page header
            title_esc = _pdf_text_escape(self.title)
            composer_esc = _pdf_text_escape(self.composer)
            subtitle_esc = _pdf_text_escape("PianoFlow AI - Grand Staff Notation")

            # Title: centered at X = 306, Y = 744 in Helvetica-Bold 20pt
            approx_title_w = len(self.title) * 20.0 * 0.52
            x_title = max(self.MARGIN_LEFT, 306.0 - (approx_title_w / 2.0))
            ops.append(f"BT /F2 20 Tf {x_title:.2f} 744.00 Td ({title_esc}) Tj ET")

            # Subtitle: centered at X = 306, Y = 724 in Helvetica-Oblique 10pt
            approx_sub_w = len(subtitle_esc) * 10.0 * 0.5
            x_sub = max(self.MARGIN_LEFT, 306.0 - (approx_sub_w / 2.0))
            ops.append(f"BT /F3 10 Tf {x_sub:.2f} 724.00 Td ({subtitle_esc}) Tj ET")

            # Tempo marking with tiny vector quarter note icon:
            # Quarter note icon at X = 38.0, Y = 700.0
            ops.append(f"{make_rotated_ellipse_path(39.0, 700.5, 2.5, 1.8, 18.0)} f")
            ops.append("0.85 w 41.20 700.50 m 41.20 710.00 l s")
            # Text "= {bpm} BPM"
            tempo_str = f"= {int(self.bpm)} BPM"
            ops.append(f"BT /F2 11 Tf 46.00 698.00 Td ({tempo_str}) Tj ET")

            # Composer: right-aligned at X = 576, Y = 700 in Helvetica 10pt
            approx_comp_w = len(self.composer) * 10.0 * 0.52
            x_comp = max(self.MARGIN_LEFT, 576.0 - approx_comp_w)
            ops.append(f"BT /F1 10 Tf {x_comp:.2f} 698.00 Td ({composer_esc}) Tj ET")

            # System Y-positions on Page 1 (3 systems capacity)
            system_y_coords = [
                (600.0, 520.0),  # System 0: Y_T=600, Y_B=520
                (430.0, 350.0),  # System 1: Y_T=430, Y_B=350
                (260.0, 180.0),  # System 2: Y_T=260, Y_B=180
            ]
        else:
            # Subsequent page running header
            title_esc = _pdf_text_escape(self.title)
            page_str = f"Page {page.page_number}"
            ops.append(f"BT /F1 9 Tf {self.MARGIN_LEFT:.2f} 760.00 Td ({title_esc}) Tj ET")
            ops.append(f"BT /F1 9 Tf 536.00 760.00 Td ({page_str}) Tj ET")
            # Thin divider rule
            ops.append(f"0.5 w {self.MARGIN_LEFT:.2f} 752.00 m 576.00 752.00 l s")

            # System Y-positions on Page 2+ (4 systems capacity)
            system_y_coords = [
                (670.0, 590.0),  # System 0
                (510.0, 430.0),  # System 1
                (350.0, 270.0),  # System 2
                (190.0, 110.0),  # System 3
            ]

        # Draw each system
        for s_idx, system in enumerate(page.systems):
            if s_idx >= len(system_y_coords):
                break
            y_t, y_b = system_y_coords[s_idx]
            self._render_system(
                ops,
                system=system,
                y_t=y_t,
                y_b=y_b,
                is_first_system=(page.is_first_page and s_idx == 0),
                total_measures_count=total_measures_count,
            )

        return "\n".join(ops).encode("latin-1")

    def _render_system(
        self,
        ops: list[str],
        system: EngravedSystem,
        y_t: float,
        y_b: float,
        is_first_system: bool,
        total_measures_count: int,
    ) -> None:
        """Renders the Grand Staff staves, clefs, braces, barlines, and notes for one system."""
        x_left = self.MARGIN_LEFT  # 36.0
        x_right = self.MARGIN_LEFT + self.CONTENT_WIDTH  # 576.0

        # 1. System bracket & brace at left edge (X = 36.0)
        # Vertical linking line connecting Treble top line (y_t + 28) to Bass bottom line (y_b)
        ops.append(f"1.6 w {x_left:.2f} {y_b:.2f} m {x_left:.2f} {y_t + 28.0:.2f} l s")

        # Curly brace
        y_mid = (y_t + 28.0 + y_b) / 2.0
        ops.append(
            f"1.4 w {x_left:.2f} {y_t + 28.0:.2f} m "
            f"29.00 {y_t + 12.0:.2f} 29.00 {y_mid + 12.0:.2f} 25.00 {y_mid:.2f} c "
            f"29.00 {y_mid - 12.0:.2f} 29.00 {y_b + 16.0:.2f} {x_left:.2f} {y_b:.2f} c s"
        )

        # 2. Staff lines (5 lines for Treble, 5 lines for Bass)
        ops.append("0.7 w")
        for i in range(5):
            line_y = y_t + i * self.STAFF_LINE_SPACING
            ops.append(f"{x_left:.2f} {line_y:.2f} m {x_right:.2f} {line_y:.2f} l s")
        for i in range(5):
            line_y = y_b + i * self.STAFF_LINE_SPACING
            ops.append(f"{x_left:.2f} {line_y:.2f} m {x_right:.2f} {line_y:.2f} l s")

        # 3. Vector Clefs
        # Treble Clef (G-Clef around G4 line: y_t + 7.0)
        x_treble_clef = 46.0
        # G-Clef loops and spine
        t_c1 = (
            f"{x_treble_clef + 1.0:.2f} {y_t - 4.0:.2f} "
            f"{x_treble_clef + 1.0:.2f} {y_t + 35.0:.2f} "
            f"{x_treble_clef + 1.0:.2f} {y_t + 36.0:.2f} c"
        )
        t_c2 = (
            f"{x_treble_clef + 5.5:.2f} {y_t + 30.0:.2f} "
            f"{x_treble_clef + 3.0:.2f} {y_t + 23.0:.2f} "
            f"{x_treble_clef - 1.5:.2f} {y_t + 18.0:.2f} c"
        )
        t_c3 = (
            f"{x_treble_clef - 6.5:.2f} {y_t + 10.0:.2f} "
            f"{x_treble_clef - 5.0:.2f} {y_t + 2.0:.2f} "
            f"{x_treble_clef + 2.0:.2f} {y_t:.2f} c"
        )
        t_c4 = (
            f"{x_treble_clef + 8.5:.2f} {y_t + 6.0:.2f} "
            f"{x_treble_clef + 7.5:.2f} {y_t + 12.0:.2f} "
            f"{x_treble_clef + 1.5:.2f} {y_t + 13.0:.2f} c"
        )
        t_c5 = (
            f"{x_treble_clef - 2.5:.2f} {y_t + 9.0:.2f} "
            f"{x_treble_clef - 0.5:.2f} {y_t + 6.5:.2f} "
            f"{x_treble_clef + 1.5:.2f} {y_t + 7.0:.2f} c s"
        )
        ops.append(
            f"1.2 w {x_treble_clef - 2.0:.2f} {y_t - 7.0:.2f} m {t_c1} {t_c2} {t_c3} {t_c4} {t_c5}"
        )
        # Teardrop terminal dot at bottom of Treble clef
        ops.append(f"{make_rotated_ellipse_path(x_treble_clef - 2.0, y_t - 7.5, 1.8, 1.8, 0.0)} f")

        # Bass Clef (F-Clef centered on F3 line: y_b + 21.0)
        x_bass_clef = 44.0
        # Filled anchor dot on line 4 (F3)
        ops.append(f"{make_rotated_ellipse_path(x_bass_clef, y_b + 21.0, 2.2, 2.2, 0.0)} f")
        # Upper arch of Bass clef
        b_c1 = (
            f"{x_bass_clef + 3.5:.2f} {y_b + 27.0:.2f} "
            f"{x_bass_clef + 9.0:.2f} {y_b + 24.0:.2f} "
            f"{x_bass_clef + 8.5:.2f} {y_b + 13.0:.2f} c"
        )
        b_c2 = (
            f"{x_bass_clef + 8.0:.2f} {y_b + 8.0:.2f} "
            f"{x_bass_clef + 4.0:.2f} {y_b + 5.0:.2f} "
            f"{x_bass_clef + 2.0:.2f} {y_b + 5.0:.2f} c s"
        )
        ops.append(f"1.6 w {x_bass_clef:.2f} {y_b + 21.0:.2f} m {b_c1} {b_c2}")
        # Two Bass clef dots in space 3 (y_b + 17.5) and space 4 (y_b + 24.5)
        ops.append(f"{make_rotated_ellipse_path(x_bass_clef + 11.5, y_b + 17.5, 1.3, 1.3, 0.0)} f")
        ops.append(f"{make_rotated_ellipse_path(x_bass_clef + 11.5, y_b + 24.5, 1.3, 1.3, 0.0)} f")

        # 4. Time Signature (Rendered on first system of piece)
        x_measures_start = 66.0
        if is_first_system:
            x_ts = 64.0
            x_measures_start = 82.0
            if self.ts_display == "C":
                ops.append(f"BT /F2 15 Tf {x_ts:.2f} {y_t + 8.0:.2f} Td (C) Tj ET")
                ops.append(f"BT /F2 15 Tf {x_ts:.2f} {y_b + 8.0:.2f} Td (C) Tj ET")
            elif self.ts_display == "C|":
                ops.append(f"BT /F2 15 Tf {x_ts:.2f} {y_t + 8.0:.2f} Td (C) Tj ET")
                ops.append(
                    f"0.9 w {x_ts + 4.5:.2f} {y_t + 2.0:.2f} m "
                    f"{x_ts + 4.5:.2f} {y_t + 26.0:.2f} l s"
                )
                ops.append(f"BT /F2 15 Tf {x_ts:.2f} {y_b + 8.0:.2f} Td (C) Tj ET")
                ops.append(
                    f"0.9 w {x_ts + 4.5:.2f} {y_b + 2.0:.2f} m "
                    f"{x_ts + 4.5:.2f} {y_b + 26.0:.2f} l s"
                )
            else:
                num_str = str(self.num)
                den_str = str(self.den)
                # Treble time signature
                ops.append(f"BT /F2 13 Tf {x_ts:.2f} {y_t + 15.0:.2f} Td ({num_str}) Tj ET")
                ops.append(f"BT /F2 13 Tf {x_ts:.2f} {y_t + 1.0:.2f} Td ({den_str}) Tj ET")
                # Bass time signature
                ops.append(f"BT /F2 13 Tf {x_ts:.2f} {y_b + 15.0:.2f} Td ({num_str}) Tj ET")
                ops.append(f"BT /F2 13 Tf {x_ts:.2f} {y_b + 1.0:.2f} Td ({den_str}) Tj ET")

        # 5. Measures in this system
        measures = system.measures
        measure_count = max(1, len(measures))
        measure_w = (x_right - x_measures_start) / measure_count

        for m_local_idx, measure in enumerate(measures):
            m_start_x = x_measures_start + m_local_idx * measure_w
            m_end_x = x_measures_start + (m_local_idx + 1) * measure_w
            is_final_measure = measure.index == total_measures_count - 1

            # Measure number box and label
            m_num_label = str(measure.index + 1)
            # Box badge using 're' operator
            ops.append(f"0.5 w {m_start_x + 1.0:.2f} {y_t + 30.5:.2f} 14.00 9.00 re s")
            ops.append(
                f"BT /F1 7 Tf {m_start_x + 3.0:.2f} {y_t + 32.5:.2f} Td ({m_num_label}) Tj ET"
            )

            # Barline at measure end
            if is_final_measure:
                # Final double barline
                ops.append(
                    f"1.0 w {m_end_x - 3.5:.2f} {y_t:.2f} m "
                    f"{m_end_x - 3.5:.2f} {y_t + 28.0:.2f} l s"
                )
                ops.append(
                    f"1.0 w {m_end_x - 3.5:.2f} {y_b:.2f} m "
                    f"{m_end_x - 3.5:.2f} {y_b + 28.0:.2f} l s"
                )
                ops.append(
                    f"2.6 w {m_end_x - 1.0:.2f} {y_t:.2f} m "
                    f"{m_end_x - 1.0:.2f} {y_t + 28.0:.2f} l s"
                )
                ops.append(
                    f"2.6 w {m_end_x - 1.0:.2f} {y_b:.2f} m "
                    f"{m_end_x - 1.0:.2f} {y_b + 28.0:.2f} l s"
                )
            else:
                ops.append(f"1.0 w {m_end_x:.2f} {y_t:.2f} m {m_end_x:.2f} {y_t + 28.0:.2f} l s")
                ops.append(f"1.0 w {m_end_x:.2f} {y_b:.2f} m {m_end_x:.2f} {y_b + 28.0:.2f} l s")

            # Notes inside measure
            m_dur = measure.end_time - measure.start_time
            if m_dur <= 0:
                m_dur = 1.0

            usable_w = measure_w - 24.0
            pad_left = m_start_x + 12.0

            # Render notes for both staves
            for dnote in measure.treble_notes + measure.bass_notes:
                rel_t = dnote.start - measure.start_time
                phi = min(max(rel_t / m_dur, 0.0), 0.95)
                note_x = pad_left + phi * usable_w

                if dnote.hand == "R":
                    note_y = y_t + dnote.staff_offset * 3.5
                    staff_bottom = y_t
                else:
                    note_y = y_b + dnote.staff_offset * 3.5
                    staff_bottom = y_b

                # Ledger lines:
                # Below staff: staff_offset < 0 (even offsets -2, -4, ...)
                if dnote.staff_offset < 0:
                    ops.append("0.85 w")
                    for k in range(-2, dnote.staff_offset - 1, -2):
                        ledger_y = staff_bottom + k * 3.5
                        ops.append(
                            f"{note_x - 7.5:.2f} {ledger_y:.2f} m "
                            f"{note_x + 7.5:.2f} {ledger_y:.2f} l s"
                        )
                # Above staff: staff_offset > 8 (even offsets 10, 12, ...)
                elif dnote.staff_offset > 8:
                    ops.append("0.85 w")
                    for k in range(10, dnote.staff_offset + 1, 2):
                        ledger_y = staff_bottom + k * 3.5
                        ops.append(
                            f"{note_x - 7.5:.2f} {ledger_y:.2f} m "
                            f"{note_x + 7.5:.2f} {ledger_y:.2f} l s"
                        )

                # Accidental:
                if dnote.accidental == "sharp":
                    ax = note_x - 9.5
                    ops.append(
                        f"0.7 w {ax - 1.5:.2f} {note_y - 6.5:.2f} m "
                        f"{ax - 1.5:.2f} {note_y + 6.5:.2f} l s"
                    )
                    ops.append(
                        f"0.7 w {ax + 1.5:.2f} {note_y - 6.5:.2f} m "
                        f"{ax + 1.5:.2f} {note_y + 6.5:.2f} l s"
                    )
                    ops.append(
                        f"1.2 w {ax - 3.5:.2f} {note_y - 2.0:.2f} m {ax + 3.5:.2f} {note_y:.2f} l s"
                    )
                    ops.append(
                        f"1.2 w {ax - 3.5:.2f} {note_y + 1.0:.2f} m "
                        f"{ax + 3.5:.2f} {note_y + 3.0:.2f} l s"
                    )
                elif dnote.accidental == "flat":
                    ax = note_x - 9.0
                    ops.append(
                        f"0.7 w {ax - 1.5:.2f} {note_y - 3.0:.2f} m "
                        f"{ax - 1.5:.2f} {note_y + 8.0:.2f} l s"
                    )
                    flat_b = (
                        f"{ax + 2.5:.2f} {note_y - 1.0:.2f} "
                        f"{ax + 2.5:.2f} {note_y + 2.0:.2f} "
                        f"{ax - 1.5:.2f} {note_y + 2.5:.2f} c s"
                    )
                    ops.append(f"1.0 w {ax - 1.5:.2f} {note_y - 3.0:.2f} m {flat_b}")

                # Notehead:
                if dnote.is_hollow:
                    ops.append(
                        f"1.3 w {make_rotated_ellipse_path(note_x, note_y, 4.8, 3.0, 18.0)} s"
                    )
                else:
                    ops.append(f"{make_rotated_ellipse_path(note_x, note_y, 4.8, 3.2, 18.0)} f")

                # Stem and flags (if not whole note)
                if not dnote.is_whole:
                    if dnote.stem_direction == "up":
                        stem_x = note_x + 4.2
                        stem_tip_y = note_y + 26.0
                        ops.append(
                            f"0.85 w {stem_x:.2f} {note_y:.2f} m {stem_x:.2f} {stem_tip_y:.2f} l s"
                        )
                        # Eighth flag
                        if 0.35 <= dnote.duration_beats < 0.75:
                            f1 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y - 6.0:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y - 10.0:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y - 14.0:.2f} c s"
                            )
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y:.2f} m {f1}")
                        # Sixteenth double flag
                        elif dnote.duration_beats < 0.35:
                            f1 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y - 6.0:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y - 10.0:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y - 14.0:.2f} c s"
                            )
                            f2 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y - 10.5:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y - 14.5:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y - 18.5:.2f} c s"
                            )
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y:.2f} m {f1}")
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y - 4.5:.2f} m {f2}")
                    else:  # stem down
                        stem_x = note_x - 4.2
                        stem_tip_y = note_y - 26.0
                        ops.append(
                            f"0.85 w {stem_x:.2f} {note_y:.2f} m {stem_x:.2f} {stem_tip_y:.2f} l s"
                        )
                        # Eighth flag
                        if 0.35 <= dnote.duration_beats < 0.75:
                            f1 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y + 6.0:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y + 10.0:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y + 14.0:.2f} c s"
                            )
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y:.2f} m {f1}")
                        # Sixteenth double flag
                        elif dnote.duration_beats < 0.35:
                            f1 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y + 6.0:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y + 10.0:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y + 14.0:.2f} c s"
                            )
                            f2 = (
                                f"{stem_x + 3.0:.2f} {stem_tip_y + 10.5:.2f} "
                                f"{stem_x + 7.0:.2f} {stem_tip_y + 14.5:.2f} "
                                f"{stem_x + 6.5:.2f} {stem_tip_y + 18.5:.2f} c s"
                            )
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y:.2f} m {f1}")
                            ops.append(f"0.85 w {stem_x:.2f} {stem_tip_y + 4.5:.2f} m {f2}")

    def render_pdf(self) -> bytes:
        """Renders the NoteData into a complete, valid PDF 1.4 byte stream."""
        measures = self._partition_measures()
        pages = self._layout_pages(measures)
        page_count = len(pages)
        total_measures_count = len(measures)

        # PDF Object Structure:
        # 1: Catalog
        # 2: Pages
        # 3: Font F1 (Helvetica)
        # 4: Font F2 (Helvetica-Bold)
        # 5: Font F3 (Helvetica-Oblique)
        # For page i in 1..page_count:
        #   (4 + 2*i): Page dict
        #   (5 + 2*i): Content stream
        page_obj_ids = [4 + 2 * i for i in range(1, page_count + 1)]
        content_obj_ids = [5 + 2 * i for i in range(1, page_count + 1)]

        kids_refs = " ".join(f"{pid} 0 R" for pid in page_obj_ids)

        objects: list[bytes] = [
            # 1: Catalog
            b"<< /Type /Catalog /Pages 2 0 R >>",
            # 2: Pages
            f"<< /Type /Pages /Kids [{kids_refs}] /Count {page_count} >>".encode(),
            # 3: Helvetica
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            # 4: Helvetica-Bold
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
            # 5: Helvetica-Oblique
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
        ]

        # Append Page and Content objects
        for p_idx, page in enumerate(pages):
            content_id = content_obj_ids[p_idx]
            stream_bytes = self._render_page_stream(page, total_measures_count=total_measures_count)

            p_box = f"[0 0 {self.PAGE_WIDTH:.0f} {self.PAGE_HEIGHT:.0f}]"
            page_dict = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox {p_box} "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> "
                f"/ProcSet [/PDF /Text] >> /Contents {content_id} 0 R >>"
            ).encode()
            objects.append(page_dict)

            content_dict = (
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode()
                + stream_bytes
                + b"\nendstream"
            )
            objects.append(content_dict)

        # Serialize PDF with exact cross-reference table and trailer
        output = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for obj_idx, obj in enumerate(objects, start=1):
            offsets.append(len(output))
            output.extend(f"{obj_idx} 0 obj\n".encode())
            output.extend(obj)
            output.extend(b"\nendobj\n")

        xref_start = len(output)
        output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
        output.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            output.extend(f"{offset:010d} 00000 n \n".encode())

        output.extend(
            (
                f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
                f"startxref\n{xref_start}\n%%EOF\n"
            ).encode()
        )

        return bytes(output)
