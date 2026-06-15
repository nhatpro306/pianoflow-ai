import base64
import modal

app = modal.App("pianoflow-transcribe")
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch", "demucs", "transkun", "soxr", "pydub",
        "numpy", "mido", "librosa", "soundfile", "moduleconf",
    )
    .add_local_python_source("pianoflow_music")
)


@app.function(gpu="A10G", image=image, timeout=600)
def transcribe(audio_b64: str, options: dict) -> dict:
    from pianoflow_music.transcription.pipeline import run_pipeline

    audio = base64.b64decode(audio_b64)
    res = run_pipeline(
        audio,
        engine=options.get("engine", "transkun"),
        separate=options.get("separate", True),
        options=options,
    )
    return {
        "notes": res.notes.to_dict(),
        "midi_b64": base64.b64encode(res.draft_midi_bytes).decode(),
        "confidence": res.confidence,
        "report": res.report,
    }


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def submit(payload: dict):
    call = transcribe.spawn(payload["audio_b64"], payload.get("options", {}))
    return {"call_id": call.object_id}


@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def result(call_id: str):
    fc = modal.FunctionCall.from_id(call_id)
    try:
        return {"status": "done", "result": fc.get(timeout=0)}
    except TimeoutError:
        return {"status": "processing"}
