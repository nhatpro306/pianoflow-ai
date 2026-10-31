"""render_video handler tests (synth/encoder faked — no ffmpeg/fluidsynth)."""

import io
import json
import os
import shutil
import struct
import uuid
import wave

import mido
import pytest


def _simple_midi_bytes() -> bytes:
    midi = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack()
    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120), time=0))
    for pitch in (60, 62, 64, 65):
        track.append(mido.Message("note_on", note=pitch, velocity=80, time=0))
        track.append(mido.Message("note_off", note=pitch, velocity=0, time=480))
    track.append(mido.MetaMessage("end_of_track", time=0))
    midi.tracks.append(track)
    buffer = io.BytesIO()
    midi.save(file=buffer)
    return buffer.getvalue()


def _tiny_wav_bytes() -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(44_100)
        for _ in range(4_410):
            wav.writeframes(struct.pack("<h", 0))
    return buffer.getvalue()


def _setup_ready_project(tmp_path):
    os.environ.update(
        {
            "DATABASE_URL": f"sqlite:///{tmp_path / 'worker.db'}",
            "STORAGE_BACKEND": "local",
            "STORAGE_LOCAL_ROOT": str(tmp_path / "storage"),
        }
    )
    from app.config import get_settings
    from app.db import Base, Project, RenderJob, User, make_sessionmaker
    from app.storage import get_storage
    from pianoflow_music.midi.parse import parse_midi_bytes

    get_settings.cache_clear()
    SessionMaker = make_sessionmaker()
    Base.metadata.create_all(SessionMaker.kw["bind"])

    user_id = uuid.uuid4()
    project_id = uuid.uuid4()
    job_id = uuid.uuid4()

    note_data = parse_midi_bytes(_simple_midi_bytes())
    notes_key = f"projects/{project_id}/notes/v2.json"
    get_storage().upload(
        notes_key,
        json.dumps(note_data.to_dict(), separators=(",", ":")).encode(),
        "application/json",
    )

    with SessionMaker() as db:
        db.add(User(id=user_id, email="dev@example.test"))
        db.add(
            Project(
                id=project_id,
                user_id=user_id,
                name="Song",
                status="ready",
                analysis_summary={**note_data.summary(), "notes_key": notes_key},
            )
        )
        db.add(
            RenderJob(
                id=job_id,
                project_id=project_id,
                user_id=user_id,
                job_type="render_video",
                status="queued",
                settings_snapshot={
                    "resolution": "720p",
                    "fps": 30,
                    "speed_multiplier": 1.5,
                    "colors": {"right_hand": "#7c3aed", "left_hand": "#3b82f6"},
                    "glow_intensity": 0.6,
                },
            )
        )
        db.commit()
    return SessionMaker, job_id, project_id


class FakeAudioRenderer:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def render_wav(
        self,
        midi_bytes: bytes,
        sample_rate: int = 44100,
        volume: float = 1.0,
        reverb: str = "medium",
        **kwargs,
    ) -> bytes:
        assert midi_bytes[:4] == b"MThd"
        self.calls.append({
            "midi_bytes": midi_bytes,
            "sample_rate": sample_rate,
            "volume": volume,
            "reverb": reverb,
        })
        return b"RIFF" + b"\x00" * 200

    def wav_to_mp3(self, wav_bytes: bytes, bitrate: str = "320k") -> bytes:
        return b"ID3\x03\x00\x00\x00\x00\x00#" + b"\x00" * 200


class FakeVideoEncoder:
    def __init__(self) -> None:
        self.frames_seen = 0
        self.args: dict = {}

    def encode(self, frames, width, height, fps, wav_bytes):
        import tempfile
        from pathlib import Path

        self.args = {"width": width, "height": height, "fps": fps}
        for frame in frames:
            assert len(frame) == width * height * 3
            self.frames_seen += 1
        assert wav_bytes.startswith(b"RIFF")
        fd, path_str = tempfile.mkstemp(prefix="pf-test-fake-video-", suffix=".mp4")
        os.close(fd)
        path = Path(path_str)
        path.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 2000)
        return path


def test_render_video_creates_streaming_output(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, _project_id = _setup_ready_project(tmp_path)

    from app.db import OutputFile, RenderJob
    from app.jobs import render_video
    from app.storage import get_storage

    encoder = FakeVideoEncoder()
    monkeypatch.setattr(render_video, "get_audio_renderer", lambda: FakeAudioRenderer())
    monkeypatch.setattr(render_video, "get_video_encoder", lambda: encoder)

    render_video.handle_render_video({"job_id": str(job_id), "job_type": "render_video"})

    assert encoder.args == {"width": 1280, "height": 720, "fps": 30}
    assert encoder.frames_seen > 30  # ~2.7s scaled song + tail at 30 fps

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "completed", job.error_message
        output = db.query(OutputFile).filter(OutputFile.job_id == job_id, OutputFile.kind == "video_mp4").one()
        assert output.kind == "video_mp4"
        assert output.content_type == "video/mp4"
        assert output.output_metadata["download_allowed"] is False
        assert output.output_metadata["streaming_only"] is True
        assert output.output_metadata["access_policy"] == "private_streaming"
        assert output.output_metadata["speed_multiplier"] == 1.5
        assert get_storage().download(output.storage_key)[4:8] == b"ftyp"

        wav_out = db.query(OutputFile).filter(OutputFile.job_id == job_id, OutputFile.kind == "audio_wav").one()
        assert wav_out.content_type == "audio/wav"
        assert wav_out.output_metadata["download_allowed"] is True
        assert wav_out.output_metadata["tail_margin_sec"] == 1.5

        mp3_out = db.query(OutputFile).filter(OutputFile.job_id == job_id, OutputFile.kind == "audio_mp3").one()
        assert mp3_out.content_type == "audio/mpeg"
        assert mp3_out.output_metadata["download_allowed"] is True


def test_render_video_fails_permanently_on_audio_error(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, _ = _setup_ready_project(tmp_path)

    from app.audio import AudioRenderError
    from app.db import RenderJob
    from app.jobs import render_video

    class BrokenAudio:
        def render_wav(self, midi_bytes: bytes, sample_rate: int = 44100, **kwargs) -> bytes:
            raise AudioRenderError("fluidsynth binary not found in worker image.")

    monkeypatch.setattr(render_video, "get_audio_renderer", lambda: BrokenAudio())

    render_video.handle_render_video({"job_id": str(job_id), "job_type": "render_video"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "failed"
        assert job.error_type == "AUDIO_RENDER_FAILED"


def test_render_video_fails_without_notes(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, project_id = _setup_ready_project(tmp_path)

    from app.db import Project, RenderJob
    from app.jobs import render_video

    with SessionMaker() as db:
        project = db.get(Project, project_id)
        project.analysis_summary = {}
        db.commit()

    render_video.handle_render_video({"job_id": str(job_id), "job_type": "render_video"})

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job is not None
        assert job.status == "failed"
        assert job.error_type == "NOTES_NOT_READY"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_ffmpeg_encoder_accepts_streamed_frames() -> None:
    from app.video_encode import FfmpegVideoEncoder

    width = 16
    height = 16
    frame = bytes([0, 0, 0]) * width * height
    mp4_path = FfmpegVideoEncoder().encode(
        (frame for _ in range(3)),
        width,
        height,
        30,
        _tiny_wav_bytes(),
    )

    try:
        assert mp4_path.is_file()
        assert mp4_path.read_bytes()[4:8] == b"ftyp"
    finally:
        mp4_path.unlink()


def test_render_video_audio_settings_forwarded_and_tail_preserved(tmp_path, monkeypatch) -> None:
    SessionMaker, job_id, _project_id = _setup_ready_project(tmp_path)

    from app.db import OutputFile, RenderJob
    from app.jobs import render_video

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        job.settings_snapshot = {
            "resolution": "720p",
            "fps": 30,
            "speed_multiplier": 1.25,
            "piano_sound": "bright_grand",
            "volume": 0.85,
            "reverb": "hall",
        }
        db.commit()

    audio_renderer = FakeAudioRenderer()
    encoder = FakeVideoEncoder()
    monkeypatch.setattr(render_video, "get_audio_renderer", lambda: audio_renderer)
    monkeypatch.setattr(render_video, "get_video_encoder", lambda: encoder)

    render_video.handle_render_video({"job_id": str(job_id), "job_type": "render_video"})

    assert len(audio_renderer.calls) == 1
    call = audio_renderer.calls[0]
    assert call["volume"] == 0.85
    assert call["reverb"] == "hall"

    # Verify MIDI payload contains program_change (1 for bright_grand) and end_of_track with tail
    midi_bytes = call["midi_bytes"]
    import mido
    mf = mido.MidiFile(file=io.BytesIO(midi_bytes))
    track = mf.tracks[0]
    program_msgs = [m for m in track if m.type == "program_change"]
    assert len(program_msgs) == 1
    assert program_msgs[0].program == 1  # bright_grand

    eot = [m for m in track if m.type == "end_of_track"]
    assert len(eot) == 1
    assert eot[0].time > 0  # tail margin preserved

    with SessionMaker() as db:
        job = db.get(RenderJob, job_id)
        assert job.status == "completed"
        wav_out = db.query(OutputFile).filter(OutputFile.job_id == job_id, OutputFile.kind == "audio_wav").one()
        assert wav_out.output_metadata["piano_sound"] == "bright_grand"
        assert wav_out.output_metadata["volume"] == 0.85
        assert wav_out.output_metadata["reverb"] == "hall"
        assert wav_out.output_metadata["tail_margin_sec"] == 1.5

        mp3_out = db.query(OutputFile).filter(OutputFile.job_id == job_id, OutputFile.kind == "audio_mp3").one()
        assert mp3_out.output_metadata["piano_sound"] == "bright_grand"
        assert mp3_out.output_metadata["bitrate"] == "320k"
