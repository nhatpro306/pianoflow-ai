# PianoFlow AI — Database Schema

## 1. Database

MVP database:

```text
Supabase Postgres
```

Long-term database:

```text
AWS RDS PostgreSQL
```

## 2. Tables

### profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text default 'free',
  created_at timestamptz default now()
);
```

### projects

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  source_type text not null default 'midi_upload',
  status text not null default 'created',
  notes_json_path text,
  draft_midi_path text,
  transcription_notes_json_path text,
  transcription_confidence_json_path text,
  transcription_report_json_path text,
  transcription_status text,
  analysis_summary jsonb,
  duration_seconds numeric,
  bpm numeric,
  note_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Allowed `source_type`:

```text
midi_upload
audio_upload
youtube_reference
tiktok_reference
instagram_reference
licensed_provider
public_domain_source
creative_commons_source
```

### uploaded_files

```sql
create table uploaded_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  file_type text not null,
  storage_path text not null,
  original_filename text,
  content_type text,
  size_bytes bigint,
  duration_seconds numeric,
  sample_rate integer,
  channels integer,
  upload_status text default 'pending',
  rights_attestation boolean default false,
  rights_attested_at timestamptz,
  created_at timestamptz default now()
);
```

Allowed `file_type`:

```text
midi
audio
draft_midi
```

### render_settings

```sql
create table render_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  resolution text default '1080p',
  fps integer default 30,
  speed_multiplier numeric default 1.0,
  difficulty text default 'original',
  show_note_names boolean default false,
  show_keyboard boolean default true,
  theme text default 'dark',
  left_hand_color text,
  right_hand_color text,
  created_at timestamptz default now()
);
```

### render_jobs

```sql
create table render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  job_type text not null,
  queue_name text,
  status text not null default 'queued',
  settings_snapshot jsonb,
  progress integer default 0,
  retry_count integer default 0,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);
```

Allowed `job_type`:

```text
parse_midi
render_sheet
render_video
simplify_midi
transcribe_audio
parse_draft_midi
render_vertical_video
create_practice_pack
```

### output_files

```sql
create table output_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid references render_jobs(id) on delete set null,
  output_type text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  duration_seconds numeric,
  download_allowed boolean default true,
  streaming_only boolean default false,
  watermark_required boolean default false,
  access_policy text default 'private_download',
  created_at timestamptz default now()
);
```

Allowed `output_type`:

```text
sheet_pdf
music_xml
original_midi
simplified_midi
transcribed_draft_midi
transcription_notes_json
transcription_confidence_json
transcription_report_json
tutorial_mp4
vertical_tutorial_mp4
thumbnail_png
```

Output policy:

```text
sheet_pdf: download_allowed=true
music_xml: download_allowed=true
original_midi: download_allowed=true
simplified_midi: download_allowed=true
transcribed_draft_midi: download_allowed=true depending on plan
transcription_notes_json: download_allowed=false by default
transcription_confidence_json: download_allowed=false by default
tutorial_mp4: download_allowed=false, streaming_only=true
vertical_tutorial_mp4: download_allowed=false, streaming_only=true
```

### project_sources

```sql
create table project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  source_type text not null,
  source_platform text,
  source_url text,
  source_external_id text,
  source_title text,
  source_author text,
  source_thumbnail_url text,
  source_duration_seconds integer,
  source_license_type text,
  source_rights_attestation boolean default false,
  source_policy_status text default 'metadata_only',
  created_at timestamptz default now()
);
```

### project_events

```sql
create table project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### usage_limits

```sql
create table usage_limits (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan text default 'free',
  midi_projects_used integer default 0,
  render_minutes_used numeric default 0,
  transcription_minutes_used numeric default 0,
  storage_bytes_used bigint default 0,
  reset_at timestamptz,
  updated_at timestamptz default now()
);
```

## 3. Storage Key Layout

```text
users/{user_id}/projects/{project_id}/input/original.mid
users/{user_id}/projects/{project_id}/input/original_audio.wav
users/{user_id}/projects/{project_id}/analysis/notes.json
users/{user_id}/projects/{project_id}/analysis/transcription_notes.json
users/{user_id}/projects/{project_id}/analysis/transcription_confidence.json
users/{user_id}/projects/{project_id}/analysis/transcription_report.json
users/{user_id}/projects/{project_id}/outputs/transcribed_draft.mid
users/{user_id}/projects/{project_id}/outputs/sheet.pdf
users/{user_id}/projects/{project_id}/outputs/score.musicxml
users/{user_id}/projects/{project_id}/outputs/tutorial.mp4
users/{user_id}/projects/{project_id}/outputs/simplified.mid
```

## 4. RLS Rules

Every user-owned table must enforce:

```text
user_id = auth.uid()
```

For storage, use private buckets and policies that allow access only to the user's folder/project.

## 5. Migration Rule

Every database change must be a migration file.

No manual production schema edits.

## 6. Implemented Schema Mapping (Alembic = source of truth)

The SQL above is the target/Supabase-era schema. The implemented schema
lives in `apps/api/alembic/versions/` and differs in naming:

| This doc | Implemented |
|---|---|
| `profiles` | `users` (dev-auth table; Supabase Auth mapping arrives in Phase 9) |
| `uploaded_files.file_type` | `uploaded_files.kind` |
| `*.storage_path` | `*.storage_key` |
| `output_files.output_type` | `output_files.kind` |
| `output_files.download_allowed/streaming_only` | kind-based policy in API code (no columns) |
| `render_jobs.retry_count` | `render_jobs.attempt` / `max_attempts` |
| `render_jobs.error_code` | `render_jobs.error_type` |

Implemented output kinds: `sheet_musicxml`, `sheet_pdf`,
`transcribed_draft_midi`, `transcription_notes_json`,
`transcription_confidence_json`, `transcription_report_json`
(video kinds arrive with the video phase).

Migrations so far:

```text
0001 users/projects/uploaded_files
0002 render_settings
0003 piano_sound
0004 render_jobs + project_events
0005 output_files
0006 audio transcription beta:
     projects.source_type, projects.transcription_status,
     projects.draft_midi_path, projects.transcription_notes_json_path,
     projects.transcription_confidence_json_path,
     projects.transcription_report_json_path,
     uploaded_files.duration_seconds, uploaded_files.sample_rate,
     uploaded_files.channels, uploaded_files.rights_attestation,
     uploaded_files.rights_attested_at
```

Audio, draft MIDI, notes/confidence/report JSON live in object storage —
Postgres stores only metadata and storage keys/paths.
