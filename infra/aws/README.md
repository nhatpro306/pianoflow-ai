# AWS deployment assets (Stage 3 — Phase 11)

Companion assets for the Terraform free-tier stack (`infra/terraform/`).

## Contents

| File | What |
|---|---|
| `migrate_storage.py` | One-shot Supabase Storage → S3 object sync (idempotent, `--dry-run` supported) |
| `ec2-worker/user-data.sh` | Reference user-data (Docker + swap). Production version is rendered by Terraform from `infra/terraform/modules/ec2-worker/user-data.sh.tftpl` |

## First Deploy (clean AWS account)

Order matters — ECR repos must exist before CI can push images:

```bash
cd infra/terraform
cp envs/free-tier/terraform.tfvars.example terraform.tfvars   # fill secrets

terraform init
terraform apply -target=module.ecr      # 1. registries first
# 2. push images (locally or run the aws-deploy workflow)
aws ecr get-login-password | docker login --username AWS --password-stdin <registry>
docker build -f infra/docker/api.Dockerfile -t <registry>/pianoflow-api:latest .
docker push <registry>/pianoflow-api:latest
docker build -f infra/docker/worker.Dockerfile -t <registry>/pianoflow-worker:latest .
docker push <registry>/pianoflow-worker:latest

terraform apply                          # 3. everything else
```

Then migrate storage objects:

```bash
export SUPABASE_URL=https://PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
uv run --directory apps/api python ../../infra/aws/migrate_storage.py --dry-run
uv run --directory apps/api python ../../infra/aws/migrate_storage.py
```

Finally point Vercel `NEXT_PUBLIC_API_BASE_URL` at the `api_url` Terraform output.

## CI/CD (GitHub OIDC)

`.github/workflows/aws-deploy.yml`:
- PR touching `infra/terraform/**` → `terraform plan` in job log
- Manual dispatch → build+push images to ECR → plan → apply (when `apply=true`)

No long-lived AWS keys. Create an IAM role with a GitHub OIDC trust policy and
set `AWS_OIDC_ROLE_ARN` repo secret. Required secrets/vars are listed at the
top of the workflow file.

## Free-Tier Guardrails

- AWS Budget alarm at $5 (create manually — Budgets has no free Terraform-safe API quota)
- Single t2.micro worker, no autoscaling
- S3 lifecycle: outputs 7 days, tmp/ 1 day
- ECR lifecycle: keep last 3 images (500MB free limit)
