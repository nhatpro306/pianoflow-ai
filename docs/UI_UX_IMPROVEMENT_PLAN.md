# PianoFlow AI — UI/UX Improvement Plan

**Date:** 2026-06-15
**Method:** Heuristic critique of the actual `apps/web` code (landing, layout, auth, dashboard, upload, editor) against a structured framework (usability, hierarchy, consistency, accessibility, copy). Companion to `docs/UI_UX.md` (as-built spec) and `MASTER_PLAN.md`.
**Stage assumed:** working MVP → polishing for real users / demo.

---

## 0. Verdict

The engineering quality of the UI is genuinely good for an MVP — loading skeletons, progress bars, error/empty states, drag-and-drop, debounced autosave, keyboard handling. The problems are **product-level, not bug-level**: the app presents itself as a *MIDI tool* instead of *"any song → playable lesson,"* the information architecture has redundant/format-split entry points, and there's **no shared design-token/primitive layer**, so consistency drifts file-by-file. Fixing those three things — positioning, IA, and a small design system — plus an accessibility pass, is the highest-value work.

---

## 1. Design critique

### Overall impression
Clean dark theme, clear enough to use — but it reads as a developer utility ("Upload a MIDI") rather than the consumer learning product the vision describes. The biggest opportunity: make the **first screen and first action** match the wedge ("paste a link / drop audio → get a lesson").

### Usability
| Finding | Severity | Recommendation |
|---|---|---|
| **Two routes for the same editor** — dashboard & uploader link to `/project?id=…`, but `/projects/[id]` also exists | 🔴 Critical | Standardize on `/projects/[id]`; redirect `/project` → `/projects/[id]`. Clean, shareable URLs. |
| **Two upload entry points split by file format** — header "Upload" (MIDI) vs "Audio Beta" | 🔴 Critical | One "Create" flow that accepts MIDI **and** audio (and later links); detect type, don't make users choose. |
| Landing leads with "Upload a MIDI" | 🟡 Moderate | Lead CTA: "Upload audio or MIDI" (+ "Paste a link" when ingestion ships). MIDI is the niche path. |
| Core outputs require manual, equal-weight clicks ("Generate sheet", "Generate tutorial video", "Generate beginner MIDI") | 🟡 Moderate | One clear primary action; group the rest in a segmented "Play · Sheet · Video" result view; auto-generate the falling-notes preview (already does). |
| `window.confirm` for delete | 🟡 Moderate | Styled confirm dialog (matches the app, less jarring, accessible). |
| AudioUploader shows text-only stage labels, no upload % | 🟢 Minor | Add a progress bar like the editor already has. |
| Disabled submit gives no reason until hover | 🟢 Minor | Inline hint ("Confirm rights to continue"). |

### Visual hierarchy
- **What draws the eye first:** the emoji title. On the editor, the cramped mono stats line (`120 BPM / 3:24 / 412 notes / …`) competes with the content. Convert to scannable **stat chips**.
- **Reading flow:** editor's primary value (falling-notes preview) is correctly large, but the action buttons below are all the same low-emphasis bordered style — nothing signals "do this next."
- **Emphasis:** the primary brand action uses three different cyan shades across screens (`cyan-500`, `cyan-600`, `cyan-400`). Pick one accent + one hover.

### Consistency
| Element | Issue | Recommendation |
|---|---|---|
| Buttons | Filled-cyan vs bordered vs cyan-600/500 across files; re-declared everywhere | Single `Button` primitive: `primary` / `secondary` / `ghost` variants |
| Cards / inputs / badges | Re-implemented inline (`rounded-xl border border-zinc-800 bg-zinc-900/50…`) in every file | `Card`, `Input`, `Badge`, `Progress`, `Skeleton` primitives |
| Tokens | `globals.css` defines only 2 vars (hand colors) | Add semantic tokens (surface/border/text/accent/success/warn/danger, radius, spacing) |
| Routes | `/project?id=` vs `/projects/[id]` | Consolidate (see Usability) |

### Accessibility
- **Color contrast:** `text-zinc-600` on `zinc-950` (used for labels like "Duration/BPM") is ~3:1 — **fails** WCAG AA for small text. Bump to `zinc-400/300`.
- **Icons:** emoji (🎹🎤🎼🎬) used as meaningful icons without `aria-label` / `aria-hidden`. Add labels or switch to an icon set (e.g. `lucide-react`).
- **Keyboard:** the upload dropzone activates on Enter but not Space; ensure visible `focus-visible` rings on all buttons/links (current focus = border-color change only).
- **Touch targets:** several `py-1.5` buttons are under the 44px guideline on mobile.
- **Motion:** falling-notes animation has no `prefers-reduced-motion` fallback.

### What works well
- Real loading skeletons, job progress bars, and distinct error/empty states — most MVPs skip these.
- Honest, well-placed beta/rights messaging in the uploader.
- Debounced settings autosave with optimistic local state in the editor.
- Sensible responsive scaffolding (`sm:`/`lg:` grids) already present.

---

## 2. Prioritized plan

Ordered by impact-to-effort. **All additive — no working flow is removed; routes are redirected, not deleted.**

**P0 — Quick wins (hours each, no new deps)**
- Consolidate routes: redirect `/project?id=` → `/projects/[id]`; update the two links (`AudioUploader` submit, `ProjectCard`).
- Merge the two header entries into one **"Create"**; the create page offers MIDI + audio in one place.
- Fix contrast: replace `text-zinc-600` body/label usage with `zinc-400`.
- Add `aria-label`/`aria-hidden` to emoji icons; add `focus-visible` rings; Space-activates dropzone.
- Replace `window.confirm` delete with the styled dialog (after `Dialog` primitive lands in P1).

**P1 — Design-system foundation (the root fix for consistency)**
- Token layer in `globals.css` / Tailwind theme: semantic colors, radius, spacing, one accent.
- Primitives in `apps/web/components/ui/`: `Button`, `Card`, `Input`, `Badge`, `Progress`, `Skeleton`, `Dialog`. Refactor existing screens to use them (mechanical, low-risk).

**P2 — Core-flow & messaging redesign**
- Landing + copy: lead with "Turn any song into a lesson you can play"; primary CTA "Upload audio or MIDI"; reframe audio as the hero, not Beta-buried.
- Editor result view: hero falling-notes player + a segmented **Play · Sheet · Video · Download**; one primary action; auto-trigger common renders; add a "Practice" next-step nudge (ties to the learning plan).
- Replace technical error codes with human copy (`SIMPLIFIED_NOTES_NOT_READY` → "Generate the beginner version first"). Centralize in one `errorMessage()` map.

**P3 — Accessibility & responsive pass**
- Audit with the `design:accessibility-review` skill; fix touch targets, focus order, `prefers-reduced-motion` for falling notes, mobile header (collapsible nav), editor on small screens.

**P4 — Brand & polish**
- Real logo/wordmark instead of emoji; consistent icon set (`lucide-react`); empty-state illustrations; micro-interactions on success.

---

## 3. Sonnet-executable tasks

One PR each; `pnpm --filter @pianoflow/web build` + `pnpm -r typecheck` must pass. Reuse existing patterns; do not alter API contracts.

| ID | Task | Files | Acceptance |
|---|---|---|---|
| UX1 | Consolidate project route | keep `app/projects/[id]/page.tsx`; redirect `app/project/page.tsx`; update **all 4** `/project?id=` links: `app/projects/page.tsx` L34, `app/upload-audio/page.tsx` L74, `components/AudioUploader.tsx` L64, `components/MidiUploader.tsx` L61 | All links go to `/projects/{id}`; `/project?id=` 301s; grep for `/project?id=` returns 0 |
| UX2 | Unify upload entry | `app/layout.tsx` nav, new/!merged create page | One "Create" nav item; page accepts MIDI + audio; old paths redirect |
| UX3 | UI primitives + tokens | `app/globals.css`, `components/ui/{Button,Card,Input,Badge,Progress,Skeleton,Dialog}.tsx` | Primitives exist with variants + tests; Storybook-less but typed |
| UX4 | Refactor screens to primitives | landing, login, projects, editor, uploaders | Visual parity; one accent shade; no inline button/card duplication |
| UX5 | Contrast + a11y basics | all screens | `zinc-600` text removed; emoji labelled; focus rings; Space-activates dropzone |
| UX6 | Styled delete dialog | `app/projects/page.tsx` + `ui/Dialog` | No `window.confirm`; keyboard-dismissable, focus-trapped |
| UX7 | Editor result view | `components/ProjectEditor.tsx` | Stat chips; segmented Play/Sheet/Video/Download; one primary CTA; humane error copy |
| UX8 | Landing/messaging | `app/page.tsx`, `components/AudioUploader.tsx` copy | Leads with "any song"; audio is primary; honest beta note retained |
| UX9 | Upload progress + reasons | `components/AudioUploader.tsx` | Upload % bar; inline disabled-reason hint |
| UX10 | Responsive + reduced-motion | `app/layout.tsx`, `FallingNotePreview.tsx` | Mobile nav collapses; `prefers-reduced-motion` honored |

Suggested order: **UX1, UX2, UX5** (quick wins) → **UX3, UX4** (foundation) → **UX7, UX8** (the visible redesign) → **UX6, UX9, UX10** (polish). Run the `design:accessibility-review` skill after UX5 and again after UX7.

---

## 4. Non-breaking guarantee

Every change is additive or a redirect: primitives are new files; refactors preserve behavior and visuals; routes are redirected not removed; no API request/response shapes change; copy and tokens are cosmetic. Each task ships green behind its own PR, so the working app never regresses.

