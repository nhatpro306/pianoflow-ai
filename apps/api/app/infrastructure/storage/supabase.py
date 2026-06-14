"""Supabase Storage adapter (production).

Talks to the Supabase Storage REST API with the service role key — backend
only, never shipped to the frontend. Buckets are private; clients get
short-lived signed URLs minted here. Keys route to one of three private
buckets by path segment (infra/supabase/migrations/0001_storage_buckets.sql):

    .../uploads/...  → sources bucket
    .../outputs/...  → outputs bucket
    everything else  → analysis bucket
"""

from datetime import UTC, datetime, timedelta

import httpx

from app.infrastructure.storage.base import (
    ObjectNotFoundError,
    SignedUrl,
    StorageError,
    StoredObject,
)

_TIMEOUT = 30.0
_UPLOAD_SIGN_EXPIRES = 900  # Supabase upload tokens are fixed-TTL (~2h); ours is advisory


class SupabaseStorageService:
    def __init__(
        self,
        url: str,
        service_role_key: str,
        bucket_sources: str = "pianoflow-sources",
        bucket_analysis: str = "pianoflow-analysis",
        bucket_outputs: str = "pianoflow-outputs",
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not url or not service_role_key:
            raise StorageError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
        self._base = url.rstrip("/") + "/storage/v1"
        self._buckets = {
            "sources": bucket_sources,
            "analysis": bucket_analysis,
            "outputs": bucket_outputs,
        }
        self._client = httpx.Client(
            timeout=_TIMEOUT,
            transport=transport,
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
            },
        )

    def _bucket_for(self, key: str) -> str:
        if "/uploads/" in key:
            return self._buckets["sources"]
        if "/outputs/" in key:
            return self._buckets["outputs"]
        return self._buckets["analysis"]

    def _object_url(self, key: str) -> str:
        return f"{self._base}/object/{self._bucket_for(key)}/{key}"

    def upload(self, key: str, data: bytes, content_type: str) -> StoredObject:
        response = self._client.post(
            self._object_url(key),
            content=data,
            headers={"Content-Type": content_type, "x-upsert": "true"},
        )
        if response.status_code >= 400:
            raise StorageError(f"Supabase upload failed ({response.status_code}) for {key!r}.")
        return StoredObject(key=key, size_bytes=len(data))

    def download(self, key: str) -> bytes:
        response = self._client.get(self._object_url(key))
        if response.status_code == 404:
            raise ObjectNotFoundError(key)
        if response.status_code >= 400:
            raise StorageError(f"Supabase download failed ({response.status_code}) for {key!r}.")
        return response.content

    def exists(self, key: str) -> bool:
        response = self._client.head(self._object_url(key))
        if response.status_code == 200:
            return True
        if response.status_code in (400, 404):
            return False
        raise StorageError(f"Supabase exists-check failed ({response.status_code}) for {key!r}.")

    def size(self, key: str) -> int:
        response = self._client.head(self._object_url(key))
        if response.status_code == 404:
            raise ObjectNotFoundError(key)
        if response.status_code >= 400:
            raise StorageError(f"Supabase size-check failed ({response.status_code}) for {key!r}.")
        return int(response.headers.get("Content-Length", 0))

    def delete(self, key: str) -> None:
        response = self._client.delete(self._object_url(key))
        if response.status_code >= 400 and response.status_code != 404:
            raise StorageError(f"Supabase delete failed ({response.status_code}) for {key!r}.")

    def delete_prefix(self, prefix: str) -> None:
        bucket = self._bucket_for(prefix)
        listing = self._client.post(
            f"{self._base}/object/list/{bucket}",
            json={"prefix": prefix, "limit": 1000},
        )
        if listing.status_code >= 400:
            raise StorageError(f"Supabase list failed ({listing.status_code}) for {prefix!r}.")
        names = [item["name"] for item in listing.json() if item.get("name")]
        if not names:
            return
        response = self._client.request(
            "DELETE", f"{self._base}/object/{bucket}", json={"prefixes": names}
        )
        if response.status_code >= 400:
            raise StorageError(
                f"Supabase batch delete failed ({response.status_code}) for {prefix!r}."
            )

    def create_signed_upload_url(self, key: str, content_type: str, max_bytes: int) -> SignedUrl:
        bucket = self._bucket_for(key)
        response = self._client.post(
            f"{self._base}/object/upload/sign/{bucket}/{key}",
            headers={"x-upsert": "true"},
        )
        if response.status_code >= 400:
            raise StorageError(
                f"Supabase upload-sign failed ({response.status_code}): {response.text[:300]}"
            )
        signed_path = response.json()["url"].lstrip("/")
        expires_at = (datetime.now(UTC) + timedelta(seconds=_UPLOAD_SIGN_EXPIRES)).isoformat()
        return SignedUrl(
            url=f"{self._base}/{signed_path}",
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=expires_at,
        )

    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl:
        bucket = self._bucket_for(key)
        response = self._client.post(
            f"{self._base}/object/sign/{bucket}/{key}",
            json={"expiresIn": expires_in},
        )
        if response.status_code == 404:
            raise ObjectNotFoundError(key)
        if response.status_code >= 400:
            raise StorageError(f"Supabase download-sign failed ({response.status_code}).")
        signed_path = response.json()["signedURL"].lstrip("/")
        expires_at = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()
        return SignedUrl(
            url=f"{self._base}/{signed_path}",
            method="GET",
            headers={},
            expires_at=expires_at,
        )
