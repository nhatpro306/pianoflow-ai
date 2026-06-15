# PianoFlow — AWS Free-Tier Deployment Runbook

Authoritative, step-by-step plan to move PianoFlow off Render (free web-service
worker that spins down) onto AWS free-tier, where the worker runs **always-on**
and the queue is **durable**. This is the real fix for the "jobs stuck in queue"
bug: a pull-based worker cannot live on a platform that suspends the process when
idle.

> **Root cause recap.** On Render free, the worker is a *web service* that
> suspends after ~15 min idle, so its `BLPOP` loop dies and queued jobs are never
> consumed. Render's free Key Value (Redis) is also non-persistent and silently
> drops queued messages. AWS fixes both: worker on **EC2** (always-on) + **SQS**
> (durable broker, DLQ).

---

## 0. Target architecture

```
Browser ── Vercel (Next.js)
   │  NEXT_PUBLIC_API_BASE_URL
   ▼
API Gateway (HTTP) → Lambda (FastAPI via Mangum)   [perpetual free: Lambda + SQS]
   │  enqueue                    │ presigned URLs
   ▼                             ▼
SQS (q_default, q_audio + DLQs)  S3 (sources/analysis/outputs)
   ▲ poll (long-poll 20s)
   │
EC2 t2.micro worker (Docker, --restart unless-stopped, 1 GB + 1 GB swap)
   │
   ▼
Supabase Postgres (DATABASE_URL)   ← metadata stays on Supabase
```

What is already in the repo (verified):
- Lambda entrypoint: [api.Dockerfile](../infra/docker/api.Dockerfile) switches to
  `awslambdaric app.main.handler` when `$AWS_LAMBDA_RUNTIME_API` is set; Mangum
  handler at [apps/api/app/main.py](../apps/api/app/main.py).
- Deps present: `mangum`, `awslambdaric`, `boto3` (API); `boto3` (worker).
- Adapters: `SqsQueueService` + `S3StorageService` on both API and worker.
- Terraform: `ecr`, `sqs` (with DLQ + redrive), `s3` (lifecycle), `lambda-api`
  (+ API Gateway HTTP), `ec2-worker` (user-data installs Docker + swap, runs the
  worker container with `QUEUE_BACKEND=sqs`, `STORAGE_BACKEND=s3`), `cloudwatch`.
- CI: [aws-deploy.yml](../.github/workflows/aws-deploy.yml) (OIDC, ECR push,
  `terraform plan/apply`).
- Storage migration: [migrate_storage.py](../infra/aws/migrate_storage.py).

---

## 1. Free-tier cost reality (read before you start)

| Resource | Free allowance | Note |
|---|---|---|
| Lambda (API) | 1M req + 400k GB-s / mo | **perpetual** |
| SQS | 1M req / mo | **perpetual** |
| EC2 t2.micro | 750 h / mo | **12 months only**, then ~$8–9/mo |
| API Gateway HTTP | 1M req / mo | 12 months |
| S3 | 5 GB + 20k GET / 2k PUT | 12 months; video outputs can exceed |
| EBS (EC2 disk) | 30 GB | 12 months |
| Data egress | 100 GB / mo | video streaming can exceed |

Net: effectively **$0 for ~12 months**, small EC2/S3 cost after. If you need
**$0 forever**, run only the worker on an Oracle Cloud Always-Free Ampere VM and
keep Lambda+SQS+S3 here — out of scope for this runbook.

---

## 2. Known gaps fixed by this runbook

These repo changes are required before a clean deploy works. They are tagged
**[AUTOMATED]** (code/IaC) vs **[MANUAL]** (your AWS console / credentials).

- **[AUTOMATED] S3 CORS** — the `sources` bucket has no CORS config; browser
  presigned `PUT` uploads would be blocked. Add
  `aws_s3_bucket_cors_configuration` allowing the Vercel origin(s).
- **[AUTOMATED] OIDC artifacts** — commit the GitHub-OIDC trust policy and the
  least-privilege permission policy JSON so the IAM role is reproducible.
- **[AUTOMATED] Stuck-job recovery** — script to re-enqueue (or fail) the
  `render_jobs` rows orphaned by the old Render/Redis setup.
- **[AUTOMATED] Docs** — this file + cross-links from
  [DEPLOYMENT.md](DEPLOYMENT.md) and [infra/aws/README.md](../infra/aws/README.md).
- **[MANUAL] Audio transcription engine** — EC2 user-data leaves
  `TRANSCRIPTION_ENGINE` unset → worker uses the **placeholder** engine (MIDI
  parse/render work; audio→MIDI is a stub). Real `basic_pitch` needs the
  `basic-pitch` extra in the worker image **and** more RAM than t2.micro (1 GB)
  comfortably gives. See §8.

---

## 3. Prerequisites [MANUAL]

1. AWS account with a payment method. **Set a budget alarm first** (§7).
2. Local tools: `terraform >= 1.5`, `awscli v2`, `docker`, `uv`.
3. Decide region (default `us-east-1`).
4. Supabase values on hand: pooler `DATABASE_URL`, `SUPABASE_URL`,
   `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Vercel project URL (for CORS), e.g. `https://pianoflow-jet.vercel.app`.

---

## 4. GitHub OIDC role (CI deploy, no static keys) [MANUAL, uses AUTOMATED artifacts]

The committed artifacts live in `infra/aws/oidc/`:
- `trust-policy.json` — trusts `token.actions.githubusercontent.com` for this repo.
- `permissions-policy.json` — least privilege for terraform (ECR, SQS, S3,
  Lambda, API Gateway, EC2, IAM passrole, SSM, CloudWatch, logs).

Create the role (one-time):

```bash
# 1. OIDC provider (skip if it already exists in the account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 2. Role + policies (edit ACCOUNT_ID and the repo in trust-policy.json first)
aws iam create-role --role-name pianoflow-gha-deploy \
  --assume-role-policy-document file://infra/aws/oidc/trust-policy.json
aws iam put-role-policy --role-name pianoflow-gha-deploy \
  --policy-name pianoflow-deploy \
  --policy-document file://infra/aws/oidc/permissions-policy.json
```

Then in GitHub → repo → Settings:
- **Secrets:** `AWS_OIDC_ROLE_ARN`, `TF_VAR_DATABASE_URL`,
  `TF_VAR_SUPABASE_JWT_SECRET`, `TF_VAR_SUPABASE_SERVICE_ROLE_KEY`.
- **Variables:** `AWS_REGION`, `TF_VAR_SUPABASE_URL`,
  `TF_VAR_CORS_ALLOWED_ORIGINS` (the Vercel URL).

---

## 5. First deploy (order matters) [MANUAL]

ECR repos must exist before images can be pushed.

```bash
cd infra/terraform
cp envs/free-tier/terraform.tfvars.example terraform.tfvars   # fill secrets
terraform init

# 1) registries first
terraform apply -target=module.ecr

# 2) build + push images (or run the aws-deploy workflow to push)
REG=$(terraform output -raw ecr_api_repo | cut -d/ -f1)
aws ecr get-login-password | docker login --username AWS --password-stdin "$REG"
docker build -f ../docker/api.Dockerfile -t "$(terraform output -raw ecr_api_repo):latest" ../..
docker push "$(terraform output -raw ecr_api_repo):latest"
docker build -f ../docker/worker.Dockerfile -t "$(terraform output -raw ecr_worker_repo):latest" ../..
docker push "$(terraform output -raw ecr_worker_repo):latest"

# 3) everything else
terraform apply
```

Capture outputs: `api_url`, `worker_public_ip`, `sqs_queue_default_url`.

> CI alternative: trigger **AWS Deploy** workflow (`workflow_dispatch`,
> `apply=true`) — it builds/pushes images and runs `terraform apply` via OIDC.

---

## 6. Wire frontend + storage [MANUAL]

1. **Data migration (optional)** — copy existing Supabase Storage objects to S3:
   ```bash
   export SUPABASE_URL=https://PROJECT.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=...
   uv run --directory apps/api python ../../infra/aws/migrate_storage.py --dry-run
   uv run --directory apps/api python ../../infra/aws/migrate_storage.py
   ```
2. **Vercel** — set `NEXT_PUBLIC_API_BASE_URL` to the `api_url` output, redeploy.
3. **S3 CORS** — applied by terraform (§2). Confirm the Vercel origin is allowed
   on the `sources` bucket.

---

## 7. Guardrails [MANUAL]

- AWS Budgets alarm at **$1–5/mo** (Budgets has no free terraform-safe quota).
- ECR lifecycle keeps last 3 images; S3 lifecycle expires outputs/tmp.
- Stop the EC2 instance when idle to stretch the 750 h/mo.

---

## 8. Audio transcription on AWS (optional, not free-tier-friendly)

The worker defaults to `TRANSCRIPTION_ENGINE=placeholder`. To run real
Spotify Basic Pitch (ONNX) audio→MIDI:
1. Add the `basic-pitch` extra to the worker image
   ([worker.Dockerfile](../infra/docker/worker.Dockerfile) + worker pyproject).
2. Set `-e TRANSCRIPTION_ENGINE=basic_pitch` in the EC2 user-data.
3. Use an instance with ≥2–4 GB RAM (t3.small, **not** free) — onnxruntime + the
   model will thrash or OOM on t2.micro's 1 GB even with swap.

Leave on `placeholder` for the free-tier deploy; MIDI upload → parse → render is
fully functional.

---

## 9. Recover the orphaned jobs [MANUAL, uses AUTOMATED script]

Jobs created under the old Render/Redis setup are `status='queued'` in Supabase
Postgres with no broker message (their Redis messages were lost). On AWS the
worker reads SQS, so they will not auto-run. Re-enqueue them:

```bash
export DATABASE_URL=...                       # Supabase pooler
export SQS_QUEUE_DEFAULT_URL=...              # terraform output
export SQS_QUEUE_AUDIO_URL=...
export AWS_REGION=us-east-1
uv run --directory apps/api python ../../infra/aws/requeue_stuck_jobs.py --dry-run
uv run --directory apps/api python ../../infra/aws/requeue_stuck_jobs.py
```

(Or simply re-upload the affected files; or mark them failed.)

---

## 10. Verification checklist

- [ ] `curl $api_url/healthz` → `{"status":"ok"}`.
- [ ] EC2: `sudo docker logs pianoflow-worker` shows "worker started" and the SQS
      receive loop (no crash loop).
- [ ] Upload a MIDI in the web app → project transitions
      `parsing → ready` within seconds.
- [ ] SQS console: `q_default` ApproximateNumberOfMessages returns to 0;
      DLQ stays empty.
- [ ] S3 `sources` bucket shows the uploaded object; `outputs` gets render
      artifacts.
- [ ] CloudWatch: no Lambda error alarm, no SQS-age alarm.

---

## 11. Rollback

- Frontend: point `NEXT_PUBLIC_API_BASE_URL` back at the Render API URL.
- Infra: `terraform destroy` (buckets use `force_destroy=true`).
- Supabase Postgres is untouched throughout — it remains the source of truth.
