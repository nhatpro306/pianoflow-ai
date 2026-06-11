# PianoFlow AI — Cloud Scale Plan

## 1. MVP

```text
Vercel frontend
FastAPI on Render/Railway/Fly.io
Worker on Render/Railway/Fly.io
Supabase Auth/Postgres/Storage
Redis queue
```

## 2. AWS Production

```text
CloudFront
S3
ECS Fargate API
ECS Fargate workers
SQS
RDS PostgreSQL
CloudWatch
Secrets Manager
Terraform
```

## 3. Migration Without Rewrite

Use adapters:

```text
Storage: Local → Supabase → S3
Queue: Redis → SQS
Database: Supabase Postgres → RDS Postgres
Auth: Supabase Auth → Cognito/Auth0/custom later
```

## 4. Worker Scaling

Start:

```text
general-worker
```

Scale to:

```text
parse-worker
sheet-worker
video-worker
audio-worker
```

Queues:

```text
queue.parse
queue.sheet
queue.video
queue.audio
```

## 5. Cost Control

- max video length
- max resolution
- no 4K in MVP
- preview-only free video
- audio transcription paid
- storage lifecycle
- concurrency limits
- priority queue for paid plans

## 6. Observability

Log fields:

```text
request_id
user_id
project_id
job_id
job_type
duration_ms
error_type
status
queue_delay_ms
```

Metrics:

```text
uploads
completed jobs
failed jobs
render time
transcription time
queue backlog
storage usage
paid conversion
churn
```

## 7. Terraform Later

```text
infra/terraform/
  environments/dev
  environments/staging
  environments/prod
  modules/s3
  modules/ecs
  modules/sqs
  modules/rds
  modules/cloudfront
  modules/secrets
  modules/cloudwatch
```

## Audio Worker Scaling

Audio transcription should have a separate queue:

```text
queue.audio
```

And separate worker type:

```text
audio-worker
```

Reason:

- transcription is slower
- transcription is more expensive
- transcription should not block parse/sheet/video jobs
- transcription limits can be enforced separately
