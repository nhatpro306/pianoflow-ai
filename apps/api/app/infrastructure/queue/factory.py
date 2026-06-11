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
    raise NotImplementedError("QUEUE_BACKEND=sqs arrives in Phase 11")
