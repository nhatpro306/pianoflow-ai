# PianoFlow AI — Audit Report: Practice Mode & Frontend Performance (Wave 1 Track C)

> **Document:** `docs/audits/2026-10-03-practice-mode.md`  
> **Date:** 2026-10-03  
> **Author:** Frontend Practice Mode Engineer (CODER — Wave 1 Track C)  
> **Scope:** Web Practice Mode (`/projects/[id]/practice`), Web MIDI integration, Canvas 2D engine, Navigation accessibility, PWA configuration  

---

## 1. Executive Summary

This audit documents the resolution of four end-to-end bugs (Bug 1, Bug 2, Bug 3, Bug 4) and targeted performance enhancements for the Practice Mode canvas in PianoFlow AI (`@pianoflow/web`). All changes adhere to the architecture defined in [`docs/MASTER_PLAN.md`](file:///c:/Users/super/pianoflow/docs/MASTER_PLAN.md), [`docs/UI_UX.md`](file:///c:/Users/super/pianoflow/docs/UI_UX.md), [`docs/E2E_REPORT.md`](file:///c:/Users/super/pianoflow/docs/E2E_REPORT.md), and baseline benchmarks established in [`docs/PERF_AUDIT.md`](file:///c:/Users/super/pianoflow/docs/PERF_AUDIT.md).

All changes are strictly contained within the assigned disjoint write scope:
- [`apps/web/next.config.mjs`](file:///c:/Users/super/pianoflow/apps/web/next.config.mjs)
- [`apps/web/app/projects/[id]/practice/page.tsx`](file:///c:/Users/super/pianoflow/apps/web/app/projects/[id]/practice/page.tsx)
- [`apps/web/components/practice/PracticeCanvas.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/practice/PracticeCanvas.tsx)
- [`apps/web/lib/midi/useWebMidi.ts`](file:///c:/Users/super/pianoflow/apps/web/lib/midi/useWebMidi.ts)
- [`apps/web/lib/audio/acousticFeedback.ts`](file:///c:/Users/super/pianoflow/apps/web/lib/audio/acousticFeedback.ts)
- [`apps/web/components/MobileNav.tsx`](file:///c:/Users/super/pianoflow/apps/web/components/MobileNav.tsx)
- [`apps/web/app/layout.tsx`](file:///c:/Users/super/pianoflow/apps/web/app/layout.tsx)
- [`docs/audits/2026-10-03-practice-mode.md`](file:///c:/Users/super/pianoflow/docs/audits/2026-10-03-practice-mode.md)

---

## 2. Issues Addressed & Architectural Improvements

### 2.1 Bug 1: Infinite Dev Rebuild & Fast Refresh Loop in PWA
- **Symptom:** In development mode (`next dev`), Webpack repeatedly triggered `GenerateSW`, generating service worker artifacts in `apps/web/public/`. Detecting changes in `public/`, Webpack initiated consecutive rebuilds, causing `GenerateSW has been called multiple times` log floods, browser reloads via `controllerchange`, and HMR chunk 404s.
- **Root Cause:** `withPWAInit({ dest: "public" })` in `next.config.mjs` lacked conditional disabling in development mode.
- **Resolution:** Added `disable: process.env.NODE_ENV === "development"` to `withPWAInit`. In production builds, PWA service workers and manifests generate normally.

### 2.2 Bug 2 & Performance: Decoupling `requestAnimationFrame` from React State
- **Symptom:** During active playback in Practice Mode, frame rate degraded from 60.2 FPS to 28.0 FPS under 4× CPU throttling.
- **Root Cause:** In `PracticePage.tsx`, `animate` called `setCurrentTime((prevTime) => nextTime)` on every animation frame (60 times/sec). This triggered continuous React component re-renders:
  - `PracticePage` recomputed `expectedNotesSet` every 16.6ms.
  - `<Keyboard>` (rendering 88 piano keys) re-rendered 60 times/second.
  - `PracticeCanvas.tsx` received new props and ran canvas drawing synchronously inside a `useEffect([draw])` post-commit hook.
- **Resolution:**
  1. Replaced `currentTime` React state with a mutable `useRef<number>(0)` (`currentTimeRef`).
  2. Moved high-frequency playhead advancement and game logic into an independent loop reading/writing `currentTimeRef.current` without calling `setCurrentTime`.
  3. `PracticeCanvas` now maintains its own internal `requestAnimationFrame` render loop reading `currentTimeRef.current`, eliminating React renders from the canvas draw path.
  4. React state updates are now restricted strictly to:
     - Scoring events (`Perfect`, `Good`, `Miss`) and combo milestones via `engine.onScore`.
     - Active key press/release events from Web MIDI and touch input.
     - Playback state transitions (`Start`, `Pause`, `Reset`, `Finish`).
     - Expected chord guidance updates on scoring or pause/resume events.

### 2.3 Canvas DevicePixelRatio Clamping
- **Symptom:** On high-DPI displays (MacBook Retina DPR 2, mobile devices DPR 3–4), full-frame 2D canvas backing stores were allocated at $(W \times \text{DPR}) \times (H \times \text{DPR})$, multiplying fill operations and VRAM overhead by up to $16\times$.
- **Resolution:** Clamped device pixel ratio using `Math.min(window.devicePixelRatio || 1, 2)` in `PracticeCanvas.tsx`. Ensures crisp visuals on retina screens while capping rasterization memory and GPU composition cost.

### 2.4 Bug 3: Web MIDI Listener Cleanup on Unmount
- **Symptom:** Navigating away from `/projects/[id]/practice` left the `access.onstatechange` event handler registered on the global `MIDIAccess` instance, causing memory leaks and redundant listener execution on re-entry.
- **Resolution:** Implemented component mount lifecycle tracking and added a cleanup return function in `useWebMidi.ts` resetting `accessObj.onstatechange = null`.

### 2.5 Bug 4: Navigation Accessibility Locator Ambiguity
- **Symptom:** Desktop header navigation and mobile drawer navigation concurrently contained identical link paths (`/create`, `/projects`, `/pricing`) inside unnamed `<nav>` elements. Even though the desktop container had `hidden md:flex`, both were present in the DOM without distinct accessible labels.
- **Resolution:**
  - Added `aria-label="Desktop navigation"` to `<nav>` in `apps/web/app/layout.tsx`.
  - Added `aria-label="Mobile navigation"` to `<nav>` in `apps/web/components/MobileNav.tsx`.

### 2.6 Sound Engine Lazy Loading (`smplr`)
- **Symptom:** Eager top-level `import { SplendidGrandPiano } from "smplr"` packaged the entire acoustic sample engine into the initial route bundle of `/projects/[id]/practice`, swelling First Load JS to 211 kB.
- **Resolution:** Converted static import to TypeScript type-only import `import type { SplendidGrandPiano } from "smplr"` and dynamically imported `smplr` via `const { SplendidGrandPiano } = await import("smplr")` inside `init()` / `initPianoAudio()`.

---

## 3. Quantitative Verification & Before/After Metrics

### 3.1 Frontend First Load JS Bundle (`pnpm --filter web build`)

| Route | Baseline Wave 0 | Wave 1 Track C | Delta | Improvement |
|---|---|---|---|---|
| `/` | 105 kB | 105 kB | 0 kB | — |
| `/create` | 173 kB | 174 kB | +1 kB | Normal variation |
| `/projects` | 187 kB | 187 kB | 0 kB | — |
| `/projects/[id]` | 212 kB | 212 kB | 0 kB | — |
| **`/projects/[id]/practice`** | **211 kB** | **190 kB** | **-21 kB** | **-10.0% reduction** (lazy `smplr`) |
| Shared chunks | 102 kB | 102 kB | 0 kB | Unchanged |

### 3.2 React State Update & Re-render Overhead

| Metric | Baseline Wave 0 | Wave 1 Track C | Status |
|---|---|---|---|
| **`setState` calls in rAF loop** | 60 updates / second (`setCurrentTime`) | **0 updates / second** | **PASSED** (Decoupled to `useRef`) |
| **`<Keyboard>` (88 keys) re-renders** | ~60 re-renders / second | **0 during steady playback** (only on note hit/miss/press) | **PASSED** |
| **Canvas Draw Sync** | Synchronous inside React `useEffect` commit | **Decoupled native rAF loop** | **PASSED** |
| **Canvas DPR Cap** | Unbounded (DPR up to 3–4) | **Clamped $\le 2.0$** | **PASSED** |
| **MIDI Listener Leak** | `onstatechange` persisted across unmounts | **Guaranteed `null` teardown** | **PASSED** |
| **Nav Accessibility** | Ambiguous unlabelled `<nav>` | **Separate desktop & mobile aria labels** | **PASSED** |
| **PWA Dev Rebuild Loop** | Active in `next dev` | **Disabled in `NODE_ENV === "development"`** | **PASSED** |

### 3.3 Static Quality Checks

- **TypeScript Typecheck:** `pnpm --filter web typecheck` $\to$ **0 errors (Exit Code 0)**
- **ESLint Validation:** `pnpm --filter web lint` $\to$ **0 warnings / 0 errors (Exit Code 0)**
- **Next.js Production Build:** `pnpm --filter web build` $\to$ **Compiled in 32.0s (Exit Code 0)**

---

## 4. Rollback Plan

If any regressions are observed, changes can be rolled back cleanly without affecting other components:

1. **Full Rollback via Git:**
   ```bash
   git checkout HEAD -- \
     apps/web/next.config.mjs \
     apps/web/app/projects/[id]/practice/page.tsx \
     apps/web/components/practice/PracticeCanvas.tsx \
     apps/web/lib/midi/useWebMidi.ts \
     apps/web/lib/audio/acousticFeedback.ts \
     apps/web/components/MobileNav.tsx \
     apps/web/app/layout.tsx
   ```

2. **Partial Reversal:**
   - To revert PWA dev disable: Remove `disable: process.env.NODE_ENV === "development"` in `apps/web/next.config.mjs`.
   - To revert canvas rAF decoupling: Revert `apps/web/app/projects/[id]/practice/page.tsx` and `apps/web/components/practice/PracticeCanvas.tsx` to restore `currentTime` React state.
   - To revert lazy soundfont loading: Re-add top-level static `import { SplendidGrandPiano } from "smplr"` in `apps/web/lib/audio/acousticFeedback.ts`.
