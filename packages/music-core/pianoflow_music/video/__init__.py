"""Falling-note video rendering (VIDEO_TUTORIAL_SPEC.md §4-6).

Pure frame/timeline math — no I/O, no encoders. The worker owns FluidSynth
and FFmpeg subprocesses; this package produces scaled timelines and RGB
frame buffers.
"""

from pianoflow_music.video.frames import FrameRenderer, RenderConfig
from pianoflow_music.video.layout import KeyboardLayout
from pianoflow_music.video.timeline import apply_speed

__all__ = ["FrameRenderer", "KeyboardLayout", "RenderConfig", "apply_speed"]
