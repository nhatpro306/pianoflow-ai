"""QueueService port (CODE_ARCHITECTURE.md section 5)."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class JobMessage:
    id: str
    queue_name: str
    body: dict


class QueueError(Exception):
    """Adapter-boundary error; broker exceptions never cross it."""


class QueueService(Protocol):
    def enqueue(self, queue_name: str, payload: dict) -> str: ...

    def receive(self, queue_name: str, visibility_timeout: int) -> JobMessage | None: ...

    def ack(self, message: JobMessage) -> None: ...

    def nack(self, message: JobMessage, requeue: bool) -> None: ...

    def depth(self, queue_name: str) -> int: ...
