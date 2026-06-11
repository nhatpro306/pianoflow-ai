"""HMAC token signing for the local storage backend's signed URLs.

The local backend cannot mint real cloud signed URLs, so the API itself
serves /internal/storage/{key} and verifies these tokens — same contract
the client sees with Supabase/S3, swappable per environment.
"""

import hashlib
import hmac
import time


def sign(secret: str, method: str, key: str, expires_ts: int, max_bytes: int = 0) -> str:
    message = f"{method}:{key}:{expires_ts}:{max_bytes}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify(
    secret: str, method: str, key: str, expires_ts: int, max_bytes: int, signature: str
) -> bool:
    if expires_ts < int(time.time()):
        return False
    expected = sign(secret, method, key, expires_ts, max_bytes)
    return hmac.compare_digest(expected, signature)
