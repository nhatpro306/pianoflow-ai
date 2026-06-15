---
name: security-review
description: PianoFlow security checklist. Use when writing auth code, API endpoints, file upload handlers, SQS handlers, or any code touching secrets, S3, or Supabase.
---

# Security Review — PianoFlow

## When to Activate

- New FastAPI endpoint added
- Supabase JWT verification logic changed
- S3 upload/download handler modified
- SQS message handler added
- IAM roles or bucket policies changed
- New environment variable introduced
- Dependency version bumped

---

## Checklist

### 1. Secrets Management (CRITICAL)

```python
# WRONG
supabase_key = "eyJhbGciOi..."

# CORRECT — pydantic-settings reads from env
from apps.api.src.config import get_settings
settings = get_settings()
# settings.supabase_service_role_key is never logged
```

- [ ] No hardcoded keys, tokens, or passwords in any source file
- [ ] `.env` in `.gitignore`; only `.env.example` committed
- [ ] `git log -p | grep -i "secret\|password\|key"` returns no real values
- [ ] `SUPABASE_SERVICE_ROLE_KEY` absent from `apps/web/` (client bundle)

### 2. Supabase JWT / JWKS (CRITICAL)

```python
# CORRECT — full JWKS verification
from jwt import PyJWKClient
import jwt

jwks_client = PyJWKClient(settings.supabase_jwks_url)
signing_key = jwks_client.get_signing_key_from_jwt(token)
payload = jwt.decode(
    token, signing_key.key,
    algorithms=["RS256"],
    audience="authenticated",
)
user_id = payload["sub"]
```

- [ ] JWT signature verified via JWKS (not `verify_signature=False`)
- [ ] `aud` claim validated as `"authenticated"`
- [ ] `sub` used as user identity; no client-supplied user IDs trusted

### 3. SQLAlchemy SQL Injection (CRITICAL)

```python
# WRONG
session.execute(f"SELECT * FROM tracks WHERE project_id = '{project_id}'")

# CORRECT
from sqlalchemy import text
session.execute(
    text("SELECT * FROM tracks WHERE project_id = :pid"),
    {"pid": project_id}
)
```

- [ ] No f-strings in `.execute()` calls
- [ ] All raw SQL uses `text()` with named params

### 4. S3 / SQS IAM (CRITICAL)

- [ ] S3 bucket has `BlockPublicAcls` and `BlockPublicPolicy` enabled
- [ ] Pre-signed URLs expire in ≤ 900 seconds for sensitive objects
- [ ] Lambda IAM role has `s3:GetObject`/`s3:PutObject` on specific prefix only — not `s3:*`
- [ ] SQS `SendMessage` restricted to the API Lambda role ARN
- [ ] No `*` in `Resource` for IAM statements

### 5. FastAPI Input Validation (HIGH)

```python
from pydantic import BaseModel, Field
from typing import Literal

class UploadRequest(BaseModel):
    filename: str = Field(..., max_length=255, pattern=r'^[\w\-. ]+$')
    content_type: Literal["audio/midi", "audio/wav", "audio/mpeg"]
```

- [ ] All request bodies are Pydantic models
- [ ] File MIME type validated server-side
- [ ] No path traversal possible in filenames (`../` rejected by pattern)

### 6. CORS (HIGH)

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pianoflow.ai", "https://www.pianoflow.ai"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

- [ ] `allow_origins` is NOT `["*"]` in production
- [ ] Credentials only allowed with explicit origin list

### 7. Supabase RLS (HIGH)

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON projects
  USING (auth.uid()::text = user_id);
```

- [ ] Every new table has `ENABLE ROW LEVEL SECURITY`
- [ ] Policies restrict access to `auth.uid() = user_id`
- [ ] Service-role client used only in server-side code

### 8. Logging — No PII / Secrets (MEDIUM)

```python
# WRONG
logger.info(f"User {user_id} token: {access_token}")

# CORRECT
logger.info("User authenticated", extra={"user_id": user_id})
```

- [ ] No tokens, passwords, or full S3 keys in log output
- [ ] Error messages returned to client are generic (no stack traces)

### 9. SQS Message Safety (MEDIUM)

- [ ] Messages reference S3 keys, not raw audio data
- [ ] No PII beyond `user_id` and `job_id` in messages
- [ ] Dead-letter queue configured with redrive policy
- [ ] `MessageDeduplicationId` set on FIFO queue messages

---

## Pre-Deployment Security Checklist

- [ ] No secrets in source code or git history
- [ ] Supabase JWT verified via JWKS
- [ ] SQLAlchemy queries parameterized
- [ ] S3 bucket is private; IAM roles are least-privilege
- [ ] CORS restricted to known origins
- [ ] RLS enabled on all Supabase tables
- [ ] Logging sanitized
- [ ] `pnpm audit` clean (web)
- [ ] `uv run --directory apps/api pip-audit` or `safety check` clean (Python)
