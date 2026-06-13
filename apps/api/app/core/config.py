"""Application configuration.

All settings come from environment variables (12-factor). The app refuses to
boot with invalid config: pydantic-settings validates at import of get_settings().
"""

import re
from functools import lru_cache
from typing import Literal
from urllib.parse import quote

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Matches a postgres URL and isolates the password. The trailing
# @host:port/db is fixed-shape (no '@' or '/' in host), so a greedy
# password group still anchors correctly even when the password itself
# contains '@' or '/'.
_PG_URL_RE = re.compile(
    r"^(?P<head>postgresql(?:\+\w+)?://[^:@/]+:)(?P<pw>.*)(?P<tail>@[^@/]+:\d+/[^/?]+)$"
)


def _encode_pg_password(url: str) -> str:
    """Percent-encode the password in a postgres URL.

    Supabase (and most providers) generate DB passwords containing '/', '@',
    '+', etc. Unencoded, those break SQLAlchemy/psycopg URL parsing — a stray
    '/' truncates the netloc and the port parses as '' → ValueError. Encoding
    the password component makes any generated password safe. Idempotent for
    passwords that need no encoding.
    """
    match = _PG_URL_RE.match(url)
    if not match or not match.group("pw"):
        return url
    return match.group("head") + quote(match.group("pw"), safe="") + match.group("tail")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "staging", "prod"] = "dev"
    log_level: str = "INFO"

    database_url: str = "postgresql+psycopg://pianoflow:pianoflow@localhost:5432/pianoflow"

    @field_validator("database_url")
    @classmethod
    def _encode_db_password(cls, value: str) -> str:
        return _encode_pg_password(value)

    queue_backend: Literal["memory", "redis", "sqs"] = "redis"
    redis_url: str = "redis://localhost:6379/0"
    aws_region: str = "us-east-1"
    sqs_queue_default_url: str = ""
    sqs_queue_audio_url: str = ""

    storage_backend: Literal["local", "supabase", "s3"] = "local"
    storage_local_root: str = "./data/storage"

    # Supabase storage (STORAGE_BACKEND=supabase). Service role key is
    # backend-only — never expose to the frontend.
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket_sources: str = "pianoflow-sources"
    supabase_bucket_analysis: str = "pianoflow-analysis"
    supabase_bucket_outputs: str = "pianoflow-outputs"

    s3_bucket_sources: str = "pianoflow-sources"
    s3_bucket_analysis: str = "pianoflow-analysis"
    s3_bucket_outputs: str = "pianoflow-outputs"

    auth_mode: Literal["dev", "supabase"] = "dev"
    supabase_jwt_secret: str = ""
    cors_allowed_origins: str = ""

    api_base_url: str = "http://localhost:8000"
    # Signs local-backend signed URLs only — never used in supabase/s3 modes.
    storage_signing_secret: str = "dev-only-not-a-secret"

    # Free-tier limits (RISKS.md §6) — config, never hardcoded at call sites.
    max_midi_bytes: int = 5 * 1024 * 1024
    max_song_seconds: int = 600
    max_notes_per_file: int = 50_000
    uploads_per_day: int = 10
    render_jobs_per_day: int = 15
    video_seconds_per_day: int = 1800
    concurrent_jobs_per_user: int = 3

    # Audio → MIDI Beta (docs 09 §11) — feature-flagged, draft-MIDI promise only.
    audio_transcription_enabled: bool = True
    max_audio_bytes: int = 50 * 1024 * 1024
    max_audio_seconds: int = 180
    transcriptions_per_day: int = 5
    audio_queue_name: str = "q_audio"


@lru_cache
def get_settings() -> Settings:
    return Settings()
