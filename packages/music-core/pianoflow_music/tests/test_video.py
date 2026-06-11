"""Video timeline/layout/frame renderer tests."""

import hashlib

import pytest

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.video.frames import RESOLUTIONS, FrameRenderer, RenderConfig
from pianoflow_music.video.layout import WHITE_KEY_COUNT, KeyboardLayout, is_black
from pianoflow_music.video.timeline import apply_speed


def _note(i: int, pitch: int, start: float, end: float, hand: str = "R") -> Note:
    return Note(
        id=i,
        pitch=pitch,
        name="C4",
        velocity=80,
        start=start,
        end=end,
        duration=end - start,
        track=0,
        hand=hand,
    )


def _note_data() -> NoteData:
    return NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=120.0,
        duration_sec=4.0,
        time_signature="4/4",
        notes=[
            _note(0, 60, 0.0, 0.5),
            _note(1, 64, 1.0, 2.0),
            _note(2, 36, 2.0, 3.0, hand="L"),
            _note(3, 96, 3.0, 4.0),
        ],
        sustain=[{"time": 1.0, "value": 127}, {"time": 3.0, "value": 0}],
    )


class TestTimeline:
    def test_double_speed_halves_times(self) -> None:
        scaled = apply_speed(_note_data(), 2.0)
        assert scaled.duration_sec == pytest.approx(2.0)
        assert scaled.notes[1].start == pytest.approx(0.5)
        assert scaled.notes[1].end == pytest.approx(1.0)
        assert scaled.sustain[0]["time"] == pytest.approx(0.5)

    def test_half_speed_doubles_times(self) -> None:
        scaled = apply_speed(_note_data(), 0.5)
        assert scaled.duration_sec == pytest.approx(8.0)
        assert scaled.notes[3].end == pytest.approx(8.0)

    def test_speed_clamped(self) -> None:
        scaled = apply_speed(_note_data(), 99.0)  # clamps to 2.0
        assert scaled.duration_sec == pytest.approx(2.0)

    def test_unit_speed_is_identity(self) -> None:
        data = _note_data()
        assert apply_speed(data, 1.0) is data


class TestLayout:
    def test_white_key_count(self) -> None:
        assert WHITE_KEY_COUNT == 52

    def test_full_range_covered(self) -> None:
        layout = KeyboardLayout(1280)
        for pitch in range(21, 109):
            rect = layout.key_rect(pitch)
            assert 0 <= rect.x < 1280
            assert rect.w > 0

    def test_black_keys_narrower_and_offset(self) -> None:
        layout = KeyboardLayout(1040)  # white width = 20
        c4 = layout.key_rect(60)
        c_sharp4 = layout.key_rect(61)
        assert is_black(61)
        assert c_sharp4.w == pytest.approx(c4.w * 0.6)
        # Black key straddles the boundary between its neighbors.
        assert c4.x < c_sharp4.x < c4.x + c4.w + c_sharp4.w

    def test_out_of_range_rejected(self) -> None:
        with pytest.raises(ValueError):
            KeyboardLayout(1280).key_rect(20)


class TestFrameRenderer:
    def test_frame_size_and_format(self) -> None:
        renderer = FrameRenderer(_note_data(), RenderConfig(resolution="720p", fps=30))
        frame = renderer.render_frame(0)
        width, height = RESOLUTIONS["720p"]
        assert len(frame) == width * height * 3  # raw RGB24

    def test_no_4k(self) -> None:
        with pytest.raises(ValueError):
            FrameRenderer(_note_data(), RenderConfig(resolution="4k"))

    def test_total_frames_scale_with_fps(self) -> None:
        data = _note_data()
        at30 = FrameRenderer(data, RenderConfig(fps=30)).total_frames
        at60 = FrameRenderer(data, RenderConfig(fps=60)).total_frames
        assert at60 == pytest.approx(at30 * 2, abs=2)

    def test_rendering_is_deterministic(self) -> None:
        config = RenderConfig(resolution="720p", fps=30, glow_intensity=0.6)
        a = FrameRenderer(_note_data(), config).render_frame(30)
        b = FrameRenderer(_note_data(), config).render_frame(30)
        assert hashlib.sha256(a).digest() == hashlib.sha256(b).digest()

    def test_active_note_changes_frame_vs_idle(self) -> None:
        renderer = FrameRenderer(_note_data(), RenderConfig(fps=30))
        # t=1.5s: note 1 sounding; t far past the song: nothing on screen.
        active = renderer.render_frame(45)
        idle = renderer.render_frame(renderer.total_frames - 1)
        assert active != idle

    def test_theme_colors_change_output(self) -> None:
        data = _note_data()
        violet = FrameRenderer(data, RenderConfig(colors={"right_hand": "#7c3aed"})).render_frame(
            45
        )
        gold = FrameRenderer(data, RenderConfig(colors={"right_hand": "#f59e0b"})).render_frame(45)
        assert violet != gold


class TestMidiWrite:
    def test_round_trip_preserves_timing_and_count(self) -> None:
        data = _note_data()
        parsed = parse_midi_bytes(note_data_to_midi_bytes(data))
        assert len(parsed.notes) == len(data.notes)
        assert parsed.duration_sec == pytest.approx(data.duration_sec, abs=0.01)
        original_starts = sorted(note.start for note in data.notes)
        parsed_starts = sorted(note.start for note in parsed.notes)
        for original, round_tripped in zip(original_starts, parsed_starts, strict=True):
            assert round_tripped == pytest.approx(original, abs=0.005)

    def test_sustain_events_written(self) -> None:
        parsed = parse_midi_bytes(note_data_to_midi_bytes(_note_data()))
        assert len(parsed.sustain) == 2
        assert parsed.sustain[0]["time"] == pytest.approx(1.0, abs=0.005)

    def test_velocity_preserved(self) -> None:
        data = _note_data()
        parsed = parse_midi_bytes(note_data_to_midi_bytes(data))
        assert {note.velocity for note in parsed.notes} == {80}
