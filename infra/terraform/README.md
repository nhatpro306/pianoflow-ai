# Terraform (Stage 3/4 — Phase 11)

Empty by design until Phase 11 (`docs/ROADMAP.md`). Planned modules:

```
modules/
  network/         VPC, subnets, S3/ECR VPC endpoints (NAT cost control)
  ecs-api/         Fargate service + ALB
  ecs-worker/      Fargate services (worker-fast, worker-render) + autoscaling on SQS depth
  sqs/             q_fast, q_render + DLQs
  s3/              buckets + lifecycle rules (tmp/ 1d, outputs/ 30d)
  rds/             PostgreSQL + RDS Proxy
  observability/   CloudWatch dashboard, alarms, log groups
envs/
  staging/
  prod/
```

State: S3 backend + DynamoDB lock. Deploys: GitHub Actions OIDC (no long-lived keys).
See `docs/DEPLOYMENT.md` Stage 4.
