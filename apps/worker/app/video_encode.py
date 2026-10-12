"""VideoEncoder adapter: raw RGB frames + WAV → H.264/AAC MP4 via FFmpeg.

Frames stream through ffmpeg's stdin (rawvideo pipe) so a full song never
sits in memory; the WAV is muxed in the same single pass
(VIDEO_TUTORIAL_SPEC.md §5).
"""

import os
import shutil
import subprocess
import tempfile
import threading
from collections.abc import Iterator
from contextlib import suppress
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
    ) -> Path:
        if not shutil.which(self.binary):
            raise VideoEncodeError("ffmpeg binary not found in worker image.")

        # Create temporary file for out_path that persists until caller deletes it
        out_fd, out_path_str = tempfile.mkstemp(prefix="pf-video-out-", suffix=".mp4")
        os.close(out_fd)
        out_path = Path(out_path_str)

        wav_fd, wav_path_str = tempfile.mkstemp(prefix="pf-video-wav-", suffix=".wav")
        os.close(wav_fd)
        wav_path = Path(wav_path_str)
        wav_path.write_bytes(wav_bytes)

        command = [
            self.binary,
            "-y",
            "-loglevel",
            "error",
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
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out_path),
        ]
        stderr_chunks: list[bytes] = []

        def _drain_stderr(pipe: object) -> None:
            try:
                while True:
                    chunk = pipe.read(4096)  # type: ignore[union-attr]
                    if not chunk:
                        break
                    stderr_chunks.append(chunk)
            except Exception:
                pass
            finally:
                with suppress(Exception):
                    pipe.close()  # type: ignore[union-attr]

        try:
            process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            assert process.stdin is not None
            assert process.stderr is not None

            stderr_thread = threading.Thread(
                target=_drain_stderr,
                args=(process.stderr,),
                name="pf-ffmpeg-stderr-drain",
                daemon=True,
            )
            stderr_thread.start()

            try:
                for frame in frames:
                    process.stdin.write(frame)
                process.stdin.close()
                process.stdin = None
                process.wait(timeout=1800)
            except (BrokenPipeError, OSError) as exc:
                with suppress(Exception):
                    if process.stdin is not None:
                        process.stdin.close()
                process.wait(timeout=5)
                stderr_thread.join(timeout=2)
                err_text = b"".join(stderr_chunks).decode("utf-8", errors="replace")
                raise VideoEncodeError(f"ffmpeg pipe broke: {err_text[-300:]!r}") from exc
            except subprocess.TimeoutExpired as exc:
                process.kill()
                stderr_thread.join(timeout=2)
                raise VideoEncodeError("ffmpeg timed out.") from exc

            stderr_thread.join(timeout=5)
            if process.returncode != 0:
                err_text = b"".join(stderr_chunks).decode("utf-8", errors="replace")
                raise VideoEncodeError(f"ffmpeg exited {process.returncode}: {err_text[-300:]!r}")
            if not out_path.is_file() or out_path.stat().st_size < 1000:
                raise VideoEncodeError("ffmpeg produced an empty MP4.")
            return out_path
        except Exception:
            if out_path.is_file():
                with suppress(Exception):
                    out_path.unlink()
            raise
        finally:
            with suppress(Exception):
                wav_path.unlink()


def get_video_encoder() -> FfmpegVideoEncoder:
    return FfmpegVideoEncoder()
