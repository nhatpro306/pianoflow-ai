# Terraform — AWS Free-Tier (Stage 3)

Infrastructure as Code for the AWS deployment. All resources fit within
AWS free tier ($0/month for 12 months; Lambda + SQS always free).

## Modules

```
modules/
  ecr/           Container registries (api + worker), lifecycle: keep 3 images
  s3/            3 private buckets + lifecycle (outputs 7d, tmp 1d)
  sqs/           q_default + q_audio + DLQs (redrive after 3 failures)
  lambda-api/    Lambda function + HTTP API Gateway + IAM (least-privilege)
  ec2-worker/    t2.micro + user-data (Docker pull + run) + SSM for DB secret
  cloudwatch/    Dashboard (Lambda + SQS metrics) + error alarm
envs/
  free-tier/     terraform.tfvars.example — copy, fill secrets, never commit
```

## Quick Start

```bash
cd infra/terraform
cp envs/free-tier/terraform.tfvars.example terraform.tfvars
# Fill secrets in terraform.tfvars

terraform init
terraform plan
terraform apply
```

## Architecture

```
Vercel (web) → API Gateway → Lambda (FastAPI via Mangum)
                                  ↓
                              SQS (q_default + q_audio + DLQs)
                                  ↓
                           EC2 t2.micro (worker, Docker)
                                  ↓
                  S3 (sources / analysis / outputs)
                  Supabase (Postgres + Auth — kept free)
```

## Secrets

- `database_url` — Supabase connection pooler URL
- `supabase_jwt_secret` — HS256 JWT secret from Supabase dashboard
- `supabase_service_role_key` — backend-only service role key
- DB URL stored in SSM Parameter Store for EC2 (not in user-data)

Pass via `terraform.tfvars` (gitignored) or `TF_VAR_*` env vars in CI.

## Cost

| Service | Free Tier |
|---|---|
| Lambda | Always free, 1M req/month |
| API Gateway | Always free, 1M req/month |
| SQS | Always free, 1M req/month |
| EC2 t2.micro | 12 months free |
| S3 (5GB) | 12 months free |
| ECR (500MB) | Always free |
| CloudWatch | Always free, 10 custom metrics |

After 12 months: EC2 ~$8/mo + S3 pennies. Everything else stays free.
