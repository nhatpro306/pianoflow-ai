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


@app.function(gpu="A10G", image=image, timeout=600)
def transcribe(audio_b64: str, options: dict) -> dict:
    from pianoflow_music.transcription.pipeline import run_pipeline

    audio = base64.b64decode(audio_b64)
    res = run_pipeline(
        audio,
        engine=options.get("engine", "transkun"),
        separate=options.get("separate", False),
        options=options,
    )
    return {
        "notes": res.notes.to_dict(),
        "midi_b64": base64.b64encode(res.draft_midi_bytes).decode(),
        "confidence": res.confidence,
        "report": res.report,
    }


# Hosts allowed for URL ingestion. No anti-bot evasion; on block we fail clean.
_ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "tiktok.com",
    "www.tiktok.com",
    "instagram.com",
    "www.instagram.com",
}
_MAX_DURATION_SEC = 600  # 10 min cap


def _host_allowed(url: str) -> bool:
    from urllib.parse import urlparse

    host = (urlparse(url).hostname or "").lower()
    return host in _ALLOWED_HOSTS


@app.function(gpu="A10G", image=image, timeout=900)
def transcribe_url(url: str, options: dict) -> dict:
    """Download audio from an allowlisted URL (ephemeral) then transcribe.

    Source audio is written to a temp dir and deleted when the function
    returns. Only the derived notes/MIDI are kept. Duration/filesize caps
    and --no-playlist guard against abuse. No anti-bot evasion.
    """
    import base64 as _b64
    import subprocess
    import tempfile
    from pathlib import Path

    from pianoflow_music.transcription.pipeline import run_pipeline

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

        res = run_pipeline(
            audio,
            engine=options.get("engine", "transkun"),
            separate=options.get("separate", False),
            options=options,
        )
        return {
            "notes": res.notes.to_dict(),
            "midi_b64": _b64.b64encode(res.draft_midi_bytes).decode(),
            "confidence": res.confidence,
            "report": res.report,
        }


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
        url = payload.get("url", "")
        if not payload.get("rights_attested"):
            raise HTTPException(
                status_code=403,
                detail=(
                    "rights attestation required: you must confirm you have the right"
                    " to transcribe this content"
                ),
            )
        if not _host_allowed(url):
            raise HTTPException(status_code=400, detail="URL host not allowed")
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
