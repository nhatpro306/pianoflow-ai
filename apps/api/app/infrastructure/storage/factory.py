"""Storage backend selection (composition root helper).

STORAGE_BACKEND=local|supabase|s3 — supabase/s3 adapters arrive in
Phases 10/11; the factory raises clearly until then.
"""

from functools import lru_cache

from app.core.config import get_settings
from app.infrastructure.storage.base import StorageService
from app.infrastructure.storage.local import LocalStorageService


@lru_cache
def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalStorageService(
            root=settings.storage_local_root,
            base_url=settings.api_base_url,
            secret=settings.storage_signing_secret,
        )
    raise NotImplementedError(
        f"Storage backend {settings.storage_backend!r} not implemented yet "
        "(supabase: Phase 10, s3: Phase 11)"
    )
