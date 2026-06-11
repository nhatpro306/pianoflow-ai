# PianoFlow AI — UI/UX Design

> Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
> Design goals: simple, modern, dark-first, portfolio-ready. Zero documentation needed to complete the core flow.

---

## 1. Design Language

- **Theme:** dark-first (musicians' tools convention: DAWs, Synthesia are dark). Light mode supported via Tailwind `dark:` + CSS variables (shadcn theming).
- **Accent palette:** two hand colors are the brand — RH = cyan `#22d3ee`, LH = orange `#fb923c` — used consistently in piano roll, video output, and legend chips.
- **Typography:** Inter (UI), JetBrains Mono (note names, technical values).
- **Components:** shadcn/ui primitives only (Button, Card, Dialog, Select, Switch, Tabs, Progress, Badge, Skeleton, Toast/sonner). No second component library.
- **Density:** generous whitespace, max-width `7xl` content column, cards with subtle borders (`border-border`), no heavy shadows.
- **Motion:** small and purposeful — progress bars, status badge pulse while `processing`, piano-roll playhead. No decorative animation.

---

## 2. Pages & Routes

```
/                      Landing page (public)
/upload                Upload MIDI page (auth)
/projects              Project list / history (auth)
/projects/[id]         Project editor: preview + settings + jobs (auth)
/projects/[id]/export  Export & download page (auth)
/login                 Auth (Supabase Auth UI) — implied, not a "feature page"
```

### 2.1 `/` Landing page

Purpose: explain the product in 5 seconds; route to upload.

Layout (top → bottom):
1. **Hero:** headline "Turn any piano MIDI into a tutorial video and sheet music." Sub: one sentence. CTA: `Upload a MIDI` (→ `/upload`). Right side: looping muted demo clip (pre-rendered falling-note video) — the product *is* the visual.
2. **Three-step strip:** Upload → Customize → Download, with icons.
3. **Output showcase:** three cards — Video / Sheet PDF / Beginner MIDI — each with a real sample artifact.
4. **Honesty note (small):** "Sheet music is auto-generated and approximate. Beginner mode is rule-based simplification."
5. Footer: GitHub link (portfolio!), tech-stack badges.

### 2.2 `/upload` Upload page

Single centered card:
- `MidiUploader` (dropzone) — drag & drop or click. Accept `.mid,.midi`. Shows max size (5 MB) and max duration (10 min) up front.
- Project name input (pre-filled from filename, editable).
- On submit: create project → signed-URL upload with progress bar → confirm → redirect to `/projects/[id]` while `parse_midi` runs.
- Inline error states: wrong type, too large, invalid MIDI (async — surfaced on the project page if parse fails).

### 2.3 `/projects` Project list

- Grid of `ProjectCard`s (via `ProjectList`): piano-roll thumbnail (`preview_image_key`), name, duration, BPM, note count, status badge, created date, kebab menu (Open / Export / Delete with confirm dialog).
- Empty state: illustration + "Upload your first MIDI" CTA.
- Skeleton cards while loading. Cursor-based "Load more".

### 2.4 `/projects/[id]` Project editor — the core screen

Two-column layout (stacks on mobile):

```
┌──────────────────────────────────────────────┬─────────────────────┐
│  Header: name (editable) · BPM · duration ·   │                     │
│  status badge                                 │  RenderSettings     │
├──────────────────────────────────────────────┤  Panel              │
│                                               │   resolution        │
│  PianoRollPreview                             │   speed             │
│  (scrollable/zoomable canvas,                 │   difficulty        │
│   RH cyan / LH orange, playhead,              │   note names  [sw]  │
│   play/pause scrub via Web Audio              │   keyboard    [sw]  │
│   metronome-less synth — stretch goal:        │   theme             │
│   simple oscillator playback)                 │                     │
│                                               │  [ Generate ▾ ]     │
├──────────────────────────────────────────────┤   ├ Video           │
│  KeyboardVisualizer (88 keys, highlights      │   ├ Sheet PDF       │
│  follow playhead — same component logic       │   ├ Beginner MIDI   │
│  as video renderer's layout math)             │   └ Everything      │
├──────────────────────────────────────────────┼─────────────────────┤
│  JobStatusPanel (active + recent jobs,        │  link → /export     │
│  progress bars, error details, retry button)  │                     │
└──────────────────────────────────────────────┴─────────────────────┘
```

Key behaviors:
- While `parse_midi` runs: piano roll area shows skeleton + "Analyzing your MIDI…" with the parse job's progress.
- Settings changes PATCH immediately (debounced 500 ms) and bump version; a toast notes "Settings saved".
- Changing `difficulty` to easy/very easy shows an info chip: "Rule-based simplification — keeps the melody, reduces chords."
- `Generate` enqueues required jobs, chaining `simplify_midi` first when difficulty ≠ original (API contract in `API.md` §3).
- Job failure shows `error_message` plainly + "Retry" (re-enqueues).

### 2.5 `/projects/[id]/export` Export page

- `VideoPreview`: inline `<video>` player for completed MP4 (signed URL), resolution/speed badges.
- `SheetPreview`: embedded PDF first page (object/iframe) + page count.
- `ExportDownloadPanel`: one card per artifact — kind icon, filename, size, created date, expiry note ("available 30 days"), `Download` button (fresh signed URL fetched on click). Disabled cards with progress for in-flight jobs.
- "Regenerate with current settings" shortcut back to editor.

---

## 3. Components

| Component | Responsibility | Notes |
|---|---|---|
| `MidiUploader` | Dropzone, client-side type/size pre-check, signed-URL PUT with progress, confirm call | react-dropzone; shows the 2-phase upload as one progress bar |
| `PianoRollPreview` | Render notes JSON on `<canvas>`: time→x, pitch→y, hand colors; zoom (wheel), scroll, playhead | Canvas (not SVG/DOM) — 5k+ notes must stay 60 fps; virtualized draw of visible window only |
| `KeyboardVisualizer` | 88-key keyboard strip; highlight active keys at playhead time | Pure function `(notes, t) → activeKeys`; shares key-layout math with backend renderer conceptually (documented constants in `shared-types`) |
| `RenderSettingsPanel` | All settings controls bound to PATCH; shows settings version conflicts | shadcn Select/Switch/Tabs; debounced save; optimistic UI |
| `JobStatusPanel` | List active/recent jobs; poll `GET /jobs/{id}` every 2 s while any job active; progress bars; retry | Polling stops when tab hidden (Page Visibility API) and when no active jobs |
| `ExportDownloadPanel` | Artifact cards + download buttons (fetch fresh signed URL on click) | Never caches signed URLs across sessions |
| `ProjectList` | Grid + skeletons + empty state + delete confirm | Server component for first page, client for pagination |
| `SheetPreview` | First-page PDF preview | `<object type="application/pdf">` with fallback download link |
| `VideoPreview` | HTML5 player with poster (piano-roll thumbnail) | `preload="metadata"` to save bandwidth |

State/data layer: TanStack Query for all API calls (caching, polling via `refetchInterval`, mutation invalidation). No global store needed in MVP — server state is the state.

---

## 4. User Flow (golden path)

```
1. UPLOAD     /upload         drop file → name → uploading (progress) →
                              redirect /projects/[id]
2. PREVIEW    /projects/[id]  parse job runs (skeleton + progress) →
                              piano roll appears, BPM/duration/hands shown
3. CUSTOMIZE  /projects/[id]  tweak resolution/speed/difficulty/theme →
                              autosaved
4. GENERATE   /projects/[id]  click Generate → Everything →
                              JobStatusPanel shows simplify → sheet → video
                              progressing
5. DOWNLOAD   /projects/[id]/export
                              watch video inline, flip sheet PDF,
                              download all artifacts
```

Failure paths surfaced inline at the step they occur; user is never dead-ended (every error state has a retry or a route back).

---

## 5. States Checklist (every page must define)

| State | Treatment |
|---|---|
| Loading | Skeletons (never spinners on full pages) |
| Empty | Friendly illustration + single CTA |
| Error (recoverable) | Inline alert + retry action |
| Error (fatal, e.g. 404) | Full-page message + "Back to projects" |
| Processing | Progress bar with percent + human message from `progress_message` |
| Expired artifact | Card shows "Expired — regenerate" instead of download |

---

## 6. Responsive & Accessibility

- Breakpoints: editor two-column ≥ `lg`; below, settings panel becomes a Sheet (slide-over) triggered by a "Settings" button; piano roll keeps full width.
- Vertical-video preview renders portrait aspect box.
- A11y: all controls keyboard-reachable (shadcn/Radix gives this), canvas piano roll gets an `aria-label` summary ("1,623 notes, 5 minutes, 66 BPM") since canvas content is opaque to screen readers; color is never the only hand indicator (legend + optional L/R letters in note tooltips); contrast AA on both themes.

---

## 7. UX Copy Principles

- Status, not jargon: "Analyzing your MIDI…", "Drawing your video (42%)", "Sheet music ready".
- Honest labels: "Beginner version (rule-based)", "Auto-generated sheet — rhythm is approximate".
- Errors say what to do next: "This file isn't a valid MIDI. Try exporting again from your app as .mid."
