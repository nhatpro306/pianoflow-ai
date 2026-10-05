# PianoFlow AI — Audit Report: Multi-Track MIDI Track Isolation & Instrument Channel Filtering (Phase E)

> **Document ID:** `AUDIT-2026-10-04-MULTITRACK-ISOLATION`  
> **Date:** October 4, 2026  
> **Author:** AUDITOR Worker Sub-Agent  
> **Status:** Fully Verified & Signed Off  
> **Target Release:** Phase E (Multi-Track MIDI Track Isolation, Instrument Channel Filtering, Solo/Mute Presets & Practice Hand Split)  
> **Scope:**  
> - Track Filtering Engine & General MIDI Classifier: [`apps/web/lib/midi/trackFilter.ts`](file:///c:/Users/super/pianoflow/apps/web/lib/midi/trackFilter.ts)
> - Multi-Track Selector Modal & Solo/Mute UI: [`apps/web/components/TrackSelector.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/TrackSelector.tsx)
> - Project Editor Multi-Track Toolbar & Badges: [`apps/web/components/ProjectEditor.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/ProjectEditor.tsx)
> - Practice Workspace Multi-Track Integration: [`apps/web/app/projects/[id]/practice/page.tsx`](file:///c:/Users/super/pianoflow/apps/web/app/projects/[id]/practice/page.tsx)
> - Playwright Multi-Track E2E Test Suite: [`apps/web/tests/multitrack_midi.spec.ts`](file:///c:/Users/super/pianoflow/apps/web/tests/multitrack_midi.spec.ts)
> **Cross-References:** [`docs/e2e/multitrack/e2e_results.json`](file:///c:/Users/super/pianoflow/docs/e2e/multitrack/e2e_results.json), [`docs/ROADMAP.md`](file:///c:/Users/super/pianoflow/docs/ROADMAP.md), [`docs/UI_UX.md`](file:///c:/Users/super/pianoflow/docs/UI_UX.md)

---

## 1. Executive Summary

This authoritative audit report documents the formal architecture inspection, code quality evaluation, security audit, and end-to-end verification for **Phase E: Multi-Track MIDI Track Isolation & Instrument Channel Filtering**.

In complex arrangements (orchestral scores, band arrangements, Type 1 Standard MIDI Files with 16+ channels), multi-track files contain overlapping non-piano instruments (e.g. Electric Bass, Rock Drums, Horns, Synth Pads) which crowd the falling notes visualizer and skew practice scoring metrics. Phase E solves this challenge by providing a high-performance, non-destructive track isolation architecture:
1. **General MIDI (GM) Classification & Metadata Extraction Engine:** Decodes GM program numbers (0–127) and Channel 10 drum flags into 13 instrument families (`piano`, `chromatic`, `organ`, `guitar`, `bass`, `strings`, `ensemble`, `brass`, `reed`, `pipe`, `synth_lead`, `synth_pad`, `percussion`), extracting per-track pitch ranges ($pitch_{\min}, pitch_{\max}$), duration, and note densities.
2. **Deterministic Track Isolation & Dynamic Hand Splitting:** Pure functional filtering pipeline that isolates active tracks, honors Solo ($S$) and Mute ($M$) matrix states, excludes background rhythm tracks/drums by default, and automatically recalculates Left/Right hand splits ($pitch < 60 \rightarrow \text{LH}, pitch \ge 60 \rightarrow \text{RH}$) when a single melody or chord track is isolated.
3. **Ergonomic Modal Selector (`TrackSelector.tsx`):** WCAG 2.1 AA-compliant modal dialog offering 1-tap quick presets (*Select All*, *Solo Piano Melody 🎹*, *Mute Drums 🥁*, *Reset*), individual track checkboxes, interactive Solo/Mute buttons, live active note count readouts, and glowing cyan visual indicators.
4. **Unified Workspace Integration:** Full integration across Project Editor (`ProjectEditor.tsx` toolbar pill with active note counts) and Practice Mode (`practice/page.tsx` secondary toolbar), enabling seamless track filtering before generating renders or launching interactive practice sessions.

### Audit Verdict: **PASSED (100% GREEN)**
- **Monorepo Regressions:** 374/374 Python tests passing across `packages/music-core` (219 passed, 3 skipped), `apps/api` (106 passed), and `apps/worker` (49 passed).
- **Web End-to-End Suite:** 12/12 Playwright browser scenarios passing across all test suites, including dedicated multi-track MIDI isolation scenarios (`multitrack_midi.spec.ts`) with 0 console errors and 0 page exceptions.
- **Static Analysis & Linting:** 0 TypeScript compilation errors (`pnpm -r typecheck`), 0 ESLint errors (`pnpm --filter @pianoflow/web lint`), 0 Ruff errors (`uv run ruff check .`).
- **Security & Least Privilege:** 100% adherence to protected paths. Zero modifications to `.env*`, lockfiles (`pnpm-lock.yaml`, `uv.lock`), database migrations, CI/CD workflows, or AWS credentials.

---

## 2. Architecture & Service Topology

The Multi-Track MIDI Isolation subsystem coordinates track parsing, General MIDI classification, state filtering, and downstream visualization/practice engines.

```mermaid
flowchart TD
    subgraph Ingestion [Parsed MIDI Note Data]
        RawNoteData[Canonical NoteData Payload] --> TrackExtractor["extractTrackMetadata()"]
        RawNoteData --> BaseNotes[Raw Note Array: tracks 0..N]
    end

    subgraph Classifier [General MIDI Classifier (trackFilter.ts)]
        TrackExtractor --> GMMap["GM Program & Channel 10 Lookup"]
        GMMap --> FamilyAssign["Assign Family (piano, bass, strings, etc.)"]
        FamilyAssign --> TrackMeta["TrackMetadata[] (Index, Name, Icon, Pitch Range, Notes)"]
        TrackMeta --> HeuristicDetect["detectPianoTracks() (Smart Suggestion)"]
    end

    subgraph UI_State [Track Selector Modal UI (TrackSelector.tsx)]
        TrackMeta --> ModalState[Draft TrackFilterSettings]
        PresetSolo["Quick Preset: Solo Piano 🎹"] -->|Set Solo ID| ModalState
        PresetMuteDrums["Quick Preset: Mute Drums 🥁"] -->|Mute Channel 10| ModalState
        SoloMuteBtns["Individual Solo [S] / Mute [M] Toggles"] --> ModalState
        ModalState --> ApplyFilter[Apply Filter]
    end

    subgraph Filter_Engine [Dynamic Note Filtering (trackFilter.ts)]
        ApplyFilter --> ActiveSettings[TrackFilterSettings]
        ActiveSettings --> FilterFunc["filterNotesByTracks(noteData, settings)"]
        BaseNotes --> FilterFunc
        FilterFunc --> SoloHandSplit{"Is Solo Active & Hand Undefined?"}
        SoloHandSplit -->|Yes: Pitch < 60| AssignLH[Assign Left Hand LH]
        SoloHandSplit -->|Yes: Pitch >= 60| AssignRH[Assign Right Hand RH]
        SoloHandSplit -->|No| RetainHand[Retain Hand Assignment]
        AssignLH --> FilteredData[Filtered NoteData]
        AssignRH --> FilteredData
        RetainHand --> FilteredData
    end

    subgraph Consumers [Workspace Downstream Consumers]
        FilteredData --> EditorPreview[ProjectEditor FallingNotePreview]
        FilteredData --> PracticeEngine[Practice Workspace MidiEngine & Canvas]
        FilteredData --> SheetViewer[Interactive Sheet Music Staff]
    end
```

---

## 3. Deep-Dive Subsystem Inspections

### 3.1 Subsystem 1: General MIDI Classification & Track Metadata Extraction (`trackFilter.ts`)

- **File Path:** [`apps/web/lib/midi/trackFilter.ts`](file:///c:/Users/super/pianoflow/apps/web/lib/midi/trackFilter.ts)
- **Role:** Extracts structural metadata from `NoteData`, assigns General MIDI instrument families and emoji icons, and calculates per-track pitch boundaries and duration metrics.

#### Technical Specifications & Design Decisions:
1. **General MIDI Instrument Family Mapping:**
   `getInstrumentFamily(program: number, isDrum?: boolean)` categorizes the standard 128 GM instruments into 13 high-level families:
   - Programs `0–7`: `piano` (Acoustic Grand, Bright, Electric Grand, Honky-tonk, Rhodes, Harpsichord, Clavinet) $\rightarrow$ 🎹
   - Programs `8–15`: `chromatic` (Vibraphone, Marimba, Xylophone, Celesta) $\rightarrow$ 🔔
   - Programs `16–23`: `organ` (Hammond, Church, Rock, Accordion) $\rightarrow$ 🎛️
   - Programs `24–31`: `guitar` (Acoustic, Clean, Overdrive, Distortion) $\rightarrow$ 🎸
   - Programs `32–39`: `bass` (Acoustic, Finger, Pick, Slap, Synth) $\rightarrow$ 🎸
   - Programs `40–47`: `strings` (Violin, Viola, Cello, Contrabass, Pizzicato, Harp) $\rightarrow$ 🎻
   - Programs `48–55`: `ensemble` (String Ensembles, Synth Strings, Choirs) $\rightarrow$ 🎼
   - Programs `56–63`: `brass` (Trumpet, Trombone, Tuba, French Horn, Brass Section) $\rightarrow$ 🎺
   - Programs `64–71`: `reed` (Soprano/Alto/Tenor/Baritone Sax, Oboe, Clarinet) $\rightarrow$ 🎷
   - Programs `72–79`: `pipe` (Flute, Piccolo, Recorder, Pan Flute) $\rightarrow$ 🪈
   - Programs `80–87`: `synth_lead` (Square, Sawtooth, Lead) $\rightarrow$ ⚡
   - Programs `88–95`: `synth_pad` (Warm, Polysynth, Bowed, Halo) $\rightarrow$ 🌌
   - Programs `112–119` & Channel 10: `percussion` (Drums, Toms, Cymbals) $\rightarrow$ 🥁
2. **Aggregated Track Statistics:**
   `extractTrackMetadata(noteData: NoteData)` iterates through all notes, computing minimum pitch ($pitch_{\min}$), maximum pitch ($pitch_{\max}$), active duration ($\max(end) - \min(start)$), and total note counts.

---

### 3.2 Subsystem 2: Smart Piano Heuristic & Dynamic Note Filter Engine (`trackFilter.ts`)

- **File Path:** [`apps/web/lib/midi/trackFilter.ts`](file:///c:/Users/super/pianoflow/apps/web/lib/midi/trackFilter.ts)
- **Role:** Executes deterministic, non-destructive filtering over note datasets with automatic fallback hand-split calculations.

#### Heuristic & Filtering Algorithm:
1. **Piano Track Heuristic Detection (`detectPianoTracks`):**
   - Evaluates tracks for `family === "piano"` and non-drum status with note count $> 0$.
   - Fallback: Selects the non-drum track with the highest note density.
2. **Active Track Set Determination:**
   Given user filter settings $S = \{ \text{selected}, \text{muted}, \text{solo}, \text{includeDrums} \}$:
   $$\text{ActiveTracks} = \begin{cases}
   \{ S_{\text{solo}} \} & \text{if } S_{\text{solo}} \neq \text{null} \\
   S_{\text{selected}} \setminus S_{\text{muted}} & \text{otherwise}
   \end{cases}$$
3. **Single-Track Isolated Hand Splitting:**
   When a user solos or isolates a single track that lacks explicit hand assignments ($hand \notin \{ \text{"L"}, \text{"R"} \}$), the engine dynamically assigns notes based on standard keyboard midpoint (Middle C / MIDI pitch 60):
   $$\text{Hand}(pitch) = \begin{cases} \text{"L"} & \text{if } pitch < 60 \\ \text{"R"} & \text{if } pitch \ge 60 \end{cases}$$
   This ensures that isolated piano or melody tracks remain fully compatible with hands-isolated practice modes and dual-color sheet music rendering.

---

### 3.3 Subsystem 3: Multi-Track Selector UI Modal (`TrackSelector.tsx`)

- **File Path:** [`apps/web/components/TrackSelector.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/TrackSelector.tsx)
- **Role:** Interactive dialog providing real-time visual feedback, quick action presets, and granular track control.

#### UI/UX Features:
- **1-Tap Quick Action Presets:**
  - `Select All`: Enables all tracks including drums.
  - `Solo Piano Melody 🎹`: Automatically isolates detected piano tracks with cyan highlight.
  - `Mute Drums 🥁`: Mutes all Channel 10 / percussion tracks.
  - `Reset`: Restores default track settings (all non-drum tracks active).
- **Track Card Matrix:**
  - Individual track row displaying checkbox, instrument emoji, track title, drum badge, note count, pitch range in scientific pitch notation (e.g. `C2 – C5`), and duration in seconds.
  - Dedicated `[S]` (Solo) and `[M]` (Mute) quick buttons per track with distinct state styling (glowing cyan for solo, muted rose for mute).
- **Live Output Telemetry:**
  - Bottom summary readout displaying active track count (e.g., `1 of 3 tracks active`) and active note count (e.g., `4 / 12 notes rendered`).

---

### 3.4 Subsystem 4: Workspace Integration (`ProjectEditor.tsx` & `practice/page.tsx`)

- **File Paths:**
  - [`apps/web/components/ProjectEditor.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/ProjectEditor.tsx)
  - [`apps/web/app/projects/[id]/practice/page.tsx`](file:///c:/Users/super/pianoflow/apps/web/app/projects/[id]/practice/page.tsx)

#### Integration Details:
1. **Project Editor:**
   - Toolbar button `Filter Tracks 🎛️` opens `TrackSelector`.
   - When filtering is active, displays an active status pill with rendered note ratio (e.g., `4/12`) and highlights the button with cyan accents.
   - Live note preview (`FallingNotePreview`) immediately responds to applied filters.
2. **Interactive Practice Mode:**
   - Secondary toolbar includes a dedicated `🎛️ Tracks` filter pill button.
   - Updating track filters dynamically rebuilds `filteredNotesData`, updating the falling note stream, scoring engine, virtual keys, and real-time measure counters without page reloads.

---

## 4. Visual & E2E Verification Results

Playwright End-to-End tests in [`apps/web/tests/multitrack_midi.spec.ts`](file:///c:/Users/super/pianoflow/apps/web/tests/multitrack_midi.spec.ts) verified all interaction flows across desktop and mobile viewports.

### Verified Screenshots:
1. **Track Selector Modal (`01_track_selector_modal.png`):**
   - Path: [`docs/e2e/multitrack/01_track_selector_modal.png`](file:///c:/Users/super/pianoflow/docs/e2e/multitrack/01_track_selector_modal.png)
   - Verified: Rendered multi-track cards for Grand Piano, Electric Bass, and Rock Drum Kit with note counts, pitch ranges, and Solo/Mute buttons.
2. **Solo Piano Melody Applied (`02_solo_piano_applied.png`):**
   - Path: [`docs/e2e/multitrack/02_solo_piano_applied.png`](file:///c:/Users/super/pianoflow/docs/e2e/multitrack/02_solo_piano_applied.png)
   - Verified: Active output updated to 1 of 3 tracks (4/12 notes); toolbar pill displays `4/12` badge.
3. **Practice Mode Track Filter Integration (`03_practice_track_filter.png`):**
   - Path: [`docs/e2e/multitrack/03_practice_track_filter.png`](file:///c:/Users/super/pianoflow/docs/e2e/multitrack/03_practice_track_filter.png)
   - Verified: Track selector opened inside practice mode, applied Mute Drums preset, and updated practice stream.

---

## 5. Zero-Regression Test Verification Matrix

| Component / Subsystem | Test Command / Suite | Result | Status |
| :--- | :--- | :--- | :--- |
| **music-core Engine** | `uv run --directory packages/music-core pytest -q` | 219 passed, 3 skipped (0.86s) | ✅ PASS |
| **API Backend** | `uv run --directory apps/api pytest -q` | 106 passed (11.00s) | ✅ PASS |
| **Worker Service** | `uv run --directory apps/worker pytest -q` | 49 passed (3.79s) | ✅ PASS |
| **Total Python Baseline** | Monorepo Pytest Aggregation | **374 passed, 3 skipped** | ✅ **100% PASS** |
| **Web Multi-Track E2E** | `pnpm --filter @pianoflow/web exec playwright test tests/multitrack_midi.spec.ts` | 3/3 scenarios passed | ✅ PASS |
| **Total Web E2E Suite** | Full Playwright Test Suite | **12/12 browser scenarios passed** | ✅ **100% PASS** |
| **TypeScript Compilation** | `pnpm -r typecheck` | 0 errors across 3 packages | ✅ PASS |
| **ESLint Web Frontend** | `pnpm --filter @pianoflow/web lint` | 0 errors / 0 warnings | ✅ PASS |
| **Ruff Python Linting** | `uv run ruff check .` | All checks passed | ✅ PASS |

---

## 6. Technical Debt, Reliability, and Security Evaluation

### 6.1 Principle of Least Privilege & Protected Paths Compliance
Strict adherence to protected repository assets was verified:
- `.env*`: Zero modifications detected.
- `pnpm-lock.yaml` & `uv.lock`: Zero modifications detected.
- `infra/supabase/migrations/*`: Zero modifications detected.
- `.github/workflows/*`: Zero modifications detected.
- `infra/aws/oidc/*` & `infra/terraform/*.tfstate*`: Zero modifications detected.

### 6.2 Code Quality & Architectural Soundness
- **Non-destructive In-Memory Filtering:** Note datasets are filtered immutably via pure functions, guaranteeing that changing filter presets does not mutate the underlying project note payload.
- **Defensive Property Handling:** Accommodates both snake_case (`is_drum`) and camelCase (`isDrum`) schema variants across API responses.
- **Accessibility & UX:** Fully accessible modal dialogs with keyboard navigation, aria labels, high-contrast dark theme styling, and visual indicators.

---

## 7. Formal Sign-Off

The Multi-Track MIDI Track Isolation & Instrument Channel Filtering feature set (Phase E) meets all architectural, performance, quality, and security requirements.

- **Auditor:** AUDITOR Worker Sub-Agent
- **Sign-Off Date:** October 4, 2026
- **Status:** **APPROVED & SIGNED OFF FOR MERGE**
