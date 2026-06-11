# PianoFlow AI — MVP Deployment on Vercel + Supabase

## 1. MVP Deployment Goal

Deploy a real web product quickly using:

```text
Vercel + Supabase + FastAPI + Worker + Redis
```

## 2. Services

### Vercel

Hosts:

```text
Next.js frontend
```

### Supabase

Provides:

```text
Auth
Postgres
Storage
RLS
signed URLs
```

### Render / Railway / Fly.io

Hosts:

```text
FastAPI API
Python worker
Redis or Redis provider
```

## 3. Local Development

Use Docker Compose:

```text
web
api
worker
postgres
redis
```

Expected local URLs:

```text
http://localhost:3000
http://localhost:8000/health
http://localhost:8000/api/v1/health
```

## 4. Environment Variables

```env
APP_ENV=development

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

API_HOST=0.0.0.0
API_PORT=8000
API_BASE_URL=http://localhost:8000

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pianoflow

QUEUE_BACKEND=redis
REDIS_URL=redis://redis:6379/0

STORAGE_BACKEND=supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
```

## 5. Supabase Setup

Steps:

1. Create Supabase project.
2. Enable Auth.
3. Create private storage buckets.
4. Apply database migrations.
5. Enable RLS.
6. Add storage RLS policies.
7. Add service role key to backend environment only.
8. Never expose service role key to frontend.

## 6. Vercel Setup

Steps:

1. Connect GitHub repo.
2. Set root directory `apps/web`.
3. Add env vars:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy preview branches.
5. Deploy production from main.

## 7. Backend Setup

Use Render/Railway/Fly.io for MVP.

Deploy:

```text
apps/api
apps/worker
```

Worker must run separately from API.

## 8. Production Rules

- no local storage in production
- storage bucket private
- RLS enabled
- signed URLs only
- video streaming-only
- no raw storage paths in frontend
- logs enabled
- rate limits enabled
- free-tier limits enabled before public launch
