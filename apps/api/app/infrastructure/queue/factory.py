"""QueueService factory."""

from functools import lru_cache

from app.core.config import get_settings
from app.infrastructure.queue.base import QueueService
from app.infrastructure.queue.memory import MemoryQueueService
from app.infrastructure.queue.redis_queue import RedisQueueService


@lru_cache
def get_queue() -> QueueService:
    settings = get_settings()
    if settings.queue_backend == "memory":
        return MemoryQueueService()
    if settings.queue_backend == "redis":
        return RedisQueueService(settings.redis_url)
    if settings.queue_backend == "sqs":
        from app.infrastructure.queue.sqs_queue import SqsQueueService

        return SqsQueueService(
            region=settings.aws_region,
            queue_urls={
                "q_default": settings.sqs_queue_default_url,
                settings.audio_queue_name: settings.sqs_queue_audio_url,
            },
        )
    raise NotImplementedError(f"Unknown QUEUE_BACKEND={settings.queue_backend!r}")
