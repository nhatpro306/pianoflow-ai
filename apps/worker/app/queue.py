"""Worker QueueService adapter."""

import json
import uuid
from contextlib import suppress
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

    def receive(
        self,
        queue_name: str | list[str],
        visibility_timeout: int = 900,
        wait_time_seconds: int | None = None,
    ) -> JobMessage | None:
        keys = [queue_name] if isinstance(queue_name, str) else list(queue_name)
        timeout = wait_time_seconds if wait_time_seconds is not None else 5
        try:
            item = self._redis.blpop(keys, timeout=timeout)
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

    def change_visibility(self, message: JobMessage, visibility_timeout: int = 900) -> None:
        return None

    def ack(self, message: JobMessage) -> None:
        return None

    def nack(self, message: JobMessage, requeue: bool) -> None:
        if not requeue:
            return
        try:
            self._redis.rpush(message.queue_name, json.dumps(message.body, separators=(",", ":")))
        except redis.RedisError as exc:
            raise QueueError("Failed to requeue message.") from exc


class SqsQueueService:
    """Worker-side SQS adapter. Supports multi-queue polling."""

    is_sqs = True

    def __init__(self, region: str = "us-east-1", queue_urls: dict[str, str] | None = None) -> None:
        import boto3

        self._sqs = boto3.client("sqs", region_name=region)
        self._url_cache: dict[str, str] = {
            queue_name: queue_url
            for queue_name, queue_url in (queue_urls or {}).items()
            if queue_url
        }

    def _queue_url(self, queue_name: str) -> str:
        if queue_name not in self._url_cache:
            try:
                resp = self._sqs.get_queue_url(QueueName=queue_name)
                self._url_cache[queue_name] = resp["QueueUrl"]
            except Exception as exc:
                raise QueueError(f"Cannot resolve SQS queue '{queue_name}'.") from exc
        return self._url_cache[queue_name]

    def receive(
        self,
        queue_name: str | list[str],
        visibility_timeout: int = 900,
        wait_time_seconds: int | None = None,
    ) -> JobMessage | None:
        keys = [queue_name] if isinstance(queue_name, str) else list(queue_name)
        if wait_time_seconds is not None:
            wait_time = wait_time_seconds
        elif len(keys) > 1:
            wait_time = 1
        else:
            wait_time = min(visibility_timeout, 5)

        for name in keys:
            try:
                resp = self._sqs.receive_message(
                    QueueUrl=self._queue_url(name),
                    MaxNumberOfMessages=1,
                    VisibilityTimeout=visibility_timeout,
                    WaitTimeSeconds=wait_time,
                )
            except Exception as exc:
                raise QueueError("Failed to receive from SQS.") from exc
            messages = resp.get("Messages", [])
            if messages:
                msg = messages[0]
                body = json.loads(msg["Body"])
                return JobMessage(
                    id=msg["ReceiptHandle"],
                    queue_name=name,
                    body=body,
                )
        return None

    def change_visibility(self, message: JobMessage, visibility_timeout: int = 900) -> None:
        try:
            self._sqs.change_message_visibility(
                QueueUrl=self._queue_url(message.queue_name),
                ReceiptHandle=message.id,
                VisibilityTimeout=visibility_timeout,
            )
        except Exception as exc:
            raise QueueError("Failed to change SQS message visibility.") from exc

    def ack(self, message: JobMessage) -> None:
        try:
            self._sqs.delete_message(
                QueueUrl=self._queue_url(message.queue_name),
                ReceiptHandle=message.id,
            )
        except Exception as exc:
            raise QueueError("Failed to ack SQS message.") from exc

    def nack(self, message: JobMessage, requeue: bool) -> None:
        # requeue: make the original message visible again immediately —
        # SQS redrive policy moves it to the DLQ after maxReceiveCount.
        # Re-sending a copy would double-process. No requeue: drop it.
        with suppress(Exception):
            if requeue:
                self._sqs.change_message_visibility(
                    QueueUrl=self._queue_url(message.queue_name),
                    ReceiptHandle=message.id,
                    VisibilityTimeout=0,
                )
            else:
                self._sqs.delete_message(
                    QueueUrl=self._queue_url(message.queue_name),
                    ReceiptHandle=message.id,
                )


def get_queue() -> RedisQueueService | SqsQueueService:
    settings = get_settings()
    if settings.queue_backend == "sqs":
        return SqsQueueService(
            region=settings.aws_region,
            queue_urls={
                "q_default": settings.sqs_queue_default_url,
                "q_audio": settings.sqs_queue_audio_url,
            },
        )
    return RedisQueueService(settings.redis_url)
