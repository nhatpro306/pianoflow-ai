-- PianoFlow AI — RLS policies for auth (Phase 9).
-- Alembic owns schema; this file enables RLS + policies for authenticated
-- Supabase users. Backend uses service role (bypasses RLS); these policies
-- protect direct Supabase client access.

-- ── Enable RLS on all user-facing tables ───────────────────

alter table public.projects enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.render_jobs enable row level security;
alter table public.output_files enable row level security;
alter table public.render_settings enable row level security;
alter table public.project_events enable row level security;
alter table public.daily_usage enable row level security;

-- ── Projects ───────────────────────────────────────────────

drop policy if exists "users read own projects" on public.projects;
create policy "users read own projects"
on public.projects for select to authenticated
using (user_id = auth.uid());

drop policy if exists "users insert own projects" on public.projects;
create policy "users insert own projects"
on public.projects for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "users update own projects" on public.projects;
create policy "users update own projects"
on public.projects for update to authenticated
using (user_id = auth.uid());

-- ── Uploaded files ─────────────────────────────────────────

drop policy if exists "users read own uploads" on public.uploaded_files;
create policy "users read own uploads"
on public.uploaded_files for select to authenticated
using (user_id = auth.uid());

-- ── Render jobs ────────────────────────────────────────────

drop policy if exists "users read own jobs" on public.render_jobs;
create policy "users read own jobs"
on public.render_jobs for select to authenticated
using (user_id = auth.uid());

-- ── Output files ───────────────────────────────────────────

drop policy if exists "users read own outputs" on public.output_files;
create policy "users read own outputs"
on public.output_files for select to authenticated
using (user_id = auth.uid());

-- ── Render settings ────────────────────────────────────────

drop policy if exists "users read own settings" on public.render_settings;
create policy "users read own settings"
on public.render_settings for select to authenticated
using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

drop policy if exists "users update own settings" on public.render_settings;
create policy "users update own settings"
on public.render_settings for update to authenticated
using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- ── Project events (read-only for users) ───────────────────

drop policy if exists "users read own events" on public.project_events;
create policy "users read own events"
on public.project_events for select to authenticated
using (user_id = auth.uid());

-- ── Daily usage (read own only) ────────────────────────────

drop policy if exists "users read own usage" on public.daily_usage;
create policy "users read own usage"
on public.daily_usage for select to authenticated
using (user_id = auth.uid());
