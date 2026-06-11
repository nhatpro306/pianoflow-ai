"""88-key keyboard geometry — Python mirror of apps/web/lib/piano.ts.

Same constants, same keyRect math, so falling notes in the export land on
exactly the keys the browser preview showed.
"""

from dataclasses import dataclass

from pianoflow_music.notes.model import PIANO_HIGHEST_PITCH, PIANO_LOWEST_PITCH

_BLACK_CLASSES = frozenset({1, 3, 6, 8, 10})

BLACK_WIDTH_RATIO = 0.6  # of a white key width (matches piano.ts keyRect)


def is_black(pitch: int) -> bool:
    return pitch % 12 in _BLACK_CLASSES


def _build_white_index() -> list[int]:
    table: list[int] = []
    count = 0
    for pitch in range(PIANO_LOWEST_PITCH, PIANO_HIGHEST_PITCH + 1):
        table.append(count - 1 if is_black(pitch) else count)
        if not is_black(pitch):
            count += 1
    return table


_WHITE_INDEX = _build_white_index()
WHITE_KEY_COUNT = sum(
    1 for pitch in range(PIANO_LOWEST_PITCH, PIANO_HIGHEST_PITCH + 1) if not is_black(pitch)
)  # 52


@dataclass(frozen=True)
class KeyRect:
    x: float
    w: float


class KeyboardLayout:
    """Horizontal pitch → x/width mapping for a keyboard `width` px wide."""

    def __init__(self, width: int) -> None:
        self.width = width
        self.white_w = width / WHITE_KEY_COUNT

    def key_rect(self, pitch: int) -> KeyRect:
        if not PIANO_LOWEST_PITCH <= pitch <= PIANO_HIGHEST_PITCH:
            raise ValueError(f"Pitch {pitch} outside piano range.")
        index = _WHITE_INDEX[pitch - PIANO_LOWEST_PITCH]
        if is_black(pitch):
            w = self.white_w * BLACK_WIDTH_RATIO
            x = (index + 1) * self.white_w - w / 2
            return KeyRect(x=x, w=w)
        return KeyRect(x=index * self.white_w, w=self.white_w)
