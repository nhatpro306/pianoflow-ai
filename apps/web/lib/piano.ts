/**
 * 88-key piano geometry shared by PianoRollPreview and KeyboardVisualizer.
 * Pitch range: A0 (21) .. C8 (108). The backend video renderer implements
 * the same layout (music-core video/layout.py, Phase 7).
 */
import { LIMITS } from "@pianoflow/shared-types";

export const LOWEST = LIMITS.PIANO_LOWEST_PITCH; // 21
export const HIGHEST = LIMITS.PIANO_HIGHEST_PITCH; // 108

const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlack(pitch: number): boolean {
  return BLACK_CLASSES.has(pitch % 12);
}

/** Count of white keys from A0 up to (exclusive) the given pitch. */
export function whiteIndex(pitch: number): number {
  let count = 0;
  for (let p = LOWEST; p < pitch; p++) {
    if (!isBlack(p)) count++;
  }
  return count;
}

export const WHITE_KEY_COUNT = whiteIndex(HIGHEST) + 1; // 52

// Precomputed lookup: pitch → white-key index (black keys map to the white key left of them).
const WHITE_INDEX: number[] = (() => {
  const table: number[] = [];
  let count = 0;
  for (let p = LOWEST; p <= HIGHEST; p++) {
    table[p - LOWEST] = isBlack(p) ? count - 1 : count;
    if (!isBlack(p)) count++;
  }
  return table;
})();

/**
 * Horizontal position of a pitch on a keyboard of `width` px.
 * Returns { x, w } of the key rectangle.
 */
export function keyRect(pitch: number, width: number): { x: number; w: number } {
  const whiteW = width / WHITE_KEY_COUNT;
  const index = WHITE_INDEX[pitch - LOWEST];
  if (isBlack(pitch)) {
    const blackW = whiteW * 0.6;
    return { x: (index + 1) * whiteW - blackW / 2, w: blackW };
  }
  return { x: index * whiteW, w: whiteW };
}

export const HAND_COLORS: Record<string, string> = {
  R: LIMITS.HAND_COLOR_RIGHT,
  L: LIMITS.HAND_COLOR_LEFT,
};
