-- PianoFlow AI — Supabase storage buckets + policies.
-- Table schema is owned by Alembic (apps/api/alembic) and applied with
-- `alembic upgrade head` against the Supabase DATABASE_URL. This file only
-- provisions Supabase-specific resources: private buckets + storage RLS.
--
-- All buckets are PRIVATE. Tutorial videos and uploaded audio must never
-- live in a public bucket (12_NO_TUTORIAL_DOWNLOAD_POLICY).

insert into storage.buckets (id, name, public)
values
  ('pianoflow-sources', 'pianoflow-sources', false),   -- uploaded MIDI/audio
  ('pianoflow-analysis', 'pianoflow-analysis', false), -- notes/confidence/report JSON
  ('pianoflow-outputs', 'pianoflow-outputs', false)    -- sheet PDF/MusicXML, draft MIDI, video
on conflict (id) do nothing;

-- Storage object access: backend uses the service role key (bypasses RLS).
-- These policies cover direct client access via signed URLs / authenticated
-- requests: a user may only touch objects under their own user-id prefix.
-- Key layout: users/{user_id}/projects/{project_id}/...

drop policy if exists "pianoflow users read own objects" on storage.objects;
create policy "pianoflow users read own objects"
on storage.objects for select to authenticated
using (
  bucket_id in ('pianoflow-sources', 'pianoflow-analysis', 'pianoflow-outputs')
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "pianoflow users upload own sources" on storage.objects;
create policy "pianoflow users upload own sources"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pianoflow-sources'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- No public read policies on purpose: outputs are served via short-lived
-- signed URLs minted by the API (POST /outputs/{id}/download-url|stream-url).
