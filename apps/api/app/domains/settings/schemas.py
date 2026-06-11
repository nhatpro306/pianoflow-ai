"""Settings DTOs + validation (VIDEO_TUTORIAL_SPEC.md §3, §9)."""

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.domains.settings.presets import VALID_PRESET_NAMES

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

COLOR_KEYS = (
    "right_hand",
    "left_hand",
    "key_highlight",
    "glow",
    "hit_effect",
    "background",
)


class ColorsModel(BaseModel):
    right_hand: str
    left_hand: str
    key_highlight: str
    glow: str
    hit_effect: str
    background: str

    @field_validator(*COLOR_KEYS)
    @classmethod
    def check_hex(cls, value: str) -> str:
        if not HEX_RE.match(value):
            raise ValueError(f"invalid HEX color {value!r} (expected #RRGGBB)")
        return value.lower()


PIANO_SOUNDS = (
    "concert_grand",
    "bright_grand",
    "warm_grand",
    "upright",
    "felt",
    "electric",
)

REVERB_LEVELS = ("off", "light", "medium", "hall")


class SettingsOut(BaseModel):
    resolution: str
    fps: int
    speed_multiplier: float
    piano_sound: str
    volume: float
    reverb: str
    difficulty: str
    show_note_names: bool
    show_keyboard: bool
    theme_preset: str
    colors: dict
    glow_intensity: float
    note_fall_speed: float
    keyboard_size: float
    version: int

    model_config = {"from_attributes": True}


class SettingsPatch(BaseModel):
    """All fields optional — partial update. Bounds per spec §3."""

    resolution: Literal["720p", "1080p"] | None = None
    fps: Literal[30, 60] | None = None
    speed_multiplier: float | None = Field(default=None, ge=0.25, le=2.0)
    piano_sound: (
        Literal["concert_grand", "bright_grand", "warm_grand", "upright", "felt", "electric"] | None
    ) = None
    volume: float | None = Field(default=None, ge=0.0, le=1.0)
    reverb: Literal["off", "light", "medium", "hall"] | None = None
    difficulty: Literal["original", "easy", "very_easy"] | None = None
    show_note_names: bool | None = None
    show_keyboard: bool | None = None
    theme_preset: str | None = None
    colors: ColorsModel | None = None
    glow_intensity: float | None = Field(default=None, ge=0.0, le=1.0)
    note_fall_speed: float | None = Field(default=None, ge=0.25, le=3.0)
    keyboard_size: float | None = Field(default=None, ge=0.7, le=1.3)

    @field_validator("theme_preset")
    @classmethod
    def check_preset(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_PRESET_NAMES:
            raise ValueError(f"unknown preset {value!r}")
        return value
