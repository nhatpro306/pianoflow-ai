"""FrameRenderer unit tests for visual polish (Phase G)."""

import hashlib

from PIL import Image

from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.video.frames import RESOLUTIONS, FrameRenderer, RenderConfig


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


class TestFrameRendererPolish:
    def test_frame_size_and_format(self) -> None:
        renderer = FrameRenderer(_note_data(), RenderConfig(resolution="720p", fps=30))
        frame = renderer.render_frame(0)
        width, height = RESOLUTIONS["720p"]
        assert len(frame) == width * height * 3

    def test_rendering_is_deterministic(self) -> None:
        config = RenderConfig(resolution="720p", fps=30, glow_intensity=0.6)
        a = FrameRenderer(_note_data(), config).render_frame(30)
        b = FrameRenderer(_note_data(), config).render_frame(30)
        assert hashlib.sha256(a).digest() == hashlib.sha256(b).digest()

    def test_hand_specific_key_lighting(self) -> None:
        """Right hand notes light keys with violet, left hand notes light keys with cyan."""
        data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=120.0,
            duration_sec=3.0,
            time_signature="4/4",
            notes=[
                _note(0, 60, 1.0, 2.0, hand="R"),
                _note(1, 48, 1.0, 2.0, hand="L"),
            ],
        )
        renderer = FrameRenderer(data, RenderConfig(resolution="720p", fps=30))
        frame_bytes = renderer.render_frame(30)
        img = Image.frombytes("RGB", (renderer.width, renderer.height), frame_bytes)
        rect_rh = renderer.layout.key_rect(60)
        rect_lh = renderer.layout.key_rect(48)
        rh_pixel = img.getpixel(
            (int(rect_rh.x + rect_rh.w / 2), renderer.hit_y + renderer.keyboard_h // 2)
        )
        lh_pixel = img.getpixel(
            (int(rect_lh.x + rect_lh.w / 2), renderer.hit_y + renderer.keyboard_h // 2)
        )
        assert rh_pixel == (124, 58, 237)
        assert lh_pixel == (34, 211, 238)

    def test_show_note_names_flag(self) -> None:
        """Enabling show_note_names modifies rendered falling note bytes vs disabled."""
        data = _note_data()
        renderer_off = FrameRenderer(data, RenderConfig(fps=30, show_note_names=False))
        renderer_on = FrameRenderer(data, RenderConfig(fps=30, show_note_names=True))
        frame_off = renderer_off.render_frame(15)
        frame_on = renderer_on.render_frame(15)
        assert frame_off != frame_on

    def test_radiant_vertical_glow(self) -> None:
        """Active keys project radiant upward glow column above the hit line."""
        data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=120.0,
            duration_sec=3.0,
            time_signature="4/4",
            notes=[_note(0, 60, 1.0, 1.05, hand="R")],
        )
        renderer = FrameRenderer(data, RenderConfig(fps=30, glow_intensity=0.8))
        frame_active = renderer.render_frame(31)
        frame_idle = renderer.render_frame(0)
        img_active = Image.frombytes("RGB", (renderer.width, renderer.height), frame_active)
        img_idle = Image.frombytes("RGB", (renderer.width, renderer.height), frame_idle)
        rect = renderer.layout.key_rect(60)
        sample_x = int(rect.x + rect.w / 2)
        sample_y = renderer.hit_y - 50
        active_pixel = img_active.getpixel((sample_x, sample_y))
        idle_pixel = img_idle.getpixel((sample_x, sample_y))
        assert active_pixel != idle_pixel
        assert active_pixel[0] > idle_pixel[0]
        assert active_pixel[2] > idle_pixel[2]
