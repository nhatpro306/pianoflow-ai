"""VideoEncoder adapter: raw RGB frames + WAV → H.264/AAC MP4 via FFmpeg.

Frames stream through ffmpeg's stdin (rawvideo pipe) so a full song never
sits in memory; the WAV is muxed in the same single pass
(VIDEO_TUTORIAL_SPEC.md §5).
"""

import shutil
import subprocess
import tempfile
from collections.abc import Iterator
from pathlib import Path


class VideoEncodeError(Exception):
    code = "FFMPEG_FAILED"


class FfmpegVideoEncoder:
    def __init__(self, binary: str = "ffmpeg") -> None:
        self.binary = binary

    def available(self) -> bool:
        return bool(shutil.which(self.binary))

    def encode(
        self,
        frames: Iterator[bytes],
        width: int,
        height: int,
        fps: int,
        wav_bytes: bytes,
    ) -> bytes:
        if not shutil.which(self.binary):
            raise VideoEncodeError("ffmpeg binary not found in worker image.")

        with tempfile.TemporaryDirectory(prefix="pf-video-") as tmp:
            wav_path = Path(tmp) / "audio.wav"
            out_path = Path(tmp) / "out.mp4"
            wav_path.write_bytes(wav_bytes)

            command = [
                self.binary,
                "-y",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgb24",
                "-s",
                f"{width}x{height}",
                "-r",
                str(fps),
                "-i",
                "-",
                "-i",
                str(wav_path),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-shortest",
                "-movflags",
                "+faststart",
                str(out_path),
            ]
            process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            assert process.stdin is not None
            try:
                for frame in frames:
                    process.stdin.write(frame)
                process.stdin.close()
                process.stdin = None
                _, stderr = process.communicate(timeout=1800)
            except BrokenPipeError as exc:
                _, stderr = process.communicate()
                raise VideoEncodeError(f"ffmpeg pipe broke: {stderr[-300:]!r}") from exc
            except subprocess.TimeoutExpired as exc:
                process.kill()
                raise VideoEncodeError("ffmpeg timed out.") from exc

            if process.returncode != 0:
                raise VideoEncodeError(f"ffmpeg exited {process.returncode}: {stderr[-300:]!r}")
            if not out_path.is_file() or out_path.stat().st_size < 1000:
                raise VideoEncodeError("ffmpeg produced an empty MP4.")
            return out_path.read_bytes()


def get_video_encoder() -> FfmpegVideoEncoder:
    return FfmpegVideoEncoder()
