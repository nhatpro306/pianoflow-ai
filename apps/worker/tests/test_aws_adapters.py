"""Contract tests for the worker-side AWS adapters (SQS + S3).

botocore Stubber — no real AWS calls. Mirrors the API-side suite but
covers the worker-specific behaviors: multi-queue polling and the
upload/download storage subset.
"""

import json

import boto3
import pytest
from botocore.stub import Stubber

from app.queue import JobMessage, SqsQueueService
from app.storage import ObjectNotFoundError, S3StorageService

DEFAULT_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/q_default"
AUDIO_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/q_audio"


def _stubbed_sqs(queue_urls: dict[str, str] | None = None):
    service = SqsQueueService(region="us-east-1", queue_urls=queue_urls)
    service._sqs = boto3.client(
        "sqs",
        region_name="us-east-1",
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
    )
    return service, Stubber(service._sqs)


def _stubbed_s3():
    service = S3StorageService(
        region="us-east-1",
        bucket_sources="pf-sources",
        bucket_analysis="pf-analysis",
        bucket_outputs="pf-outputs",
    )
    service._s3 = boto3.client(
        "s3",
        region_name="us-east-1",
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
    )
    return service, Stubber(service._s3)


class TestWorkerSqs:
    def test_receive_polls_queues_in_order(self):
        """First queue empty → falls through to the second."""
        service, stubber = _stubbed_sqs({"q_default": DEFAULT_URL, "q_audio": AUDIO_URL})
        body = json.dumps({"message_id": "m-1", "job_id": "j-1"})
        stubber.add_response(
            "receive_message",
            {},
            {
                "QueueUrl": DEFAULT_URL,
                "MaxNumberOfMessages": 1,
                "VisibilityTimeout": 300,
                "WaitTimeSeconds": 5,
            },
        )
        stubber.add_response(
            "receive_message",
            {"Messages": [{"ReceiptHandle": "rh-1", "Body": body}]},
            {
                "QueueUrl": AUDIO_URL,
                "MaxNumberOfMessages": 1,
                "VisibilityTimeout": 300,
                "WaitTimeSeconds": 5,
            },
        )
        with stubber:
            msg = service.receive(["q_default", "q_audio"], visibility_timeout=300)
        assert msg is not None
        assert msg.queue_name == "q_audio"
        assert msg.body["job_id"] == "j-1"
        stubber.assert_no_pending_responses()

    def test_preconfigured_urls_skip_get_queue_url(self):
        """queue_urls injection means no sqs:GetQueueUrl IAM permission needed."""
        service, stubber = _stubbed_sqs({"q_default": DEFAULT_URL})
        stubber.add_response(
            "delete_message", {}, {"QueueUrl": DEFAULT_URL, "ReceiptHandle": "rh-1"}
        )
        msg = JobMessage(id="rh-1", queue_name="q_default", body={})
        with stubber:
            service.ack(msg)
        stubber.assert_no_pending_responses()

    def test_nack_requeue_resets_visibility(self):
        service, stubber = _stubbed_sqs({"q_default": DEFAULT_URL})
        stubber.add_response(
            "change_message_visibility",
            {},
            {"QueueUrl": DEFAULT_URL, "ReceiptHandle": "rh-1", "VisibilityTimeout": 0},
        )
        msg = JobMessage(id="rh-1", queue_name="q_default", body={"job_id": "j-1"})
        with stubber:
            service.nack(msg, requeue=True)
        stubber.assert_no_pending_responses()

    def test_nack_drop_deletes_message(self):
        service, stubber = _stubbed_sqs({"q_default": DEFAULT_URL})
        stubber.add_response(
            "delete_message", {}, {"QueueUrl": DEFAULT_URL, "ReceiptHandle": "rh-1"}
        )
        msg = JobMessage(id="rh-1", queue_name="q_default", body={"job_id": "j-1"})
        with stubber:
            service.nack(msg, requeue=False)
        stubber.assert_no_pending_responses()


class TestWorkerS3:
    def test_upload_routes_by_key_segment(self):
        service, stubber = _stubbed_s3()
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-outputs",
                "Key": "p1/outputs/o1/video.mp4",
                "Body": b"x",
                "ContentType": "video/mp4",
            },
        )
        with stubber:
            service.upload("p1/outputs/o1/video.mp4", b"x", "video/mp4")
        stubber.assert_no_pending_responses()

    def test_download_returns_body(self):
        service, stubber = _stubbed_s3()
        import io

        from botocore.response import StreamingBody

        payload = b'{"notes": []}'
        stubber.add_response(
            "get_object",
            {"Body": StreamingBody(io.BytesIO(payload), len(payload))},
            {"Bucket": "pf-analysis", "Key": "p1/notes/v1.json"},
        )
        with stubber:
            assert service.download("p1/notes/v1.json") == payload
        stubber.assert_no_pending_responses()

    def test_download_missing_raises_not_found(self):
        service, stubber = _stubbed_s3()
        stubber.add_client_error("get_object", "NoSuchKey")
        with stubber, pytest.raises(ObjectNotFoundError):
            service.download("p1/notes/missing.json")
