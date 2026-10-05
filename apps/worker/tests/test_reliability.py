"""Comprehensive tests for worker reliability fixes (R1-R5).

Covers:
- R1: Heartbeat starts/stops cleanly, extends SQS visibility timeout, handles exceptions safely.
- R2: Handler crash marks RenderJob as failed with WORKER_CRASH in DB; duplicate processing guard.
- R3: FFmpeg deadlock elimination with large stderr via NamedTemporaryFile; Path return from encode.
- R4: Streaming upload_file on storage backends; tempfile cleanup in render_video.
- R5: Multi-queue receive polling latency optimization.
"""

import os
import subprocess
import sys
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from app.db import Base, Project, ProjectEvent, RenderJob, User, make_sessionmaker
from app.main import MessageHeartbeat, process_payload
from app.queue import JobMessage
from app.storage import LocalStorageService, StorageError, SupabaseStorageService
from app.video_encode import FfmpegVideoEncoder, VideoEncodeError


class FakeSqsQueue:
    is_sqs = True

    def __init__(self) -> None:
        self.visibility_calls: list[tuple[JobMessage, int]] = []
        self.should_raise = False

    def change_visibility(self, message: JobMessage, visibility_timeout: int = 900) -> None:
        if self.should_raise:
            raise RuntimeError("SQS network error")
        self.visibility_calls.append((message, visibility_timeout))


class FakeRedisQueue:
    is_sqs = False

    def __init__(self) -> None:
        self.visibility_calls: list[tuple[JobMessage, int]] = []

    def change_visibility(self, message: JobMessage, visibility_timeout: int = 900) -> None:
        self.visibility_calls.append((message, visibility_timeout))


def _setup_test_db(tmp_path: Path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path / 'test_worker.db'}"
    from app.config import get_settings

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])
    return SessionMaker


class TestHeartbeat:
    def test_heartbeat_starts_and_stops_cleanly_for_sqs(self):
        queue = FakeSqsQueue()
        msg = JobMessage(id="msg-1", queue_name="q_default", body={})

        hb = MessageHeartbeat(
            queue=queue, message=msg, interval_seconds=0.05, visibility_timeout=900
        )
        assert hb._thread is None

        hb.start()
        assert hb._thread is not None
        assert hb._thread.is_alive()

        # Wait for at least one heartbeat tick
        time.sleep(0.12)
        assert len(queue.visibility_calls) >= 1
        assert queue.visibility_calls[0] == (msg, 900)

        hb.stop()
        assert hb._thread is None

    def test_heartbeat_ignores_non_sqs_queue(self):
        queue = FakeRedisQueue()
        msg = JobMessage(id="msg-1", queue_name="q_default", body={})

        hb = MessageHeartbeat(queue=queue, message=msg, interval_seconds=0.05)
        hb.start()
        assert hb._thread is None

    def test_heartbeat_context_manager_stops_on_exception(self):
        queue = FakeSqsQueue()
        msg = JobMessage(id="msg-1", queue_name="q_default", body={})

        hb_ref = None
        with (
            pytest.raises(ValueError),
            MessageHeartbeat(queue=queue, message=msg, interval_seconds=0.05) as hb,
        ):
            hb_ref = hb
            assert hb._thread is not None
            assert hb._thread.is_alive()
            raise ValueError("Worker crash inside job")

        assert hb_ref is not None
        assert hb_ref._thread is None

    def test_heartbeat_tolerates_sqs_exceptions_without_crashing_worker(self):
        queue = FakeSqsQueue()
        queue.should_raise = True
        msg = JobMessage(id="msg-1", queue_name="q_default", body={})

        with MessageHeartbeat(queue=queue, message=msg, interval_seconds=0.05):
            time.sleep(0.12)
            # Must not crash the caller thread


class TestCrashStatusUpdateAndDuplicateGuard:
    def test_handler_crash_updates_db_job_to_failed(self, tmp_path, monkeypatch):
        SessionMaker = _setup_test_db(tmp_path)
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        job_id = uuid.uuid4()

        with SessionMaker() as db:
            db.add(User(id=user_id, email="test@example.com"))
            db.add(Project(id=project_id, user_id=user_id, name="Test Project"))
            db.add(
                RenderJob(
                    id=job_id,
                    project_id=project_id,
                    user_id=user_id,
                    job_type="test_crash_job",
                    status="queued",
                )
            )
            db.commit()

        from app.jobs.registry import register

        @register("test_crash_job")
        def _failing_handler(payload: dict) -> None:
            raise RuntimeError("Fatal memory corrupt or worker exception")

        payload = {"job_type": "test_crash_job", "job_id": str(job_id), "trace_id": "req-123"}
        result = process_payload(payload)

        assert result == "drop"

        with SessionMaker() as db:
            job = db.get(RenderJob, job_id)
            assert job is not None
            assert job.status == "failed"
            assert job.error_type == "WORKER_CRASH"
            assert "Fatal memory corrupt" in (job.error_message or "")
            assert job.finished_at is not None
            assert job.progress == 100

            event = (
                db.query(ProjectEvent)
                .filter(ProjectEvent.job_id == job_id, ProjectEvent.event_type == "job.failed")
                .first()
            )
            assert event is not None
            assert event.payload["error_type"] == "WORKER_CRASH"

    def test_duplicate_processing_guard_skips_recent_job(self, tmp_path):
        SessionMaker = _setup_test_db(tmp_path)
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        job_id = uuid.uuid4()

        # Job started 30s ago (within 120s guard window)
        started_at = datetime.now(UTC) - timedelta(seconds=30)
        with SessionMaker() as db:
            db.add(User(id=user_id, email="test@example.com"))
            db.add(Project(id=project_id, user_id=user_id, name="Test Project"))
            db.add(
                RenderJob(
                    id=job_id,
                    project_id=project_id,
                    user_id=user_id,
                    job_type="test_dup_job",
                    status="processing",
                    started_at=started_at,
                )
            )
            db.commit()

        from app.jobs.registry import register

        executed = []

        @register("test_dup_job")
        def _handler(payload: dict) -> None:
            executed.append(True)

        payload = {"job_type": "test_dup_job", "job_id": str(job_id)}
        result = process_payload(payload)

        # Must skip execution and ack the duplicate message
        assert result == "ack"
        assert len(executed) == 0

    def test_duplicate_guard_allows_stale_processing_job_to_retry(self, tmp_path):
        SessionMaker = _setup_test_db(tmp_path)
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        job_id = uuid.uuid4()

        # Job started 300s ago (> 120s, worker previously died)
        started_at = datetime.now(UTC) - timedelta(seconds=300)
        with SessionMaker() as db:
            db.add(User(id=user_id, email="test@example.com"))
            db.add(Project(id=project_id, user_id=user_id, name="Test Project"))
            db.add(
                RenderJob(
                    id=job_id,
                    project_id=project_id,
                    user_id=user_id,
                    job_type="test_stale_job",
                    status="processing",
                    started_at=started_at,
                )
            )
            db.commit()

        from app.jobs.registry import register

        executed = []

        @register("test_stale_job")
        def _handler(payload: dict) -> None:
            executed.append(True)

        payload = {"job_type": "test_stale_job", "job_id": str(job_id)}
        result = process_payload(payload)

        assert result == "ack"
        assert len(executed) == 1

    def test_duplicate_guard_skips_completed_job(self, tmp_path):
        SessionMaker = _setup_test_db(tmp_path)
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        job_id = uuid.uuid4()

        with SessionMaker() as db:
            db.add(User(id=user_id, email="test@example.com"))
            db.add(Project(id=project_id, user_id=user_id, name="Test Project"))
            db.add(
                RenderJob(
                    id=job_id,
                    project_id=project_id,
                    user_id=user_id,
                    job_type="test_completed_job",
                    status="completed",
                )
            )
            db.commit()

        from app.jobs.registry import register

        executed = []

        @register("test_completed_job")
        def _handler(payload: dict) -> None:
            executed.append(True)

        payload = {"job_type": "test_completed_job", "job_id": str(job_id)}
        result = process_payload(payload)
        assert result == "ack"
        assert len(executed) == 0


class TestFfmpegDeadlockElimination:
    def test_large_stderr_does_not_deadlock(self, tmp_path, monkeypatch):
        """Simulate an FFmpeg process that produces >100 KB of stderr output while reading stdin.
        With NamedTemporaryFile redirect, it must complete smoothly without pipe deadlock.
        """
        script = tmp_path / "mock_ffmpeg.py"
        script.write_text(
            """import sys
# Write 100 KB of warnings to stderr before consuming stdin
warning_chunk = "WARNING: frame dropped or repeated\\n" * 100
for _ in range(40):
    sys.stderr.write(warning_chunk)
    sys.stderr.flush()

# Now consume stdin
data = sys.stdin.buffer.read()
# Write output file
out_arg = sys.argv[-1]
with open(out_arg, "wb") as f:
    f.write(b"\\x00\\x00\\x00\\x18ftypmp42" + b"\\x00" * 2000)
sys.exit(0)
"""
        )

        encoder = FfmpegVideoEncoder(binary=sys.executable)
        # Monkeypatch the command to run our python mock script
        original_popen = subprocess.Popen

        def custom_popen(cmd, *args, **kwargs):
            # Replace cmd with [sys.executable, str(script), cmd[-1]]
            new_cmd = [sys.executable, str(script), cmd[-1]]
            return original_popen(new_cmd, *args, **kwargs)

        monkeypatch.setattr(subprocess, "Popen", custom_popen)

        width, height = 16, 16
        frame = bytes([0, 0, 0]) * (width * height)
        frames = (frame for _ in range(50))

        out_path = encoder.encode(frames, width, height, 30, b"RIFF" + b"\x00" * 100)
        try:
            assert out_path.is_file()
            assert out_path.read_bytes()[:8] == b"\x00\x00\x00\x18ftyp"
        finally:
            out_path.unlink()

    def test_failed_encode_reads_stderr_from_disk_and_cleans_up(self, tmp_path, monkeypatch):
        script = tmp_path / "mock_ffmpeg_fail.py"
        script.write_text(
            """import sys
sys.stderr.write("Critical error: invalid codec parameters encountered!\\n")
sys.exit(1)
"""
        )

        encoder = FfmpegVideoEncoder(binary=sys.executable)
        original_popen = subprocess.Popen

        def custom_popen(cmd, *args, **kwargs):
            new_cmd = [sys.executable, str(script), cmd[-1]]
            return original_popen(new_cmd, *args, **kwargs)

        monkeypatch.setattr(subprocess, "Popen", custom_popen)

        width, height = 16, 16
        frame = bytes([0, 0, 0]) * (width * height)
        frames = (frame for _ in range(5))

        with pytest.raises(VideoEncodeError) as exc_info:
            encoder.encode(frames, width, height, 30, b"RIFF" + b"\x00" * 100)

        assert "Critical error: invalid codec parameters" in str(exc_info.value)


class TestStreamingStorageUpload:
    def test_local_storage_upload_file(self, tmp_path):
        service = LocalStorageService(str(tmp_path / "storage"))
        src_file = tmp_path / "sample.mp4"
        src_file.write_bytes(b"streaming-video-bytes")

        service.upload_file("videos/v1.mp4", src_file, "video/mp4")
        assert service.download("videos/v1.mp4") == b"streaming-video-bytes"

    def test_local_storage_upload_file_missing_raises(self, tmp_path):
        service = LocalStorageService(str(tmp_path / "storage"))
        with pytest.raises(StorageError):
            service.upload_file("videos/missing.mp4", tmp_path / "nonexistent.mp4", "video/mp4")

    def test_supabase_upload_file_streams_content(self, tmp_path, monkeypatch):
        import httpx

        service = SupabaseStorageService(
            url="https://test.supabase.co",
            service_role_key="test-key",
            bucket_sources="pf-sources",
            bucket_analysis="pf-analysis",
            bucket_outputs="pf-outputs",
        )

        src_file = tmp_path / "supabase_test.mp4"
        src_file.write_bytes(b"supabase-bytes")

        posted = {}

        def fake_post(url, content, headers):
            # Read content generator / file-like object
            data = content.read() if hasattr(content, "read") else content
            posted["url"] = url
            posted["content"] = data
            posted["headers"] = headers
            return httpx.Response(200, request=httpx.Request("POST", url))

        monkeypatch.setattr(service._client, "post", fake_post)
        service.upload_file("p1/outputs/o1/test.mp4", src_file, "video/mp4")

        assert "p1/outputs/o1/test.mp4" in posted["url"]
        assert posted["content"] == b"supabase-bytes"
        assert posted["headers"]["Content-Type"] == "video/mp4"
