# PianoFlow AI — Security and Compliance

## 1. Principles

1. Private by default.
2. Least privilege.
3. No user-controlled storage keys.
4. Signed URLs for upload/download/stream.
5. API never handles large file bytes.
6. Workers re-check file/project/job state.
7. Social links are metadata-only.
8. Tutorial videos are streaming-only.
9. Logs must not expose secrets or raw signed URLs.
10. RLS enabled before public launch.

## 2. Upload Security

- file size limit
- file type allowlist
- MIME validation where possible
- duration validation after parse
- server-generated storage key
- private bucket
- signed upload URL
- malware scan later for audio

## 3. Auth

Use Supabase Auth for MVP.

Every API call except health must have auth.

## 4. Authorization

Check:

```text
project.user_id == current_user.id
```

Use RLS in database and storage.

## 5. Storage

Buckets should be private.

Never expose:

```text
raw storage path
public MP4 URL
service role key
```

## 6. Tutorial Video Protection

- no download button
- short-lived stream URL
- watermark by plan
- access logging
- streaming-only output policy

Important: screen recording cannot be fully prevented.

## 7. Social Platform Compliance

Public app must not:

- download platform media
- cache platform media
- extract audio from social videos
- store copies of social audio/video
- encourage ripping

Allowed:

- metadata
- thumbnail where allowed
- embedded player where allowed
- user-uploaded authorized files
- licensed/public-domain files

## 8. Rights Attestation

For audio uploads:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

Store:

```text
rights_attestation=true
attested_at
user_id
```

## 9. DMCA / Takedown

Real product needs:

- complaint email
- report form
- takedown workflow
- output disable ability
- repeat infringer policy
- audit logs
- appeal flow

## 10. Production Checklist

- RLS enabled
- storage private
- signed URLs expire
- rate limits enabled
- CORS allowlist
- no stack traces
- secrets in env/vault
- logs sanitized
- usage limits enforced
- copyright terms visible

## Audio → MIDI Security Update

Audio transcription requires extra controls:

- rights attestation required
- stricter file size limits
- duration limits
- private storage only
- malware scan later
- transcription minutes limit
- abuse detection
- no social platform media download
- no public sharing by default

Audio files should have shorter retention than user-created MIDI unless the user is on a paid plan.
