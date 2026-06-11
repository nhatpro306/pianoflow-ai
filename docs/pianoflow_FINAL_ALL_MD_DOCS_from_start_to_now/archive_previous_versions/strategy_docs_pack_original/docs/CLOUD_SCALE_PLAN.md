# PianoFlow AI — Cloud Scale Plan

## 1. Goal

Build the MVP cheaply, but design the system so it can migrate to AWS production without rewriting app logic.

## 2. MVP Architecture

```text
Vercel
  → Next.js frontend

Render/Railway/Fly.io
  → FastAPI API
  → Worker

Supabase
  → Postgres
  → Auth
  → Storage

Redis
  → job queue
```

## 3. Production AWS Architecture

```text
CloudFront
  → frontend static assets or Vercel frontend

ALB / API Gateway
  → ECS Fargate API service

SQS
  → ECS Fargate worker services

S3
  → source files
  → notes JSON
  → output MP4/PDF/MIDI/MusicXML

RDS PostgreSQL
  → metadata

CloudWatch
  → logs, metrics, alarms

Secrets Manager
  → secrets
```

## 4. Adapter-Based Migration

### 4.1 Storage

```text
LocalStorageAdapter
→ SupabaseStorageAdapter
→ S3StorageAdapter
```

App code uses:

```text
StorageService
```

Not direct S3/Supabase calls.

### 4.2 Queue

```text
RedisQueueAdapter
→ SQSQueueAdapter
```

App code uses:

```text
QueueService
```

### 4.3 Database

```text
Supabase Postgres
→ RDS PostgreSQL
```

Keep SQL standard and migrations portable.

### 4.4 Auth

```text
Supabase Auth
→ Auth0/Cognito/custom JWT later
```

Auth should be isolated behind auth middleware/service.

## 5. Worker Scaling

Start with:

```text
one general worker
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

This prevents video rendering from blocking quick parse/sheet jobs.

## 6. Job System

Job statuses:

```text
queued
processing
completed
failed
cancelled
```

Job payload:

```json
{
  "job_id": "uuid",
  "project_id": "uuid"
}
```

Full details are loaded from DB.

## 7. Cost Controls

### 7.1 Render Limits

MVP:

```text
max 1080p
fixed 30 fps
max 10 min
no 4K
```

Free plan:

```text
30 sec preview
watermark
limited projects
```

### 7.2 Concurrency Limits

Use:

- max active jobs per user
- max daily render minutes
- max concurrent workers
- priority queue for paid users

### 7.3 Lifecycle Rules

```text
temporary files: delete after 1 day
failed job outputs: delete after 7 days
free outputs: delete after 14-30 days
paid outputs: retain longer
```

## 8. Observability

Structured logs must include:

```text
request_id
user_id
project_id
job_id
job_type
duration_ms
error_type
status
```

Metrics:

```text
total uploads
total jobs
completed jobs
failed jobs
average render time
queue delay
storage usage
active users
paid conversion
```

Alarms:

```text
API 5xx rate high
worker failures high
queue delay high
storage upload failures
database connection failures
monthly cost threshold
```

## 9. CI/CD

GitHub Actions should run:

- frontend lint
- frontend type check
- frontend build
- backend tests
- worker tests
- music-core tests
- Docker build
- migration check later

Deployment stages:

```text
dev
staging
production
```

Production deploy should require approval.

## 10. Terraform Plan

Folder structure:

```text
infra/terraform/
  environments/
    dev/
    staging/
    prod/
  modules/
    s3/
    ecs/
    sqs/
    rds/
    cloudfront/
    iam/
    cloudwatch/
    secrets/
```

Do not write Terraform before MVP skeleton is stable.

## 11. Migration Roadmap

### Stage 1 — Local

```text
Docker Compose
Postgres
Redis
Local storage
```

### Stage 2 — Public MVP

```text
Vercel
Render/Railway
Supabase
Redis
```

### Stage 3 — AWS Hybrid

```text
Vercel frontend
ECS API
ECS worker
SQS
S3
Supabase or RDS
```

### Stage 4 — Full AWS

```text
CloudFront
S3
ECS Fargate
SQS
RDS
CloudWatch
Secrets Manager
Terraform
```

## 12. Key Rule

Cloud migration should change:

```text
environment variables
adapters
infrastructure
```

It should not rewrite:

```text
business logic
music-core
API contracts
job contracts
frontend flow
```
