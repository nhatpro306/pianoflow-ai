"""Re-enqueue render_jobs rows that are stuck in 'queued' status.

Jobs created under the old Render/Redis setup have status='queued' in Supabase
Postgres but no corresponding broker message (Redis messages were lost on
Render's non-persistent Key Value). On AWS the worker reads SQS, so these jobs
will never be consumed without this script.

Usage:
    export DATABASE_URL=...
    export SQS_QUEUE_DEFAULT_URL=...
    export SQS_QUEUE_AUDIO_URL=...
    export AWS_REGION=us-east-1   # optional, defaults to us-east-1

    uv run --directory apps/api python ../../infra/aws/requeue_stuck_jobs.py --dry-run
    uv run --directory apps/api python ../../infra/aws/requeue_stuck_jobs.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import UTC, datetime


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"ERROR: environment variable {name!r} is not set.", file=sys.stderr)
        sys.exit(1)
    return value


def _build_payload(row: dict) -> dict:
    """Build the SQS message body matching the shape produced by
    apps/api/app/domains/jobs/service.py enqueue calls."""
    return {
        "message_id": uuid.uuid4().hex,
        "job_id": str(row["id"]),
        "job_type": row["job_type"],
        "project_id": str(row["project_id"]),
        "user_id": str(row["user_id"]),
        "attempt": (row["attempt"] or 0) + 1,
        "settings_version": row["settings_version"],
        "queue_name": row["queue_name"],
        "created_at": datetime.now(UTC).isoformat(),
        "trace_id": None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Re-enqueue stuck 'queued' render_jobs rows into SQS."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be sent without sending anything.",
    )
    args = parser.parse_args()

    database_url = _require_env("DATABASE_URL")
    sqs_default_url = _require_env("SQS_QUEUE_DEFAULT_URL")
    sqs_audio_url = _require_env("SQS_QUEUE_AUDIO_URL")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")

    # Lazy import so that missing deps produce a clear error rather than an
    # import-time crash when the script is merely syntax-checked.
    try:
        import boto3
        from sqlalchemy import create_engine, text
    except ImportError as exc:
        print(f"ERROR: missing dependency — {exc}", file=sys.stderr)
        print(
            "Run inside 'uv run --directory apps/api' so the api venv is active.",
            file=sys.stderr,
        )
        sys.exit(1)

    engine = create_engine(database_url)

    query = text(
        """
        SELECT id, project_id, user_id, job_type, attempt,
               settings_version, queue_name
        FROM render_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        """
    )

    with engine.connect() as conn:
        rows = conn.execute(query).mappings().all()

    if not rows:
        print("No stuck jobs found. Nothing to do.")
        return

    print(f"Found {len(rows)} stuck job(s) with status='queued'.")

    if args.dry_run:
        print("\n[DRY RUN] Would send the following SQS messages:\n")

    sqs_client = boto3.client("sqs", region_name=aws_region)

    sent = 0
    errors = 0
    for row in rows:
        row_dict = dict(row)
        payload = _build_payload(row_dict)
        queue_url = (
            sqs_audio_url
            if row_dict["job_type"] == "transcribe_audio"
            else sqs_default_url
        )

        if args.dry_run:
            print(
                f"  job_id={payload['job_id']}  job_type={payload['job_type']}"
                f"  queue={payload['queue_name']}"
            )
            print(f"  -> {queue_url}")
            print(f"  payload: {json.dumps(payload, indent=4)}\n")
            sent += 1
            continue

        try:
            sqs_client.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps(payload),
            )
            print(
                f"  Enqueued job_id={payload['job_id']} job_type={payload['job_type']}"
            )
            sent += 1
        except Exception as exc:
            print(
                f"  ERROR sending job_id={payload['job_id']}: {exc}",
                file=sys.stderr,
            )
            errors += 1

    action = "Would send" if args.dry_run else "Sent"
    print(f"\nSummary: {action} {sent} message(s).", end="")
    if errors:
        print(f" {errors} error(s).", file=sys.stderr)
        sys.exit(1)
    else:
        print()


if __name__ == "__main__":
    main()
