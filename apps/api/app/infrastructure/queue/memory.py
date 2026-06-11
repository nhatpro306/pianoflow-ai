"""In-process QueueService fake for API tests."""

import uuid
from collections import defaultdict, deque

from app.infrastructure.queue.base import JobMessage


class MemoryQueueService:
    def __init__(self) -> None:
        self._queues: dict[str, deque[JobMessage]] = defaultdict(deque)

    def enqueue(self, queue_name: str, payload: dict) -> str:
        message_id = uuid.uuid4().hex
        self._queues[queue_name].append(
            JobMessage(id=message_id, queue_name=queue_name, body=dict(payload))
        )
        return message_id

    def receive(self, queue_name: str, visibility_timeout: int) -> JobMessage | None:
        if not self._queues[queue_name]:
            return None
        return self._queues[queue_name].popleft()

    def ack(self, message: JobMessage) -> None:
        return None

    def nack(self, message: JobMessage, requeue: bool) -> None:
        if requeue:
            self._queues[message.queue_name].append(message)

    def depth(self, queue_name: str) -> int:
        return len(self._queues[queue_name])
