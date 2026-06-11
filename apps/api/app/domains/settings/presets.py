"""Preset color themes — Python mirror of packages/shared-types/src/themes.json.

Kept as a copy (not a cross-package file read) so the API has no path
dependency on the Node workspace; a conformance test asserting equality with
themes.json runs in CI once the worker consumes these too (Phase 7).
"""

DEFAULT_PRESET = "classic"

PRESETS: dict[str, dict[str, str]] = {
    "classic": {
        "right_hand": "#7c3aed",
        "left_hand": "#3b82f6",
        "key_highlight": "#a78bfa",
        "glow": "#8b5cf6",
        "hit_effect": "#ffffff",
        "background": "#050507",
    },
    "white_glow": {
        "right_hand": "#f4f4f5",
        "left_hand": "#a1a1aa",
        "key_highlight": "#e4e4e7",
        "glow": "#ffffff",
        "hit_effect": "#ffffff",
        "background": "#050507",
    },
    "neon": {
        "right_hand": "#ec4899",
        "left_hand": "#22d3ee",
        "key_highlight": "#f9a8d4",
        "glow": "#f0abfc",
        "hit_effect": "#ffffff",
        "background": "#060410",
    },
    "gold": {
        "right_hand": "#f59e0b",
        "left_hand": "#fbbf24",
        "key_highlight": "#fcd34d",
        "glow": "#fde68a",
        "hit_effect": "#fffbeb",
        "background": "#0a0703",
    },
    "green_cyan": {
        "right_hand": "#10b981",
        "left_hand": "#06b6d4",
        "key_highlight": "#6ee7b7",
        "glow": "#34d399",
        "hit_effect": "#ecfdf5",
        "background": "#030807",
    },
    "red_orange": {
        "right_hand": "#ef4444",
        "left_hand": "#f97316",
        "key_highlight": "#fca5a5",
        "glow": "#fb923c",
        "hit_effect": "#fff7ed",
        "background": "#0a0404",
    },
}

VALID_PRESET_NAMES = set(PRESETS) | {"custom"}
