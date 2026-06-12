"""SQS QueueService adapter (Phase 11).

Uses standard SQS queues. Queue names map to SQS queue URLs resolved once
at construction. Visibility timeout on receive lets the worker claim a
message; ack deletes it, nack optionally requeues.
"""

import json
import uuid
from contextlib import suppress

import boto3

from app.infrastructure.queue.base import JobMessage, QueueError


class SqsQueueService:
    def __init__(self, region: str = "us-east-1", queue_urls: dict[str, str] | None = None) -> None:
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

    def enqueue(self, queue_name: str, payload: dict) -> str:
        message_id = uuid.uuid4().hex
        body = {"message_id": message_id, **payload}
        try:
            resp = self._sqs.send_message(
                QueueUrl=self._queue_url(queue_name),
                MessageBody=json.dumps(body, separators=(",", ":")),
            )
        except Exception as exc:
            raise QueueError("Failed to enqueue job to SQS.") from exc
        return resp.get("MessageId", message_id)

    def receive(self, queue_name: str, visibility_timeout: int) -> JobMessage | None:
        try:
            resp = self._sqs.receive_message(
                QueueUrl=self._queue_url(queue_name),
                MaxNumberOfMessages=1,
                VisibilityTimeout=visibility_timeout,
                WaitTimeSeconds=min(visibility_timeout, 20),
            )
        except Exception as exc:
            raise QueueError("Failed to receive from SQS.") from exc
        messages = resp.get("Messages", [])
        if not messages:
            return None
        msg = messages[0]
        body = json.loads(msg["Body"])
        return JobMessage(
            id=msg["ReceiptHandle"],
            queue_name=queue_name,
            body=body,
        )

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

    def depth(self, queue_name: str) -> int:
        try:
            resp = self._sqs.get_queue_attributes(
                QueueUrl=self._queue_url(queue_name),
                AttributeNames=["ApproximateNumberOfMessages"],
            )
            return int(resp["Attributes"]["ApproximateNumberOfMessages"])
        except Exception as exc:
            raise QueueError("Failed to read SQS queue depth.") from exc
