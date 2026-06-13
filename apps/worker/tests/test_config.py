"""Worker Settings strips a leading BOM (U+FEFF) and whitespace from string env values."""


class TestBomStripping:
    def test_supabase_url_bom_stripped(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "﻿https://x.supabase.co  ")
        from app.config import Settings, get_settings

        get_settings.cache_clear()
        s = Settings()
        assert s.supabase_url == "https://x.supabase.co"

    def test_supabase_service_role_key_bom_stripped(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "﻿my-secret-key  ")
        from app.config import Settings, get_settings

        get_settings.cache_clear()
        s = Settings()
        assert s.supabase_service_role_key == "my-secret-key"

    def test_redis_url_bom_stripped(self, monkeypatch):
        monkeypatch.setenv("REDIS_URL", "﻿  redis://redis.example.com:6379/0")
        from app.config import Settings, get_settings

        get_settings.cache_clear()
        s = Settings()
        assert s.redis_url == "redis://redis.example.com:6379/0"

    def test_api_base_url_bom_stripped(self, monkeypatch):
        monkeypatch.setenv("API_BASE_URL", "﻿https://api.pianoflow.ai  ")
        from app.config import Settings, get_settings

        get_settings.cache_clear()
        s = Settings()
        assert s.api_base_url == "https://api.pianoflow.ai"

    def test_plain_value_unchanged(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "https://clean.supabase.co")
        from app.config import Settings, get_settings

        get_settings.cache_clear()
        s = Settings()
        assert s.supabase_url == "https://clean.supabase.co"
