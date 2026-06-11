"""Worker QueueService adapter."""

import json
import uuid
from dataclasses import dataclass

import redis

from app.config import get_settings


@dataclass(frozen=True)
class JobMessage:
    id: str
    queue_name: str
    body: dict


class QueueError(Exception):
    pass


class RedisQueueService:
    def __init__(self, redis_url: str) -> None:
        self._redis = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=15)

    def receive(self, queue_name: str | list[str], visibility_timeout: int) -> JobMessage | None:
        keys = [queue_name] if isinstance(queue_name, str) else list(queue_name)
        try:
            item = self._redis.blpop(keys, timeout=visibility_timeout)
        except redis.RedisError as exc:
            raise QueueError("Failed to receive queue message.") from exc
        if item is None:
            return None
        key, raw = item
        body = json.loads(raw)
        return JobMessage(
            id=str(body.get("message_id") or uuid.uuid4().hex),
            queue_name=key,
            body=body,
        )

    def ack(self, message: JobMessage) -> None:
        return None

    def nack(self, message: JobMessage, requeue: bool) -> None:
        if not requeue:
            return
        try:
            self._redis.rpush(message.queue_name, json.dumps(message.body, separators=(",", ":")))
        except redis.RedisError as exc:
            raise QueueError("Failed to requeue message.") from exc


def get_queue() -> RedisQueueService:
    settings = get_settings()
    return RedisQueueService(settings.redis_url)
