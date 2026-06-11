# PianoFlow AI — Risk Register

## 1. Technical Risks

### MIDI parsing edge cases

Mitigation:

- fixture tests
- support standard MIDI first
- safe error handling

### Video render performance

Mitigation:

- 30 fps fixed
- max 1080p
- max duration limits
- worker queue

### Audio transcription quality

Mitigation:

- beta feature
- solo piano first
- call output draft MIDI
- editable preview later

## 2. Legal Risks

### Copyrighted uploads

Mitigation:

- rights attestation
- private outputs
- no public library
- DMCA workflow

### Social platform policy

Mitigation:

- metadata-only
- no media download
- feature flags
- legal review before OAuth import

## 3. Business Risks

### Free-tier abuse

Mitigation:

- preview limits
- render caps
- storage lifecycle
- rate limits

### Low conversion

Mitigation:

- teacher workflow
- project history
- watermark/plan limits
- SEO and creator outreach

## 4. Cloud Cost Risks

Mitigation:

- usage_limits table
- max duration
- no 4K MVP
- paid audio transcription
- autoscaling workers
- lifecycle cleanup

## 5. Security Risks

Mitigation:

- RLS
- private buckets
- signed URLs
- no service key in frontend
- safe logging
- auth checks
