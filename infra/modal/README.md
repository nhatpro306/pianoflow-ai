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

---

## Direct browser upload (large files)

The demo browser uploads audio **directly to Modal**, not through the Vercel
`/api/transcribe` proxy, because Vercel's serverless body limit (~4.5 MB) is
smaller than a base64-encoded 3-4 minute song. The Modal app exposes a single
CORS-enabled FastAPI app (`web`) with two routes:

- `POST {web_url}/submit` — body `{ audio_b64, options }` → `{ call_id }`
- `GET  {web_url}/result?call_id=...` → `{ status, result | error }`

Both require an `X-Demo-Token` header matching `DEMO_TOKEN` in the Modal secret
`pianoflow-demo`. Create the secret once:

```bash
modal secret create pianoflow-demo DEMO_TOKEN=<your-token>
```

Then set these in Vercel (and `.env` locally), all to the deployed `web` URL:

- `NEXT_PUBLIC_MODAL_SUBMIT_URL` = `https://<org>--pianoflow-transcribe-web.modal.run`
- `NEXT_PUBLIC_MODAL_RESULT_URL` = `https://<org>--pianoflow-transcribe-web.modal.run`
- `NEXT_PUBLIC_DEMO_TOKEN` = the same token

Deploy: `modal deploy infra/modal/transcribe_app.py`.

The old server-side `MODAL_SUBMIT_URL`/`MODAL_RESULT_URL` (used by the
`/api/transcribe` proxy fallback for small/local uploads) still work when the
`NEXT_PUBLIC_*` vars are unset.
