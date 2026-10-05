# PianoFlow AI — UI/UX Design & Frontend Specification

> Version: 2.0 (Post-Audit Design System & Practice HUD Specification)  
> Scope: Dark-first design system, responsive layout, mobile piano keyboard pan/zoom, navigation drawer, and integrated Practice Mode HUD  
> Last updated: October 2026  

---

## 1. Design Language & Aesthetic Tokens

PianoFlow AI follows a sleek, dark-first visual language tailored for musicians and content creators. It pairs deep cinematic backgrounds with vibrant, illuminated musical elements.

### 1.1 Color Tokens & Contrast Ratios (WCAG 2.1 AA Compliant)

| Token Name | Value | Purpose / Usage | Minimum Contrast Ratio |
|---|---|---|---|
| `bg-primary` | `#050507` | Canvas and app-wide dark backdrop | Baseline |
| `bg-surface` | `#09090b` | Card backgrounds, dialogs, drawers | 1.1:1 vs backdrop |
| `bg-elevated` | `#18181b` | Dropdowns, hover states, keyboard wells | 1.4:1 vs backdrop |
| `border-subtle` | `#27272a` | Dividers, card borders, key dividers | 2.1:1 vs surface |
| `text-primary` | `#f4f4f5` | Headings, primary labels, note text | 15.2:1 (AAA) |
| `text-secondary` | `#a1a1aa` | Subheadings, metadata, tooltips | 7.1:1 (AAA) |
| `hand-right` | `#7c3aed` | Right hand notes, treble staff, RH keys | 4.8:1 against `#050507` |
| `hand-left` | `#22d3ee` | Left hand notes, bass staff, LH keys | 8.5:1 against `#050507` |
| `glow-accent` | `#8b5cf6` | Canvas bloom halos, active key highlights | Luminescent |
| `hit-flash` | `#ffffff` | Note strike sparks, hit line flare | Maximum luminosity |
| `error-miss` | `#ef4444` | Wrong notes, connection drops, miss state | 4.6:1 against `#050507` |
| `success-perfect` | `#10b981` | Perfect hit timing, streak indicators | 5.2:1 against `#050507` |

> [!NOTE]
> All inactive metadata and secondary labels use `text-zinc-400` (`#a1a1aa`) or brighter, strictly satisfying the WCAG 2.1 AA minimum contrast threshold of 4.5:1.

### 1.2 Typography System

- **UI Headings & Body:** `Inter`, sans-serif (`font-sans`) — clear, modern, and highly legible across dense toolbars and settings cards.
- **Musical & Technical Data:** `JetBrains Mono`, monospace (`font-mono`) — used for note pitches (`C4`, `F#5`), tempos (`120 BPM`), timing codes (`01:24.50`), and score percentages.

---

## 2. Navigation & Responsive Layout Architecture

PianoFlow AI adapts across desktop, tablet, and mobile displays without compromising playability.

```
Desktop (>=1024px): Two-Column Workspace (Canvas + Inspector)
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo · Create · Projects · Pricing · [User Profile] │
├──────────────────────────────────────────────┬──────────────┤
│ Falling Notes Canvas & Piano Keyboard        │ Settings /   │
│ (Full 88-Key Viewport)                       │ Practice HUD │
└──────────────────────────────────────────────┴──────────────┘

Mobile (<768px): Stacked Viewport with Octave Zoom & Drawer
┌─────────────────────────────────────────────────────────────┐
│ [≡ Drawer] Logo                 [MIDI Status] [User Avatar] │
├─────────────────────────────────────────────────────────────┤
│ Falling Notes Canvas (Zoomed Viewport)                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [◄ Octave]   Zoomed Piano Keyboard (C3–C5)      [Octave ►]  │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Mobile Navigation Drawer

On viewports narrower than `768px`:
- Desktop navigation links collapse into an accessible slide-over sheet drawer (`MobileNavDrawer.tsx`).
- Triggered by a prominent hamburger icon button with `aria-label="Open Navigation Menu"`.
- Features rapid route navigation: **Create Song**, **My Projects**, **Interactive Practice**, **Pricing & Pro**, and **Settings**.

### 2.2 Mobile Piano Keyboard: Octave Viewport & Pan Engine

Rendering all 88 keys on mobile screens (<640px) reduces individual white keys to 3–4 pixels wide, rendering them unplayable. PianoFlow AI provides an **Octave Viewport Selector**:
1. **Windowed Key Range:** Mobile default displays 2 to 3 octaves (e.g., $C3$ to $C5$, 15 to 22 white keys), expanding individual key width to a comfortable 16–22 pixels.
2. **Octave Shift Buttons:** Sticky `[◄ Octave]` and `[Octave ►]` controls flank the keyboard, shifting the visible key window by 12 semitones per tap.
3. **Touch Panning & Swipe:** Horizontal swipe gestures glide the active viewport across the full 88-key span with smooth inertial deceleration.
4. **Auto-Tracking Camera:** During playback and practice, the canvas viewport automatically centers itself on the active cluster of falling notes.

---

## 3. Integrated Practice Mode Layout & Heads-Up Display (HUD)

The `/projects/[id]/practice` workspace integrates real-time MIDI input, visual feedback, and gamified scoring.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  PRACTICE MODE HUD                                                                       │
│  [◄ Exit] Clair de Lune · Measure 14                                                      │
│  Mode: [ Free Play | Tempo Run | Wait Mode ]    Speed: [ 0.75x ▾ ]   MIDI: [● Yamaha P-125]│
│  Score: 14,250    Combo: 18x 🔥    Accuracy: 96.4%    Hand: [ RH | LH | Both ]           │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                               FALLING NOTE CANVAS ENGINE                                 │
│                                                                                          │
│                                    ██ (C4, RH Violet)                                    │
│                                                                                          │
│                       ██ (G3, LH Cyan)                                                   │
│                                                                                          │
│  ════════════════════════════════ HIT LINE ═════════════════════════════════════════════  │
│                                    ★ Hit Spark (Perfect!)                                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  INTERACTIVE KEYBOARD                                                                    │
│  [◄]  │ | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |  [►]   │
│       • Ghost Outline: Expected Note (C4)                                                │
│       • Glowing Fill: Physical Key Pressed                                               │
│       • Red Flash: Wrong Key Struck                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Practice HUD Components

1. **Top Status Bar:**
   - **Back Navigation:** Direct return link to `/projects/[id]`.
   - **Song & Position Indicator:** Song title and current measure/bar number.
   - **Practice Mode Selector:** Segmented toggle:
     - `Free Play`: Play freely without note scoring.
     - `Tempo Run`: Continuous playback at selected speed; tests tempo consistency.
     - `Wait Mode`: Notes pause at the hit line until the user strikes the correct keys.
   - **Speed Multiplier:** Selectable dropdown (`0.25x`, `0.5x`, `0.75x`, `1.0x`, `1.25x`).
   - **Hand Isolation Switcher:** `Right Hand`, `Left Hand`, or `Both Hands`.
   - **Web MIDI Status Indicator:** Live pill badge showing hardware status:
     - Green: `● [Device Name] Connected`
     - Amber: `● Detecting MIDI Devices...`
     - Gray: `○ No Device Connected (Virtual Mode)`
2. **Performance Telemetry:**
   - **Score Display:** Running score with spring-based numeric rollup animation.
   - **Combo Multiplier:** Consecutive Perfect/Good streak counter (`1x`, `2x`, `3x`, `4x`) with flame icon and accent glow.
   - **Live Accuracy Meter:** Real-time percentage badge calculated as $\frac{\text{Hits}_{\text{correct}}}{\text{Notes}_{\text{total}}} \times 100$.

### 3.2 Visual Note & Keyboard State Indicators

| Key State | Visual Appearance on Canvas / Virtual Keyboard | Sound Feedback |
|---|---|---|
| **Incoming Note** | Colored falling rectangle with rounded cap descending toward hit line. | None until hit line |
| **Target Key (Approaching)** | Key border displays a subtle dashed ghost highlight. | Silent |
| **Wait Mode Paused** | Playhead freezes; target key displays pulsating glow. | Prompts user touch |
| **Perfect Hit (≤ 50ms)** | Explosive radial hit spark (`#ffffff`), key flashes solid hand color, "+100 Perfect" toast. | Clean acoustic piano sample |
| **Good Hit (≤ 120ms)** | Medium hit flare, key flashes with hand color, "+50 Good" toast. | Clean acoustic piano sample |
| **Wrong Key / Miss** | Red tint on struck key (`#ef4444`), combo resets to `1x`. | Soft warning woodblock click |
| **Physical MIDI Press** | Struck key immediately illuminates with solid accent fill and radial bloom. | Instant zero-latency synthesis |

---

## 4. Post-Session Performance & Leveling Modal

Upon song completion or manual exit, an animated celebration modal displays comprehensive performance analytics:

```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION COMPLETE! 🎉                     │
│                       Clair de Lune                         │
│                                                             │
│   FINAL SCORE: 28,400                 ACCURACY: 94.2%       │
│                                                             │
│   Perfect Hits: 214    Good Hits: 38    Misses: 8           │
│   Max Combo: 74 notes  Timing Latency: 18 ms avg            │
│                                                             │
│   +350 XP Earned! 🔥 5-Day Practice Streak!                 │
│   Level 4 Virtuoso [██████████████░░░░] 2,450 / 3,000 XP    │
│                                                             │
│   [ Retry Practice ]   [ Export Video ]   [ Back to Project ]│
└─────────────────────────────────────────────────────────────┘
```

1. **Detailed Metrics:** Accurate counts of Perfect, Good, Misses, Max Combo, and Timing Precision (ms).
2. **Gamification Progression:** Animated progress bar showing XP gained and distance to the next player Level.
3. **Daily Practice Streak:** Updates user streak counter, celebrating consistency with fire badges.
4. **Actionable Follow-ups:** 1-click restart, jump to export video, or return to editor.

---

## 5. Accessibility & Interaction Standards (WCAG 2.1 AA)

1. **Keyboard Accessibility:**
   - All interactive controls (buttons, selects, tabs, toggles) are reachable via standard `Tab` navigation.
   - Focus states feature visible high-contrast focus rings: `focus-visible:ring-2 focus-visible:ring-violet-500`.
2. **Screen Reader Support:**
   - Canvas interactive surfaces carry `role="application"` with dynamic `aria-label` describing song progress, note counts, and connection state.
   - Real-time scoring updates are announced unobtrusively via an off-screen `aria-live="polite"` region.
3. **Form & Color Accessibility:**
   - Color pickers in the settings panel include explicit `<label htmlFor="...">` bindings and HEX text inputs.
   - Hand identification is never conveyed by color alone; UI badges include explicit text labels ("RH / Right Hand" and "LH / Left Hand").

---

## 6. Unified Export Center Modal & Delivery UI (`ExportCenterModal.tsx`)

The Unified Export Center consolidates project delivery, video rendering, sheet music exports, MIDI files, and acoustic audio bounces into a single, accessible modal hub.

### 6.1 Modal Architecture & Tab Layout
- **Modal Container:** Built on `Dialog.tsx` with `role="dialog"` and `aria-modal="true"`. Traps keyboard focus, handles `Escape` key dismissal, and renders via React portal.
- **Tab Bar (`role="tablist"`):**
  - `🎥 Video`: Configure aspect ratio (16:9 Landscape vs. 9:16 Vertical), resolution (720p / 1080p), framerate (30 / 60 FPS), and monitor render queue progress.
  - `🎼 Sheet Music`: 1-click printable Grand Staff vector PDF and universal MusicXML downloads.
  - `🎹 MIDI`: Direct downloads for Original, Easy Simplified, and Isolated Piano MIDI tracks.
  - `🎧 Audio`: High-fidelity FluidR3_GM acoustic grand piano WAV (44.1 kHz PCM) and MP3 bounces.
- **Format Badge Chips:** Compact, color-coded badges (`variant="default" | "success" | "warning"`) identifying media type, bitrate, resolution, and availability.
- **Progress Tracking:** Embedded `Progress.tsx` bars with live percentage and stage feedback (e.g. "Drawing frames (45%)").
- **Shareable Link Utility:** Prominent read-only input field with a single-click "Copy Link" action providing instant clipboard feedback (`"Copied!"` badge).
- **Access Policy Notice:** In strict alignment with `12_NO_TUTORIAL_DOWNLOAD_POLICY`, tutorial videos feature private streaming-only controls and stream URLs rather than direct download links.
