"""Load test: N concurrent upload→parse flows (Phase 11 deliverable).

Drives the public API exactly like the web client:
  create project → init upload → PUT MIDI to signed URL → confirm
  → poll parse job until done.

Usage:
    uv run --directory apps/api python ../../scripts/load_test.py \
        --base-url https://API_URL --token JWT --concurrency 10 \
        --midi packages/music-core/pianoflow_music/tests/fixtures/simple.mid

Dev mode (AUTH_MODE=dev) needs no --token. Exit 0 only if every flow
completes. Mind the per-user daily upload quota — the rate limiter
counts these uploads like any other.
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

import httpx

POLL_INTERVAL = 2.0
TIMEOUT_SECONDS = 300


async def run_flow(client: httpx.AsyncClient, index: int, midi: bytes) -> dict:
    started = time.monotonic()

    resp = await client.post("/api/v1/projects", json={"name": f"load-test-{index}"})
    resp.raise_for_status()
    project_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/projects/{project_id}/upload-midi",
        json={"filename": "load.mid", "size_bytes": len(midi), "content_type": "audio/midi"},
    )
    resp.raise_for_status()
    init = resp.json()

    put = await client.request(
        init["method"],
        init["upload_url"],
        content=midi,
        headers=init["headers"],
    )
    put.raise_for_status()

    resp = await client.post(
        f"/api/v1/projects/{project_id}/upload-midi/confirm",
        json={"upload_id": init["upload_id"]},
    )
    resp.raise_for_status()
    job_id = resp.json()["parse_job"]["id"]

    deadline = time.monotonic() + TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        resp = await client.get(f"/api/v1/jobs/{job_id}")
        resp.raise_for_status()
        status = resp.json()["status"]
        if status == "completed":
            return {"index": index, "ok": True, "seconds": time.monotonic() - started}
        if status in ("failed", "cancelled"):
            return {"index": index, "ok": False, "error": f"job {status}"}
        await asyncio.sleep(POLL_INTERVAL)
    return {"index": index, "ok": False, "error": "timeout"}


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--token", default="")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--midi", required=True, type=Path)
    args = parser.parse_args()

    midi = args.midi.read_bytes()
    headers = {"Authorization": f"Bearer {args.token}"} if args.token else {}

    async with httpx.AsyncClient(base_url=args.base_url, headers=headers, timeout=60.0) as client:
        results = await asyncio.gather(
            *(run_flow(client, i, midi) for i in range(args.concurrency)),
            return_exceptions=True,
        )

    ok = 0
    for result in results:
        if isinstance(result, Exception):
            print(f"  FAIL: {result}")
        elif result["ok"]:
            ok += 1
            print(f"  ok #{result['index']}: {result['seconds']:.1f}s")
        else:
            print(f"  FAIL #{result['index']}: {result['error']}")

    total = len(results)
    print(f"\n{ok}/{total} flows completed")
    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
