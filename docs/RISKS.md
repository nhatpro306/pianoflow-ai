# PianoFlow AI — Risks & Mitigations

> Severity = impact × likelihood. Every risk has an owner decision recorded, not just a worry.

---

## 1. Technical Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| T1 | **Video render too slow on cheap MVP workers** (Render starter CPU) — minutes-long waits kill UX | High | Caps: ≤10 min song, ≤1080p, 30 fps; O(visible) frame loop + FFmpeg pipe (no disk frames); measure in Phase 7 and set honest "estimated time" in UI; first trigger for Stage-3 ECS migration |
| T2 | **Sheet output ugly/wrong on humanized MIDI** (quantization, rhythm spelling) | High | Quantize to 16th grid; honest UI labeling ("approximate"); curated fixtures define "good enough"; document failure classes; future improvements listed in `DESIGN.md` §6.3 — do not chase perfection in MVP |
| T3 | **Hand-split heuristic wrong** → mislabeled video colors and staves | Med | Two-track convention first, pitch-window fallback; label as "estimate" in UI; per-note correction is future work; wrongness is cosmetic, not data loss |
| T4 | **Malicious/pathological MIDI** (huge tick values, 1M notes, zip-bomb-like structures) crashes worker | Med | Validation limits (max notes 50k, max tracks 32, max duration 10 min, max size 5 MB); per-job timeout; parse inside try with `PermanentError` classification; worker survives and fails the job, not the process |
| T5 | **MuseScore CLI flaky in headless containers** (fontconfig, Qt deps) | Med | Pin image + known-good flags; smoke test in CI on every image build; LilyPond fallback behind `SheetEngraver` adapter |
| T6 | **Queue message loss / double processing** | Med | DB is job source of truth; idempotent handlers (job_id check, deterministic output keys); at-least-once semantics assumed everywhere; DLQ + alarm at scale |
| T7 | **Supabase→AWS migration harder than designed** | Low | Adapter contract tests run against every backend; keys are backend-relative; migration rehearsed in staging in Phase 11 before prod |
| T8 | **Canvas piano roll perf on big files** | Low | Virtualized drawing; cap handled at upload (50k notes); tested with `long_song.mid`-sized fixture under the cap |

## 2. Cost Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| C1 | **Render abuse** — one user queues 500 videos | High | `usage_limits`: default free tier = 10 uploads/day, 15 render jobs/day, 30 min rendered video-seconds/day, 3 concurrent active jobs; enforced API-side with 429 |
| C2 | **Storage growth unbounded** | High | Outputs expire after 30 days (`expires_at` cleanup job + lifecycle rule backstop); per-user storage quota (1 GB free tier) tracked in `usage_limits.storage_bytes`; tmp/ auto-purged per job and via 1-day lifecycle |
| C3 | **Long/4K renders burn CPU dollars** | Med | No 4K in MVP (max 1080p); 30 fps fixed; duration cap; speed-50% doubles video length — counted against video-seconds quota |
| C4 | **Egress costs from video downloads** | Med | Signed URLs expire 1 h; no public hotlinking; at scale CloudFront in front of S3 reduces egress unit cost; download counts logged to spot anomalies |
| C5 | **Idle infra cost creep** | Low | Stage-2 target < $20/mo verified; AWS Budgets alarms at stages 3–4; scale-to-zero scheduled scaling for workers off-peak |

## 3. Legal / Content Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| L1 | **Copyright** — users upload MIDI of copyrighted songs; generated videos/PDFs are derivative works | **High — the project's biggest non-technical risk** | MVP posture: (a) private-by-default — outputs visible only to the uploading user, no public library, no sharing; (b) ToS: user affirms they hold rights; (c) no "download from YouTube" features ever in this codebase; (d) DMCA contact + takedown process documented before any public-sharing feature ships; (e) public sharing deferred until reviewed. Private personal-use tooling is a defensible posture; a public library is not — which is exactly why the library is out of scope |
| L2 | **YouTube import ToS violation** (future phase) | High (future) | Phase-12+ decision gate; design docs deliberately exclude it from commitments |
| L3 | **User data privacy** | Med | Minimal PII (email only); deletion actually deletes (cascade + storage prefix delete); no analytics trackers in MVP beyond basic privacy-friendly counts |

## 4. Product / Scope Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| P1 | **Scope creep kills completion** — the classic portfolio-project death | High | Frozen MVP scope (`PRODUCT.md` §3.2); "Do NOT" list per roadmap phase; new ideas go to a `FUTURE.md` backlog, not the sprint |
| P2 | **Beginner mode disappoints** ("this isn't a real arrangement") | Med | Honest labeling is a product principle; UI copy says "rule-based"; quality bar = "playable and recognizable", tested per rule |
| P3 | **Audio-to-MIDI expectations leak into MVP messaging** | Med | Landing page mentions MIDI-only explicitly; roadmap shows audio as beta/future |
| P4 | **Single maintainer bus-factor / momentum loss** | Med | Each phase ends demonstrable; docs let work resume cold; CI keeps main always-green |

## 5. Operational Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| O1 | **Worker dies mid-render** | Med | Visibility timeout → message redelivered → idempotent handler restarts cleanly; progress resets; tmp cleanup on startup sweeps orphaned `tmp/` dirs |
| O2 | **DB connection exhaustion** (serverless-ish API + pooler limits) | Med | Transaction-mode pooler + NullPool config; worker uses few long-lived connections; readyz checks pool health |
| O3 | **Silent failure pile-up** (jobs failing, nobody notices) | Med | failure-rate metric + alarm (stage 4); MVP: daily metrics summary endpoint + manual check habit; DLQ depth alarm |
| O4 | **Migration with live jobs in flight** | Low | Drain pattern: stop enqueue, let workers finish, switch backend, resume — documented as runbook in Phase 11 |

---

## 6. Free-Tier Limit Summary (cost-control source of truth)

| Limit | Default |
|---|---|
| Max MIDI file size | 5 MB |
| Max song duration | 10 min |
| Max notes per file | 50,000 |
| Uploads / day | 10 |
| Render jobs / day | 15 |
| Rendered video-seconds / day | 1,800 (30 min) |
| Concurrent active jobs / user | 3 |
| Max resolution / FPS | 1080p / 30 |
| Output retention | 30 days |
| Storage quota / user | 1 GB |

All limits are config (env / `core/config.py`), not hardcoded, and surfaced in UI before the user hits them.
