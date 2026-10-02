# PianoFlow AI — Piano-Learning Market Analysis & Product Improvement Plan

**Date:** 2026-06-15
**Scope:** Analyze the popular piano-learning platforms and turn that into a concrete plan to improve PianoFlow as a *learning* product (not just a transcription tool).
**Companion docs:** [`AUDIO_MIDI_IMPROVEMENT_PLAN.md`](./AUDIO_MIDI_IMPROVEMENT_PLAN.md) (engine/infra), [`DEMO_AND_SCALE_PLAN.md`](./DEMO_AND_SCALE_PLAN.md) (deploy).

---

## 0. TL;DR — the strategic wedge

Every popular app is built on three things: a **real-time feedback loop** (you play → it scores you), **gamification** (streaks/XP/missions), and a **graded song library**. They all share one ceiling: a **fixed, licensed library** — users constantly hit *"the song I actually want isn't here."*

**PianoFlow already owns the part they can't do:** it generates the learnable content (falling notes + MIDI + sheet) from *any* audio/YouTube/IG/TikTok, and it can **auto-simplify** any song to a learner's level (your `simplify` engine). What it's missing is the **learning loop and engagement layer** that turn content into a product people practice with daily.

**So the plan is not "build another library app." It's: keep the generation engine as the moat, and bolt on the learning loop.** Position: **"Learn any song, at your level"** — Synthesia's falling notes + Flowkey's song-first feel, but with no library limits and automatic difficulty.

Top moves, by impact-to-effort:
1. **Practice UX** (slow-down, hands-separate, loop, wait-mode) — mostly wiring data you already produce. *Quick win.*
2. **Real-time feedback via Web MIDI** — the feature that makes it a "learning" app, zero-install in the browser. *Medium.*
3. **Auto-difficulty** via the `simplify` engine — the differentiator no competitor has for arbitrary songs. *Medium, high-leverage.*
4. **Engagement** (streaks, progress, XP) and **freemium monetization** (~$10–13/mo, the market rate).

---

## 1. The market (verified, 2026)

| Platform | Approach | Note detection | Library | Price | Strength | Ceiling |
|---|---|---|---|---|---|---|
| **Simply Piano** (JoyTunes) | Gamified beginner course, step-by-step missions | Microphone | Structured beginner | ~$170/yr | Best onboarding for total beginners | Mobile-only; beginner plateau |
| **Flowkey** | Song-first learning + real-pianist hand videos, "wait mode" | Mic **or** MIDI | Large, graded, multi-genre | ~$10–20/mo | Best song library; web + mobile | Bound to its catalog |
| **Synthesia** | Falling-notes rhythm game | **MIDI** (lighted-keyboard support) | 150 + store + **import any MIDI** | One-time + store | Best falling-notes; learn any MIDI | Shallow feedback/musicianship; you must *find* the MIDI |
| **Yousician** | Heavily gamified, multi-instrument | Advanced polyphonic **mic** | Large, challenge-driven | $10–20/mo | Engagement, games, weekly challenges | Falling-notes ceiling for sheet readers |
| **Skoove** | Musicianship + sheet literacy, adaptive pacing | Mic real-time + fingering | Curated, song-based | ~$12.5/mo | Best "overall"; real music literacy | Smaller library, less gamified |
| **Playground Sessions** | Celebrity teachers, play-along band | **MIDI required** | Popular songs + courses | ~$15–20/mo | Star instructors, structure | MIDI keyboard required |
| **Piano Marvel** | Academic, assessment-driven | MIDI | **25,000+** graded pieces | Subscription | Rigor, graded classical repertoire | Less consumer-friendly UX |

**Two technical camps for the feedback loop:** *microphone* (audio analysis — Simply Piano, Skoove, Yousician; works with acoustic pianos, noisier) vs *MIDI* (Synthesia, Playground Sessions, Piano Marvel; precise, needs a digital keyboard). The best apps support both.

---

## 2. What actually makes them popular

1. **The feedback loop is the product.** "Play → instant right/wrong + score" is the dopamine engine. Everything else is packaging.
2. **Gamification drives retention.** Streaks, XP, missions, weekly challenges, badges. This is why casual users come back daily.
3. **A big, graded, multi-genre library drives acquisition** — *and* is their biggest cost (licensing) and biggest complaint ("my song isn't here").
4. **Practice tooling is table stakes:** tempo slow-down, hands-separate, section looping, wait-mode, finger-number hints, and a falling-notes ↔ sheet-music dual view.
5. **Hybrid pedagogy:** structured curriculum for beginners *plus* song-first learning for motivation.
6. **Business model:** subscription, ~$110–200/yr, free trial, referrals/discounts. Microphone apps avoid hardware friction; MIDI apps get precision.
7. **Multi-platform** matters (Flowkey web+mobile beats Simply Piano mobile-only for many adult learners).

---

## 3. Where PianoFlow already stands

You're closer than it looks — most *content* pieces exist; the *interactive learning* layer doesn't.

| Learning-app capability | PianoFlow today | Where in the code |
|---|---|---|
| Falling-notes visualization | ✅ Have it | `components/FallingNotePreview.tsx`, `KeyboardVisualizer.tsx`, `music-core/video/*` |
| Sheet music (dual view) | ✅ MusicXML + PDF | `music-core/sheet/musicxml.py`, `sheet/pdf.py` |
| In-browser playback | ✅ | `lib/pianoSynth.ts`, `sampledPiano.ts` |
| Hands-separate | ✅ Hand split exists | `music-core/midi/hands.py` |
| Tempo / slow-down | ✅ bpm produced | transcription output (`NoteData.bpm`) |
| **Auto-difficulty / graded** | ✅ **Simplify engine exists** | `music-core/simplify/rules.py` |
| **Content from ANY song** | ✅ **The moat** | `music-core/transcription/*` + planned URL ingest |
| Real-time student feedback | ❌ Missing | — |
| Gamification / progress | ❌ Missing | — |
| Practice modes (wait/loop/finger hints) | ❌ Not wired | — |
| Structured curriculum | ❌ Missing | — |

**The gap is the loop and the engagement layer — not the content.** That's good news: it's additive UI/logic on top of data you already generate.

---

## 4. Positioning

**"Learn any song, at your level."** Synthesia's falling notes + Flowkey's song-first motivation, minus the library ceiling, plus automatic difficulty. Two structural advantages competitors can't easily copy:

- **No library to license.** Learners bring the song (upload / paste a link); you generate the lesson. The #1 competitor complaint ("my song isn't here") is your default. (Carry the copyright/ToS safeguards from `AUDIO_MIDI_IMPROVEMENT_PLAN.md` Part B.)
- **Web-native real-time feedback.** You're a web app; **Web MIDI** gives zero-install, precise feedback on desktop Chrome/Edge/Firefox and Android — no download like Synthesia, not mobile-only like Simply Piano.

---

## 5. Improvement plan (prioritized)

### P1 — Practice UX *(quick win; uses data you already produce)*
Wire a real **Practice view** around the generated `NoteData`:
- **Tempo slow-down** (you already have `bpm`); **section looping** (A–B); **hands-separate** toggle (you already compute `hand`); **count-in + metronome**; **finger-number hints** (derive from hand-span/position heuristic, extend `midi/hands.py`); **falling-notes ↔ sheet dual view** (you have both renderers).
- **Files:** new `apps/web/app/practice/[projectId]/page.tsx`, extend `FallingNotePreview.tsx` + `KeyboardVisualizer.tsx`; reuse `pianoSynth.ts`.
- **Why first:** highest impact-to-effort — it's repackaging existing output into the thing learners actually use.

### P2 — Real-time feedback loop (Web MIDI) *(the "learning app" unlock)*
- `navigator.requestMIDIAccess()` → capture played notes → match against the lesson `NoteData` in real time → **score** (note accuracy + timing window ±50–100 ms), highlight hit/miss on the keyboard and falling notes.
- **Wait-mode** (don't advance until the correct note is played) — the single most-loved learning feature (Flowkey, Synthesia).
- **Files:** new `apps/web/lib/webmidi.ts` (input + scoring), `lib/scoring.ts`; integrate into the Practice view.
- **Caveat (verified):** Web MIDI works in Chrome/Edge/Firefox/Android but **not Safari/iOS** (WebKit blocks it). Fallback ladder: (1) Web MIDI where available; (2) **microphone detection reusing your own transcription engine** for acoustic/iOS users (later); (3) "follow-along" mode (no scoring) as the universal default.

### P3 — Auto-difficulty *(your differentiator — no one does this for arbitrary songs)*
- Expose `simplify/rules.py` as **graded versions** of any transcribed song: *Beginner → Intermediate → Original*. Learner picks a level and graduates up; the falling-notes/sheet re-render from the simplified `NoteData`.
- **Files:** surface existing `simplify` output as selectable variants in the project + practice views; add a `difficulty` selector.
- **Why it matters:** combines transcription + simplify into "any song, playable at your level today" — a capability fixed-library apps structurally can't match.

### P4 — Engagement & retention
- **Streaks**, **daily goal** (minutes or songs), **XP/score per session**, **per-song mastery %**, **achievements**. This is what converts one-time transcribers into daily users.
- **Files:** new `practice_sessions` + `user_progress` tables (Alembic migration + Supabase RLS); API endpoints under `apps/api/.../routers/`; surface in web with a streak/goal widget. You already have auth + projects to anchor it.

### P5 — Onboarding / curriculum
- Keep **song-first as the hero** ("paste a link → start playing"), but add a light **beginner path**: a handful of starter songs auto-simplified (P3), with a guided first-session. Reduces the cold-start drop-off competitors solve with structured courses.

### P6 — Monetization
- **Freemium** aligned to the market: **Free** = transcribe + follow-along + a few practice songs/month; **Pro (~$10–13/mo)** = unlimited songs, MP4 export, advanced engine (Transkun+Demucs), auto-difficulty levels, sheet-PDF download, scoring history. Add a **free trial + referral** discount. (Market is $110–200/yr; price at the accessible end to win on "any song.")
- Gate via your existing plan/tier concept; the engine tiering already maps (free=Basic Pitch, pro=Transkun).

### P7 — Platform reach
- Ship a **PWA** (installable web, offline-friendly for practice) — covers desktop + Android (incl. Web MIDI). Defer native iOS; when you do iOS, use **mic-based** feedback powered by your own transcription stack rather than Web MIDI.

---

## 6. Phased roadmap

| Phase | Focus | Outcome |
|---|---|---|
| **L1** | P1 Practice UX + P3 difficulty selector | A real practice experience over any generated song, at any level |
| **L2** | P2 Web MIDI feedback + wait-mode | It becomes a *learning* app: play, get scored, progress |
| **L3** | P4 engagement (streaks/progress) + P6 freemium | Retention + revenue |
| **L4** | P5 curriculum, P7 PWA, mic-based feedback (reuse transcription) for iOS/acoustic | Reach + beginner funnel |

Sequence L1→L4 *after* the demo (`DEMO_AND_SCALE_PLAN.md`) and the engine quality work (`AUDIO_MIDI_IMPROVEMENT_PLAN.md` Phase 1–2): better transcription makes every learning feature better, since the lesson is only as good as the MIDI.

---

## 7. The one decision to make

**How far toward "full learning platform" do you want to go?**
- **A — Generation tool + light practice** (P1, P3, P6): smaller build, leans on your moat, ships fast.
- **B — Full learning platform** (P1–P7): real Simply-Piano/Flowkey competitor, much bigger build (feedback loop, gamification, curriculum, mobile).

Recommended: **start at A, instrument for B.** Ship Practice UX + auto-difficulty + freemium first (they're mostly repackaging what you have), measure whether people actually practice, and only invest in the heavy feedback/gamification stack if the usage is there.

---

## Sources

- Market overviews — [Skoove: best piano apps 2026](https://www.skoove.com/blog/best-piano-apps/), [Stuff: best piano learning apps 2026](https://www.stuff.tv/sponsored/best-piano-learning-apps-2026-how-to-pick-up-the-piano-in-no-time-at-all/), [HackerNoon comparison](https://hackernoon.com/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology)
- Simply Piano / Flowkey — [MusicianWave: Flowkey vs Simply Piano](https://www.musicianwave.com/flowkey-vs-simply-piano/), [MusicRadar: Simply Piano review](https://www.musicradar.com/reviews/simply-piano-review)
- Synthesia — [synthesiagame.com/about](https://www.synthesiagame.com/about), [Pianoers: Synthesia review](https://pianoers.com/synthesia-piano-review/)
- Yousician / Skoove / Playground — [MasterPiano: Yousician review](https://www.masterpiano.com/yousician-review), [Playground vs Yousician](https://www.voicesinc.org/playground-sessions-vs-yousician/)
- Business model — [Matellio: piano teaching app development](https://matellio.com/blog/piano-teaching-app-development/)
- Web MIDI support — [MDN Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API), [caniuse: midi](https://caniuse.com/midi), [Web MIDI in 2026](https://www.supersimplepiano.com/blog/web-midi-browser-compatibility-2026)

