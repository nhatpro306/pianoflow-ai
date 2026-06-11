"""Worker configuration."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://pianoflow:pianoflow@localhost:5432/pianoflow"
    queue_backend: Literal["redis"] = "redis"
    redis_url: str = "redis://localhost:6379/0"
    # Comma-separated poll list. Local dev: one worker drains both queues.
    # Production audio-worker runs with QUEUE_NAMES=q_audio only.
    queue_names: str = "q_default,q_audio"

    @property
    def queue_name_list(self) -> list[str]:
        return [name.strip() for name in self.queue_names.split(",") if name.strip()]

    storage_backend: Literal["local", "supabase", "s3"] = "local"
    storage_local_root: str = "./data/storage"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket_sources: str = "pianoflow-sources"
    supabase_bucket_analysis: str = "pianoflow-analysis"
    supabase_bucket_outputs: str = "pianoflow-outputs"
    api_base_url: str = "http://localhost:8000"
    # FluidR3_GM lands at this path in the worker image (video rendering).
    soundfont_path: str = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
    storage_signing_secret: str = "dev-only-not-a-secret"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
