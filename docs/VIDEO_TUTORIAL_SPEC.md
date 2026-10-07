# PianoFlow AI — Synthesia-Style Video Tutorial Specification

> Version: 2.0 (Post-Audit Visual & Audio Pipeline Specification)  
> Scope: Visual composition, visual effects (bloom, fog, hit sparks), FluidSynth audio rendering, theme palettes, and streaming delivery policy  
> Last updated: October 2026  

---

## 1. Feature Summary & Visual Standards

PianoFlow AI produces broadcast-ready, Synthesia-style falling-note piano tutorial videos directly from parsed musical score data.

### Visual Reference & Design Standards
- **Cinematic Dark Backdrop:** Deep dark background (`#050507`) ensuring maximum contrast with illuminated falling notes.
- **Physical 88-Key Keyboard:** Accurately proportioned 88-key piano keyboard (52 white keys, 36 black keys) positioned at the bottom of the frame, with active keys illuminated in real time.
- **Glowing Falling Bars:** Vertical note bars falling from top to bottom, with width equal to key width, height proportional to note duration and fall speed, and rounded end-caps.
- **Atmospheric Fog & Bloom:** Soft volumetric fog layer hovering above the keyboard hit line, and Gaussian blur bloom surrounding falling notes and active keys.
- **Dynamic Hit Sparks:** Explosive radial flares and hit pulses on the exact frame a note strikes the hit line.
- **Dual Formats:**
  - **16:9 Landscape:** 1920×1080 (1080p) or 1280×720 (720p) for YouTube tutorials and desktop learning.
  - **9:16 Vertical:** 1080×1920 for mobile viewing, YouTube Shorts, TikTok, and Instagram Reels (features dynamic camera framing tracking active octaves).

---

## 2. Visual Effects (VFX) Architecture

All visual effects in the video rendering pipeline are computed headlessly on the CPU using NumPy, Pillow, and OpenCV, avoiding expensive GPU dependencies while maintaining 30–60 FPS encoding throughput.

```
┌─────────────────────────────────────────────────────────────┐
│                 FRAME COMPOSITION PIPELINE                  │
│                                                             │
│  [Layer 1] Static Canvas: Base keyboard + background image   │
│                             │                               │
│  [Layer 2] Falling Notes: Sharp colored rounded rectangles  │
│                             │                               │
│  [Layer 3] Bloom Generator: Multi-pass Gaussian blur on L2  │
│                             │                               │
│  [Layer 4] Atmospheric Fog: Vertical alpha gradient band    │
│                             │                               │
│  [Layer 5] Hit Line & Sparks: Radial shockwaves & hit glow  │
│                             │                               │
│  [Layer 6] Active Keys: Lit keys + pressed-key bloom        │
│                             │                               │
│  [Layer 7] Optional HUD: Song title, progress bar, note text│
└─────────────────────────────┬───────────────────────────────┘
                              │ Pipe frames directly to FFmpeg
                              ▼
                FFmpeg H.264 Encoder (stdin)
```

### 2.1 Bloom & Glow Engine (Without GPU)

To simulate intense optical neon bloom without dedicated GPU shaders:
1. **Isolated Note Layer:** In each frame, falling note rectangles are rendered onto an empty black image buffer.
2. **Dual-Pass Gaussian Blur:**
   $$\text{Blur}_{\text{core}} = \text{cv2.GaussianBlur}(L_{\text{notes}}, (15, 15), \sigma_1 = 4.0)$$
   $$\text{Blur}_{\text{halo}} = \text{cv2.GaussianBlur}(L_{\text{notes}}, (45, 45), \sigma_2 = 12.0)$$
3. **Additive Blending:**
   $$\text{Bloom} = \text{cv2.addWeighted}(\text{Blur}_{\text{core}}, 0.6 \times \text{glow\_intensity}, \text{Blur}_{\text{halo}}, 0.4 \times \text{glow\_intensity}, 0)$$
4. The bloom buffer is additively composited under the sharp note layer, producing a crisp core with a radiant outer glow.

### 2.2 Atmospheric Fog Gradient

Directly above the keyboard hit line, an atmospheric fog strip simulates light scattering through stage smoke:
- **Geometry:** Height = 140 pixels above the keyboard hit line.
- **Falloff Curve:** Quadratic exponential alpha decay from $y = \text{hit\_line}$ ($\alpha = 0.35$) to $y = \text{hit\_line} - 140$ ($\alpha = 0.0$).
- **Color:** Matches the active glow color tint, pre-rendered once as an alpha LUT (lookup table) and blended per frame using SIMD-accelerated array math.

### 2.3 Hit Sparks & Radial Pulses

When a note reaches the hit line ($t_{\text{current}} = \text{note.start}$):
1. **Hit Flash:** A bright horizontal line segment at the key's width flashes in pure white (`#ffffff`) or accent color for 3 frames (50–100 ms).
2. **Radial Shockwave:** An expanding radial ellipse centered at $(x_{\text{key\_center}}, y_{\text{hit\_line}})$:
   $$r(t) = r_{\text{max}} \times \left(\frac{t - t_{\text{onset}}}{\Delta t_{\text{life}}}\right)^{0.5}, \quad \alpha(t) = \alpha_{\text{initial}} \times \left(1 - \frac{t - t_{\text{onset}}}{\Delta t_{\text{life}}}\right)$$
   Where $\Delta t_{\text{life}} \approx 150\text{ ms}$, creating a responsive, high-energy impact spark.

### 2.4 Keyboard Layout & Active Key Geometry

- **Physical 88-Key Bounds:** From MIDI note 21 ($A0$) to MIDI note 108 ($C8$).
- **52 White Keys:** Distributed evenly across horizontal width $W$:
  $$W_{\text{white}} = \frac{W}{52}$$
- **36 Black Keys:** Positioned on the upper $62\%$ of the keyboard height, width $W_{\text{black}} \approx 0.62 \times W_{\text{white}}$, offset laterally according to acoustic grand piano standards (asymmetrical spacing around $C/D/E$ and $F/G/A/B$).
- **Active Key Illumination (Hand-Specific):** When active, the entire key body is overlaid with the performer's hand color:
  - **Right Hand (RH):** Vivid Violet `#7c3aed` $\rightarrow \text{RGB}(124, 58, 237)$
  - **Left Hand (LH):** Vivid Cyan `#22d3ee` $\rightarrow \text{RGB}(34, 211, 238)$
  - **Precedence:** Right Hand takes priority if both hands strike the same pitch simultaneously.
  - **Geometry:** White keys illuminated along full height $(x + 1, 0, x + w - 1, keyboard\_h - 1)$; black keys illuminated along upper $62\%$ $(x, 0, x + w, keyboard\_h \times 0.62)$.

### 2.5 Radiant Vertical Hit Glow Beams
Directly above active keys during note sounding ($note.start \le t \le note.end$), an upward-projecting light beam radiates along the key lane:
- **Geometry:** Height $H_{\text{beam}} = \min(keyboard\_h \times 1.2, 100\text{ px})$ above the hit line, width equal to key lane width.
- **Falloff:** Quadratic alpha fade from $\alpha = 0.35 \times glow\_intensity$ at $y = hit\_y$ to $\alpha = 0.0$ at $y = hit\_y - H_{\text{beam}}$.
- **Color:** Tinted to match the active hand's color (violet for RH, cyan for LH).

### 2.6 Note Pitch Name Labels
When configured via `config.show_note_names = True`:
- **Dimensions Threshold:** Rendered on falling note bars where width $W_{\text{bar}} \ge 16\text{ px}$ and height $H_{\text{bar}} \ge 18\text{ px}$ to prevent clipping.
- **Typography:** Centered horizontally within the bar ($X = x_0 + (W_{\text{bar}} - W_{\text{text}}) / 2$), anchored 4 pixels above the leading bottom hit edge ($Y = y_{\text{bottom}} - H_{\text{text}} - 4$).
- **Contrast:** Crisp white text `(255, 255, 255)` with 1-pixel dark outline `(0, 0, 0)` for maximum legibility against glowing backgrounds.

---

## 3. SoundFont Audio Pipeline (FluidSynth)

PianoFlow AI produces natural acoustic sound by synthesizing audio directly from speed-scaled musical events rather than stretching pre-rendered audio.

### 3.1 Synthesis Architecture

```
Master Scaled Notes JSON
           │
           ▼  Extract Note On/Off + CC64 Sustain Pedal Events
Speed-Scaled Standard MIDI File (.mid)
           │
           ▼  FluidSynth CLI with FluidR3_GM SoundFont
High-Fidelity 44.1 kHz 16-Bit Stereo WAV
           │
           ▼  FFmpeg Synchronous Pipe Muxing
Broadcast MP4 Video (H.264 High Profile + AAC Stereo)
```

### 3.2 Timeline & Sustain Preservation
1. **Speed Scaling:**
   All note onsets, durations, and CC64 sustain pedal timestamps are divided by `speed_multiplier` before generating the temporary MIDI stream.
2. **Sustain Pedal Modeling:**
   Continuous CC64 damper pedal controller messages are fully preserved. FluidSynth naturally simulates prolonged acoustic resonance, sympathetic string vibration, and realistic damping release upon pedal lift.
3. **SoundFont Selection:**
   - Primary: **FluidR3_GM.sf2** (SoundFont bank preset 0, acoustic grand piano, ~140 MB).
   - High-Fidelity Alternative: **MuseScore General SoundFont** or Yamaha C5 soundbank for Pro exports.

### 3.3 Worker Audio CLI Execution

The worker executes FluidSynth in fast-render non-interactive audio file mode:
```bash
fluidsynth -ni -g 1.2 -r 44100 /app/soundfonts/FluidR3_GM.sf2 \
  /tmp/{job_id}/scaled.mid -F /tmp/{job_id}/audio.wav
```

### 3.4 FFmpeg Stream Multiplexing

Frames drawn by Pillow/NumPy are streamed directly into FFmpeg through standard input (`stdin`), multiplexed with the synthesized audio WAV in a single pass:
```bash
ffmpeg -y -f rawvideo -vcodec rawvideo -s 1920x1080 -pix_fmt bgr24 -r 30 \
  -i - -i /tmp/{job_id}/audio.wav \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -shortest -movflags +faststart \
  /tmp/{job_id}/video.mp4
```

---

## 4. Color Theme Palettes & Custom Rules

Users can select from curated preset themes or define custom HEX colors.

| Theme Preset | Right Hand (RH) | Left Hand (LH) | Glow Tint | Hit Effect | Background |
|---|---|---|---|---|---|
| **Classic** (Default) | Violet `#7c3aed` | Cyan `#22d3ee` | Purple `#8b5cf6` | White `#ffffff` | Dark `#050507` |
| **White Glow** | White `#f4f4f5` | Slate `#a1a1aa` | Pure White `#ffffff` | Cyan `#38bdf8` | Black `#000000` |
| **Neon Cyberpunk** | Pink `#ec4899` | Cyan `#06b6d4` | Violet `#c084fc` | White `#ffffff` | Deep Navy `#020617` |
| **Gold Elegance** | Amber `#f59e0b` | Yellow `#fbbf24` | Gold `#fde68a` | White `#ffffff` | Charcoal `#0f0f11` |
| **Emerald River** | Emerald `#10b981` | Teal `#14b8a6` | Mint `#6ee7b7` | White `#ffffff` | Deep Pine `#022c22` |
| **Sunset Blaze** | Red `#ef4444` | Orange `#f97316` | Amber `#fb923c` | Yellow `#fef08a` | Dark Maroon `#180808` |
| **Custom** | User HEX | User HEX | User HEX | User HEX | User HEX |

### Validation & Sanitization
- All custom HEX inputs must match regex: `^#[0-9a-fA-F]{6}$`.
- Missing or malformed color parameters fall back safely to the `classic` preset defaults.

---

## 5. Streaming-Only & Delivery Policy

1. **HTTP Byte-Range Streaming (`Accept-Ranges: bytes`):**
   - Video artifacts are delivered via presigned Cloudflare R2 / AWS S3 URLs supporting byte-range requests (`HTTP 206 Partial Content`).
   - Enables instant in-browser seeking without downloading the full video file.
2. **Moov Atom Fast-Start (`-movflags +faststart`):**
   - FFmpeg relocates the MP4 `moov` atom (index headers and sample tables) to the absolute beginning of the MP4 file.
   - The browser video player starts playback within < 200 ms of the first byte arrival.
3. **Content-Disposition Headers:**
   - **Streaming View:** `Content-Disposition: inline; filename="{title}.mp4"`.
   - **Direct Download:** `Content-Disposition: attachment; filename="{title}.mp4"`.
4. **Lifecycle & Expiry Policy:**
   - Free-tier video artifacts expire after 7 days (`expires_at` database trigger + S3 lifecycle policy).
   - Pro-tier video artifacts are retained for 90 days.

---

## 6. Document Cross-References

- Comprehensive UI/UX Design System Overhaul Specification: [`plans/2026-10-07-comprehensive-ui-ux-design-system-overhaul-spec.md`](./plans/2026-10-07-comprehensive-ui-ux-design-system-overhaul-spec.md)
- UI/UX & Responsive Design System: [`UI_UX.md`](./UI_UX.md)
- Product Specification & Vision: [`PRODUCT.md`](./PRODUCT.md)
- System Architecture & Design: [`DESIGN.md`](./DESIGN.md)
- Active Engineering Roadmap: [`ROADMAP.md`](./ROADMAP.md)
- Master Execution Plan: [`MASTER_PLAN.md`](./MASTER_PLAN.md)

