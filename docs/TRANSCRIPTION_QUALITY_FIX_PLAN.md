# PianoFlow AI — Transcription Quality Fix Plan (solo-piano regression)

**Date:** 2026-06-17
**Trigger:** Live Modal pipeline works end-to-end, but on a **solo-piano clip** the output has **missing/extra notes, bad timing/rhythm, and no sustain**.
**Audience:** the implementing agent (Sonnet 4.6 default, per `CLAUDE.md`).
**Parent docs:** `AUDIO_MIDI_IMPROVEMENT_PLAN.md` (the *why* — Part A), `DEMO_AND_SCALE_PLAN.md` (the *how* for the demo). This doc is the **focused remediation** for the observed regression.

---

## 0. Diagnosis (code-grounded)

Traced submit → Modal → `run_pipeline` → `TranskunEngine` → MIDI/notes → web playback.

| # | Defect | Root cause | Evidence |
|---|---|---|---|
| 1 | **Missing/extra notes on solo piano** | Demucs separation runs by default and extracts the **`"other"`** stem. htdemucs is 4-stem (drums/bass/vocals/other) — **no piano stem**; piano lands in a degraded `"other"`. Separating clean solo piano *adds artifacts and drops content*. | `infra/modal/transcribe_app.py:35` (`separate=options.get("separate", True)`); `pipeline.py:49` (`stem="other"`) |
| 2 | **Bad timing / rhythm** | Transkun returns `bpm=0.0` → always 120 BPM fallback; transkun path **never quantizes** (no beat tracking, no grid snap). | `transkun.py:133-135`, `transkun.py:198-199`; no `quantize_notes` call anywhere in `transkun.py` |
| 3 | **No sustain** | Web player **does** honor CC64 and MIDI export **does** emit it — so `NoteData.sustain` is arriving empty. Either (a) separation destroyed pedal cues, or (b) the negative-pitch pedal convention is wrong for real transkun output. | `transkun.py:124-131` (assumes `n.pitch < 0`, `-n.pitch == 64`); `midi/write.py:48-55` emits CC64; `apps/web/lib/sustain.ts` + `FallingNotePreview.tsx:35` apply it |
| 4 | **Can't measure any of this** | `evaluate.py` has `onset_prf` only — no `mir_eval`, no fixture, no CLI/`make eval`. | `transcription/evaluate.py` (single function), `AUDIO_MIDI_IMPROVEMENT_PLAN.md:21,145` |

**Fix order rationale:** measure first (Q1), then the dominant defect — separation (Q2) — then verify pedal end-to-end on a real clip (Q3), then timing (Q4), then dynamics polish (Q5). Each task is independently shippable and green.

---

## How to execute

- **One task = one PR.** Do in order. Each task lists **Files**, **Steps**, **Acceptance**, **Tests**, **Commit**.
- **TDD:** failing test first, then implement. Run `uv run --directory packages/music-core pytest` before commit. `music-core` stays **pure** (deferred heavy imports).
- **CI must stay green:** `ruff check .` + `ruff format --check .` + `pnpm -r typecheck`. (Recent CI failures were all ruff lint/format — keep formatting clean.)
- **Conventions** per `CLAUDE.md`: Conventional Commits; adapters translate vendor errors; no vendor SDK at module top-level.
- **⚠ DECISION** tasks: stop and escalate to `architect`/`code-reviewer` (Opus) if a design choice is ambiguous.

---

## Q1 — Eval harness (do first, measure everything after)

**Goal:** an objective onset/offset/velocity F1 number so every later change is a measured delta, not "by ear."

**Files:**
- `packages/music-core/pianoflow_music/transcription/evaluate.py` (extend)
- `packages/music-core/pianoflow_music/tests/test_evaluate_mireval.py` (new)
- `packages/music-core/pianoflow_music/tests/fixtures/eval/` (new — 1 short reference MIDI + its rendered WAV, or a tiny synthetic pair)
- `scripts/eval_transcription.py` (new CLI)
- `packages/music-core/pyproject.toml` (add `mir_eval>=0.7` to a new `[eval]` extra)
- `Makefile` or `scripts/` note for `make eval` (repo has no Makefile yet — add one or document the script invocation)

**Steps:**
1. Add `onset_offset_velocity_prf(reference, predicted, *, onset_tol=0.05, offset_ratio=0.2, velocity_tol=0.1) -> dict` that wraps `mir_eval.transcription.precision_recall_f1_overlap` and `mir_eval.transcription_velocity`. Convert `list[Note]` → the `(intervals: np.ndarray[N,2], pitches: np.ndarray[N], velocities)` arrays mir_eval expects. **Defer the `mir_eval`/`numpy` import inside the function** (keep module import cheap, pattern like `beat.py`). Keep the existing pure `onset_prf` as the zero-dependency fallback.
2. `scripts/eval_transcription.py`: load a reference MIDI (ground truth) and an audio file, run `run_pipeline(audio, engine="transkun", separate=<flag>)`, parse both to `list[Note]`, print onset F1, onset+offset F1, onset+offset+velocity F1, plus note counts. Accept `--engine`, `--separate/--no-separate`, `--audio`, `--ref`.
3. Provide one tiny committed fixture pair so CI can run a smoke eval without downloading MAESTRO. Real MAESTRO slice usage stays a documented local step (see `AUDIO_MIDI_IMPROVEMENT_PLAN.md:321`).

**Acceptance:** `python scripts/eval_transcription.py --audio <fixture>.wav --ref <fixture>.mid --no-separate` prints F1 numbers; unit test asserts `onset_offset_velocity_prf` returns 1.0 for identical input and degrades correctly for shifted/dropped notes.

**Tests:** `uv run --directory packages/music-core pytest tests/test_evaluate_mireval.py`.

**Commit:** `feat(music-core): mir_eval onset/offset/velocity harness + eval CLI`.

---

## Q2 — Fix separation for solo piano (dominant defect)

**Goal:** stop degrading clean piano. Separation should be **off by default** and only run for full-mix input; never extract a bogus `"other"` stem for solo piano.

**Files:**
- `infra/modal/transcribe_app.py` (default `separate=False`)
- `packages/music-core/pianoflow_music/transcription/pipeline.py` (stem handling)
- `apps/web/lib/transcribeClient.ts` (send explicit `separate` option)
- `apps/web/app/demo/page.tsx` (add a "full-mix song" toggle; default off = solo piano)
- tests: `packages/music-core/pianoflow_music/tests/test_pipeline.py` (extend)

**Steps:**
1. **Modal default → `separate=False`** at `transcribe_app.py:35`. The submit payload from the web client decides; default must be the safe (no-separation) path.
2. In `pipeline.py`, when `separate=True`, default stem stays `"other"` **but** document that htdemucs has no piano stem; expose `options["stem"]` so callers can pick. Add a guard: if `engine` is the piano-specific transkun **and** `separate` was not explicitly requested, do not separate.
3. Web: add a checkbox **"This is a full-mix song (isolate piano)"**, default **unchecked**. `transcribeClient` sends `options: { engine: "transkun", separate: <checkbox> }`.
4. Re-run **Q1 eval** on the same solo clip with `--no-separate` vs `--separate` and record both F1 numbers in the PR description (expect `--no-separate` materially higher for solo piano).

**Acceptance:** solo-piano clip transcribed with `separate=False` has visibly correct notes (manual) AND higher onset F1 than the `separate=True` run (Q1). `pnpm --filter @pianoflow/web build` passes.

**Tests:** `uv run --directory packages/music-core pytest tests/test_pipeline.py` (assert separation is skipped when not requested); web typecheck.

**Commit:** `fix(transcribe): default separation off; solo piano skips Demucs`.

---

## Q3 — Verify & fix sustain pedal end-to-end

**Goal:** confirm transkun emits pedal, and that `NoteData.sustain` → MIDI CC64 → web playback all carry it. Fix the mapping if transkun's real output doesn't use the assumed negative-pitch convention.

**Files:**
- `packages/music-core/pianoflow_music/transcription/transkun.py` (pedal mapping at lines 124-131)
- `infra/modal/debug_transkun.py` (extend the diagnostic to dump a few raw `Note` objects incl. pedal)
- tests: `packages/music-core/pianoflow_music/tests/test_transkun.py` (extend)

**Steps:**
1. Run the existing `modal run infra/modal/debug_transkun.py` (and/or a short real clip through `transcribe`) and inspect actual transkun `Note` objects. Confirm whether pedal is encoded as **negative pitch** (`-64`) or a separate attribute. The current code assumes negative pitch — **verify, don't trust**.
2. If the convention differs, fix `_run_model`'s pedal extraction so `pedal_events` is populated. Keep the normalized contract `(time_sec, value_0to127)`.
3. Confirm `report["has_pedal"]` is `True` for a pedaled clip and that the exported MIDI contains `control_change control=64` (assert via `mido` parse in a test using a faked `_run_model` that returns pedal events).
4. In the web demo, surface `report.has_pedal` so it's visible whether pedal was detected.

**Acceptance:** a pedaled solo-piano clip yields non-empty `note_data.sustain`, `has_pedal=True`, MIDI has CC64 events, and `FallingNotePreview` notes ring through the pedal (manual A/B vs pre-fix).

**Tests:** `uv run --directory packages/music-core pytest tests/test_transkun.py` (faked pedal events → sustain populated → CC64 in MIDI bytes).

**Commit:** `fix(transcribe): correct transkun pedal mapping; sustain reaches MIDI`.

---

## Q4 — Timing: real tempo + opt-in quantization in the transkun path

**Goal:** notes align to a sensible grid so rhythm reads correctly (and sheet music stops being a wall of ties).

**Files:**
- `packages/music-core/pianoflow_music/transcription/transkun.py` (wire tempo + quantize)
- `packages/music-core/pianoflow_music/transcription/beat.py` (reuse `estimate_tempo_and_beats`)
- `packages/music-core/pianoflow_music/transcription/quantize.py` (reuse `quantize_notes`)
- tests: `test_transkun.py` (extend)

**Steps:**
1. After `_run_model`, when `librosa` is available, call `estimate_tempo_and_beats` (deferred import, like `basic_pitch.py` does) to get a real BPM instead of the 120 fallback. Record `report["tempo_source"]`.
2. Add **opt-in** quantization mirroring the Basic Pitch path: `options={"quantize": True, "grid": "1/16"}` → run `quantize_notes(notes, bpm, grid)` (onset-snap only, duration preserved, `max_shift_sec` guard already in `quantize.py`).
3. Set `confidence["tempo_confidence"]` per source (0.8 with librosa, 0.6 fallback), matching the Basic Pitch convention.
4. Re-run Q1 eval to confirm onset+offset F1 doesn't regress (quantization should not hurt onset F1 within the 50 ms window).

**Acceptance:** with a clip at a known tempo, `report["bpm"]` ≈ true tempo (not 120); with `quantize:true`, onsets snap to grid and the falling-notes render reads as rhythmic; F1 within Q1 tolerance.

**Tests:** `uv run --directory packages/music-core pytest tests/test_transkun.py` (faked model + monkeypatched beat estimator → bpm set; quantize toggles).

**Commit:** `feat(transcribe): transkun real tempo + opt-in quantization`.

---

## Q5 — Velocity calibration (dynamics polish)

**Goal:** dynamics stop clustering at one loudness.

**Files:**
- `packages/music-core/pianoflow_music/transcription/postprocess.py` (add pure `calibrate_velocity`)
- tests: `packages/music-core/pianoflow_music/tests/test_postprocess.py` (extend)

**Steps:**
1. Add a pure `calibrate_velocity(notes, *, low_pct=5, high_pct=95, out_min=20, out_max=120) -> list[Note]` doing percentile normalization (piece-wise linear) so the velocity histogram spreads across a musical range. Never mutate inputs.
2. Make it opt-in via `options={"calibrate_velocity": True}` in both engines; default off until Q1 shows it helps velocity F1.
3. Validate against Q1's onset+offset+**velocity** F1 (needs MAESTRO velocities locally).

**Acceptance:** velocity stddev increases on a dynamic clip; onset/offset F1 unchanged; velocity F1 improves on the MAESTRO slice.

**Tests:** `uv run --directory packages/music-core pytest tests/test_postprocess.py`.

**Commit:** `feat(music-core): opt-in percentile velocity calibration`.

---

## Definition of done

A solo-piano clip uploaded to the demo produces: correct note count (no separation artifacts), pedal that rings (sustain populated + audible), rhythm that reads on a grid, and a measured onset F1 reported by `scripts/eval_transcription.py`. Each task green in CI; engine defaults safe for solo piano; full-mix path still available behind an explicit toggle.

## Out of scope (later, per AUDIO_MIDI_IMPROVEMENT_PLAN.md)

- ByteDance ensemble / A-B (Part A, open question 2)
- URL ingestion (Part B / Phase 3)
- `RemoteTranscriptionEngine` adapter for the always-on worker (Phase 2 / S2) — the demo calls Modal directly today
- MusicXML downbeat quantization (A8 advanced), hand-split HMM upgrade (A7)
