"""Storage backend selection (composition root helper).

STORAGE_BACKEND=local|supabase|s3 — s3 adapter arrives with the AWS stage;
the factory raises clearly until then.
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
    if settings.storage_backend == "supabase":
        from app.infrastructure.storage.supabase import SupabaseStorageService

        return SupabaseStorageService(
            url=settings.supabase_url,
            service_role_key=settings.supabase_service_role_key,
            bucket_sources=settings.supabase_bucket_sources,
            bucket_analysis=settings.supabase_bucket_analysis,
            bucket_outputs=settings.supabase_bucket_outputs,
        )
    raise NotImplementedError(
        f"Storage backend {settings.storage_backend!r} not implemented yet (s3: AWS stage)"
    )
