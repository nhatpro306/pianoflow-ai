"""StorageService port (CODE_ARCHITECTURE.md §5).

Domain code depends on this protocol only. Implementations: local (dev),
supabase (Stage 2), s3 (Stage 3+).
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class StoredObject:
    key: str
    size_bytes: int


@dataclass(frozen=True)
class SignedUrl:
    url: str
    method: str
    headers: dict[str, str]
    expires_at: str  # ISO-8601


class StorageError(Exception):
    """Adapter-boundary error — vendor exceptions never cross it."""


class ObjectNotFoundError(StorageError):
    pass


class StorageService(Protocol):
    def upload(self, key: str, data: bytes, content_type: str) -> StoredObject: ...

    def download(self, key: str) -> bytes: ...

    def exists(self, key: str) -> bool: ...

    def delete(self, key: str) -> None: ...

    def delete_prefix(self, prefix: str) -> None: ...

    def size(self, key: str) -> int: ...

    def create_signed_upload_url(
        self, key: str, content_type: str, max_bytes: int
    ) -> SignedUrl: ...

    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl: ...
