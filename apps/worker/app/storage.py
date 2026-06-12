"""Worker storage adapter subset."""

from pathlib import Path
from typing import Protocol

from app.config import get_settings


class StorageError(Exception):
    pass


class ObjectNotFoundError(StorageError):
    pass


class StorageService(Protocol):
    def upload(self, key: str, data: bytes, content_type: str) -> None: ...

    def download(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...


class LocalStorageService:
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise StorageError(f"Key escapes storage root: {key!r}")
        return path

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def download(self, key: str) -> bytes:
        path = self._path(key)
        if not path.is_file():
            raise ObjectNotFoundError(key)
        return path.read_bytes()

    def delete(self, key: str) -> None:
        path = self._path(key)
        if not path.is_file():
            raise ObjectNotFoundError(key)
        path.unlink()


class SupabaseStorageService:
    """Worker subset of the Supabase Storage REST adapter (upload/download).

    Same key→bucket routing as the API adapter: uploads → sources,
    outputs → outputs, everything else → analysis.
    """

    def __init__(
        self,
        url: str,
        service_role_key: str,
        bucket_sources: str,
        bucket_analysis: str,
        bucket_outputs: str,
    ) -> None:
        import httpx

        if not url or not service_role_key:
            raise StorageError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
        self._base = url.rstrip("/") + "/storage/v1"
        self._buckets = (bucket_sources, bucket_analysis, bucket_outputs)
        self._client = httpx.Client(
            timeout=60.0,
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
            },
        )

    def _object_url(self, key: str) -> str:
        sources, analysis, outputs = self._buckets
        if "/uploads/" in key:
            bucket = sources
        elif "/outputs/" in key:
            bucket = outputs
        else:
            bucket = analysis
        return f"{self._base}/object/{bucket}/{key}"

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        response = self._client.post(
            self._object_url(key),
            content=data,
            headers={"Content-Type": content_type, "x-upsert": "true"},
        )
        if response.status_code >= 400:
            raise StorageError(f"Supabase upload failed ({response.status_code}) for {key!r}.")

    def download(self, key: str) -> bytes:
        response = self._client.get(self._object_url(key))
        if response.status_code == 404:
            raise ObjectNotFoundError(key)
        if response.status_code >= 400:
            raise StorageError(f"Supabase download failed ({response.status_code}) for {key!r}.")
        return response.content

    def delete(self, key: str) -> None:
        response = self._client.delete(self._object_url(key))
        if response.status_code == 404:
            raise ObjectNotFoundError(key)
        if response.status_code >= 400:
            raise StorageError(f"Supabase delete failed ({response.status_code}) for {key!r}.")


def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalStorageService(settings.storage_local_root)
    if settings.storage_backend == "supabase":
        return SupabaseStorageService(
            url=settings.supabase_url,
            service_role_key=settings.supabase_service_role_key,
            bucket_sources=settings.supabase_bucket_sources,
            bucket_analysis=settings.supabase_bucket_analysis,
            bucket_outputs=settings.supabase_bucket_outputs,
        )
    raise NotImplementedError("s3 storage adapter arrives with the AWS stage")
