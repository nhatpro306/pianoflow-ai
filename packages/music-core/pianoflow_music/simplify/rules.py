"""Simplification constants — single source of truth for both Python and tests."""

# Notes starting within this window are treated as a single chord cluster.
CHORD_WINDOW_SEC: float = 0.04

# Notes to keep per chord cluster per hand.
# Right hand: top-N by pitch. Left hand: top-1 (highest) + bottom-1 (lowest).
EASY_NOTES_PER_CLUSTER: int = 2
VERY_EASY_NOTES_PER_CLUSTER: int = 1

# Maximum notes per beat (both hands combined) after cluster reduction.
EASY_MAX_NOTES_PER_BEAT: float = 6.0
VERY_EASY_MAX_NOTES_PER_BEAT: float = 3.0
