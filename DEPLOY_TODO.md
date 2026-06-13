# Finish the deploy — 5 minutes (then delete this file)

Everything else is done and live:
- Web: https://pianoflow-jet.vercel.app (Vercel, auto-deploys from GitHub)
- Supabase DB `kcznjjnhtajwumhvbasq`: schema + buckets + RLS applied
- Render: GitHub app installed, Blueprint form was open and parsed

## Step 1 — Supabase secrets (2 values)

1. DB password: https://supabase.com/dashboard/project/kcznjjnhtajwumhvbasq/database/settings
   → "Reset password" → **Generate a password** → copy → Reset.
   Then your DATABASE_URL is (replace YOUR_PASSWORD):

   ```
   postgresql+psycopg://postgres.kcznjjnhtajwumhvbasq:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

   The `postgresql+psycopg://` prefix is required. If the generated password
   contains `@ : / # ?`, generate another one.

2. Service role key: https://supabase.com/dashboard/project/kcznjjnhtajwumhvbasq/settings/api-keys
   → tab "Legacy anon, service_role API keys" → reveal + copy **service_role**.

## Step 2 — Render Blueprint

https://dashboard.render.com → New + → Blueprint → `nhatpro306/pianoflow-ai`
- Blueprint Name: `pianoflow`
- Fill the 4 prompted fields (DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY for
  both pianoflow-api and pianoflow-worker) with the 2 values from Step 1
- Click **Deploy Blueprint** (first Docker builds take ~10–15 min)

## Step 3 — point the web app at the API

When pianoflow-api shows "Live", copy its URL (https://pianoflow-api-XXXX.onrender.com), then run:

```powershell
cd C:\Users\super\pianoflow
"https://YOUR-RENDER-API-URL" | vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel deploy --prod --yes
```

(or just tell Claude "render URL is https://..." next session — it finishes Step 3 + 4 + smoke test)

## Step 4 — keep free services awake

https://uptimerobot.com (free) → 2 HTTP monitors, 5-min interval:
- `https://YOUR-RENDER-API-URL/healthz`
- `https://pianoflow-worker-XXXX.onrender.com/healthz`

## GitHub Actions secret (CI migrations)

Repo → Settings → Secrets → Actions → add `DATABASE_URL` = same value as Step 1.
