# PianoFlow AI — Database Design

> Engine: PostgreSQL 15+ (Supabase Postgres in MVP, RDS PostgreSQL at scale)
> ORM: SQLAlchemy 2.x + Alembic migrations
> Rule: **metadata in database, binaries and large JSON in object storage**

---

## 1. Principles

1. **No large blobs in the DB.** MP4, PDF, MusicXML, MIDI, and full notes JSON live in object storage. The DB stores storage keys + metadata (size, checksum, content type).
2. **UUIDv4 primary keys** — non-enumerable (security), mergeable across environments, generated app-side or by `gen_random_uuid()`.
3. **Soft ownership boundary:** every user-facing row carries `user_id`; all queries are scoped to it.
4. **Append-only event log** (`project_events`) for auditability and debugging job flows.
5. **Timestamps everywhere:** `created_at` default `now()`, `updated_at` via trigger or ORM.

---

## 2. Entity-Relationship Overview

```
users 1───* projects 1───* uploaded_files
                 │ 1───1  render_settings (current)
                 │ 1───*  render_jobs *───1 render_settings_snapshot (settings JSONB on job)
                 │ 1───*  output_files *───1 render_jobs
                 │ 1───*  project_events
users 1───1 usage_limits
```

---

## 3. Schema (SQL)

```sql
-- ============================================================
-- users
-- With Supabase Auth, auth.users is the identity source; this
-- table is the app profile mirrored via trigger. With Cognito
-- later, it is populated on first login. Same shape either way.
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    plan            TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'pro' (future)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- projects : one uploaded song and everything derived from it
-- ============================================================
CREATE TABLE projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'created',
        -- 'created' | 'uploading' | 'parsing' | 'ready' | 'failed' | 'archived'
    -- small derived summary for list views & previews (NOT full notes)
    analysis_summary JSONB,
        -- { "bpm": 120.0, "duration_sec": 154.2, "track_count": 2,
        --   "note_count": 1623, "pitch_min": 36, "pitch_max": 96,
        --   "hand_split": "tracks", "time_signature": "4/4",
        --   "notes_key": "projects/<id>/notes/v1.json",
        --   "notes_schema_version": 1 }
    preview_image_key TEXT,                                -- piano-roll thumbnail in storage
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ                            -- soft delete
);
CREATE INDEX idx_projects_user ON projects(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- uploaded_files : source files (MIDI in MVP; audio later)
-- ============================================================
CREATE TABLE uploaded_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    kind            TEXT NOT NULL DEFAULT 'midi',          -- 'midi' | 'audio' (future)
    storage_key     TEXT NOT NULL,                          -- server-generated, never user-named
    original_name   TEXT NOT NULL,                          -- sanitized, display only
    content_type    TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL,
    checksum_sha256 TEXT,
    upload_status   TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'uploaded' | 'validated' | 'rejected'
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_uploaded_files_project ON uploaded_files(project_id);

-- ============================================================
-- render_settings : current settings per project (1:1)
-- Versioned so job snapshots can reference a version number.
-- ============================================================
CREATE TABLE render_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,             -- bumped on every PATCH
    resolution      TEXT NOT NULL DEFAULT '720p',            -- '720p' | '1080p' | 'vertical'
    fps             INTEGER NOT NULL DEFAULT 30,
    speed_percent   INTEGER NOT NULL DEFAULT 100,            -- 50 | 75 | 100
    difficulty      TEXT NOT NULL DEFAULT 'original',        -- 'original' | 'easy' | 'very_easy'
    show_note_names BOOLEAN NOT NULL DEFAULT true,
    show_keyboard   BOOLEAN NOT NULL DEFAULT true,
    theme           TEXT NOT NULL DEFAULT 'dark',            -- 'dark' | 'light'
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_resolution CHECK (resolution IN ('720p','1080p','vertical')),
    CONSTRAINT chk_speed      CHECK (speed_percent IN (50,75,100)),
    CONSTRAINT chk_difficulty CHECK (difficulty IN ('original','easy','very_easy')),
    CONSTRAINT chk_theme      CHECK (theme IN ('dark','light'))
);

-- ============================================================
-- render_jobs : every async unit of work
-- settings_snapshot freezes the settings the job renders with.
-- ============================================================
CREATE TABLE render_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id),
    job_type          TEXT NOT NULL,
        -- 'parse_midi' | 'generate_preview' | 'render_sheet'
        -- | 'render_video' | 'simplify_midi' | 'transcribe_audio' (future)
    status            TEXT NOT NULL DEFAULT 'queued',
        -- 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
    progress          SMALLINT NOT NULL DEFAULT 0,           -- 0..100
    progress_message  TEXT,
    settings_snapshot JSONB,                                  -- frozen copy of render_settings at enqueue
    settings_version  INTEGER,
    attempt           SMALLINT NOT NULL DEFAULT 0,
    max_attempts      SMALLINT NOT NULL DEFAULT 3,
    error_type        TEXT,                                   -- stable code: 'INVALID_MIDI', 'FFMPEG_FAILED', ...
    error_message     TEXT,                                   -- human-readable
    queue_name        TEXT NOT NULL DEFAULT 'q_default',
    broker_message_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),     -- enqueue time
    started_at        TIMESTAMPTZ,
    finished_at       TIMESTAMPTZ,
    CONSTRAINT chk_job_status CHECK (status IN ('queued','processing','completed','failed','cancelled'))
);
CREATE INDEX idx_jobs_project ON render_jobs(project_id, created_at DESC);
CREATE INDEX idx_jobs_status  ON render_jobs(status) WHERE status IN ('queued','processing');
-- API-side dedup: one live job per (project, type, settings version)
CREATE UNIQUE INDEX uq_jobs_live ON render_jobs(project_id, job_type, settings_version)
    WHERE status IN ('queued','processing');

-- ============================================================
-- output_files : generated artifacts (storage keys only)
-- ============================================================
CREATE TABLE output_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_id          UUID NOT NULL REFERENCES render_jobs(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    kind            TEXT NOT NULL,
        -- 'video_mp4' | 'sheet_pdf' | 'sheet_musicxml' | 'midi_processed'
        -- | 'midi_simplified' | 'notes_json' | 'preview_png'
    storage_key     TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL,
    metadata        JSONB,                                    -- e.g. {"resolution":"1080p","duration_sec":182.5}
    expires_at      TIMESTAMPTZ,                              -- lifecycle cleanup target (free tier)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outputs_project ON output_files(project_id, created_at DESC);
CREATE INDEX idx_outputs_expiry  ON output_files(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- project_events : append-only audit/debug trail
-- ============================================================
CREATE TABLE project_events (
    id              BIGSERIAL PRIMARY KEY,                    -- ordered, append-only
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID,
    job_id          UUID,
    event_type      TEXT NOT NULL,
        -- 'project.created' | 'file.uploaded' | 'file.rejected'
        -- | 'job.enqueued' | 'job.started' | 'job.completed' | 'job.failed'
        -- | 'job.retried' | 'settings.updated' | 'output.downloaded' ...
    payload         JSONB,
    request_id      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_project ON project_events(project_id, id);

-- ============================================================
-- usage_limits : per-user counters for rate limiting / cost control
-- Counters reset daily by date column (no cron needed: row per day).
-- ============================================================
CREATE TABLE usage_limits (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day                DATE NOT NULL DEFAULT CURRENT_DATE,
    uploads_count      INTEGER NOT NULL DEFAULT 0,
    render_jobs_count  INTEGER NOT NULL DEFAULT 0,
    video_seconds      INTEGER NOT NULL DEFAULT 0,            -- total rendered video duration
    storage_bytes      BIGINT  NOT NULL DEFAULT 0,            -- running total (not daily)
    UNIQUE (user_id, day)
);
```

---

## 4. Notes Storage Decision (full analysis)

**Question:** store parsed note data as DB rows / JSONB, or as JSON in object storage?

| Option | Pros | Cons |
|---|---|---|
| A. `notes` table (row per note) | SQL-queryable per note | 5k+ rows per song; massive table growth; nobody queries individual notes; slow bulk insert per parse |
| B. JSONB column on `projects` | One read | 100 KB–1 MB per row bloats table, TOAST pressure, slows every project list query, inflates backups |
| **C. JSON file in object storage (CHOSEN)** | DB stays tiny; storage is cheap; notes are always read whole (preview, render); versionable (`notes/v1.json`); same path works for simplified variants | Extra fetch hop; no SQL over notes (not needed) |

**Decision: Option C.** The DB keeps `projects.analysis_summary` (≈300 bytes) with the stats list views need plus the `notes_key` pointer. Workers and the `GET /notes` endpoint fetch the JSON from storage (API returns it directly for preview, or a signed URL for large files). Simplified versions are sibling objects: `notes/v1.simplified-easy.json`.

This is the same pattern at MVP (Supabase Storage) and scale (S3) — no migration cost.

---

## 5. Storage Key Layout (object storage)

```
projects/{project_id}/
  uploads/{uuid}.mid                      # original upload (server-named)
  notes/v{n}.json                          # canonical parsed notes
  notes/v{n}.simplified-{difficulty}.json
  outputs/{job_id}/video.mp4
  outputs/{job_id}/sheet.pdf
  outputs/{job_id}/sheet.musicxml
  outputs/{job_id}/simplified.mid
  outputs/{job_id}/processed.mid
  previews/{project_id}.png
tmp/{job_id}/...                           # worker scratch, deleted on completion
```

Everything is namespaced under `project_id`; deleting a project = one prefix delete + cascade in DB.

---

## 6. Data Lifecycle & Retention

| Data | Free-tier retention | Mechanism |
|---|---|---|
| Output files (MP4/PDF) | 30 days (`expires_at`) | Daily cleanup job scans `idx_outputs_expiry`, deletes storage object + row; at scale: S3 lifecycle rule on `outputs/` prefix as backstop |
| Worker tmp files | Hours | Worker deletes `tmp/{job_id}/` in `finally`; lifecycle rule on `tmp/` (1 day) as backstop |
| Uploaded MIDI + notes JSON | Life of project | Deleted with project |
| `project_events` | 90 days | Periodic partition/delete |
| Soft-deleted projects | 14 days then hard delete | Cleanup job |

---

## 7. Migration & RLS Notes

- **Alembic** owns the schema; Supabase migrations directory mirrors it for RLS policies.
- **MVP (Supabase):** enable Row Level Security on all user-facing tables (`user_id = auth.uid()`) as defense-in-depth even though the API also enforces ownership — the API uses the service-role key, so RLS protects against any future direct client access.
- **Scale (RDS):** RLS policies drop away; API-layer ownership checks (always present) remain the enforcement. Because the app never *relied* on RLS for its own queries, this migration is a no-op for application code.
- Connection pooling: Supabase pooler (transaction mode) in MVP; RDS Proxy at scale. SQLAlchemy configured for external pooling (NullPool) when behind a pooler.
