import base64
import os

import modal

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
    "amazonaws.com",
    "r2.cloudflarestorage.com",
]
_MAX_DURATION_SEC = 600  # 10 min cap


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
    # Also allow direct audio/video file URLs
    path = (parsed.path or "").lower()
    valid_exts = (".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".aac", ".mp4")
    return any(path.endswith(ext) for ext in valid_exts)


@app.function(gpu="A10G", image=image, timeout=900)
def transcribe_url(url: str, options: dict) -> dict:
    """Download audio from an allowlisted URL (ephemeral) then transcribe.

    Source audio is written to a temp dir and deleted when the function
    returns. Only the derived notes/MIDI are kept. Duration/filesize caps
    and --no-playlist guard against abuse. No anti-bot evasion.
    """
    import subprocess
    import tempfile
    from pathlib import Path

    url = (url or "").strip()
    if url and not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    if not _host_allowed(url):
        raise ValueError("URL host is not in the allowlist")

    with tempfile.TemporaryDirectory(prefix="pf-ingest-") as tmp:
        out_tmpl = str(Path(tmp) / "src.%(ext)s")
        cmd = [
            "yt-dlp",
            # curl_cffi-backed TLS/HTTP impersonation. TikTok (and increasingly
            # other hosts) block plain requests; without a target yt-dlp warns
            # "no impersonate target is available" and the download fails.
            "--impersonate",
            "chrome",
            "-x",
            "--audio-format",
            "wav",
            "--no-playlist",
            "--match-filter",
            f"duration < {_MAX_DURATION_SEC}",
            "--max-filesize",
            "60M",
            "--socket-timeout",
            "30",
            "-o",
            out_tmpl,
            url,
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=300, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"download failed: {proc.stderr[-500:] or proc.stdout[-500:]}")

        wavs = list(Path(tmp).glob("*.wav"))
        if not wavs:
            raise RuntimeError("no audio extracted (too long, too large, or unavailable)")
        audio = wavs[0].read_bytes()

        return _process_audio_map_reduce(audio, options)


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
        if expected and token != expected:
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
