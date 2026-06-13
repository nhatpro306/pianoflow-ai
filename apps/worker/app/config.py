"""Worker configuration."""

import re
from functools import lru_cache
from typing import Literal
from urllib.parse import quote

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# See apps/api/app/core/config.py for the rationale. Two safety nets for
# generated DB passwords with '/', '@', '+': encode a password already in
# DATABASE_URL, or inject DB_PASSWORD into a passwordless URL.
_PG_URL_RE = re.compile(
    r"^(?P<head>postgresql(?:\+\w+)?://[^:@/]+:)(?P<pw>.*)(?P<tail>@[^@/]+:\d+/[^/?]+)$"
)
_PG_NOPW_RE = re.compile(r"^(?P<scheme>postgresql(?:\+\w+)?://)(?P<user>[^:@/]+)@(?P<rest>.+)$")


def _encode_pg_password(url: str) -> str:
    match = _PG_URL_RE.match(url)
    if not match or not match.group("pw"):
        return url
    return match.group("head") + quote(match.group("pw"), safe="") + match.group("tail")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://pianoflow:pianoflow@localhost:5432/pianoflow"
    db_password: str = ""

    @field_validator("database_url")
    @classmethod
    def _encode_db_password(cls, value: str) -> str:
        return _encode_pg_password(value)

    @model_validator(mode="after")
    def _inject_db_password(self) -> "Settings":
        if self.db_password:
            match = _PG_NOPW_RE.match(self.database_url)
            if match:
                pw = quote(self.db_password, safe="")
                self.database_url = f"{match['scheme']}{match['user']}:{pw}@{match['rest']}"
        return self

    queue_backend: Literal["redis", "sqs"] = "redis"
    redis_url: str = "redis://localhost:6379/0"
    aws_region: str = "us-east-1"
    sqs_queue_default_url: str = ""
    sqs_queue_audio_url: str = ""
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
    s3_bucket_sources: str = "pianoflow-sources"
    s3_bucket_analysis: str = "pianoflow-analysis"
    s3_bucket_outputs: str = "pianoflow-outputs"
    api_base_url: str = "http://localhost:8000"
    # FluidR3_GM lands at this path in the worker image (video rendering).
    soundfont_path: str = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
    storage_signing_secret: str = "dev-only-not-a-secret"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
