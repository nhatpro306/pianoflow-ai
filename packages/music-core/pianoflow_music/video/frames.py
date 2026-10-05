"""Falling-note frame renderer (VIDEO_TUTORIAL_SPEC.md §6).

Composition top→bottom: background → glowing falling notes → fog band →
hit line → keyboard. Pure CPU rendering with Pillow + numpy; deterministic
for golden-frame tests. The renderer consumes an already speed-scaled
timeline (video/timeline.py) — frame i shows t = i / fps.
"""

import bisect
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from pianoflow_music.notes.model import Note, NoteData
from pianoflow_music.video.layout import KeyboardLayout, is_black

RESOLUTIONS = {
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "720p_vertical": (720, 1280),
    "1080p_vertical": (1080, 1920),
}

_KEYBOARD_HEIGHT_RATIO = 0.18
_HIT_LINE_HEIGHT = 4
_FOG_HEIGHT_RATIO = 0.10
_LOOKAHEAD_SECONDS = 3.0  # falling distance == lookahead window
_HIT_FLASH_SECONDS = 0.15
_MIN_NOTE_HEIGHT = 8
_NOTE_RADIUS = 4
_GLOW_DOWNSCALE = 4


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
    show_note_names: bool = False


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
            "left": _hex_to_rgb(colors.get("left_hand", "#22d3ee")),
            "key_highlight": _hex_to_rgb(colors.get("key_highlight", "#a78bfa")),
            "glow": _hex_to_rgb(colors.get("glow", "#8b5cf6")),
            "hit_effect": _hex_to_rgb(colors.get("hit_effect", "#ffffff")),
        }
        self._font = ImageFont.load_default()
        self._keyboard_base = self._render_keyboard_base()
        self._fog = self._render_fog()

        # Radiant vertical hit glow precomputed columns (P3)
        self.beam_h = min(int(self.keyboard_h * 1.2), 100)
        self._beam_cache: dict[tuple[int, str], Image.Image] = {}
        if self.beam_h > 0 and self.config.glow_intensity > 0:
            t_vals = np.linspace(0.0, 1.0, self.beam_h)
            alphas = (0.35 * self.config.glow_intensity * (t_vals**2) * 255).astype(np.uint8)
            beams_1px: dict[str, Image.Image] = {}
            for hand_key, col in [
                ("R", self._rgb["right"]),
                ("L", self._rgb["left"]),
                ("default", self._rgb["key_highlight"]),
            ]:
                arr = np.zeros((self.beam_h, 1, 4), dtype=np.uint8)
                arr[..., 0] = col[0]
                arr[..., 1] = col[1]
                arr[..., 2] = col[2]
                arr[..., 3] = alphas[:, None]
                beams_1px[hand_key] = Image.fromarray(arr, "RGBA")

            for pitch in range(21, 109):
                rect = self.layout.key_rect(pitch)
                x0 = max(0, int(rect.x - 1))
                x1 = min(self.width, int(rect.x + rect.w + 1))
                bw = x1 - x0
                if bw > 0:
                    for hand_key in ("R", "L", "default"):
                        self._beam_cache[(pitch, hand_key)] = beams_1px[hand_key].resize(
                            (bw, self.beam_h), Image.Resampling.BILINEAR
                        )

        # Precompute maximum note duration for two-sided bisect scan (P1)
        self.max_note_duration = max((note.duration for note in self.notes), default=0.0)

        # Preallocated buffers for per-frame allocation reuse (P3)
        self._frame = Image.new("RGB", (self.width, self.height), self._rgb["background"])
        self._note_layer = Image.new("RGBA", (self.width, self.hit_y), (0, 0, 0, 0))
        self._small_glow_size = (
            max(1, self.width // _GLOW_DOWNSCALE),
            max(1, self.hit_y // _GLOW_DOWNSCALE),
        )

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
        # Non-linear (quadratic) fog for smoother blending
        t_vals = np.linspace(0.0, 1.0, fog_h)
        alphas = (0.45 * (t_vals**2) * 255).astype(np.uint8)
        gradient[..., 0] = glow[0]
        gradient[..., 1] = glow[1]
        gradient[..., 2] = glow[2]
        gradient[..., 3] = alphas[:, None]
        return Image.fromarray(gradient, "RGBA")

    # ── per-frame ───────────────────────────────────────────

    def _visible_notes(self, t: float):
        """Notes whose bar intersects the falling window at time t.
        Visible while start in [t - max_note_duration - 0.5, t + lookahead]."""
        lo = bisect.bisect_left(self._starts, t - self.max_note_duration - 0.5)
        hi = bisect.bisect_right(self._starts, t + self.lookahead)
        for i in range(lo, hi):
            note = self.notes[i]
            if note.end + 0.5 >= t:
                yield note

    def render_frame(self, frame_index: int) -> bytes:
        t = frame_index / self.config.fps

        # Buffer reuse: reset frame background (P3)
        frame = self._frame
        frame.paste(self._rgb["background"], (0, 0, self.width, self.height))

        active_keys: dict[int, str] = {}
        hit_pulses: list[tuple[int, float]] = []
        visible_rects: list[tuple[tuple[int, int, int, int], tuple[int, int, int], Note]] = []

        for note in self._visible_notes(t):
            rect = self.layout.key_rect(note.pitch)
            color = self._rgb["right"] if note.hand == "R" else self._rgb["left"]
            height = max(note.duration * self._px_per_second, _MIN_NOTE_HEIGHT)
            # Bottom edge hits the line exactly at t == note.start.
            bottom = self.hit_y - (note.start - t) * self._px_per_second
            top = bottom - height
            if bottom < 0 or top > self.hit_y:
                continue
            r_coords = (rect.x + 1, max(top, -20), rect.x + rect.w - 1, min(bottom, self.hit_y))
            visible_rects.append((r_coords, color, note))
            if note.start <= t <= note.end and (note.pitch not in active_keys or note.hand == "R"):
                active_keys[note.pitch] = note.hand
            if note.start <= t <= note.start + _HIT_FLASH_SECONDS:
                hit_pulses.append((note.pitch, t - note.start))

        # Crop & Downsample GaussianBlur Glow (P2)
        if visible_rects:
            note_layer = self._note_layer
            note_layer.paste((0, 0, 0, 0), (0, 0, self.width, self.hit_y))
            draw_notes = ImageDraw.Draw(note_layer)
            for r_coords, color, _note in visible_rects:
                draw_notes.rounded_rectangle(
                    r_coords,
                    radius=_NOTE_RADIUS,
                    fill=(*color, 255),
                )

            if self.config.glow_intensity > 0:
                blur_radius = 2 + self.config.glow_intensity * 6
                small_layer = note_layer.resize(self._small_glow_size, Image.Resampling.NEAREST)
                glow_small = small_layer.filter(
                    ImageFilter.GaussianBlur(blur_radius / _GLOW_DOWNSCALE)
                )
                glow_layer = glow_small.resize((self.width, self.hit_y), Image.Resampling.NEAREST)
                frame.paste(glow_layer, (0, 0), glow_layer)

            # Draw sharp note bodies directly onto frame (avoids full-frame alpha mask paste)
            draw_frame = ImageDraw.Draw(frame)
            for r_coords, color, _note in visible_rects:
                draw_frame.rounded_rectangle(
                    r_coords,
                    radius=_NOTE_RADIUS,
                    fill=color,
                )

            # Note Pitch Name Labels (when config.show_note_names is True)
            if self.config.show_note_names:
                for (x0, y0, x1, y1), _color, note in visible_rects:
                    bar_w = x1 - x0
                    bar_h = y1 - y0
                    if bar_w >= 16 and bar_h >= 18 and note.name:
                        text = note.name
                        bbox = self._font.getbbox(text)
                        tw = bbox[2] - bbox[0]
                        th = bbox[3] - bbox[1]
                        tx = x0 + (bar_w - tw) // 2
                        ty = y1 - th - 4
                        if ty > y0:
                            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                                draw_frame.text(
                                    (tx + ox, ty + oy), text, fill=(0, 0, 0), font=self._font
                                )
                            draw_frame.text((tx, ty), text, fill=(255, 255, 255), font=self._font)

        frame.paste(self._fog, (0, self.hit_y - self._fog.height), self._fog)

        # Radiant Vertical Hit Glow above active keys at the hit line
        if self.config.glow_intensity > 0 and active_keys:
            for pitch, hand in active_keys.items():
                beam = self._beam_cache.get((pitch, hand)) or self._beam_cache.get(
                    (pitch, "default")
                )
                if beam:
                    rect = self.layout.key_rect(pitch)
                    x0 = max(0, int(rect.x - 1))
                    frame.paste(beam, (x0, self.hit_y - self.beam_h), beam)

        # Hit line + 150 ms radial pulses.
        draw_frame = ImageDraw.Draw(frame, "RGBA")
        draw_frame.rectangle(
            (0, self.hit_y - _HIT_LINE_HEIGHT, self.width, self.hit_y),
            fill=(*self._rgb["hit_effect"], 230),
        )
        for pitch, time_since_hit in hit_pulses:
            rect = self.layout.key_rect(pitch)
            cx = rect.x + rect.w / 2

            progress = time_since_hit / _HIT_FLASH_SECONDS

            # Horizontal glowing bar that expands and fades
            bar_width = rect.w * (2.0 + 4.0 * progress)
            bar_height = 4.0 * (1.0 - progress)
            alpha = int(200 * (1.0 - progress))

            if alpha > 0:
                draw_frame.ellipse(
                    (
                        cx - bar_width / 2,
                        self.hit_y - bar_height / 2,
                        cx + bar_width / 2,
                        self.hit_y + bar_height / 2,
                    ),
                    fill=(*self._rgb["hit_effect"], alpha),
                )

                # Core bright spark
                core_width = rect.w * (1.0 + 1.0 * progress)
                core_height = 2.0
                core_alpha = int(255 * (1.0 - progress) ** 2)
                draw_frame.ellipse(
                    (
                        cx - core_width / 2,
                        self.hit_y - core_height / 2,
                        cx + core_width / 2,
                        self.hit_y + core_height / 2,
                    ),
                    fill=(*self._rgb["hit_effect"], core_alpha),
                )

        # Keyboard with hand-specific lit keys
        if active_keys:
            keyboard = self._keyboard_base.copy()
            draw_keys = ImageDraw.Draw(keyboard)
            for pitch, hand in active_keys.items():
                if not is_black(pitch):
                    rect = self.layout.key_rect(pitch)
                    hand_color = (
                        self._rgb["right"]
                        if hand == "R"
                        else self._rgb["left"]
                        if hand == "L"
                        else self._rgb["key_highlight"]
                    )
                    draw_keys.rectangle(
                        (rect.x + 1, 0, rect.x + rect.w - 1, self.keyboard_h - 1),
                        fill=hand_color,
                    )
            for pitch in range(21, 109):
                if is_black(pitch):
                    rect = self.layout.key_rect(pitch)
                    black_h = self.keyboard_h * 0.62
                    if pitch in active_keys:
                        hand = active_keys[pitch]
                        hand_color = (
                            self._rgb["right"]
                            if hand == "R"
                            else self._rgb["left"]
                            if hand == "L"
                            else self._rgb["key_highlight"]
                        )
                        draw_keys.rectangle(
                            (rect.x, 0, rect.x + rect.w, black_h),
                            fill=hand_color,
                        )
                    else:
                        draw_keys.rectangle(
                            (rect.x, 0, rect.x + rect.w, black_h),
                            fill=(12, 12, 14),
                        )
            frame.paste(keyboard, (0, self.hit_y))
        else:
            frame.paste(self._keyboard_base, (0, self.hit_y))

        return frame.tobytes()  # raw RGB24, ready for the FFmpeg rawvideo pipe
