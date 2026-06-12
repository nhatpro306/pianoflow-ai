"""S3 StorageService adapter (Phase 11).

Three private buckets mirror the Supabase layout:
    .../uploads/... → sources bucket
    .../outputs/... → outputs bucket
    everything else → analysis bucket

Signed URLs use S3 presigned URLs (upload via PUT, download via GET).
"""

from datetime import UTC, datetime, timedelta

import boto3
from botocore.exceptions import ClientError

from app.infrastructure.storage.base import (
    ObjectNotFoundError,
    SignedUrl,
    StorageError,
    StoredObject,
)


class S3StorageService:
    def __init__(
        self,
        region: str = "us-east-1",
        bucket_sources: str = "pianoflow-sources",
        bucket_analysis: str = "pianoflow-analysis",
        bucket_outputs: str = "pianoflow-outputs",
    ) -> None:
        self._s3 = boto3.client("s3", region_name=region)
        self._buckets = {
            "sources": bucket_sources,
            "analysis": bucket_analysis,
            "outputs": bucket_outputs,
        }

    def _bucket_for(self, key: str) -> str:
        if "/uploads/" in key:
            return self._buckets["sources"]
        if "/outputs/" in key:
            return self._buckets["outputs"]
        return self._buckets["analysis"]

    def upload(self, key: str, data: bytes, content_type: str) -> StoredObject:
        try:
            self._s3.put_object(
                Bucket=self._bucket_for(key),
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except ClientError as exc:
            raise StorageError(f"S3 upload failed for {key!r}: {exc}") from exc
        return StoredObject(key=key, size_bytes=len(data))

    def download(self, key: str) -> bytes:
        try:
            resp = self._s3.get_object(Bucket=self._bucket_for(key), Key=key)
            return resp["Body"].read()
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "NoSuchKey":
                raise ObjectNotFoundError(key) from exc
            raise StorageError(f"S3 download failed for {key!r}: {exc}") from exc

    def exists(self, key: str) -> bool:
        try:
            self._s3.head_object(Bucket=self._bucket_for(key), Key=key)
            return True
        except ClientError as exc:
            if exc.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise StorageError(f"S3 exists-check failed for {key!r}: {exc}") from exc

    def delete(self, key: str) -> None:
        try:
            self._s3.delete_object(Bucket=self._bucket_for(key), Key=key)
        except ClientError as exc:
            raise StorageError(f"S3 delete failed for {key!r}: {exc}") from exc

    def delete_prefix(self, prefix: str) -> None:
        bucket = self._bucket_for(prefix)
        try:
            paginator = self._s3.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
            for page in pages:
                objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
                if objects:
                    self._s3.delete_objects(
                        Bucket=bucket, Delete={"Objects": objects, "Quiet": True}
                    )
        except ClientError as exc:
            raise StorageError(f"S3 delete_prefix failed for {prefix!r}: {exc}") from exc

    def size(self, key: str) -> int:
        try:
            resp = self._s3.head_object(Bucket=self._bucket_for(key), Key=key)
            return resp["ContentLength"]
        except ClientError as exc:
            if exc.response["Error"]["Code"] in ("404", "NoSuchKey"):
                raise ObjectNotFoundError(key) from exc
            raise StorageError(f"S3 size-check failed for {key!r}: {exc}") from exc

    def create_signed_upload_url(self, key: str, content_type: str, max_bytes: int) -> SignedUrl:
        try:
            url = self._s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket_for(key),
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,
            )
        except ClientError as exc:
            raise StorageError(f"S3 upload-sign failed for {key!r}: {exc}") from exc
        expires_at = (datetime.now(UTC) + timedelta(seconds=900)).isoformat()
        return SignedUrl(
            url=url,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=expires_at,
        )

    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl:
        try:
            url = self._s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket_for(key), "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] in ("404", "NoSuchKey"):
                raise ObjectNotFoundError(key) from exc
            raise StorageError(f"S3 download-sign failed for {key!r}: {exc}") from exc
        expires_at = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()
        return SignedUrl(
            url=url,
            method="GET",
            headers={},
            expires_at=expires_at,
        )
