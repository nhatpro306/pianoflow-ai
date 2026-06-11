# PianoFlow AI — Piano Sound System Spec

> Status: accepted
> Extends: `VIDEO_TUTORIAL_SPEC.md` §5 (audio pipeline), §7 (preview player)
> Goal: realistic sampled piano — never "MIDI beep" — in both preview and exported MP4.

---

## 1. Instrument Set

| UI label | id (settings enum) | Preview source (sampled, browser) | Export source (FluidSynth SF2 preset, Phase 7) |
|---|---|---|---|
| Concert Grand **(default)** | `concert_grand` | smplr `SplendidGrandPiano` (multi-velocity sampled grand) | FluidR3_GM prog 0 (Acoustic Grand) — upgrade path: dedicated SF2 |
| Bright Grand | `bright_grand` | smplr Soundfont `bright_acoustic_piano` | FluidR3_GM prog 1 |
| Warm Grand | `warm_grand` | smplr Soundfont `acoustic_grand_piano` + lowpass tilt | FluidR3_GM prog 0 + EQ (documented approximation until premium SF2) |
| Upright Piano | `upright` | smplr Soundfont `acoustic_grand_piano` (closest GM; honest label "approximation" in tooltip) | SF2 upright preset when sourced; GM prog 0 fallback |
| Soft / Felt Piano | `felt` | Concert Grand samples + lowpass + velocity curve soften | GM prog 0 + EQ/velocity curve |
| Electric Piano (Rhodes) | `electric` | smplr Soundfont `electric_piano_1` | FluidR3_GM prog 4 |

Principles:
- **Preview approximates, export is ground truth** (same rule as VIDEO_TUTORIAL_SPEC §7). Where no free sample of the exact instrument exists (upright, felt), we approximate and label honestly; the adapter design lets premium SF2s replace any row later without code changes (`soundfont_path` per instrument in worker config).
- All samples velocity-sensitive; natural decay/release from samples themselves. Master limiter prevents clipping (preview: gain headroom + soft compressor node; export: `fluidsynth --gain` ≤ 0.7 + ffmpeg `alimiter`).

## 2. User Controls (Settings v3 fields)

```sql
ALTER TABLE render_settings
  ADD COLUMN piano_sound TEXT NOT NULL DEFAULT 'concert_grand',
  ADD COLUMN volume REAL NOT NULL DEFAULT 0.8,          -- 0..1 master
  ADD COLUMN reverb TEXT NOT NULL DEFAULT 'light';      -- off|light|medium|hall
```

- UI: "Piano Sound" selector + volume slider + reverb select, placed in `SettingsPanel` above Playback speed.
- Reverb mix mapping: off=0, light=0.15, medium=0.3, hall=0.5 (preview: smplr convolution `Reverb`; export: FluidSynth reverb room-size/level presets per level).
- Sustain pedal: CC64 events already parsed (notes schema v2). Preview + export both honor: while pedal ≥ 64, note releases are deferred to pedal-off (`applySustain(notes, sustain)` pure function, shared logic mirrored music-core ↔ web).

## 3. Sync & Export Rules (unchanged, restated)

- Same single-timeline model: sound triggers at scaled `note.start` — identical number the canvas uses for hit-line crossing. Speed changes rescale event times; both stay locked.
- Export audio 44.1 kHz WAV (FluidSynth `-r 44100`) → AAC 192k in MP4.
- Selected `piano_sound`, `volume`, `reverb` are part of the settings snapshot → exported MP4 always matches preview selection.

## 4. Phase Mapping (decision)

| Piece | Phase | Why |
|---|---|---|
| Settings fields + validation + UI selector/volume/reverb + sampled preview engine (smplr) + sustain in preview | **Phase 4B-S — implement now** | extends the just-shipped preview; pure frontend + one migration |
| FluidSynth multi-preset rendering, per-instrument SF2 config, reverb presets, limiter, 44.1 kHz pipeline | **Phase 7** (export) | needs worker/queue; spec'd here so Phase 7 implements without re-design |
| Premium soundfont upgrades (true upright/felt samples) | post-MVP backlog | swap-in via config only |

## 5. Failure Handling

- Sample CDN load failure in preview → automatic fallback to built-in synth (`PianoSynth`), toast "High-quality piano unavailable offline — using basic sound." Never block preview on audio assets.
- Export: missing SF2 → `AUDIO_RENDER_FAILED` (permanent, message names the instrument).

## 6. Acceptance

- Default Concert Grand sounds clearly sampled (hammer attack, natural decay), not synthetic.
- pp vs ff velocity audibly different on every instrument.
- Reverb levels audibly distinct; "off" is dry.
- Sustain-pedal MIDI holds chords with pedal down in preview and export.
- No clipping at volume 1.0 with dense chords (limiter test fixture: 10-note fortissimo cluster).
- Switching instrument mid-session re-targets next Play without page reload.
