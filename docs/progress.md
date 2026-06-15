# PianoFlow AI — Progress Log

Newest entries first. Append with `/checkpoint` after completing a milestone.

---

## 2026-06-15 — AWS Free-Tier Deployment Live + ECC Adopted

**Milestone: Stage 3 deployment complete.**

### AWS Infrastructure (ap-southeast-1)

- API live on AWS Lambda + API Gateway via Mangum adapter.
  Endpoint: `https://fszwcr0te3.execute-api.ap-southeast-1.amazonaws.com`
- Worker running always-on on EC2 t2.micro (Docker, `--restart unless-stopped`,
  1 GB RAM + 1 GB swap). Worker drains SQS `q_default` and `q_audio` queues.
- SQS queues provisioned with DLQs (redrive policy: 3 attempts). This is the
  permanent fix for jobs stuck in `queued` status on Render/Redis.
- S3 buckets: `sources`, `analysis`, `outputs` with lifecycle rules (outputs
  expire 30 days; `tmp/` expires 1 day).
- CloudWatch log groups + basic alarms configured.
- Terraform IaC committed under `infra/terraform/` (modules: `ecr`, `sqs`, `s3`,
  `lambda-api`, `ec2-worker`, `cloudwatch`).
- GitHub OIDC deploy role (`pianoflow-gha-deploy`) created; trust and permissions
  policies committed to `infra/aws/oidc/`.
- CI workflow `aws-deploy.yml` (OIDC, ECR push, `terraform plan/apply`) in place.

### Root Cause Fixed

The worker on Render free-tier ("web service") suspended after ~15 minutes of
inactivity. Its Redis `BLPOP` loop died and queued jobs were never consumed. Render
Key Value (Redis) also dropped messages on restart. EC2 (always-on) + SQS (durable)
permanently resolves this.

### Other changes in this batch

- DB password rotated; new value stored in AWS SSM Parameter Store.
- AWS Budget alarm set at $5/month to catch free-tier overages.
- Orphaned `status='queued'` jobs from Render/Redis recoverable via
  `infra/aws/requeue_stuck_jobs.py`.
- Storage migration script `infra/aws/migrate_storage.py` committed (Supabase
  Storage → S3, idempotent, `--dry-run` supported).
- Upload route fixed to redirect to static project page (commit `9cb266d`).
- Vercel catch-all routes dropped so `@vercel/next` handles dynamic routes
  (commit `3414ecf`).
- Storage adapter errors surfaced as 502 envelope, not bare 500 (commit `8387e74`).
- CORS, auth callback, transcribing status, and user-identity bugs fixed
  (commit `qa: fix 9 bugs from full-stack audit`).

### ECC Adopted

- `CLAUDE.md` created at repo root with project memory, stack, commands, model
  delegation policy, agent/command index, and doc pointers.
- `docs/project-analysis.md`, `docs/architecture.md`, `docs/progress.md`,
  `docs/decisions.md` created.
- `ECC_ADOPTION_REPORT.md` filed at repo root.
- Selected components: architect/planner/code-reviewer/security-reviewer (Opus);
  refactor-cleaner/doc-updater/tdd-guide/build-error-resolver (Sonnet); 10 commands;
  coding-standards + backend/frontend-patterns + security-review + tdd-workflow +
  verification-loop + strategic-compact skills; 4 hook categories.

### Status

Stage 3 is live. Web → API → Queue → Worker → Storage/DB pipeline is end-to-end
functional. Audio transcription remains on `placeholder` engine (real Basic Pitch
needs more RAM than t2.micro provides).

---

<!-- /checkpoint will append the next entry above this line -->
