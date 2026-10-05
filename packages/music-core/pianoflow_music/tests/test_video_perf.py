"""Video performance, PSNR regression, and golden reference frame tests."""

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.video.frames import RESOLUTIONS, FrameRenderer, RenderConfig

GOLDEN_DIR = Path(__file__).parent / "golden"


def _compute_psnr(img1_bytes: bytes, img2_bytes: bytes) -> float:
    arr1 = np.frombuffer(img1_bytes, dtype=np.uint8).astype(np.float64)
    arr2 = np.frombuffer(img2_bytes, dtype=np.uint8).astype(np.float64)
    mse = np.mean((arr1 - arr2) ** 2)
    if mse == 0:
        return 999.0
    return float(10 * math.log10((255.0**2) / mse))


def _synthetic_test_notes() -> NoteData:
    """Generate synthetic notes across 10 seconds."""
    notes = []
    for i in range(100):
        start = i * 0.1
        duration = 0.3 + (i % 5) * 0.2
        end = start + duration
        pitch = 36 + (i * 7) % 52
        hand = "R" if pitch >= 60 else "L"
        notes.append(
            Note(
                id=i,
                pitch=pitch,
                name="C4",
                velocity=80,
                start=round(start, 4),
                end=round(end, 4),
                duration=round(duration, 4),
                track=0 if hand == "R" else 1,
                hand=hand,
            )
        )
    return NoteData(
        schema_version=SCHEMA_VERSION,
        bpm=120.0,
        duration_sec=10.0,
        time_signature="4/4",
        notes=notes,
    )


class TestVideoPerformance:
    def test_windowed_scan_equivalence(self) -> None:
        """Two-sided bisect scan must yield identical notes to exhaustive linear search."""
        data = _synthetic_test_notes()
        renderer = FrameRenderer(data, RenderConfig(resolution="720p", fps=30))

        # Test at various timestamps
        test_times = [0.0, 0.5, 1.25, 3.5, 5.0, 8.0, 10.0, 12.0]
        for t in test_times:
            # Optimized windowed scan
            windowed = list(renderer._visible_notes(t))

            # Exhaustive baseline scan
            exhaustive = [
                n for n in renderer.notes if n.start <= t + renderer.lookahead and n.end + 0.5 >= t
            ]

            assert len(windowed) == len(exhaustive), f"Count mismatch at t={t}"
            assert [n.id for n in windowed] == [n.id for n in exhaustive]

    def test_golden_frames_psnr_quality(self) -> None:
        """FrameRenderer output must maintain PSNR >= 35.0 dB vs golden reference frames."""
        manifest_path = GOLDEN_DIR / "manifest.json"
        if not manifest_path.exists():
            pytest.skip("Golden reference frames manifest not found.")

        manifest = json.loads(manifest_path.read_text("utf-8"))

        # Load synthetic notes corresponding to reference frames
        fixtures_json = (
            Path(__file__).resolve().parent.parent.parent.parent.parent
            / "scripts"
            / "bench"
            / "fixtures"
            / "synthetic_notes_60s.json"
        )
        if not fixtures_json.exists():
            pytest.skip("synthetic_notes_60s.json fixture not found.")

        note_data = NoteData.from_dict(json.loads(fixtures_json.read_text("utf-8")))
        config = RenderConfig(resolution="720p", fps=30)
        renderer = FrameRenderer(note_data, config)

        for item in manifest:
            frame_idx = item["frame_index"]
            ref_path = GOLDEN_DIR / item["file_name"]
            ref_bytes = Image.open(ref_path).tobytes()

            rendered_bytes = renderer.render_frame(frame_idx)
            psnr = _compute_psnr(ref_bytes, rendered_bytes)

            assert psnr >= 35.0, (
                f"Frame {frame_idx:04d} PSNR ({psnr:.2f} dB) fell below quality threshold 35.0 dB"
            )

    def test_buffer_reuse_and_state_isolation(self) -> None:
        """Buffer reuse must not leak state between consecutive or out-of-order calls."""
        data = _synthetic_test_notes()
        config = RenderConfig(resolution="720p", fps=30)
        renderer = FrameRenderer(data, config)

        # Render frame 10, then frame 50, then frame 10 again
        frame_10_first = renderer.render_frame(10)
        frame_50 = renderer.render_frame(50)
        frame_10_second = renderer.render_frame(10)

        assert frame_10_first != frame_50
        assert hashlib.sha256(frame_10_first).digest() == hashlib.sha256(frame_10_second).digest()

    def test_vertical_resolutions_supported(self) -> None:
        """Renderer handles vertical resolutions with buffer allocation correctly."""
        data = _synthetic_test_notes()
        for res in ["720p_vertical", "1080p_vertical"]:
            config = RenderConfig(resolution=res, fps=30)
            renderer = FrameRenderer(data, config)
            frame_bytes = renderer.render_frame(0)
            w, h = RESOLUTIONS[res]
            assert len(frame_bytes) == w * h * 3

    def test_empty_notes_renders_clean_frame(self) -> None:
        """An empty song renders static background without error."""
        empty_data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=120.0,
            duration_sec=2.0,
            time_signature="4/4",
            notes=[],
        )
        renderer = FrameRenderer(empty_data, RenderConfig(resolution="720p", fps=30))
        frame_bytes = renderer.render_frame(0)
        assert len(frame_bytes) == 1280 * 720 * 3
