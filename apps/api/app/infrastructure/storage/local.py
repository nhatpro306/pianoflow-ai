"""Local-filesystem StorageService for development and tests.

Objects live under a root directory; signed URLs point at the API's
/internal/storage routes with HMAC tokens (signing.py). Keys are always
server-generated and forward-slash separated; resolution is confined to
the root (defense against traversal even though keys are never user input).
"""

import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.infrastructure.storage.base import (
    ObjectNotFoundError,
    SignedUrl,
    StorageError,
    StoredObject,
)
from app.infrastructure.storage.signing import sign


class LocalStorageService:
    def __init__(self, root: str, base_url: str, secret: str) -> None:
        self.root = Path(root).resolve()
        self.base_url = base_url.rstrip("/")
        self.secret = secret
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise StorageError(f"Key escapes storage root: {key!r}")
        return path

    def upload(self, key: str, data: bytes, content_type: str) -> StoredObject:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return StoredObject(key=key, size_bytes=len(data))

    def download(self, key: str) -> bytes:
        path = self._path(key)
        if not path.is_file():
            raise ObjectNotFoundError(key)
        return path.read_bytes()

    def exists(self, key: str) -> bool:
        return self._path(key).is_file()

    def delete(self, key: str) -> None:
        path = self._path(key)
        if path.is_file():
            path.unlink()

    def delete_prefix(self, prefix: str) -> None:
        path = self._path(prefix)
        if path.is_dir():
            shutil.rmtree(path)

    def size(self, key: str) -> int:
        path = self._path(key)
        if not path.is_file():
            raise ObjectNotFoundError(key)
        return path.stat().st_size

    def _signed(self, method: str, key: str, expires_in: int, max_bytes: int) -> SignedUrl:
        expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)
        expires_ts = int(expires_at.timestamp())
        signature = sign(self.secret, method, key, expires_ts, max_bytes)
        url = (
            f"{self.base_url}/internal/storage/{key}"
            f"?exp={expires_ts}&max={max_bytes}&sig={signature}"
        )
        return SignedUrl(
            url=url,
            method=method,
            headers={},
            expires_at=expires_at.isoformat(),
        )

    def create_signed_upload_url(self, key: str, content_type: str, max_bytes: int) -> SignedUrl:
        signed = self._signed("PUT", key, expires_in=900, max_bytes=max_bytes)
        return SignedUrl(
            url=signed.url,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_at=signed.expires_at,
        )

    def create_signed_download_url(self, key: str, expires_in: int = 3600) -> SignedUrl:
        return self._signed("GET", key, expires_in=expires_in, max_bytes=0)
