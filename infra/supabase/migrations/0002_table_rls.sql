-- Phase 9: Row Level Security on user-owned tables.
--
-- The API connects with the service role (bypasses RLS) and enforces
-- ownership scoping in repositories — RLS is defense in depth so the anon /
-- authenticated Postgrest surface can never read another user's rows, even
-- if a key leaks or someone queries Supabase directly.
--
-- users.id mirrors auth.users.id (app/core/security.py sync), so
-- auth.uid() compares directly against user_id columns.

-- ── Enable RLS everywhere (service role bypasses it) ────────────────────────
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE output_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits     ENABLE ROW LEVEL SECURITY;

-- ── users: a user sees only their own profile row ───────────────────────────
CREATE POLICY users_select_own ON users
    FOR SELECT USING (id = auth.uid());

-- ── projects ────────────────────────────────────────────────────────────────
CREATE POLICY projects_select_own ON projects
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ── uploaded_files ──────────────────────────────────────────────────────────
CREATE POLICY uploads_select_own ON uploaded_files
    FOR SELECT USING (user_id = auth.uid());

-- ── render_settings (owned via project) ─────────────────────────────────────
CREATE POLICY settings_select_own ON render_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = render_settings.project_id AND p.user_id = auth.uid()
        )
    );

-- ── render_jobs ─────────────────────────────────────────────────────────────
CREATE POLICY jobs_select_own ON render_jobs
    FOR SELECT USING (user_id = auth.uid());

-- ── output_files ────────────────────────────────────────────────────────────
CREATE POLICY outputs_select_own ON output_files
    FOR SELECT USING (user_id = auth.uid());

-- ── project_events ──────────────────────────────────────────────────────────
CREATE POLICY events_select_own ON project_events
    FOR SELECT USING (user_id = auth.uid());

-- ── usage_limits ────────────────────────────────────────────────────────────
CREATE POLICY usage_select_own ON usage_limits
    FOR SELECT USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies on purpose: all writes go through the
-- FastAPI service role. Client-side Supabase access is read-only at most.
