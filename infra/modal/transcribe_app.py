import base64
import os

try:
    import modal
except ImportError:  # pragma: no cover
    from unittest.mock import MagicMock

    modal = MagicMock()
    modal.App.return_value.function.return_value = lambda f: f
    modal.asgi_app.return_value = lambda f: f

app = modal.App("pianoflow-transcribe")
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch",
        "demucs",
        "transkun>=2.0",
        "setuptools<70.0.0",
        "soxr",
        "pydub",
        "numpy",
        "mido",
        "librosa",
        "yt-dlp[default]>=2026.8.19",
        "curl_cffi",
        "soundfile",
        "torchcodec",
        "moduleconf",
        "fastapi[standard]",
    )
    .add_local_dir("packages/music-core/pianoflow_music", remote_path="/root/pianoflow_music")
)

# Shared secret holding DEMO_TOKEN. The browser sends the same value as the
# X-Demo-Token header so random traffic can't burn GPU credits. It is a
# low-friction gate (the token ships in the web bundle), not strong auth.
_demo_secret = modal.Secret.from_name("pianoflow-demo")


@app.function(gpu="A10G", image=image, timeout=600, max_containers=50)
def transcribe_chunk(audio_bytes: bytes, options: dict) -> dict:
    from pianoflow_music.transcription.pipeline import run_pipeline

    try:
        res = run_pipeline(
            audio_bytes,
            engine=options.get("engine", "transkun"),
            separate=options.get("separate", False),
            options=options,
        )
        return {
            "notes": res.notes.to_dict(),
            "confidence": res.confidence,
            "report": res.report,
        }
    except Exception as exc:
        is_no_notes = (
            type(exc).__name__ == "TranscriptionError"
            and getattr(exc, "code", "") == "NO_NOTES_DETECTED"
        )
        if is_no_notes:
            return {
                "notes": {"notes": [], "bpm": 120.0, "sustain": []},
                "confidence": {},
                "report": {},
            }
        raise


def _process_audio_map_reduce(audio: bytes, options: dict) -> dict:
    import base64
    import io
    import os
    import tempfile

    import librosa
    import soundfile as sf

    from pianoflow_music.midi.write import note_data_to_midi_bytes
    from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData

    # 1. Split audio using librosa
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio)
        tmp.flush()
        y, sr = librosa.load(tmp.name, sr=None, mono=False)
        os.unlink(tmp.name)

    chunk_length_samples = sr * 10
    chunks_params = []

    for i in range(0, y.shape[-1], chunk_length_samples):
        if y.ndim > 1:
            chunk_data = y[:, i : i + chunk_length_samples]
        else:
            chunk_data = y[i : i + chunk_length_samples]

        buf = io.BytesIO()
        sf.write(buf, chunk_data.T if y.ndim > 1 else chunk_data, sr, format="WAV")
        chunks_params.append((buf.getvalue(), options))

    # 2. Map-Reduce on Modal
    results = list(transcribe_chunk.starmap(chunks_params))

    # 3. Merge MIDI notes
    all_notes = []
    all_sustain = []
    note_id = 0
    bpms = []

    for i, res in enumerate(results):
        chunk_start = (i * chunk_length_samples) / sr
        notes_dict = res["notes"]
        if notes_dict.get("bpm"):
            bpms.append(notes_dict["bpm"])

        for n_dict in notes_dict["notes"]:
            n_dict["start"] = round(n_dict["start"] + chunk_start, 6)
            n_dict["end"] = round(n_dict["end"] + chunk_start, 6)
            n_dict["id"] = note_id
            note_id += 1
            all_notes.append(Note(**n_dict))

        for s_dict in notes_dict.get("sustain", []):
            s_dict["time"] = round(s_dict["time"] + chunk_start, 6)
            all_sustain.append(s_dict)

    duration_sec = round(y.shape[-1] / sr, 6)
    bpm = round(sum(bpms) / len(bpms), 2) if bpms else 120.0

    note_data = NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=bpm,
        duration_sec=duration_sec,
        time_signature="4/4",
        notes=all_notes,
        tracks=[{"index": 0, "name": "transcribed", "note_count": len(all_notes)}],
        meta={
            "source": "audio_transcription",
            "engine": "transkun_map_reduce",
            "hand_split": "none",
        },
        sustain=all_sustain,
    )

    draft_midi_bytes = note_data_to_midi_bytes(note_data)

    return {
        "notes": note_data.to_dict(),
        "midi_b64": base64.b64encode(draft_midi_bytes).decode(),
        "confidence": results[0]["confidence"] if results else {},
        "report": {
            "note_count": len(all_notes),
            "engine": "transkun_map_reduce",
            "chunks": len(results),
        },
    }


@app.function(gpu="A10G", image=image, timeout=600)
def transcribe(audio_b64: str, options: dict) -> dict:
    audio = base64.b64decode(audio_b64)
    return _process_audio_map_reduce(audio, options)


# Hosts allowed for URL ingestion. No anti-bot evasion; on block we fail clean.
_ALLOWED_DOMAINS = [
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "douyin.com",
    "instagram.com",
    "facebook.com",
    "fb.watch",
    "soundcloud.com",
    "bilibili.com",
    "b23.tv",
    "vimeo.com",
    "twitter.com",
    "x.com",
    "drive.google.com",
    "dropbox.com",
    "bandcamp.com",
    "supabase.co",
    "supabase.in",
    "amazonaws.com",
    "r2.cloudflarestorage.com",
    "cloudflarestorage.com",
]
_MAX_DURATION_SEC = 600.0  # 10 min cap
_MAX_FILE_BYTES = 100 * 1024 * 1024  # 100 MB cap

DIRECT_AUDIO_EXTENSIONS = (
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".flac",
    ".ogg",
    ".webm",
    ".opus",
    ".wma",
)

DIRECT_STORAGE_DOMAINS = (
    "amazonaws.com",
    "cloudflarestorage.com",
    "r2.cloudflarestorage.com",
    "supabase.co",
    "supabase.in",
)


def is_direct_audio_url(url: str) -> bool:
    """Detects S3 presigned URLs (.amazonaws.com), Cloudflare R2 (.cloudflarestorage.com),
    Supabase storage, or URLs ending with audio extensions (.mp3, .wav, .m4a, .aac, .flac, .ogg,
    .webm), or URLs with audio query parameters.
    """
    from urllib.parse import parse_qs, urlparse

    url = (url or "").strip()
    if not url:
        return False
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = (parsed.path or "").lower()

    # Cloud storage signed URLs (S3, Cloudflare R2, Supabase)
    if any(host == d or host.endswith("." + d) for d in DIRECT_STORAGE_DOMAINS):
        return True

    # Supabase storage in URL path
    if "supabase" in host and "/storage/" in path:
        return True

    # Direct audio file extensions in path
    if any(path.endswith(ext) for ext in DIRECT_AUDIO_EXTENSIONS):
        return True

    # Audio query parameters or content disposition / filename
    qs = parse_qs(parsed.query)
    for k, vals in qs.items():
        k_lower = k.lower()
        for v in vals:
            v_lower = v.lower()
            if any(v_lower.endswith(ext) for ext in DIRECT_AUDIO_EXTENSIONS):
                return True
            if "audio/" in v_lower:
                return True
            if k_lower in ("format", "ext", "type") and any(
                v_lower == ext.lstrip(".") for ext in DIRECT_AUDIO_EXTENSIONS
            ):
                return True

    return False


def validate_url_ssrf(url: str) -> None:
    """Validates target URL against private subnets (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12,
    192.168.0.0/16, AWS metadata 169.254.169.254). Raises ValueError if blocked.
    """
    import ipaddress
    import socket
    from urllib.parse import urlparse

    url = (url or "").strip()
    if not url:
        raise ValueError("Invalid URL: URL is empty")
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname")

    # If hostname is already an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        ips = [ip]
    except ValueError:
        # Hostname is a domain name, resolve via DNS
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            ips = [ipaddress.ip_address(sockaddr[0]) for _, _, _, _, sockaddr in addr_info]
        except socket.gaierror as exc:
            raise ValueError(f"Could not resolve host: {hostname}") from exc

    for ip in ips:
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError(f"Access to private/local address {ip} is forbidden")


validate_url_safety = validate_url_ssrf


def _probe_duration(wav_path: str) -> float:
    """Probe audio duration in seconds using soundfile, standard library wave, or ffprobe."""
    # 1. Try soundfile
    try:
        import soundfile as sf

        info = sf.info(wav_path)
        return float(info.duration)
    except Exception:
        pass

    # 2. Try wave module for PCM WAV
    try:
        import wave

        with wave.open(wav_path, "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return float(frames / rate)
    except Exception:
        pass

    # 3. Fallback to ffprobe
    try:
        import json
        import subprocess

        probe_cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            wav_path,
        ]
        res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        return float(data["format"]["duration"])
    except Exception as exc:
        raise RuntimeError(f"Could not determine audio duration: {exc}") from exc


def download_direct_audio(
    url: str,
    out_wav_path: str,
    max_bytes: int = _MAX_FILE_BYTES,
    max_duration_sec: float = _MAX_DURATION_SEC,
) -> tuple[str, float]:
    """Downloads audio directly from URL, enforces max_bytes, and transcodes to 16kHz mono WAV."""
    import subprocess
    import urllib.request
    from pathlib import Path

    validate_url_ssrf(url)

    out_path = Path(out_wav_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path = out_path.parent / f"raw_download_{out_path.stem}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PianoFlow/3.0 (Audio Ingestion Engine)"},
    )

    downloaded = 0
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            content_length = resp.headers.get("Content-Length")
            if content_length and int(content_length) > max_bytes:
                raise ValueError("File size exceeds 100 MB limit")

            with open(raw_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    downloaded += len(chunk)
                    if downloaded > max_bytes:
                        raise ValueError("File size exceeds 100 MB limit")
                    f.write(chunk)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Failed to download audio file: HTTP {exc.code} {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Failed to connect to audio host: {exc.reason}") from exc

    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(raw_path),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out_path),
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=60, text=True)
        if proc.returncode != 0:
            raise RuntimeError(
                f"Failed to transcode audio: {proc.stderr[-300:] or 'Unsupported format'}"
            )

        duration = _probe_duration(str(out_path))
        if duration > max_duration_sec:
            raise ValueError("Audio exceeds maximum duration of 10 minutes")

        return str(out_path), duration
    finally:
        if raw_path.exists():
            import contextlib

            with contextlib.suppress(OSError):
                raw_path.unlink()


def extract_platform_audio(
    url: str,
    out_wav_path: str,
    max_duration_sec: float = _MAX_DURATION_SEC,
) -> tuple[str, float]:
    """Extracts audio stream from video platforms using hardened yt-dlp
    and transcodes to 16kHz mono WAV.
    """
    import os
    import subprocess
    import tempfile
    from pathlib import Path

    out_path = Path(out_wav_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="pf-ytdlp-") as tmp:
        cmd = [
            "yt-dlp",
            "--no-playlist",
            "-f",
            "bestaudio/ba/b",
            "--extract-audio",
            "--audio-format",
            "wav",
            "--audio-quality",
            "0",
            "--match-filter",
            f"duration <=? {int(max_duration_sec)}",
            "--max-filesize",
            "100M",
            "--socket-timeout",
            "30",
            "--extractor-args",
            "youtube:player_client=android,web,ios",
            "-o",
            os.path.join(tmp, "audio.%(ext)s"),
            url,
        ]

        try:
            proc = subprocess.run(cmd, capture_output=True, timeout=120, text=True)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Audio extraction timed out after 120 seconds") from exc

        tmp_path = Path(tmp)
        wav_files = list(tmp_path.glob("*.wav"))
        source_audio = None

        if wav_files:
            source_audio = wav_files[0]
        else:
            # Check if another audio format was produced (e.g. audio.opus, audio.m4a, audio.webm)
            other_audio = [
                f
                for f in tmp_path.glob("audio.*")
                if f.suffix.lower() not in (".part", ".ytdl", ".temp")
            ]
            if not other_audio:
                other_audio = [
                    f
                    for f in tmp_path.iterdir()
                    if f.is_file() and f.suffix.lower() not in (".part", ".ytdl", ".temp")
                ]
            if other_audio:
                source_audio = other_audio[0]

        if source_audio is not None and source_audio.exists() and source_audio.stat().st_size > 0:
            conv_cmd = [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(source_audio),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(out_path),
            ]
            conv_proc = subprocess.run(conv_cmd, capture_output=True, timeout=60, text=True)
            if conv_proc.returncode != 0:
                raise RuntimeError(
                    f"Failed to transcode extracted audio to 16kHz WAV: {conv_proc.stderr[-300:]}"
                )
        else:
            combined_err = (proc.stderr or "") + " " + (proc.stdout or "")
            combined_err_lower = combined_err.lower()

            if (
                "file is larger than max-filesize" in combined_err_lower
                or "max-filesize" in combined_err_lower
                or "larger than 100m" in combined_err_lower
            ):
                raise ValueError("File size exceeds 100 MB limit")

            if (
                "does not pass filter (duration" in combined_err_lower
                or "filter (duration" in combined_err_lower
                or "duration exceeds" in combined_err_lower
            ):
                raise ValueError("Video duration exceeds maximum allowed limit (10 minutes)")

            if (
                "sign in to confirm you're not a bot" in combined_err_lower
                or "bot detection" in combined_err_lower
                or "video unavailable" in combined_err_lower
                or "private video" in combined_err_lower
                or "this video is private" in combined_err_lower
                or "geo-restricted" in combined_err_lower
                or "not available in your country" in combined_err_lower
            ):
                raise RuntimeError(
                    "Audio stream could not be extracted from this URL "
                    "(video may be private, geo-blocked, or unavailable)"
                )

            err_msg = proc.stderr.strip()[-300:] if proc.stderr else ""
            if err_msg:
                raise RuntimeError(
                    "Audio stream could not be extracted from this URL "
                    f"(video may be private, geo-blocked, or unavailable): {err_msg}"
                )
            raise RuntimeError(
                "Audio stream could not be extracted from this URL "
                "(video may be private, geo-blocked, or unavailable)"
            )

        if not out_path.exists() or out_path.stat().st_size == 0:
            raise RuntimeError(
                "Audio stream could not be extracted from this URL "
                "(video may be private, geo-blocked, or unavailable)"
            )

        duration = _probe_duration(str(out_path))
        if duration > max_duration_sec:
            raise ValueError("Video duration exceeds maximum allowed limit (10 minutes)")

        return str(out_path), duration


def _host_allowed(url: str) -> bool:
    from urllib.parse import urlparse

    url = (url or "").strip()
    if not url:
        return False
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if any(host == d or host.endswith("." + d) for d in _ALLOWED_DOMAINS):
        return True
    if is_direct_audio_url(url):
        return True
    path = (parsed.path or "").lower()
    return any(path.endswith(ext) for ext in DIRECT_AUDIO_EXTENSIONS)


@app.function(gpu="A10G", image=image, timeout=900)
def transcribe_url(url: str, options: dict) -> dict:
    """Download audio from an allowlisted URL (ephemeral) then transcribe.

    Dispatches automatically between direct HTTP streaming download
    (for S3 signed URLs, R2, Supabase, direct .mp3/.wav files) and
    hardened yt-dlp (for YouTube, TikTok, Douyin, etc.).
    Source audio is written to a temporary directory and unlinked upon completion.
    """
    import tempfile
    from pathlib import Path

    url = (url or "").strip()
    if url and not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    if not _host_allowed(url):
        raise ValueError(f"URL host is not in the allowlist: {url}")

    # Step 1: Validate SSRF
    validate_url_ssrf(url)

    with tempfile.TemporaryDirectory(prefix="pf-ingest-") as tmp:
        target_wav = Path(tmp) / "standardized_input.wav"

        # Step 2: Check is_direct_audio_url(url)
        if is_direct_audio_url(url):
            download_direct_audio(
                url,
                str(target_wav),
                max_bytes=_MAX_FILE_BYTES,
                max_duration_sec=_MAX_DURATION_SEC,
            )
        else:
            extract_platform_audio(
                url,
                str(target_wav),
                max_duration_sec=_MAX_DURATION_SEC,
            )

        if not target_wav.exists() or target_wav.stat().st_size == 0:
            raise RuntimeError("Audio extraction failed to produce a valid audio file.")

        audio_bytes = target_wav.read_bytes()
        # Step 3: Pass the clean 16kHz mono WAV to the Transkun transcription pipeline
        return _process_audio_map_reduce(audio_bytes, options)


@app.function(image=image, secrets=[_demo_secret])
@modal.asgi_app()
def web():
    """Single FastAPI app with CORS so the browser can POST audio directly.

    Browsers cannot send a 3-4 min song through a Vercel route handler (the
    serverless body limit is ~4.5 MB; base64 audio is larger). Calling Modal
    directly removes that ceiling; CORS + a shared token make it work safely.
    """
    from fastapi import FastAPI, Header, HTTPException, Request
    from fastapi.middleware.cors import CORSMiddleware

    api = FastAPI()
    api.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def _check_token(token: str | None) -> None:
        expected = os.environ.get("DEMO_TOKEN")
        if not expected:
            raise HTTPException(status_code=503, detail="DEMO_TOKEN is not configured")
        if not token or token != expected:
            raise HTTPException(status_code=401, detail="invalid or missing demo token")

    @api.post("/submit")
    async def submit(request: Request, x_demo_token: str | None = Header(default=None)):
        _check_token(x_demo_token)
        payload = await request.json()
        call = transcribe.spawn(payload["audio_b64"], payload.get("options", {}))
        return {"call_id": call.object_id}

    @api.post("/submit_url")
    async def submit_url(request: Request, x_demo_token: str | None = Header(default=None)):
        _check_token(x_demo_token)
        if os.environ.get("ENABLE_URL_INGEST", "1") != "1":
            raise HTTPException(status_code=403, detail="URL ingestion is disabled")
        payload = await request.json()
        url = (payload.get("url") or "").strip()
        if url and not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        if not payload.get("rights_attested"):
            raise HTTPException(
                status_code=403,
                detail=(
                    "rights attestation required: you must confirm you have the right"
                    " to transcribe this content"
                ),
            )
        if not _host_allowed(url):
            err_msg = f"Trang web hoặc định dạng URL chưa được hỗ trợ: {url}"
            raise HTTPException(status_code=400, detail=err_msg)
        try:
            validate_url_ssrf(url)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        call = transcribe_url.spawn(url, payload.get("options", {}))
        return {"call_id": call.object_id}

    @api.get("/result")
    async def result(call_id: str, x_demo_token: str | None = Header(default=None)):
        _check_token(x_demo_token)
        fc = modal.FunctionCall.from_id(call_id)
        try:
            return {"status": "done", "result": fc.get(timeout=0)}
        except TimeoutError:
            return {"status": "processing"}
        except Exception as exc:
            return {"status": "failed", "error": str(exc)}

    return api
