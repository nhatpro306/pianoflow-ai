# PianoFlow AI — Synthesia-Style Video Tutorial Feature Spec

> Status: accepted, scheduled (see §2 phase mapping)
> Supersedes/extends: `DESIGN.md` §5 (video rendering), parts of §3 render settings
> Visual reference: classic YouTube piano tutorial look — black cinematic background,
> glowing blue/purple/white vertical falling notes, bright hit line, soft fog/glow
> above an 88-key keyboard, bloom on notes and lit keys.

---

## 1. Feature Summary

User uploads MIDI → app renders a Synthesia-style falling-note piano tutorial video with:

- Real piano audio (SoundFont-rendered, in sync with visuals)
- Customizable note colors (per hand), key highlight, glow, hit effect, background
- Preset color themes + custom HEX input
- YouTube-style playback speed: 0.25x / 0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x (+ custom, clamped)
- Real-time canvas preview with live audio before export
- Downloadable MP4 (H.264 + AAC) that preserves the exact preview settings

MIDI-only input (audio transcription stays Phase 12 — unchanged).

---

## 2. Phase Mapping (decision)

The request's 3 phases slot into the existing roadmap as follows. **Existing Phases 1–4 already cover upload, parsing, metadata display, and key mapping** — done and verified. The deltas land here:

| Spec phase | Roadmap slot | Name | Contents |
|---|---|---|---|
| Phase 1 | **Phase 4B** (new, before queue work or parallel to Phase 5) | Live preview & settings | Color pickers + presets + HEX, speed selector + estimated duration, falling-note canvas preview animation, real-time piano audio (Web Audio), live speed control |
| Phase 2 | **Phase 7** (replaces old Phase 7 scope) | Server-side export | FluidSynth MIDI→WAV, frame renderer with selected colors/speed, FFmpeg mux → MP4, download |
| Phase 3 | **Phase 7C** (polish, after Phase 8 OK) | Visual polish | Bloom upgrade, hit particles, better key lighting, fog refinement, perf tuning |

Rationale: preview (4B) is pure frontend + already-parsed notes JSON — no queue dependency, immediate demo value. Export (7) needs the worker/queue from Phases 5–6. Polish (7C) is deferred until sheet + beginner mode exist, per the original anti-scope-creep rule.

**Sequencing from today:** Phase 4B → Phase 5 (queue) → Phase 6 (sheet) → Phase 7 (this export) → 7C polish later.

---

## 3. Settings Schema v2 (delta to `DATABASE.md` §3 `render_settings`)

```sql
-- migration when Phase 4B lands:
ALTER TABLE render_settings
    ADD COLUMN colors JSONB NOT NULL DEFAULT '{}',     -- see shape below
    ADD COLUMN theme_preset TEXT NOT NULL DEFAULT 'classic',
    ADD COLUMN glow_intensity REAL NOT NULL DEFAULT 0.6,   -- 0..1
    ADD COLUMN note_fall_speed REAL NOT NULL DEFAULT 1.0,  -- visual speed multiplier (px/s scale)
    ADD COLUMN keyboard_size REAL NOT NULL DEFAULT 1.0,    -- keyboard height scale 0.7..1.3
    ADD COLUMN speed_multiplier REAL NOT NULL DEFAULT 1.0; -- replaces speed_percent semantics
-- fps CHECK relaxed to (30, 60); speed CHECK becomes 0.25 <= speed_multiplier <= 2.0
```

`colors` JSONB shape (also the TS type in `shared-types`):

```json
{
  "right_hand": "#7c3aed",
  "left_hand":  "#22d3ee",
  "key_highlight": "#a78bfa",
  "glow": "#8b5cf6",
  "hit_effect": "#ffffff",
  "background": "#050507"
}
```

### Preset themes (constants in `shared-types`, one source for web + worker)

| Preset | RH | LH | Glow |
|---|---|---|---|
| `classic` (default, reset target) | violet `#7c3aed` | blue `#3b82f6` | `#8b5cf6` |
| `white_glow` | `#f4f4f5` | `#a1a1aa` | `#ffffff` |
| `neon` | pink `#ec4899` | cyan `#22d3ee` | `#f0abfc` |
| `gold` | `#f59e0b` | `#fbbf24` | `#fde68a` |
| `green_cyan` | `#10b981` | `#06b6d4` | `#34d399` |
| `red_orange` | `#ef4444` | `#f97316` | `#fb923c` |
| `custom` | user HEX | user HEX | user HEX |

Validation: HEX `^#[0-9a-fA-F]{6}$` (API 400 `INVALID_HEX`); speed clamped to `[0.25, 2.0]` (`INVALID_SPEED`); presets fill the colors object server-side so export never depends on client-only state.

---

## 4. Single-Timeline Sync Model (the core rule)

**One timeline, in seconds, derived from MIDI; everything consumes it.**

```
notes JSON (already seconds, tempo map applied at parse)
        │
        ▼  apply speed: t' = t / speed_multiplier   (one pure function, music-core notes/timeline.py)
   scaled timeline ──┬──▶ preview animation clock (Web Audio currentTime)
                     ├──▶ frame renderer  (frame i ⇒ t' = i / fps)
                     └──▶ audio renderer  (note_on/off at t', durations scaled)
```

- Speed scales the *event times*, not playback-rate of an audio file → notes re-rendered at new timing through the SoundFont = clean sound at any speed (the "re-render MIDI, don't stretch MP3" rule).
- Tempo changes already collapsed into absolute seconds at parse time → automatically respected under any multiplier.
- Hit moment = note.start. The falling note's bottom edge reaches the hit line exactly at t' = start; key lights from start to end; audio note-on at start. All three read the same number — drift is structurally impossible in export.
- Preview drift control: canvas animation clock is `audioContext.currentTime` (not rAF accumulation), so long songs can't drift in browser playback either.
- Estimated final duration shown in UI: `duration_sec / speed_multiplier`.

---

## 5. Audio Pipeline (Phase 7, worker)

| Step | Tool | Notes |
|---|---|---|
| Build speed-scaled MIDI | `pianoflow_music.midi.write` (mido) | from scaled timeline; velocities preserved; CC64 sustain events copied with scaled times |
| MIDI → WAV | **FluidSynth CLI** (`fluidsynth -ni soundfont.sf2 in.mid -F out.wav -r 44100`) | behind `AudioRenderer` adapter (same pattern as `SheetEngraver`) |
| SoundFont | **FluidR3_GM** (piano program 0) baked into worker image (~140 MB) — MuseScore General as documented alternative | free, redistributable |
| Velocity → volume | native to SoundFont rendering | nothing to do |
| Sustain | CC64 passed through | natural decay handled by synth |
| Mux | FFmpeg `-i frames_pipe -i out.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart` | single pass, video+audio land together |

Parse delta (Phase 4B prerequisite): parser must also extract **channel** per note and **CC64 sustain events** into notes JSON (`schema_version: 2`, additive — old consumers ignore new fields).

## 6. Video Pipeline (Phase 7, worker — updates `DESIGN.md` §5)

Composition (top→bottom): dark background (user color) → falling glowing notes → fog gradient band → bright hit line → keyboard (size scaled by `keyboard_size`).

- **Glow/bloom without a GPU:** draw notes layer → `cv2.GaussianBlur` the layer (kernel ∝ `glow_intensity`) → additive-blend blur under the sharp layer. One extra blur per frame ≈ cheap at 1080p; benchmark in Phase 7 acceptance.
- **Rounded vertical bars:** height ∝ duration × fall speed; min height for very short notes; black-key notes narrower (existing `keyRect` geometry — frontend `lib/piano.ts` and worker `video/layout.py` share constants via `shared-types`).
- **Hit effects:** key flash in `key_highlight` + radial pulse in `hit_effect` at the hit line for the note's first 150 ms. Particles = Phase 7C only.
- **Fog:** vertical alpha gradient strip (pre-rendered once, alpha-blended per frame).
- **60 FPS:** allowed at 720p and 1080p, but counts double against the daily video-seconds quota (`RISKS.md` §6) — render cost is linear in frame count.
- FFmpeg stdin pipe unchanged from `DESIGN.md` §5.2.

## 7. Preview Player (Phase 4B, web)

- `previewPlayer` = existing `PianoRollPreview` evolved: vertical orientation (notes fall top→bottom onto the keyboard, matching export), play/pause, speed dropdown.
- Audio: **Web Audio API** with a small piano sample set (e.g. `smplr`/soft piano samples) or oscillator fallback — *preview* audio approximates; *export* audio is the FluidSynth ground truth. Documented honestly in UI ("preview sound is approximate").
- Color changes re-render canvas immediately (colors are draw-time params, no data rebuild). Speed changes restart the audio scheduler from the current musical position.
- Settings persist via existing `PATCH /settings` (debounced) so preview and export read identical state — the existing settings-snapshot-per-job mechanism (`DESIGN.md` §3.3) already guarantees export uses what was previewed.

## 8. Progress UI (export job)

Job `progress_message` steps emitted by the worker (existing throttled progress writer):

```
1 queued                      → "Waiting in queue"
2 preparing                   → "Preparing timeline & layout"   (parse already done)
3 audio                       → "Rendering piano audio"          (~10%)
4 frames                      → "Drawing frames (N%)"            (10–85%, per-batch)
5 mux                         → "Combining audio and video"      (~90%)
6 finalize                    → "Finalizing MP4"                 (upload, 95–100%)
```

Upload/parse/layout/settings steps from the request happen before the job exists (Phases 3–4B flows) — already surfaced in their own UI states.

## 9. Error Codes (additive to `API.md` §0)

`INVALID_HEX`, `INVALID_SPEED`, `AUDIO_RENDER_FAILED` (FluidSynth nonzero/empty WAV), `FFMPEG_FAILED`, `EXPORT_TIMEOUT` (per-job wall-clock cap = `4 × duration/speed`, min 5 min), plus existing MIDI/file errors. All permanent (no retry) except `EXPORT_TIMEOUT` (one retry — may be a slow-node fluke).

## 10. Acceptance Criteria (checked at Phase 7 completion)

Functional: valid MIDI → MP4 with synced audio; notes aligned to correct keys (A0–C8, black keys offset); long/short notes render and sound proportionally; velocity audible; sustain respected; colors (per hand), presets, HEX, glow intensity, background all preserved exactly in export; reset-to-default restores `classic`; all 7 speed presets + custom work in both preview and export; estimated duration shown; key lights exactly at note start; no drift over a 10-minute file (assert: last-note audio onset vs frame position < 1 frame); MP4 downloadable, H.264+AAC, plays in Chrome/QuickTime.

Tests: golden-frame compares per theme; WAV onset-vs-timeline assertion (librosa onset detect on 5-note fixture); ffprobe duration == expected ± 1 frame; HEX/speed validation unit tests; preview clock drift test (mock audio clock).

---

## 11. Out of Scope (unchanged guards)

Audio transcription (Phase 12), particles before 7C, 4K, custom soundfont upload, per-note color editing, watermarks. Speed below 0.25x/above 2x rejected (quota abuse + absurd render cost at 0.1x).
