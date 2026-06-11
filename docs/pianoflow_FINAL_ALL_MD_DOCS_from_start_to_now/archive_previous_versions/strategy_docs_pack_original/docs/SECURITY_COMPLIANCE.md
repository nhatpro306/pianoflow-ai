# PianoFlow AI — Security and Compliance

## 1. Security Principles

1. Private by default.
2. Least privilege.
3. No user-controlled storage keys.
4. Signed URLs for file transfer.
5. API never handles large file bytes.
6. Workers validate before processing.
7. Queue payloads contain IDs only.
8. No social-media audio/video downloading in public app.
9. All outputs require authorization unless explicitly shared.
10. Logs must not leak secrets or file URLs.

## 2. File Upload Security

### 2.1 Signed Upload URLs

Upload flow:

```text
Frontend asks API for upload URL
API checks auth and project ownership
API generates safe storage key
API returns signed upload URL
Frontend uploads directly to storage
Frontend calls upload-complete endpoint
```

API does not receive file bytes.

### 2.2 Server-Generated Keys

Bad:

```text
user_filename.mid
```

Good:

```text
users/{user_id}/projects/{project_id}/input/original.mid
```

### 2.3 Validation

Validate:

- extension
- MIME type where possible
- file size
- duration after parsing
- note count after parsing
- empty file
- corrupted MIDI

MVP allowed:

```text
.mid
.midi
```

Future audio:

```text
.wav
.mp3
.m4a
```

### 2.4 Virus Scan Later

For audio upload and public product, add:

- ClamAV worker
- malware scan status
- processing only after scan passes

## 3. Auth and Authorization

Use:

- JWT/session auth
- project ownership checks
- RLS in Postgres/Supabase
- admin role separated

Rules:

```text
User can only access own projects.
User can only access own output files.
User can only create jobs for own projects.
Worker re-validates project and file status.
```

## 4. Storage Security

Storage should be private by default.

Use signed URLs for:

- upload
- download
- preview

Do not expose public bucket.

Use lifecycle rules:

```text
temporary files: delete after 1 day
failed outputs: delete after 7 days
free user outputs: delete after 14-30 days
paid outputs: retain by plan
```

## 5. API Security

Implement:

- rate limiting
- request validation
- CORS allowlist
- no stack traces in production
- structured error envelope
- request_id
- auth middleware
- input sanitization
- safe logging

Error envelope:

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only .mid and .midi files are supported.",
    "request_id": "req_123"
  }
}
```

## 6. Job Security

Queue payload:

```json
{
  "job_id": "uuid",
  "project_id": "uuid"
}
```

Worker must load full details from DB.

Worker rules:

- verify project exists
- verify user/project ownership context
- verify file exists
- verify file status is uploaded
- use settings snapshot
- enforce limits
- update progress safely
- mark failed with safe error
- support retry
- use DLQ later

## 7. Copyright and Platform Compliance

Public product must not implement:

```text
download YouTube audio/video
download TikTok audio/video
download Instagram audio/video
cache social audio/video
store social media copies
extract audio from social video
```

Allowed safer approach:

```text
fetch metadata where allowed
show embedded player where allowed
store title/thumbnail/duration/platform ID
ask user to upload authorized file
```

## 8. User Rights Attestation

Before processing uploaded audio or non-public-domain files, show:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

Store:

```text
source_rights_attestation = true
attested_at
user_id
```

## 9. DMCA / Takedown Checklist

For real product:

- contact email for complaints
- report form
- ability to disable project/output
- audit logs
- repeat infringer policy
- user notification flow
- appeal flow

## 10. Secrets Management

Never commit:

- API keys
- Supabase service role key
- AWS keys
- Stripe secret key
- YouTube API key
- private signing secrets

Use:

- local `.env`
- Vercel/Render env vars for MVP
- AWS Secrets Manager for production
- IAM roles where possible

## 11. Production Checklist

Before production:

- RLS enabled
- storage private
- signed URLs expire
- rate limits enabled
- secrets outside Git
- logs sanitized
- backups enabled
- lifecycle rules enabled
- billing limits enabled
- copyright terms visible
- no social media download code
