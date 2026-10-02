# Phase 7C: Video Visual Polish & Vertical Format Plan

**Goal:** Close the gap to cinematic reference looks (Synthesia / TikTok piano videos) by improving the `FrameRenderer` in Python and adding 9:16 aspect ratios.

## Features

### 1. Vertical Formats (9:16 for Shorts / TikTok)
- Add `"720p_vertical"` (720x1280) and `"1080p_vertical"` (1080x1920) to `RESOLUTIONS` in `packages/shared-types/src/constants.json`.
- Add these mapping tuples to `RESOLUTIONS` dictionary in `packages/music-core/pianoflow_music/video/frames.py`.
- Ensure the `KeyboardLayout` math respects the `width` correctly so 88 keys fit, even if narrowly.

### 2. Bloom & Glow Pass
- Modify `frames.py` to create a `notes_layer` image.
- Draw notes on the `notes_layer`.
- Create a `glow_layer` by applying `ImageFilter.GaussianBlur(radius=8)` to the `notes_layer`.
- Composite the glow layer under the sharp `notes_layer`.
- Note: We will use `ImageChops.add()` or `Image.alpha_composite` to blend them.

### 3. Gradient Fog
- Instead of a solid semi-transparent rectangle covering the top 10% of the screen, we will use a gradient (Alpha 255 at top -> Alpha 0 at bottom) to make notes smoothly fade into view.

### 4. Hit Flash Particles
- For notes that are currently hitting the `hit_line`, draw a small brighter glowing ellipse or flash radius around the bottom edge.

## Implementation Steps
1. **Types:** Edit `packages/shared-types/src/constants.json`.
2. **Music-Core:** Edit `packages/music-core/pianoflow_music/video/frames.py` to add glow, gradient fog, and hit flashes.
3. **Tests:** Update `test_video.py` in `music-core` to verify the new resolutions.
4. **API / Worker:** Ensure the `render_video` worker successfully passes `720p_vertical` down to the renderer.
