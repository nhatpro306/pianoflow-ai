# Queue Diagnostic Report: Job Processing Stoppage

**Date**: 2026-10-04 (UTC 2026-10-03)  
**Investigation Target**: User job stuck in "Waiting in queue" (`status: queued`)  
**Auditor**: PianoFlow AI Auditor  

---

## 1. Executive Root Cause Summary

The job processing queue is currently **completely halted** because:
1. **Cloud Worker is Offline**: The AWS EC2 worker instance ([`i-03c7c318f3b425032`](https://ap-southeast-1.console.aws.amazon.com/ec2/home?region=ap-southeast-1#InstanceDetails:instanceId=i-03c7c318f3b425032) in `ap-southeast-1`) is in **`stopped`** state.
2. **No Local Worker is Running**: There are zero worker processes (`python` / `apps/worker/app/main.py`) running on the local host.
3. **Queue Backlog**: 3 tasks are currently backed up in AWS SQS (`pianoflow-v3-q-default`), matching 3 `queued` jobs in the Supabase production database.

---

## 2. Process & Port Inspection

| Component / Port | Target | Current Status | Notes |
|---|---|---|---|
| Port 3000 | Next.js Frontend | **Inactive** (No listening process) | Deployed on Vercel |
| Port 8000 | FastAPI API Server | **Inactive** (No listening process) | Deployed on AWS Lambda (`pianoflow-v3-api`) via API Gateway |
| Port 6379 | Local Redis | **Inactive** (No listening process) | Production uses AWS SQS |
| Local Python Workers | `apps/worker` | **0 processes running** | None active |
| Docker Daemon | Local Docker | **Not running** | - |

---

## 3. AWS Infrastructure Status

### EC2 Worker Instance (`ap-southeast-1`)
```
+----------------------+-----------+
|  InstanceId          | State     |
+----------------------+-----------+
|  i-03c7c318f3b425032 |  stopped  |
+----------------------+-----------+
```

### AWS SQS Message Backlog
- **Region**: `ap-southeast-1`
- **Queue**: `pianoflow-v3-q-default` (`https://sqs.ap-southeast-1.amazonaws.com/442383221213/pianoflow-v3-q-default`)
  - **Visible / Queued Messages**: `3`
  - **In-Flight Messages**: `0` (no consumers processing)
  - **Delayed Messages**: `0`
- **Queue**: `pianoflow-v3-q-audio`: `0`
- **Dead-Letter Queues (DLQ)**: `0` (no failed discarded messages)

---

## 4. Database Job Status (Supabase Production Database)

Querying `render_jobs` and `projects`:

### Latest Render Jobs
| Job ID | Job Type | Project ID | Status | Progress | Created At (UTC) | SQS Broker Msg ID |
|---|---|---|---|---|---|---|
| `2fbb7a05-2f83-4c5a-9f62-e963ec0ffd84` | `parse_midi` | `701a80d5-680c-4a57-befd-d5776e5aedf0` | **`queued`** | 0% | 2026-10-03 15:12:31 | `e8a27906-4550-4163-bd41-bfc8d467f00a` |
| `93b17531-ed01-46c5-b3ad-b8cd8c68a6b0` | `parse_midi` | `6dcc3e37-9e6b-4d2d-af3b-1d0f649b8066` | **`queued`** | 0% | 2026-10-03 15:11:40 | `0975362b-1f7e-4be9-89db-615f9587bc1e` |
| `d112c467-392c-4ba0-956e-8c5a272246d8` | `parse_midi` | `bc6929b1-63a9-4907-a50b-697ce27f8927` | **`queued`** | 0% | 2026-10-03 09:26:21 | `a048258d-06e4-4d1b-a1a6-3459df70323d` |
| `b1ccd983-5f50-4e79-b2cb-5a393974b4bf` | `render_video`| `4ce01be7-7d08-4c27-8172-5f8296e0cbda` | `processing` | 21% | 2026-10-03 02:11:36 | `a075ba0c-7449-4019-b8d5-9ee6b5fcf767` |
| `35557b8d-e6af-47f6-ac91-f8a9549a1ba5` | `render_sheet`| `4ce01be7-7d08-4c27-8172-5f8296e0cbda` | `completed` | 100% | 2026-10-03 02:11:20 | `ac7b0e0a-c0a4-42f2-8e35-e78e841869af` |

- **User Waiting On**: Job `2fbb7a05-2f83-4c5a-9f62-e963ec0ffd84` (and `93b17531-ed01-46c5-b3ad-b8cd8c68a6b0`) created at 15:11–15:12 UTC.
- **Duration in `queued`**: The latest job has been waiting in the queue without being touched because no worker consumer is running. Job `b1ccd983...` was frozen mid-way at 21% when the worker instance shut down at ~02:11 UTC.

---

## 5. Answers to Specific Diagnostic Questions

1. **Is there a Worker process active right now to consume the queue?**
   - **No.** Cloud EC2 instance `i-03c7c318f3b425032` is stopped, and no local worker process is running.
2. **Which queue is the job waiting in?**
   - **AWS SQS Queue**: `pianoflow-v3-q-default` (`https://sqs.ap-southeast-1.amazonaws.com/442383221213/pianoflow-v3-q-default`).
3. **Exact command to start the worker and process the waiting job immediately:**
   
   **Option A: Start Cloud EC2 Worker (Primary Production Fix)**
   ```powershell
   aws ec2 start-instances --region ap-southeast-1 --instance-ids i-03c7c318f3b425032
   ```

   **Option B: Start Local Worker pointing to SQS & Prod DB (Alternative / Debugging)**
   ```powershell
   $env:DATABASE_URL="postgresql+psycopg://postgres.kcznjjnhtajwumhvbasq:aVnV8U6XaNe56Red@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
   $env:QUEUE_BACKEND="sqs"
   $env:AWS_REGION="ap-southeast-1"
   $env:SQS_QUEUE_DEFAULT_URL="https://sqs.ap-southeast-1.amazonaws.com/442383221213/pianoflow-v3-q-default"
   $env:SQS_QUEUE_AUDIO_URL="https://sqs.ap-southeast-1.amazonaws.com/442383221213/pianoflow-v3-q-audio"
   $env:STORAGE_BACKEND="s3"
   $env:S3_BUCKET_SOURCES="pianoflow-v3-sources"
   $env:S3_BUCKET_ANALYSIS="pianoflow-v3-analysis"
   $env:S3_BUCKET_OUTPUTS="pianoflow-v3-outputs"
   uv run --directory apps/worker python -m app.main
   ```
