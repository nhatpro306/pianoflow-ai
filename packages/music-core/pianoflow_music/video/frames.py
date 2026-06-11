"""Falling-note frame renderer (VIDEO_TUTORIAL_SPEC.md §6).

Composition top→bottom: background → glowing falling notes → fog band →
hit line → keyboard. Pure CPU rendering with Pillow + numpy; deterministic
for golden-frame tests. The renderer consumes an already speed-scaled
timeline (video/timeline.py) — frame i shows t = i / fps.
"""

import bisect
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from pianoflow_music.notes.model import NoteData
from pianoflow_music.video.layout import KeyboardLayout, is_black

RESOLUTIONS = {"720p": (1280, 720), "1080p": (1920, 1080)}

_KEYBOARD_HEIGHT_RATIO = 0.18
_HIT_LINE_HEIGHT = 4
_FOG_HEIGHT_RATIO = 0.10
_LOOKAHEAD_SECONDS = 3.0  # falling distance == lookahead window
_HIT_FLASH_SECONDS = 0.15
_MIN_NOTE_HEIGHT = 8
_NOTE_RADIUS = 4


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


@dataclass(frozen=True)
class RenderConfig:
    resolution: str = "720p"
    fps: int = 30
    colors: dict[str, str] = field(default_factory=dict)
    glow_intensity: float = 0.6
    keyboard_size: float = 1.0
    note_fall_speed: float = 1.0


class FrameRenderer:
    def __init__(self, note_data: NoteData, config: RenderConfig) -> None:
        if config.resolution not in RESOLUTIONS:
            raise ValueError(f"Unsupported resolution {config.resolution!r}.")
        self.width, self.height = RESOLUTIONS[config.resolution]
        self.config = config
        self.notes = sorted(note_data.notes, key=lambda note: note.start)
        self._starts = [note.start for note in self.notes]
        self.duration = note_data.duration_sec

        keyboard_scale = min(max(config.keyboard_size, 0.7), 1.3)
        self.keyboard_h = int(self.height * _KEYBOARD_HEIGHT_RATIO * keyboard_scale)
        self.hit_y = self.height - self.keyboard_h  # hit line = top of keyboard
        self.layout = KeyboardLayout(self.width)
        self.lookahead = _LOOKAHEAD_SECONDS / max(config.note_fall_speed, 0.25)
        self._px_per_second = self.hit_y / self.lookahead

        colors = config.colors
        self._rgb = {
            "background": _hex_to_rgb(colors.get("background", "#050507")),
            "right": _hex_to_rgb(colors.get("right_hand", "#7c3aed")),
            "left": _hex_to_rgb(colors.get("left_hand", "#3b82f6")),
            "key_highlight": _hex_to_rgb(colors.get("key_highlight", "#a78bfa")),
            "glow": _hex_to_rgb(colors.get("glow", "#8b5cf6")),
            "hit_effect": _hex_to_rgb(colors.get("hit_effect", "#ffffff")),
        }
        self._keyboard_base = self._render_keyboard_base()
        self._fog = self._render_fog()

    @property
    def total_frames(self) -> int:
        # Tail pad: one lookahead-free second so the last notes finish on screen.
        return int((self.duration + 1.0) * self.config.fps) + 1

    # ── static layers ───────────────────────────────────────

    def _render_keyboard_base(self) -> Image.Image:
        image = Image.new("RGB", (self.width, self.keyboard_h), (16, 16, 18))
        draw = ImageDraw.Draw(image)
        for pitch in range(21, 109):
            rect = self.layout.key_rect(pitch)
            if not is_black(pitch):
                draw.rectangle(
                    (rect.x + 1, 0, rect.x + rect.w - 1, self.keyboard_h - 1),
                    fill=(232, 232, 235),
                )
        for pitch in range(21, 109):
            rect = self.layout.key_rect(pitch)
            if is_black(pitch):
                draw.rectangle(
                    (rect.x, 0, rect.x + rect.w, self.keyboard_h * 0.62),
                    fill=(12, 12, 14),
                )
        return image

    def _render_fog(self) -> Image.Image:
        fog_h = max(int(self.height * _FOG_HEIGHT_RATIO), 1)
        glow = self._rgb["glow"]
        gradient = np.zeros((fog_h, self.width, 4), dtype=np.uint8)
        alphas = (np.linspace(0.0, 0.45, fog_h) * 255).astype(np.uint8)
        gradient[..., 0] = glow[0]
        gradient[..., 1] = glow[1]
        gradient[..., 2] = glow[2]
        gradient[..., 3] = alphas[:, None]
        return Image.fromarray(gradient, "RGBA")

    # ── per-frame ───────────────────────────────────────────

    def _visible_notes(self, t: float):
        """Notes whose bar intersects the falling window at time t.
        Visible while start in [t - dur_on_screen, t + lookahead]."""
        hi = bisect.bisect_right(self._starts, t + self.lookahead)
        for note in self.notes[:hi]:
            if note.end + 0.5 >= t:
                yield note

    def render_frame(self, frame_index: int) -> bytes:
        t = frame_index / self.config.fps
        frame = Image.new("RGB", (self.width, self.height), self._rgb["background"])

        # Falling notes on their own layer (RGBA) so glow blur stays cheap.
        note_layer = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(note_layer)
        active_pitches: list[int] = []
        hit_pulses: list[int] = []

        for note in self._visible_notes(t):
            rect = self.layout.key_rect(note.pitch)
            color = self._rgb["right"] if note.hand == "R" else self._rgb["left"]
            height = max(note.duration * self._px_per_second, _MIN_NOTE_HEIGHT)
            # Bottom edge hits the line exactly at t == note.start.
            bottom = self.hit_y - (note.start - t) * self._px_per_second
            top = bottom - height
            if bottom < 0 or top > self.hit_y:
                continue
            draw.rounded_rectangle(
                (rect.x + 1, max(top, -20), rect.x + rect.w - 1, min(bottom, self.hit_y)),
                radius=_NOTE_RADIUS,
                fill=(*color, 255),
            )
            if note.start <= t <= note.end:
                active_pitches.append(note.pitch)
            if note.start <= t <= note.start + _HIT_FLASH_SECONDS:
                hit_pulses.append(note.pitch)

        if self.config.glow_intensity > 0:
            blur_radius = 2 + self.config.glow_intensity * 6
            glow_layer = note_layer.filter(ImageFilter.GaussianBlur(blur_radius))
            frame.paste(glow_layer, (0, 0), glow_layer)
        frame.paste(note_layer, (0, 0), note_layer)

        frame.paste(self._fog, (0, self.hit_y - self._fog.height), self._fog)

        # Hit line + 150 ms radial pulses.
        draw_frame = ImageDraw.Draw(frame, "RGBA")
        draw_frame.rectangle(
            (0, self.hit_y - _HIT_LINE_HEIGHT, self.width, self.hit_y),
            fill=(*self._rgb["hit_effect"], 230),
        )
        for pitch in hit_pulses:
            rect = self.layout.key_rect(pitch)
            cx = rect.x + rect.w / 2
            radius = rect.w * 1.2
            draw_frame.ellipse(
                (cx - radius, self.hit_y - radius, cx + radius, self.hit_y + radius),
                fill=(*self._rgb["hit_effect"], 70),
            )

        # Keyboard with lit keys.
        keyboard = self._keyboard_base.copy()
        if active_pitches:
            draw_keys = ImageDraw.Draw(keyboard)
            for pitch in active_pitches:
                rect = self.layout.key_rect(pitch)
                key_h = self.keyboard_h * (0.62 if is_black(pitch) else 1.0)
                draw_keys.rectangle(
                    (rect.x + 1, 0, rect.x + rect.w - 1, key_h - 1),
                    fill=self._rgb["key_highlight"],
                )
        frame.paste(keyboard, (0, self.hit_y))

        return frame.tobytes()  # raw RGB24, ready for the FFmpeg rawvideo pipe
