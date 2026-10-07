"""Contract tests for the AWS adapters (SQS queue + S3 storage).

Uses botocore Stubber — no real AWS calls, no moto dependency. Stubber
asserts the exact request parameters each adapter sends, which is the
contract we care about.
"""

import json

import boto3
import pytest
from botocore.stub import ANY, Stubber

from app.infrastructure.queue.base import JobMessage, QueueError
from app.infrastructure.queue.sqs_queue import SqsQueueService
from app.infrastructure.storage.base import ObjectNotFoundError
from app.infrastructure.storage.s3 import S3StorageService

QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/q_default"


@pytest.fixture
def sqs_service():
    service = SqsQueueService(region="us-east-1")
    # Replace the real client with a stubbed one.
    service._sqs = boto3.client(
        "sqs",
        region_name="us-east-1",
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
    )
    stubber = Stubber(service._sqs)
    yield service, stubber
    stubber.assert_no_pending_responses()


@pytest.fixture
def s3_service():
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
    stubber = Stubber(service._s3)
    yield service, stubber
    stubber.assert_no_pending_responses()


class TestSqsQueue:
    def test_enqueue_sends_message(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response(
            "send_message",
            {"MessageId": "m-1"},
            {"QueueUrl": QUEUE_URL, "MessageBody": ANY},
        )
        with stubber:
            message_id = service.enqueue("q_default", {"job_id": "j-1"})
        assert message_id == "m-1"

    def test_receive_returns_job_message(self, sqs_service):
        service, stubber = sqs_service
        body = json.dumps({"message_id": "m-1", "job_id": "j-1"})
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response(
            "receive_message",
            {"Messages": [{"ReceiptHandle": "rh-1", "Body": body}]},
            {
                "QueueUrl": QUEUE_URL,
                "MaxNumberOfMessages": 1,
                "VisibilityTimeout": 300,
                "WaitTimeSeconds": 20,
            },
        )
        with stubber:
            msg = service.receive("q_default", visibility_timeout=300)
        assert msg is not None
        assert msg.id == "rh-1"
        assert msg.body["job_id"] == "j-1"

    def test_receive_empty_returns_none(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response(
            "receive_message",
            {},
            {
                "QueueUrl": QUEUE_URL,
                "MaxNumberOfMessages": 1,
                "VisibilityTimeout": 300,
                "WaitTimeSeconds": 20,
            },
        )
        with stubber:
            assert service.receive("q_default", visibility_timeout=300) is None

    def test_ack_deletes_message(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response("delete_message", {}, {"QueueUrl": QUEUE_URL, "ReceiptHandle": "rh-1"})
        msg = JobMessage(id="rh-1", queue_name="q_default", body={})
        with stubber:
            service.ack(msg)

    def test_depth_reads_attribute(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response(
            "get_queue_attributes",
            {"Attributes": {"ApproximateNumberOfMessages": "7"}},
            {"QueueUrl": QUEUE_URL, "AttributeNames": ["ApproximateNumberOfMessages"]},
        )
        with stubber:
            assert service.depth("q_default") == 7

    def test_nack_requeue_resets_visibility(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response(
            "change_message_visibility",
            {},
            {"QueueUrl": QUEUE_URL, "ReceiptHandle": "rh-1", "VisibilityTimeout": 0},
        )
        msg = JobMessage(id="rh-1", queue_name="q_default", body={"job_id": "j-1"})
        with stubber:
            service.nack(msg, requeue=True)

    def test_nack_drop_deletes_message(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_response("get_queue_url", {"QueueUrl": QUEUE_URL}, {"QueueName": "q_default"})
        stubber.add_response("delete_message", {}, {"QueueUrl": QUEUE_URL, "ReceiptHandle": "rh-1"})
        msg = JobMessage(id="rh-1", queue_name="q_default", body={"job_id": "j-1"})
        with stubber:
            service.nack(msg, requeue=False)

    def test_unresolvable_queue_raises_queue_error(self, sqs_service):
        service, stubber = sqs_service
        stubber.add_client_error("get_queue_url", "QueueDoesNotExist")
        with stubber, pytest.raises(QueueError):
            service.enqueue("missing", {})


class TestS3Storage:
    def test_upload_routes_uploads_key_to_sources_bucket(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-sources",
                "Key": "p1/uploads/f1/file.mid",
                "Body": b"data",
                "ContentType": "audio/midi",
            },
        )
        with stubber:
            obj = service.upload("p1/uploads/f1/file.mid", b"data", "audio/midi")
        assert obj.size_bytes == 4

    def test_upload_routes_audio_key_to_sources_bucket(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-sources",
                "Key": "users/u1/uploads/audio/a1.mp3",
                "Body": b"audio-data",
                "ContentType": "audio/mpeg",
            },
        )
        with stubber:
            obj = service.upload("users/u1/uploads/audio/a1.mp3", b"audio-data", "audio/mpeg")
        assert obj.size_bytes == 10

    def test_upload_routes_legacy_audio_key_to_sources_bucket(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-sources",
                "Key": "users/u1/audio/a1.mp3",
                "Body": b"audio-data",
                "ContentType": "audio/mpeg",
            },
        )
        with stubber:
            obj = service.upload("users/u1/audio/a1.mp3", b"audio-data", "audio/mpeg")
        assert obj.size_bytes == 10

    def test_upload_routes_outputs_key_to_outputs_bucket(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-outputs",
                "Key": "p1/outputs/o1/video.mp4",
                "Body": ANY,
                "ContentType": "video/mp4",
            },
        )
        with stubber:
            service.upload("p1/outputs/o1/video.mp4", b"x", "video/mp4")

    def test_upload_routes_other_key_to_analysis_bucket(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "put_object",
            {},
            {
                "Bucket": "pf-analysis",
                "Key": "p1/notes/v1.json",
                "Body": ANY,
                "ContentType": "application/json",
            },
        )
        with stubber:
            service.upload("p1/notes/v1.json", b"{}", "application/json")

    def test_download_missing_raises_not_found(self, s3_service):
        service, stubber = s3_service
        stubber.add_client_error("get_object", "NoSuchKey")
        with stubber, pytest.raises(ObjectNotFoundError):
            service.download("p1/notes/missing.json")

    def test_exists_true_and_false(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "head_object",
            {"ContentLength": 10},
            {"Bucket": "pf-analysis", "Key": "p1/notes/v1.json"},
        )
        stubber.add_client_error("head_object", "404")
        with stubber:
            assert service.exists("p1/notes/v1.json") is True
            assert service.exists("p1/notes/v2.json") is False

    def test_size_returns_content_length(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "head_object",
            {"ContentLength": 1234},
            {"Bucket": "pf-analysis", "Key": "p1/notes/v1.json"},
        )
        with stubber:
            assert service.size("p1/notes/v1.json") == 1234

    def test_delete_prefix_lists_and_batch_deletes(self, s3_service):
        service, stubber = s3_service
        stubber.add_response(
            "list_objects_v2",
            {"Contents": [{"Key": "p1/notes/a.json"}, {"Key": "p1/notes/b.json"}]},
            {"Bucket": "pf-analysis", "Prefix": "p1/notes/"},
        )
        stubber.add_response(
            "delete_objects",
            {},
            {
                "Bucket": "pf-analysis",
                "Delete": {
                    "Objects": [
                        {"Key": "p1/notes/a.json"},
                        {"Key": "p1/notes/b.json"},
                    ],
                    "Quiet": True,
                },
            },
        )
        with stubber:
            service.delete_prefix("p1/notes/")

    def test_signed_download_url_is_presigned_get(self, s3_service):
        service, _ = s3_service
        signed = service.create_signed_download_url("p1/outputs/o1/video.mp4", 600)
        assert signed.method == "GET"
        assert "pf-outputs" in signed.url
        assert "Signature" in signed.url

    def test_signed_upload_url_is_presigned_put(self, s3_service):
        service, _ = s3_service
        signed = service.create_signed_upload_url("p1/uploads/f1/file.mid", "audio/midi", 5_000_000)
        assert signed.method == "PUT"
        assert "pf-sources" in signed.url
        assert signed.headers["Content-Type"] == "audio/midi"
