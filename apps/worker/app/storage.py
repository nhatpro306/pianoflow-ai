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


def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalStorageService(settings.storage_local_root)
    raise NotImplementedError("supabase/s3 storage adapters arrive in later phases")
