# PianoFlow — Modal GPU Transcription App

Async audio-to-MIDI transcription running on Modal A10G GPUs. Exposes two HTTP
endpoints (`submit` and `result`) that the PianoFlow worker calls instead of
running Transkun locally.

---

## Prerequisites

```bash
pip install modal
modal token new        # opens browser, saves credentials to ~/.modal/credentials.toml
```

---

## Running locally (one-off test)

Run from the **repo root** so that `add_local_python_source("pianoflow_music")`
can resolve `packages/music-core/`:

```bash
modal run infra/modal/transcribe_app.py::transcribe \
  --audio_b64 "$(base64 -w0 /path/to/sample.mp3)" \
  --options '{}'
```

---

## Dev server (live-reload, ephemeral tunnel URL)

```bash
modal serve infra/modal/transcribe_app.py
```

Modal prints temporary `https://<hash>.modal.run` URLs for `submit` and
`result`. Use these for local integration testing.

---

## Production deploy (stable URLs)

```bash
modal deploy infra/modal/transcribe_app.py
```

Modal prints stable URLs such as:

```
submit  -> https://pianoflow-transcribe--submit.modal.run
result  -> https://pianoflow-transcribe--result.modal.run
```

Copy these into your Vercel project environment variables:

| Variable            | Value                                              |
|---------------------|----------------------------------------------------|
| `MODAL_SUBMIT_URL`  | `https://pianoflow-transcribe--submit.modal.run`   |
| `MODAL_RESULT_URL`  | `https://pianoflow-transcribe--result.modal.run`   |

---

## Package mounting

`add_local_python_source("pianoflow_music")` mounts `packages/music-core/` into
the Modal container at import time. The `modal` CLI resolves this path relative
to the current working directory, so **always run modal commands from the repo
root**.

---

## GPU, cold start, and model weights

- **GPU:** NVIDIA A10G (24 GB VRAM).
- **Cold start:** a few seconds once the image is cached; first run after deploy
  also downloads Transkun model weights (one-time, cached in the Modal volume).
- **Timeout:** 600 s per transcription call.

---

## Cost

Covered by Modal's Starter plan free credits ($30/month). A10G is billed per
second of GPU time only while a function is actually running.
