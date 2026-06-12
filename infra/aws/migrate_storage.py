"""One-shot Supabase Storage → S3 migration (Stage 2 → Stage 3).

Copies every object from the three Supabase buckets to the matching S3
buckets. Idempotent: objects already in S3 with the same size are skipped.
The database stays on Supabase — only storage objects move.

Usage:
    export SUPABASE_URL=https://PROJECT.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=...
    # AWS credentials via env/profile/IAM as usual
    uv run --directory apps/api python ../../infra/aws/migrate_storage.py \
        --region us-east-1 [--dry-run]
"""

import argparse
import os
import sys

import boto3
import httpx

BUCKET_MAP = {
    "pianoflow-sources": "pianoflow-sources",
    "pianoflow-analysis": "pianoflow-analysis",
    "pianoflow-outputs": "pianoflow-outputs",
}
PAGE_SIZE = 100


def list_objects(client: httpx.Client, base: str, bucket: str) -> list[dict]:
    """Page through a Supabase bucket; returns [{name, size}]."""
    objects: list[dict] = []
    offset = 0
    while True:
        resp = client.post(
            f"{base}/object/list/{bucket}",
            json={
                "prefix": "",
                "limit": PAGE_SIZE,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        resp.raise_for_status()
        page = resp.json()
        for item in page:
            name = item.get("name")
            if not name:
                continue
            # Folders come back without metadata; files have metadata.size.
            meta = item.get("metadata") or {}
            if "size" in meta:
                objects.append({"name": name, "size": meta["size"]})
        if len(page) < PAGE_SIZE:
            return objects
        offset += PAGE_SIZE


def s3_size(s3, bucket: str, key: str) -> int | None:
    try:
        return s3.head_object(Bucket=bucket, Key=key)["ContentLength"]
    except s3.exceptions.ClientError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", file=sys.stderr)
        return 1

    base = supabase_url.rstrip("/") + "/storage/v1"
    client = httpx.Client(
        timeout=120.0,
        headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
    )
    s3 = boto3.client("s3", region_name=args.region)

    copied = skipped = failed = 0
    for sb_bucket, s3_bucket in BUCKET_MAP.items():
        print(f"\n== {sb_bucket} → {s3_bucket}")
        try:
            objects = list_objects(client, base, sb_bucket)
        except httpx.HTTPError as exc:
            print(f"  list failed: {exc}", file=sys.stderr)
            failed += 1
            continue
        print(f"  {len(objects)} objects")

        for obj in objects:
            key, size = obj["name"], obj["size"]
            if s3_size(s3, s3_bucket, key) == size:
                skipped += 1
                continue
            if args.dry_run:
                print(f"  would copy {key} ({size}B)")
                copied += 1
                continue
            resp = client.get(f"{base}/object/{sb_bucket}/{key}")
            if resp.status_code != 200:
                print(f"  download failed ({resp.status_code}): {key}", file=sys.stderr)
                failed += 1
                continue
            s3.put_object(
                Bucket=s3_bucket,
                Key=key,
                Body=resp.content,
                ContentType=resp.headers.get("content-type", "application/octet-stream"),
            )
            copied += 1
            print(f"  copied {key} ({size}B)")

    print(f"\nDone. copied={copied} skipped={skipped} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
