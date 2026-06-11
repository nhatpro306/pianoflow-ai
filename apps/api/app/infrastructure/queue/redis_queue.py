"""Redis QueueService adapter.

MVP uses Redis lists. `BLPOP` removes the item, so ack is a no-op and nack
requeues explicitly when requested.
"""

import json
import uuid

import redis

from app.infrastructure.queue.base import JobMessage, QueueError


class RedisQueueService:
    def __init__(self, redis_url: str) -> None:
        self._redis = redis.Redis.from_url(redis_url, decode_responses=True)

    def enqueue(self, queue_name: str, payload: dict) -> str:
        message_id = uuid.uuid4().hex
        body = {"message_id": message_id, **payload}
        try:
            self._redis.rpush(queue_name, json.dumps(body, separators=(",", ":")))
        except redis.RedisError as exc:
            raise QueueError("Failed to enqueue job.") from exc
        return message_id

    def receive(self, queue_name: str, visibility_timeout: int) -> JobMessage | None:
        try:
            item = self._redis.blpop([queue_name], timeout=visibility_timeout)
        except redis.RedisError as exc:
            raise QueueError("Failed to receive job.") from exc
        if item is None:
            return None
        _, raw = item
        body = json.loads(raw)
        return JobMessage(
            id=str(body.get("message_id") or uuid.uuid4().hex),
            queue_name=queue_name,
            body=body,
        )

    def ack(self, message: JobMessage) -> None:
        return None

    def nack(self, message: JobMessage, requeue: bool) -> None:
        if requeue:
            self.enqueue(message.queue_name, message.body)

    def depth(self, queue_name: str) -> int:
        try:
            return int(self._redis.llen(queue_name))
        except redis.RedisError as exc:
            raise QueueError("Failed to read queue depth.") from exc
