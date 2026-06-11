import json

from app.jobs.base import RequeueJob
from app.jobs.registry import get_handler, register
from app.main import process_message, process_payload


def test_noop_handler_is_registered() -> None:
    assert get_handler("noop") is not None


def test_unknown_job_type_returns_none() -> None:
    assert get_handler("does_not_exist") is None


def test_process_message_dispatches_to_handler() -> None:
    calls: list[dict] = []

    @register("test_capture")
    def _capture(payload: dict) -> None:
        calls.append(payload)

    raw = json.dumps({"job_type": "test_capture", "job_id": "j1"}).encode()
    process_message(raw)
    assert calls == [{"job_type": "test_capture", "job_id": "j1"}]


def test_process_message_survives_bad_json() -> None:
    process_message(b"not json{{{")  # must not raise


def test_process_message_survives_unknown_type() -> None:
    process_message(json.dumps({"job_type": "nope"}).encode())  # must not raise


def test_process_payload_requeue_signal() -> None:
    @register("test_retry_signal")
    def _retry(payload: dict) -> None:
        raise RequeueJob

    assert process_payload({"job_type": "test_retry_signal"}) == "requeue"
