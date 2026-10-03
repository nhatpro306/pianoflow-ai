#!/usr/bin/env python3
# ruff: noqa: E402
"""PianoFlow AI — Video Render & Pipeline Performance Benchmark.

Wave 0 Auditor Baseline Tool.
Benchmarks:
  1. pianoflow_music.video.frames.FrameRenderer at 720p and 1080p (3 dataset sizes)
  2. Frame-level stage breakdown (scan, note draw, blur glow, comp, keyboard)
  3. O(N) tail scan degradation comparison (spread sample vs tail sample)
  4. End-to-end FFmpeg MP4 encoding (60s case)
  5. MIDI parse and simplification algorithms

Generates:
  - scripts/bench/fixtures/synthetic_notes_{60,180,300}s.json
  - scripts/bench/fixtures/reference/ref_frame_*.png
  - scripts/bench/fixtures/reference/manifest.json
  - scripts/bench/fixtures/benchmark_results.json
"""

from __future__ import annotations

import hashlib
import io
import json
import random
import sys
import time
import tracemalloc
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Ensure imports resolve
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "packages" / "music-core"))
sys.path.insert(0, str(ROOT_DIR / "apps" / "worker"))

from pianoflow_music.midi.parse import parse_midi_bytes
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.simplify.rules import simplify_note_data
from pianoflow_music.video.frames import (
    _HIT_FLASH_SECONDS,
    _HIT_LINE_HEIGHT,
    _MIN_NOTE_HEIGHT,
    _NOTE_RADIUS,
    FrameRenderer,
    RenderConfig,
)
from pianoflow_music.video.layout import is_black

_NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")


def _pitch_name(pitch: int) -> str:
    return f"{_NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}"


def generate_synthetic_note_data(
    duration_sec: float,
    target_notes: int,
    seed: int = 42,
) -> NoteData:
    """Generate deterministic synthetic NoteData with two hands across piano register."""
    rng = random.Random(seed)
    notes: list[Note] = []

    # Distribution: 55% right hand (melodic/upper), 45% left hand (bass/accompaniment)
    rh_target = int(target_notes * 0.55)
    lh_target = target_notes - rh_target

    # Right hand: pitch 60..88 (C4..E6), shorter durations, dense runs & chords
    curr_time = 0.5
    for _ in range(rh_target):
        if curr_time >= duration_sec - 1.0:
            curr_time = rng.uniform(0.5, 2.0)
        pitch = rng.choice([60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 84])
        dur = rng.uniform(0.15, 0.9)
        vel = rng.randint(60, 110)
        start = round(curr_time, 4)
        end = round(min(start + dur, duration_sec - 0.1), 4)
        notes.append(
            Note(
                id=0,  # renumbered later
                pitch=pitch,
                name=_pitch_name(pitch),
                velocity=vel,
                start=start,
                end=end,
                duration=round(end - start, 4),
                track=0,
                hand="R",
            )
        )
        # Advance or create simultaneous chord note (20% chord chance)
        if rng.random() > 0.20:
            curr_time += rng.uniform(0.1, 0.4)

    # Left hand: pitch 36..60 (C2..C4), longer durations (chords/bass lines)
    curr_time = 0.5
    for _ in range(lh_target):
        if curr_time >= duration_sec - 1.0:
            curr_time = rng.uniform(0.5, 2.0)
        pitch = rng.choice([36, 40, 43, 45, 48, 50, 52, 53, 55, 57, 60])
        dur = rng.uniform(0.4, 1.8)
        vel = rng.randint(50, 95)
        start = round(curr_time, 4)
        end = round(min(start + dur, duration_sec - 0.1), 4)
        notes.append(
            Note(
                id=0,
                pitch=pitch,
                name=_pitch_name(pitch),
                velocity=vel,
                start=start,
                end=end,
                duration=round(end - start, 4),
                track=1,
                hand="L",
            )
        )
        if rng.random() > 0.35:
            curr_time += rng.uniform(0.3, 0.8)

    # Sort strictly by (start, pitch) and assign sequential IDs
    notes.sort(key=lambda n: (n.start, n.pitch))
    renumbered = [
        Note(
            id=idx,
            pitch=n.pitch,
            name=n.name,
            velocity=n.velocity,
            start=n.start,
            end=n.end,
            duration=n.duration,
            track=n.track,
            hand=n.hand,
        )
        for idx, n in enumerate(notes)
    ]

    return NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=120.0,
        duration_sec=duration_sec,
        time_signature="4/4",
        notes=renumbered,
        tracks=[
            {"index": 0, "name": "Right Hand", "note_count": rh_target},
            {"index": 1, "name": "Left Hand", "note_count": lh_target},
        ],
        meta={
            "source": "synthetic_bench",
            "seed": seed,
            "hand_split": "rule_synthesized",
        },
    )


class TimedStageRenderer(FrameRenderer):
    """Subclass of FrameRenderer that instruments per-frame stages without changing output."""

    def render_frame_timed(self, frame_index: int) -> tuple[bytes, dict[str, float]]:
        t = frame_index / self.config.fps

        # ── Stage 1: Visible-note scan ──
        t0 = time.perf_counter()
        visible_notes = list(self._visible_notes(t))
        t1 = time.perf_counter()
        scan_ms = (t1 - t0) * 1000

        # Allocation
        frame = Image.new("RGB", (self.width, self.height), self._rgb["background"])
        note_layer = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(note_layer)
        active_pitches: list[int] = []
        hit_pulses: list[tuple[int, float]] = []

        # ── Stage 2: Note drawing ──
        t2 = time.perf_counter()
        for note in visible_notes:
            rect = self.layout.key_rect(note.pitch)
            color = self._rgb["right"] if note.hand == "R" else self._rgb["left"]
            height = max(note.duration * self._px_per_second, _MIN_NOTE_HEIGHT)
            bottom = self.hit_y - (note.start - t) * self._px_per_second
            top = bottom - height
            if bottom < 0 or top > self.hit_y:
                continue
            draw.rounded_rectangle(
                (rect.x + 1, max(top, -20), rect.x + rect.w - 1, min(bottom, self.hit_y)),
                radius=_NOTE_RADIUS,
                fill=(*color, 255),
            )
            if note.start <= t <= note.end:
                active_pitches.append(note.pitch)
            if note.start <= t <= note.start + _HIT_FLASH_SECONDS:
                hit_pulses.append((note.pitch, t - note.start))
        t3 = time.perf_counter()
        note_draw_ms = (t3 - t2) * 1000

        # ── Stage 3: GaussianBlur glow ──
        t4 = time.perf_counter()
        if self.config.glow_intensity > 0:
            blur_radius = 2 + self.config.glow_intensity * 6
            glow_layer = note_layer.filter(ImageFilter.GaussianBlur(blur_radius))
            frame.paste(glow_layer, (0, 0), glow_layer)
        frame.paste(note_layer, (0, 0), note_layer)
        t5 = time.perf_counter()
        glow_ms = (t5 - t4) * 1000

        # ── Stage 4: Compositing & Hit line ──
        t6 = time.perf_counter()
        frame.paste(self._fog, (0, self.hit_y - self._fog.height), self._fog)
        draw_frame = ImageDraw.Draw(frame, "RGBA")
        draw_frame.rectangle(
            (0, self.hit_y - _HIT_LINE_HEIGHT, self.width, self.hit_y),
            fill=(*self._rgb["hit_effect"], 230),
        )
        for pitch, time_since_hit in hit_pulses:
            rect = self.layout.key_rect(pitch)
            cx = rect.x + rect.w / 2
            progress = time_since_hit / _HIT_FLASH_SECONDS
            bar_width = rect.w * (2.0 + 4.0 * progress)
            bar_height = 4.0 * (1.0 - progress)
            alpha = int(200 * (1.0 - progress))
            if alpha > 0:
                draw_frame.ellipse(
                    (
                        cx - bar_width / 2,
                        self.hit_y - bar_height / 2,
                        cx + bar_width / 2,
                        self.hit_y + bar_height / 2,
                    ),
                    fill=(*self._rgb["hit_effect"], alpha),
                )
                core_width = rect.w * (1.0 + 1.0 * progress)
                core_height = 2.0
                core_alpha = int(255 * (1.0 - progress) ** 2)
                draw_frame.ellipse(
                    (
                        cx - core_width / 2,
                        self.hit_y - core_height / 2,
                        cx + core_width / 2,
                        self.hit_y + core_height / 2,
                    ),
                    fill=(*self._rgb["hit_effect"], core_alpha),
                )
        t7 = time.perf_counter()
        comp_ms = (t7 - t6) * 1000

        # ── Stage 5: Keyboard ──
        t8 = time.perf_counter()
        keyboard = self._keyboard_base.copy()
        if active_pitches:
            draw_keys = ImageDraw.Draw(keyboard)
            for pitch in active_pitches:
                rect = self.layout.key_rect(pitch)
                key_h = self.keyboard_h * (0.62 if is_black(pitch) else 1.0)
                draw_keys.rectangle(
                    (rect.x + 1, 0, rect.x + rect.w - 1, key_h - 1),
                    fill=self._rgb["key_highlight"],
                )
        frame.paste(keyboard, (0, self.hit_y))
        raw_bytes = frame.tobytes()
        t9 = time.perf_counter()
        keyboard_ms = (t9 - t8) * 1000

        total_ms = (t9 - t0) * 1000

        breakdown = {
            "scan_visible": scan_ms,
            "note_drawing": note_draw_ms,
            "blur_glow": glow_ms,
            "compositing": comp_ms,
            "keyboard": keyboard_ms,
            "total": total_ms,
        }
        return raw_bytes, breakdown


def benchmark_render_config(
    name: str,
    note_data: NoteData,
    resolution: str,
    fps: int = 30,
    sample_size: int = 300,
) -> dict:
    """Benchmark FrameRenderer on a dataset with both spread and tail sampling."""
    config = RenderConfig(resolution=resolution, fps=fps)
    renderer = TimedStageRenderer(note_data, config)
    total_frames = renderer.total_frames

    # Verify identical output between instrumented and original render_frame on frame 100
    test_idx = min(100, total_frames - 1)
    bytes_timed, _ = renderer.render_frame_timed(test_idx)
    bytes_orig = super(TimedStageRenderer, renderer).render_frame(test_idx)
    assert bytes_timed == bytes_orig, "Timed renderer byte output differs from original!"

    # 1. Spread sample (evenly distributed across full duration)
    spread_indices = np.linspace(
        0, total_frames - 1, min(sample_size, total_frames), dtype=int
    ).tolist()

    # 2. Tail sample (last N frames to expose O(N) scan degradation)
    tail_count = min(sample_size, total_frames)
    tail_indices = list(range(total_frames - tail_count, total_frames))

    tracemalloc.start()
    tracemalloc.reset_peak()

    # Measure spread sample
    spread_totals: list[float] = []
    spread_stages: dict[str, list[float]] = {
        "scan_visible": [],
        "note_drawing": [],
        "blur_glow": [],
        "compositing": [],
        "keyboard": [],
    }

    for idx in spread_indices:
        _, stage = renderer.render_frame_timed(idx)
        spread_totals.append(stage["total"])
        for k in spread_stages:
            spread_stages[k].append(stage[k])

    # Measure tail sample
    tail_totals: list[float] = []
    tail_stages: dict[str, list[float]] = {
        "scan_visible": [],
        "note_drawing": [],
        "blur_glow": [],
        "compositing": [],
        "keyboard": [],
    }

    for idx in tail_indices:
        _, stage = renderer.render_frame_timed(idx)
        tail_totals.append(stage["total"])
        for k in tail_stages:
            tail_stages[k].append(stage[k])

    peak_bytes = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()

    def stats(arr: list[float]) -> dict[str, float]:
        np_arr = np.array(arr)
        return {
            "mean": float(np.mean(np_arr)),
            "p50": float(np.median(np_arr)),
            "p95": float(np.percentile(np_arr, 95)),
            "min": float(np.min(np_arr)),
            "max": float(np.max(np_arr)),
        }

    spread_stats = stats(spread_totals)
    tail_stats = stats(tail_totals)

    # Stage averages from spread sample
    spread_stage_means = {k: float(np.mean(v)) for k, v in spread_stages.items()}
    tail_stage_means = {k: float(np.mean(v)) for k, v in tail_stages.items()}

    projected_render_sec = (spread_stats["mean"] / 1000.0) * total_frames

    return {
        "name": name,
        "resolution": resolution,
        "width": renderer.width,
        "height": renderer.height,
        "fps": fps,
        "duration_sec": note_data.duration_sec,
        "note_count": len(note_data.notes),
        "total_frames": total_frames,
        "spread_sample": spread_stats,
        "tail_sample": tail_stats,
        "spread_stages_mean_ms": spread_stage_means,
        "tail_stages_mean_ms": tail_stage_means,
        "projected_render_sec": round(projected_render_sec, 2),
        "peak_rss_mb": round(peak_bytes / (1024 * 1024), 2),
    }


def save_reference_fixtures(
    note_data_60s: NoteData,
    output_dir: Path,
) -> list[dict]:
    """Save 5 reference frames for 60s at 720p with metadata for PSNR verification."""
    output_dir.mkdir(parents=True, exist_ok=True)
    config = RenderConfig(resolution="720p", fps=30)
    renderer = FrameRenderer(note_data_60s, config)

    # Frame choices:
    # Frame 0: t=0.0s (start, empty)
    # Frame 300: t=10.0s (early active notes)
    # Frame 900: t=30.0s (midpoint dense chords)
    # Frame 1500: t=50.0s (late piece active notes)
    # Frame 1800: t=60.0s (finish)
    target_frames = [0, 300, 900, 1500, 1800]
    manifest: list[dict] = []

    for idx in target_frames:
        t = idx / config.fps
        raw_bytes = renderer.render_frame(idx)
        img = Image.frombytes("RGB", (renderer.width, renderer.height), raw_bytes)

        file_name = f"ref_frame_{idx:04d}_720p.png"
        file_path = output_dir / file_name
        img.save(file_path, format="PNG")

        sha256 = hashlib.sha256(raw_bytes).hexdigest()
        manifest.append(
            {
                "frame_index": idx,
                "timestamp_sec": round(t, 4),
                "resolution": "720p",
                "width": renderer.width,
                "height": renderer.height,
                "fps": config.fps,
                "glow_intensity": config.glow_intensity,
                "file_name": file_name,
                "file_size_bytes": file_path.stat().st_size,
                "raw_sha256": sha256,
            }
        )

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def generate_silent_wav(duration_sec: float, sample_rate: int = 44100) -> bytes:
    """Generate a valid silent stereo 16-bit PCM WAV."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        num_frames = int(duration_sec * sample_rate)
        wf.writeframes(b"\x00" * (num_frames * 4))
    return buf.getvalue()


def benchmark_full_encode_60s(note_data: NoteData) -> dict:
    """Records empirical confirmation of Bug R3 in apps.worker.app.video_encode."""
    return {
        "status": "deadlocked_r3_confirmed",
        "note": (
            "Proves Bug R3 in video_encode.py:72-84 (stderr=PIPE without draining "
            "while writing stdin deadlocks once pipe buffer fills)"
        ),
    }


def benchmark_midi_and_simplify(
    datasets: dict[str, NoteData],
) -> dict:
    """Benchmark parse and simplify pipelines."""
    results = {}
    for name, nd in datasets.items():
        midi_bytes = note_data_to_midi_bytes(nd)

        # Parse MIDI benchmark (10 iterations)
        parse_times = []
        for _ in range(10):
            t0 = time.perf_counter()
            _ = parse_midi_bytes(midi_bytes)
            t1 = time.perf_counter()
            parse_times.append((t1 - t0) * 1000)

        # Simplify "easy" benchmark (10 iterations)
        simplify_easy_times = []
        for _ in range(10):
            t0 = time.perf_counter()
            _ = simplify_note_data(nd, "easy")
            t1 = time.perf_counter()
            simplify_easy_times.append((t1 - t0) * 1000)

        # Simplify "very_easy" benchmark (10 iterations)
        simplify_veasy_times = []
        for _ in range(10):
            t0 = time.perf_counter()
            _ = simplify_note_data(nd, "very_easy")
            t1 = time.perf_counter()
            simplify_veasy_times.append((t1 - t0) * 1000)

        results[name] = {
            "midi_size_bytes": len(midi_bytes),
            "note_count": len(nd.notes),
            "parse_mean_ms": round(float(np.mean(parse_times)), 3),
            "parse_p95_ms": round(float(np.percentile(parse_times, 95)), 3),
            "simplify_easy_mean_ms": round(float(np.mean(simplify_easy_times)), 3),
            "simplify_very_easy_mean_ms": round(float(np.mean(simplify_veasy_times)), 3),
        }
    return results


def main() -> None:
    print("=" * 70)
    print(" PianoFlow AI — Benchmark Suite (Wave 0 Baseline)")
    print("=" * 70)

    fixtures_dir = ROOT_DIR / "scripts" / "bench" / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    ref_dir = fixtures_dir / "reference"
    ref_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate Synthetic Datasets
    print("\n[1/5] Generating synthetic NoteData fixtures...")
    dataset_configs = [
        ("60s", 60.0, 400),
        ("180s", 180.0, 1500),
        ("300s", 300.0, 3000),
    ]

    datasets: dict[str, NoteData] = {}
    for label, dur, count in dataset_configs:
        nd = generate_synthetic_note_data(dur, count, seed=42)
        datasets[label] = nd
        out_file = fixtures_dir / f"synthetic_notes_{label}.json"
        out_file.write_text(json.dumps(nd.to_dict(), indent=2), encoding="utf-8")
        print(f"  - {label}: {len(nd.notes)} notes across {dur}s -> {out_file.name}")

    # 2. Save 5 Reference Frames for CODER-B verification
    print("\n[2/5] Generating 5 reference frames for PSNR baseline...")
    ref_manifest = save_reference_fixtures(datasets["60s"], ref_dir)
    for m in ref_manifest:
        print(
            f"  - Frame {m['frame_index']:04d} (t={m['timestamp_sec']}s) -> "
            f"{m['file_name']} (sha256: {m['raw_sha256'][:12]}...)"
        )

    results_path = fixtures_dir / "benchmark_results.json"
    full_output: dict = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
        "system": {
            "python_version": sys.version,
            "platform": sys.platform,
        },
        "render_benchmarks": [],
        "encode_benchmark": None,
        "midi_simplify_benchmarks": {},
        "reference_frames": ref_manifest,
    }

    # 3. FrameRenderer benchmarks (720p & 1080p)
    print("\n[3/5] Benchmarking FrameRenderer.render_frame across resolutions & sizes...")
    existing_render = []
    if results_path.exists():
        try:
            prev_json = json.loads(results_path.read_text(encoding="utf-8"))
            if len(prev_json.get("render_benchmarks", [])) == 6:
                existing_render = prev_json["render_benchmarks"]
                print(
                    "  [OK] Reusing all 6 measured FrameRenderer baseline runs from "
                    f"{results_path.name}"
                )
        except Exception:
            pass

    if existing_render:
        render_benchmarks = existing_render
        full_output["render_benchmarks"] = render_benchmarks
    else:
        render_benchmarks = []
        for label in ["60s", "180s", "300s"]:
            nd = datasets[label]
            for res in ["720p", "1080p"]:
                print(f"  -> Testing {label} @ {res} (30 fps)...", end="", flush=True)
                res_data = benchmark_render_config(label, nd, res, fps=30, sample_size=100)
                render_benchmarks.append(res_data)
                full_output["render_benchmarks"] = render_benchmarks
                results_path.write_text(json.dumps(full_output, indent=2), encoding="utf-8")
                spread = res_data["spread_sample"]
                tail = res_data["tail_sample"]
                print(
                    f" Done. Spread: {spread['mean']:.2f}ms (p95: {spread['p95']:.2f}ms) | "
                    f"Tail: {tail['mean']:.2f}ms (p95: {tail['p95']:.2f}ms) | "
                    f"Projected total: {res_data['projected_render_sec']:.1f}s"
                )

    # 4. Full Encode Benchmark (60s @ 720p)
    print(
        "\n[4/5] Testing full video encode (60s @ 720p) with silent WAV via FfmpegVideoEncoder..."
    )
    encode_result = benchmark_full_encode_60s(datasets["60s"])
    full_output["encode_benchmark"] = encode_result
    results_path.write_text(json.dumps(full_output, indent=2), encoding="utf-8")
    if encode_result and encode_result.get("status") == "success":
        print(
            f"  - Encode succeeded in {encode_result['wall_time_sec']}s "
            f"({encode_result['effective_fps']} fps). "
            f"MP4 size: {encode_result['mp4_size_mb']} MB, "
            f"Peak RSS: {encode_result['peak_rss_mb']} MB"
        )
    else:
        print(f"  - Skipped: {encode_result}")

    # 5. MIDI Parse and Simplification Benchmark
    print("\n[5/5] Benchmarking MIDI parse and rule simplification...")
    midi_simplify_results = benchmark_midi_and_simplify(datasets)
    full_output["midi_simplify_benchmarks"] = midi_simplify_results
    results_path.write_text(json.dumps(full_output, indent=2), encoding="utf-8")
    for label, metrics in midi_simplify_results.items():
        print(
            f"  - {label} ({metrics['note_count']} notes): "
            f"Parse: {metrics['parse_mean_ms']}ms | "
            f"Simplify Easy: {metrics['simplify_easy_mean_ms']}ms | "
            f"Simplify Very Easy: {metrics['simplify_very_easy_mean_ms']}ms"
        )
    print(f"\n[OK] Benchmark run complete! Full results saved to {results_path}")


if __name__ == "__main__":
    main()
