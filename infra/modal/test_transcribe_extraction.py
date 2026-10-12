"""Unit and regression test suite for multi-stage audio ingestion and extraction.

Covers:
1. is_direct_audio_url URL classification (S3, R2, Supabase, direct audio exts vs video platforms)
2. validate_url_ssrf SSRF defense (loopback, link-local 169.254, RFC1918, public URLs)
3. download_direct_audio (streaming chunks, byte limit cap, ffmpeg transcode, duration validation)
4. extract_platform_audio (hardened yt-dlp arguments, format fallback, granular error taxonomy)
5. transcribe_url orchestration (proper routing based on URL classification)
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from infra.modal.transcribe_app import (
    download_direct_audio,
    extract_platform_audio,
    is_direct_audio_url,
    transcribe_url,
    validate_url_safety,
    validate_url_ssrf,
)


class TestDirectAudioUrlClassification:
    """Verify that is_direct_audio_url distinguishes direct audio assets from media platforms."""

    @pytest.mark.parametrize(
        "url",
        [
            "https://my-bucket.s3.amazonaws.com/uploads/piano.mp3?X-Amz-Signature=abc",
            "https://pianoflow-v3-sources.s3.us-east-1.amazonaws.com/song-uuid?AWSAccessKeyId=123",
            "https://pub-abc.r2.cloudflarestorage.com/raw/track1",
            "https://my-bucket.cloudflarestorage.com/piano.wav",
            "https://xyz.supabase.co/storage/v1/object/public/audios/clip.m4a",
            "https://xyz.supabase.in/storage/v1/object/public/audios/clip.mp3",
            "https://example.com/music/chopin_nocturne.mp3",
            "https://cdn.mysite.com/audio.wav",
            "https://cdn.mysite.com/audio.m4a",
            "https://cdn.mysite.com/audio.aac",
            "https://cdn.mysite.com/audio.flac",
            "https://cdn.mysite.com/audio.ogg",
            "https://cdn.mysite.com/audio.webm",
            "https://cdn.mysite.com/audio.opus",
            "https://example.com/api/download?format=mp3",
            "https://example.com/api/download?format=wav",
            "https://example.com/stream?file=test.wav",
            "https://example.com/api?response-content-type=audio/mpeg",
        ],
    )
    def test_direct_audio_urls_detected(self, url: str) -> None:
        assert is_direct_audio_url(url) is True

    @pytest.mark.parametrize(
        "url",
        [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://www.tiktok.com/@pianist/video/7123456789012345678",
            "https://vt.tiktok.com/ZS2abcxyz/",
            "https://www.instagram.com/reel/C123456789/",
            "https://vimeo.com/123456789",
            "https://soundcloud.com/artist/piano-solo",
            "https://www.bilibili.com/video/BV1xx411c7mD",
            "",
        ],
    )
    def test_platform_urls_not_classified_as_direct(self, url: str) -> None:
        assert is_direct_audio_url(url) is False


class TestSsrfValidation:
    """Verify validate_url_ssrf blocks private, loopback, and cloud metadata addresses."""

    @pytest.mark.parametrize(
        "url",
        [
            "http://127.0.0.1:8000/audio.mp3",
            "http://127.0.1.1/secret.wav",
            "http://[::1]:8080/audio.mp3",
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.1.1/credentials",
            "http://10.0.0.1/private.wav",
            "http://10.255.0.1/audio.mp3",
            "http://172.16.0.1/audio.mp3",
            "http://172.31.255.255/audio.mp3",
            "http://192.168.1.1/internal.wav",
            "http://192.168.0.254/audio.wav",
            "http://0.0.0.0:8000/audio.wav",
        ],
    )
    def test_private_and_metadata_addresses_rejected(self, url: str) -> None:
        with pytest.raises(ValueError, match="forbidden"):
            validate_url_ssrf(url)

    def test_empty_url_rejected(self) -> None:
        with pytest.raises(ValueError, match=r"empty|missing"):
            validate_url_ssrf("")

    def test_public_ip_permitted(self) -> None:
        # 93.184.216.34 is example.com's public IP
        validate_url_ssrf("http://93.184.216.34/audio.mp3")

    def test_public_domain_permitted(self) -> None:
        with patch("socket.getaddrinfo") as mock_gai:
            mock_gai.return_value = [
                (2, 1, 6, "", ("93.184.216.34", 80)),
            ]
            validate_url_ssrf("https://example.com/audio.mp3")

    def test_safety_alias(self) -> None:
        assert validate_url_safety is validate_url_ssrf


class TestDirectAudioDownloader:
    """Verify download_direct_audio streaming, byte limits, and ffmpeg transcoding."""

    @patch("infra.modal.transcribe_app._probe_duration", return_value=120.0)
    @patch("subprocess.run")
    @patch("urllib.request.urlopen")
    def test_direct_download_success(
        self,
        mock_urlopen: MagicMock,
        mock_subproc: MagicMock,
        mock_probe: MagicMock,
        tmp_path: Path,
    ) -> None:
        mock_resp = MagicMock()
        mock_resp.headers = {"Content-Length": "1048576"}
        mock_resp.read.side_effect = [b"A" * 65536, b"B" * 65536, b""]
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        mock_subproc.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )

        out_wav = tmp_path / "output.wav"
        # Simulate ffmpeg creating the target wav file
        out_wav.write_bytes(b"RIFF dummy wav data")

        result_path, duration = download_direct_audio(
            "https://93.184.216.34/sample.mp3",
            str(out_wav),
            max_bytes=100 * 1024 * 1024,
            max_duration_sec=600.0,
        )

        assert result_path == str(out_wav)
        assert duration == 120.0

        # Verify ffmpeg arguments
        ffmpeg_cmd = mock_subproc.call_args[0][0]
        assert "ffmpeg" in ffmpeg_cmd[0]
        assert "-ar" in ffmpeg_cmd
        assert "16000" in ffmpeg_cmd
        assert "-ac" in ffmpeg_cmd
        assert "1" in ffmpeg_cmd
        assert "pcm_s16le" in ffmpeg_cmd

    @patch("urllib.request.urlopen")
    def test_direct_download_content_length_exceeded(
        self, mock_urlopen: MagicMock, tmp_path: Path
    ) -> None:
        mock_resp = MagicMock()
        mock_resp.headers = {"Content-Length": str(150 * 1024 * 1024)}  # 150 MB
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        out_wav = tmp_path / "output.wav"
        with pytest.raises(ValueError, match="File size exceeds 100 MB limit"):
            download_direct_audio(
                "https://93.184.216.34/oversized.mp3",
                str(out_wav),
                max_bytes=100 * 1024 * 1024,
            )

    @patch("urllib.request.urlopen")
    def test_direct_download_streaming_bytes_exceeded(
        self, mock_urlopen: MagicMock, tmp_path: Path
    ) -> None:
        mock_resp = MagicMock()
        mock_resp.headers = {}
        # Stream chunks totaling 6MB with a 5MB limit
        mock_resp.read.side_effect = [b"X" * (2 * 1024 * 1024), b"Y" * (4 * 1024 * 1024)]
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        out_wav = tmp_path / "output.wav"
        with pytest.raises(ValueError, match="File size exceeds 100 MB limit"):
            download_direct_audio(
                "https://93.184.216.34/chunked.mp3",
                str(out_wav),
                max_bytes=5 * 1024 * 1024,
            )

    @patch("infra.modal.transcribe_app._probe_duration", return_value=750.0)
    @patch("subprocess.run")
    @patch("urllib.request.urlopen")
    def test_direct_download_duration_exceeded(
        self,
        mock_urlopen: MagicMock,
        mock_subproc: MagicMock,
        mock_probe: MagicMock,
        tmp_path: Path,
    ) -> None:
        mock_resp = MagicMock()
        mock_resp.headers = {"Content-Length": "1000"}
        mock_resp.read.side_effect = [b"data", b""]
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        mock_subproc.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )

        out_wav = tmp_path / "output.wav"
        out_wav.write_bytes(b"RIFF dummy wav data")

        with pytest.raises(ValueError, match="Audio exceeds maximum duration of 10 minutes"):
            download_direct_audio(
                "https://93.184.216.34/long.mp3",
                str(out_wav),
                max_duration_sec=600.0,
            )


class TestPlatformAudioExtractor:
    """Verify hardened yt-dlp arguments, format fallback, and granular error taxonomy."""

    @patch("infra.modal.transcribe_app._probe_duration", return_value=90.0)
    @patch("subprocess.run")
    def test_hardened_ytdlp_command_structure(
        self, mock_subproc: MagicMock, mock_probe: MagicMock, tmp_path: Path
    ) -> None:
        out_wav = tmp_path / "audio_target.wav"

        def fake_run(cmd, *args, **kwargs):
            if cmd[0] == "yt-dlp":
                # Find output template and write dummy wav
                out_idx = cmd.index("-o") + 1
                tmpl = cmd[out_idx]
                target_file = Path(tmpl.replace("%(ext)s", "wav"))
                target_file.write_bytes(b"RIFF wav from ytdlp")
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")
            if cmd[0] == "ffmpeg":
                out_wav.write_bytes(b"RIFF normalized wav")
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")

        mock_subproc.side_effect = fake_run

        result_path, duration = extract_platform_audio(
            "https://www.youtube.com/watch?v=sample123",
            str(out_wav),
            max_duration_sec=600.0,
        )

        assert result_path == str(out_wav)
        assert duration == 90.0

        # Inspect the yt-dlp command executed
        ytdlp_cmd = mock_subproc.call_args_list[0][0][0]
        assert ytdlp_cmd[0] == "yt-dlp"
        assert "--no-playlist" in ytdlp_cmd
        assert "-f" in ytdlp_cmd
        assert "bestaudio/ba/b" in ytdlp_cmd
        assert "--extract-audio" in ytdlp_cmd
        assert "--audio-format" in ytdlp_cmd
        assert "wav" in ytdlp_cmd
        assert "--audio-quality" in ytdlp_cmd
        assert "0" in ytdlp_cmd
        assert "--match-filter" in ytdlp_cmd
        assert "duration <=? 600" in ytdlp_cmd
        assert "--max-filesize" in ytdlp_cmd
        assert "100M" in ytdlp_cmd
        assert "--extractor-args" in ytdlp_cmd
        assert "youtube:player_client=android,web,ios" in ytdlp_cmd

    @patch("infra.modal.transcribe_app._probe_duration", return_value=45.0)
    @patch("subprocess.run")
    def test_non_wav_format_fallback_transcoding(
        self, mock_subproc: MagicMock, mock_probe: MagicMock, tmp_path: Path
    ) -> None:
        out_wav = tmp_path / "audio_target.wav"

        def fake_run(cmd, *args, **kwargs):
            if cmd[0] == "yt-dlp":
                out_idx = cmd.index("-o") + 1
                tmpl = cmd[out_idx]
                target_file = Path(tmpl.replace("%(ext)s", "opus"))
                target_file.write_bytes(b"OPUS dummy audio track")
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")
            if cmd[0] == "ffmpeg":
                out_wav.write_bytes(b"RIFF wav converted from opus")
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")

        mock_subproc.side_effect = fake_run

        result_path, duration = extract_platform_audio(
            "https://www.tiktok.com/@user/video/123",
            str(out_wav),
            max_duration_sec=600.0,
        )

        assert result_path == str(out_wav)
        assert duration == 45.0
        ffmpeg_calls = [c for c in mock_subproc.call_args_list if c[0][0][0] == "ffmpeg"]
        assert len(ffmpeg_calls) >= 1
        assert "pcm_s16le" in ffmpeg_calls[0][0][0]

    @pytest.mark.parametrize(
        ("stderr_output", "expected_err_type", "expected_err_pattern"),
        [
            (
                "[download] Video does not pass filter (duration <=? 600), skipping ..",
                ValueError,
                r"Video duration exceeds maximum allowed limit \(10 minutes\)",
            ),
            (
                "[download] File is larger than max-filesize (100M), skipping ..",
                ValueError,
                "File size exceeds 100 MB limit",
            ),
            (
                "ERROR: Sign in to confirm you're not a bot. This helps protect our community.",
                RuntimeError,
                r"Audio stream could not be extracted from this URL "
                r"\(video may be private, geo-blocked, or unavailable\)",
            ),
            (
                "ERROR: [youtube] Video unavailable. This video is private.",
                RuntimeError,
                r"Audio stream could not be extracted from this URL "
                r"\(video may be private, geo-blocked, or unavailable\)",
            ),
            (
                "ERROR: The uploader has not made this video available (geo-restricted).",
                RuntimeError,
                r"Audio stream could not be extracted from this URL "
                r"\(video may be private, geo-blocked, or unavailable\)",
            ),
        ],
    )
    @patch("subprocess.run")
    def test_granular_error_classification(
        self,
        mock_subproc: MagicMock,
        stderr_output: str,
        expected_err_type: type[Exception],
        expected_err_pattern: str,
        tmp_path: Path,
    ) -> None:
        mock_subproc.return_value = subprocess.CompletedProcess(
            args=["yt-dlp"], returncode=1, stdout="", stderr=stderr_output
        )

        out_wav = tmp_path / "audio_target.wav"
        with pytest.raises(expected_err_type, match=expected_err_pattern):
            extract_platform_audio(
                "https://www.youtube.com/watch?v=problematic",
                str(out_wav),
            )


class TestTranscribeUrlOrchestration:
    """Verify transcribe_url orchestrates SSRF, direct download, and yt-dlp appropriately."""

    @patch("infra.modal.transcribe_app._process_audio_map_reduce")
    @patch("infra.modal.transcribe_app.download_direct_audio")
    @patch("infra.modal.transcribe_app.extract_platform_audio")
    def test_routes_s3_url_to_direct_downloader(
        self,
        mock_extract: MagicMock,
        mock_download: MagicMock,
        mock_map_reduce: MagicMock,
        tmp_path: Path,
    ) -> None:
        s3_url = "https://pianoflow-v3-sources.s3.amazonaws.com/chopin.mp3"

        def fake_download(url, out_path, **kwargs):
            Path(out_path).write_bytes(b"RIFF wav direct")
            return out_path, 100.0

        mock_download.side_effect = fake_download
        mock_map_reduce.return_value = {"status": "success", "notes": {}}

        getattr(transcribe_url, "local", transcribe_url)(s3_url, {"engine": "transkun"})

        mock_download.assert_called_once()
        mock_extract.assert_not_called()
        mock_map_reduce.assert_called_once()

    @patch("infra.modal.transcribe_app._process_audio_map_reduce")
    @patch("infra.modal.transcribe_app.download_direct_audio")
    @patch("infra.modal.transcribe_app.extract_platform_audio")
    def test_routes_youtube_url_to_platform_extractor(
        self,
        mock_extract: MagicMock,
        mock_download: MagicMock,
        mock_map_reduce: MagicMock,
        tmp_path: Path,
    ) -> None:
        yt_url = "https://www.youtube.com/watch?v=sample123"

        def fake_extract(url, out_path, **kwargs):
            Path(out_path).write_bytes(b"RIFF wav platform")
            return out_path, 150.0

        mock_extract.side_effect = fake_extract
        mock_map_reduce.return_value = {"status": "success", "notes": {}}

        getattr(transcribe_url, "local", transcribe_url)(yt_url, {"engine": "transkun"})

        mock_extract.assert_called_once()
        mock_download.assert_not_called()
        mock_map_reduce.assert_called_once()

    def test_rejects_ssrf_before_download(self) -> None:
        with pytest.raises(ValueError, match="forbidden"):
            getattr(transcribe_url, "local", transcribe_url)("http://127.0.0.1:8000/audio.mp3", {})

    def test_rejects_disallowed_domain(self) -> None:
        with pytest.raises(ValueError, match="allowlist"):
            getattr(transcribe_url, "local", transcribe_url)(
                "https://malicious-site-unknown.org/video", {}
            )
