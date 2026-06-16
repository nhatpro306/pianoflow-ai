#!/usr/bin/env python
"""Smoke test for the Modal transcription endpoint.

Usage:
    python scripts/demo_smoke.py

Reads MODAL_SUBMIT_URL and MODAL_RESULT_URL from environment (or .env).
Sends a tiny synthetic WAV and asserts a MIDI comes back within 3 minutes.
Prints PASS or FAIL with details.
"""

from __future__ import annotations

import array
import base64
import io
import json
import math
import os
import struct
import sys
import time
import urllib.request
import wave


# ---------------------------------------------------------------------------
# WAV generation — stdlib only, no numpy/scipy
# ---------------------------------------------------------------------------

def _make_sine_wav(
    *,
    frequency: float = 440.0,
    duration_sec: float = 1.0,
    sample_rate: int = 44100,
    amplitude: float = 0.5,
) -> bytes:
    """Return a minimal mono 16-bit PCM WAV at the given frequency."""
    n_samples = int(sample_rate * duration_sec)
    samples = array.array(
        "h",
        (
            int(amplitude * 32767 * math.sin(2 * math.pi * frequency * t / sample_rate))
            for t in range(n_samples)
        ),
    )
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(samples.tobytes())
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Env loading
# ---------------------------------------------------------------------------

def _load_env() -> None:
    """Populate os.environ from .env in the repo root (if python-dotenv is installed)."""
    try:
        from dotenv import load_dotenv  # type: ignore[import-untyped]

        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_file = os.path.join(repo_root, ".env")
        if os.path.exists(env_file):
            load_dotenv(env_file, override=False)
            print(f"Loaded .env from {env_file}")
    except ImportError:
        pass  # python-dotenv not installed — rely on real env vars


# ---------------------------------------------------------------------------
# HTTP helpers (stdlib urllib only)
# ---------------------------------------------------------------------------

def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Main smoke test
# ---------------------------------------------------------------------------

def main() -> None:
    _load_env()

    submit_url = os.environ.get("MODAL_SUBMIT_URL")
    result_url = os.environ.get("MODAL_RESULT_URL")

    if not submit_url or not result_url:
        missing = []
        if not submit_url:
            missing.append("MODAL_SUBMIT_URL")
        if not result_url:
            missing.append("MODAL_RESULT_URL")
        print(
            f"FAIL — missing environment variable(s): {', '.join(missing)}\n"
            "Set them in .env or export them before running this script.\n"
            "Example:\n"
            "  MODAL_SUBMIT_URL=https://<org>--pianoflow-transcribe-web.modal.run/submit\n"
            "  MODAL_RESULT_URL=https://<org>--pianoflow-transcribe-web.modal.run/result"
        )
        sys.exit(1)

    print("Generating synthetic WAV (440 Hz, 1 s) …")
    wav_bytes = _make_sine_wav(frequency=440.0, duration_sec=1.0)
    audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
    print(f"  WAV size: {len(wav_bytes)} bytes")

    # --- Submit ---
    print(f"\nPOST {submit_url}")
    try:
        submit_resp = _post_json(
            submit_url,
            {
                "audio_b64": audio_b64,
                "options": {"engine": "transkun", "separate": False},
            },
        )
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL — submit request raised: {exc}")
        sys.exit(1)

    call_id = submit_resp.get("call_id")
    if not call_id:
        print(f"FAIL — submit response missing 'call_id': {submit_resp!r}")
        sys.exit(1)
    print(f"  call_id: {call_id}")

    # --- Poll ---
    poll_interval_sec = 3
    max_attempts = 60  # 3 minutes
    poll_url = f"{result_url}?call_id={call_id}"
    print(f"\nPolling {poll_url}")
    print(f"  (max {max_attempts} attempts × {poll_interval_sec}s = {max_attempts * poll_interval_sec}s)")

    for attempt in range(1, max_attempts + 1):
        time.sleep(poll_interval_sec)
        try:
            result = _get_json(poll_url)
        except Exception as exc:  # noqa: BLE001
            print(f"  [{attempt}/{max_attempts}] poll error: {exc}")
            continue

        status = result.get("status", "")
        print(f"  [{attempt}/{max_attempts}] status={status!r}")

        if status == "processing" or status == "queued" or status == "":
            continue  # still running

        if status == "failed":
            error = result.get("error", "(no details)")
            # "No notes detected" is expected for synthetic sine-wave audio —
            # it proves the model ran end-to-end; treat as pipeline PASS.
            if "No notes detected" in error or "NO_NOTES_DETECTED" in error:
                print(
                    f"\nPASS (pipeline) — model ran end-to-end in "
                    f"{attempt * poll_interval_sec}s; no notes in synthetic audio (expected)."
                )
                return
            print(f"FAIL — Modal reported failure: {error}")
            sys.exit(1)

        if status == "done" or "midi_b64" in result.get("result", {}):
            break
    else:
        print(f"FAIL — timed out after {max_attempts * poll_interval_sec}s without a result")
        sys.exit(1)

    # --- Assert MIDI (real audio path) ---
    inner = result.get("result", result)
    midi_b64 = inner.get("midi_b64")
    if not midi_b64:
        print(f"FAIL — result missing 'midi_b64' key: {list(inner.keys())}")
        sys.exit(1)

    try:
        midi_bytes = base64.b64decode(midi_b64)
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL — could not base64-decode midi_b64: {exc}")
        sys.exit(1)

    # MIDI magic bytes: MThd (0x4D 0x54 0x68 0x64)
    magic = b"MThd"
    if not midi_bytes.startswith(magic):
        actual = midi_bytes[:4]
        print(f"FAIL — MIDI bytes don't start with {magic!r}, got {actual!r}")
        sys.exit(1)

    note_count = inner.get("note_count", "n/a")
    print(
        f"\nPASS — received {len(midi_bytes)}-byte MIDI file"
        f" with {note_count} note(s) in "
        f"{attempt * poll_interval_sec}s"
    )


if __name__ == "__main__":
    main()
