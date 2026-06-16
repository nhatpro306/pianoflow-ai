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
        "transkun",
        "soxr",
        "pydub",
        "numpy",
        "mido",
        "librosa",
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
