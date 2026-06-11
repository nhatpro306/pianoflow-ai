# Supabase setup (production database / auth / storage)

Schema source of truth: **Alembic** (`apps/api/alembic/versions/`).
This directory holds Supabase-specific provisioning only (buckets, storage RLS).

## One-time setup

1. Create a Supabase project (region close to backend host).
2. Apply the table schema with Alembic against the Supabase connection string:

   ```bash
   cd apps/api
   DATABASE_URL="postgresql+psycopg://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
     uv run alembic upgrade head
   ```

3. Apply `migrations/0001_storage_buckets.sql` in the Supabase SQL editor
   (or `supabase db push` if using the CLI). All three buckets are private.
4. Enable Auth providers (email at minimum). `AUTH_MODE=supabase` in the API
   arrives with Phase 9 — until then production should not be public.
5. Enable RLS on user-owned tables before exposing anything publicly
   (table RLS policies ship with Phase 9 auth, since dev-mode rows are not
   keyed by `auth.uid()` yet).

## Key handling rules

- `SUPABASE_SERVICE_ROLE_KEY` → API/worker environment only. Never in the
  frontend, never in `NEXT_PUBLIC_*`.
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- Storage keys are server-generated (`projects/{id}/uploads/...`) — user
  filenames are display metadata only.
- Tutorial videos and uploaded audio: private buckets, short-lived signed
  URLs minted by the API. No public buckets, no permanent URLs.

## Deployment topology

| Piece | Host |
|---|---|
| Next.js frontend | Vercel (root directory `apps/web`) |
| Auth / Postgres / Storage / RLS | Supabase |
| FastAPI API | Render / Railway / Fly.io (long-running) |
| Worker (`QUEUE_NAMES=q_default`) + audio-worker (`QUEUE_NAMES=q_audio`) | same host, separate services |
| Queue | Redis provider (Upstash / platform Redis) |

Never run the API or workers on Vercel serverless functions — render and
transcription jobs are long-running.
