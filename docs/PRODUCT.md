# PianoFlow AI — Product Specification & Vision

> Version: 2.0 (Post-Audit Full Feature Vision)  
> Status: Approved Architecture Baseline  
> Last updated: October 2026  

---

## 1. Executive Product Vision

**PianoFlow AI is an intelligent piano learning and content creation platform.** It transforms raw musical inputs—standard MIDI files, acoustic microphone recordings, high-fidelity audio files, or YouTube/social media links—into an end-to-end, multi-format piano learning environment:

1. **Synthesia-Style Falling-Note Tutorial Videos (MP4):** Broadcast-quality videos featuring synchronized FluidSynth SoundFont audio, customizable glowing visual aesthetics, hit particles, and mobile-ready vertical (9:16) or widescreen (16:9) formats.
2. **Interactive Web MIDI Practice Mode:** Real-time feedback connecting physical USB/Bluetooth MIDI keyboards to the browser, offering **Wait Mode** (the song pauses until the correct keys are struck), millisecond-accurate timing scoring, combo multipliers, and SoundFont audio playback.
3. **Interactive Sheet Music:** Real grand staff engraving (treble/bass staves) rendered via OpenSheetMusicDisplay (OSMD) with synchronized score cursors and downloadable printable PDFs and MusicXML files.
4. **AI-Powered Multi-Source Transcription:** Studio-grade transcription isolating piano from mixed audio via Demucs v4 stem separation and transcribing polyphonic notes, velocities, and pedal state via Transkun on serverless A10G GPUs.
5. **Gamification & Habit Building:** Experience Points (XP), leveling, daily practice streaks, and detailed session performance analytics.
6. **Rule-Based Beginner Simplification:** Algorithmic reduction generating `easy` and `very_easy` playable arrangements without compromising the core melody.

The core promise: **"From any song to mastery — listen, watch, practice, and read piano music in one unified workflow."**

---

## 2. Target Personas & Core Use Cases

| Persona | Profile & Pain Points | PianoFlow AI Solution |
|---|---|---|
| **Self-Taught Piano Learner** | Relies on YouTube tutorials; frustrated by pausing videos manually; lacks physical sheet reading fluency. | **Interactive Practice Mode with Wait Mode**: Connects MIDI keyboard, falling notes pause for user input, immediate timing feedback, and audio playback. |
| **Piano Teacher & Educator** | Needs customized arrangements for students of varying skill levels; transcribing popular songs manually takes hours. | **Multi-Source Transcription & Beginner Mode**: Converts YouTube/MP3 links into clean MIDI, generates simplified arrangements, and exports printable sheet music. |
| **Content Creator (YouTube/TikTok)** | Spends hours manually recording screen capture from DAWs and video editing software for Synthesia videos. | **Headless Video Rendering**: 1-click cloud generation of 1080p60 landscape (16:9) and vertical (9:16) videos with custom glow themes and hit effects. |
| **Hobbyist Musician / Composer** | Records melodies on an acoustic or digital piano; struggles to translate audio into readable notation or MIDI. | **In-Browser Mic Recorder & Stem Separation**: Records acoustic piano directly in-browser or uploads mixed audio, producing clean quantized MIDI and MusicXML. |

---

## 3. Product Features & Detailed Specifications

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   INPUT INGESTION                      │
                       │  • MIDI Upload (.mid, .midi)                           │
                       │  • Audio Upload (MP3, WAV, FLAC, M4A)                  │
                       │  • In-Browser Microphone Recording (WebM)              │
                       │  • Video URL Import (YouTube / TikTok / Social)        │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                       ┌────────────────────────────────────────────────────────┐
                       │               CORE PROCESSING PIPELINE                 │
                       │  • Demucs v4 Piano Stem Isolation (Modal A10G GPU)     │
                       │  • Transkun Neural Transcription & CC64 Pedal Mapping  │
                       │  • Note Normalization & Hand Estimation (music-core)   │
                       │  • Rule-Based Simplification (Original / Easy / V.Easy)│
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
         ┌────────────────────────┬───────────────┴──────────────┬────────────────────────┐
         ▼                        ▼                              ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  VIDEO TUTORIAL  │    │  PRACTICE MODE   │    │   SHEET MUSIC    │    │  EXPORT CENTER   │
│  • SoundFont WAV │    │  • Web MIDI In   │    │  • OSMD Grand    │    │  • MP4 Video     │
│  • Falling Glow  │    │  • Wait Mode     │    │    Staff Staves  │    │  • PDF Scores    │
│  • Hit Sparks    │    │  • Live Scoring  │    │  • Follow Cursor │    │  • MusicXML      │
│  • 16:9 & 9:16   │    │  • XP & Streaks  │    │  • Measure Loop  │    │  • Cleaned MIDI  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 3.1 Multi-Source Transcription Engine

PianoFlow AI supports multi-modal audio and video ingestion alongside native MIDI:

1. **Direct MIDI Upload:**
   - Supported extensions: `.mid`, `.midi`.
   - Validation: Magic byte inspection (`MThd`), maximum file size (5 MB for free tier, 25 MB for Pro), duration cap (10 minutes).
2. **Audio File Upload & Microphone Recording:**
   - Supported formats: MP3, WAV, FLAC, M4A, and WebM (recorded directly in the browser via `MediaRecorder` API).
   - Audio pre-processing: Re-sampled to 44.1 kHz stereo/mono, client-side format validation.
3. **URL Video Ingestion:**
   - Ingests audio directly from public YouTube, TikTok, and social links using `yt-dlp` and `curl_cffi` on serverless workers.
4. **Two-Stage Serverless GPU Transcription:**
   - **Stem Separation:** Mixed music files pass through Demucs v4 (Hybrid Transformer) on serverless A10G GPUs to isolate the clean piano track from vocals, bass, and drums.
   - **Polyphonic Transcription:** The isolated piano stem is processed by Transkun, predicting exact note pitches, onset/offset timings, dynamic velocities, and CC64 sustain pedal events.
   - **Map-Reduce Chunking:** Long audio files (>2 minutes) are split into overlapping chunks, processed in parallel across GPU workers, and stitched back together seamlessly.

---

### 3.2 Web MIDI Interactive Practice Mode

The practice suite bridges digital hardware and browser visualization:

1. **Web MIDI Device Connection:**
   - Connects to class-compliant USB and Bluetooth MIDI keyboards via `navigator.requestMIDIAccess`.
   - Auto-detects connected inputs, logs device manufacturer/model, and monitors connection status with real-time HUD indicator.
2. **Practice Modes:**
   - **Wait Mode (Learn at Your Own Pace):** The falling notes animation advances only when the user plays the correct note(s) for the current musical chord or beat. Notes pause at the hit line until struck.
   - **Tempo Mode (Real-Time Play-Along):** The song runs continuously at a chosen speed multiplier (0.25x to 1.5x). User inputs are scored in real time against falling notes.
   - **Hand Isolation:** Practice Right Hand only, Left Hand only, or Both Hands simultaneously.
3. **Real-Time Scoring Engine (`MidiEngine`):**
   - **Timing Windows:**
     - **Perfect:** ±50 ms of target note onset.
     - **Good:** ±120 ms of target note onset.
     - **Miss:** Struck outside 120 ms window or incorrect pitch.
   - **Streak & Combo Multiplier:** Consecutive Perfect/Good hits increment a combo multiplier (`1x`, `2x`, `3x`, `4x`), rewarding rhythm consistency.
   - **Live Sound Synthesis:** Incoming MIDI events trigger low-latency acoustic piano samples via `SampledPiano` (SoundFont Web Audio synth), giving immediate acoustic confirmation.
4. **Session Summary & Analytics:**
   - End-of-song modal displaying: Overall Accuracy Percentage, Total Notes Struck, Perfect/Good/Miss breakdown, Maximum Combo, Average Timing Latency (ms), and XP awarded.

---

### 3.3 Gamification & Learning Journey

1. **Experience Points (XP):**
   - Base XP earned per practice session: `XP = floor(note_count * (accuracy_percent / 100) * difficulty_weight)`.
   - Bonus XP for maintaining daily practice streaks and mastering new songs (>90% accuracy).
2. **Leveling System:**
   - Tiered progression (`Novice`, `Apprentice`, `Virtuoso`, `Maestro`) based on total cumulative XP.
3. **Daily Streaks:**
   - Tracks consecutive days of practice (minimum 1 session completed per calendar day UTC).
   - Streak freeze / recovery available for Pro tier members.

---

### 3.4 Synthesia-Style Video Tutorial Generation

1. **Visual Composition:**
   - 88-key physical piano rendering with active key lighting matching hand colors.
   - Vertical falling note bars with rounded caps and length proportional to note duration and fall speed.
   - Visual FX: Gaussian blur bloom on falling bars, fog gradient band hovering over the keyboard, hit line flash, and radial spark ripples on key strike.
   - Hand color coding: Right Hand default Violet (`#7c3aed`), Left Hand default Cyan (`#22d3ee`).
2. **FluidSynth SoundFont Audio Pipeline:**
   - Dedicated audio worker synthesizes studio-grade acoustic piano sound using FluidSynth and high-resolution soundfonts (FluidR3_GM / MuseScore General).
   - Speed changes re-render note events directly rather than time-stretching MP3 audio, preserving natural pitch, attack transients, and pedal decay.
3. **Streaming & Export:**
   - Encodings: 720p30, 1080p30, and 1080p60.
   - Aspect ratios: 16:9 Widescreen (YouTube) and 9:16 Vertical (TikTok/Shorts/Reels).
   - Private streaming policy: Signed byte-range MP4 delivery (`+faststart` moov atom header) with direct download options.

---

### 3.5 Interactive & Printable Sheet Music

1. **Client-Side Grand Staff Rendering:**
   - Interactive SVG notation rendered directly in the browser via OpenSheetMusicDisplay (OSMD).
   - Treble clef (Right Hand) and Bass clef (Left Hand) staves cleanly separated.
2. **Synchronized Playback Cursor:**
   - Visual playback bar moves across measures in real time as the song plays or during practice mode.
   - Measure clicking allows instant looping and scrub navigation.
3. **Export Formats:**
   - High-resolution printable PDF scores with clean measure formatting, title, and composer metadata.
   - Raw MusicXML export for importing into MuseScore, Sibelius, Dorico, or Finale.

---

### 3.6 Beginner Mode (Rule-Based Simplification)

1. **Algorithmic Reduction Rules:**
   - `original`: Full polyphonic transcription with complete voicings.
   - `easy`: Max 4 simultaneous notes; caps chord density to 2 notes per hand (preserving bass root and top melody); removes octave doublings; drops notes shorter than 60 ms.
   - `very_easy`: Max 2 simultaneous notes (1 note per hand: top melody in RH, bass root in LH); drops notes shorter than 100 ms.
2. **Melody Preservation Guarantee:**
   - High-pitch RH contour is locked and protected from deletion during chord reduction passes.

---

## 4. Monetization & Subscription Tiers (Stripe)

| Feature | Free Tier | Pro Tier ($12/month or $99/year) |
|---|---|---|
| **MIDI Ingestion** | Unlimited files, up to 5 MB (< 5 min duration) | Unlimited files, up to 25 MB (< 15 min duration) |
| **Audio & URL Transcription** | 3 minutes / month (standard queue) | 60 minutes / month (priority A10G GPU queue) |
| **Interactive Practice Mode** | Full access (Wait Mode, Tempo Mode, Scoring) | Full access + Custom measure looping & streak recovery |
| **Video Tutorial Export** | 720p30 with subtle watermark | 1080p60 watermark-free, 16:9 and 9:16 vertical |
| **Sheet Music Export** | View online + 1 PDF download/day | Unlimited PDF & MusicXML downloads |
| **Storage Retention** | 7 days output artifact retention | 90 days artifact retention |

---

## 5. Success Metrics & Performance Targets

| Metric | Target | Measurement Strategy |
|---|---|---|
| **Audio-to-Note Transcription F1** | > 88% onset F1 on MAESTRO solo piano | Benchmarked using `pianoflow_music.transcription.evaluate` |
| **Audio-Video Timeline Drift** | < 1 video frame (16.6 ms at 60 fps) across 10 min | Tested by comparing audio onset waveform to video hit line frame |
| **Web MIDI Input Latency** | < 15 ms from physical key strike to UI highlight | Web MIDI event dispatch to Canvas RAF benchmark |
| **Video Render Turnaround** | < 90 s wall-clock for 3-minute 720p video | Worker SQS processing duration metric |
| **Practice Mode User Retention** | > 40% 7-day practice streak retention | Daily active practice session analytics |
| **End-to-End Task Completion** | > 75% of users who upload complete a practice session or export | TanStack query / project event telemetry |

---

## 6. Document Cross-References

- Architecture & System Topology: [`DESIGN.md`](./DESIGN.md)
- Video & Audio Synthesis Specification: [`VIDEO_TUTORIAL_SPEC.md`](./VIDEO_TUTORIAL_SPEC.md)
- UI/UX & Responsive Design System: [`UI_UX.md`](./UI_UX.md)
- Phased Implementation Roadmap: [`ROADMAP.md`](./ROADMAP.md)
- Consolidated Implementation Master Plan: [`MASTER_PLAN.md`](./MASTER_PLAN.md)
- REST API Reference: [`API.md`](./API.md)
- Database Schemas: [`DATABASE.md`](./DATABASE.md)
