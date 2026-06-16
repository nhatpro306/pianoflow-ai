"""Demucs stem-separation utility.

Isolates a single stem (e.g. "other" for piano/keys/synths) from a mixed
audio recording using Meta's ``htdemucs`` model.

Heavy imports (``demucs``, ``torch``) are deferred to the function body so
importing this module is cheap and safe in all deployment contexts.  Install
the optional extra to enable:

    pip install "pianoflow-music[separation]"
    # or: uv add "pianoflow-music[separation]"

Without the extra, calling ``separate_target_stem`` raises
``TranscriptionError(code="ENGINE_UNAVAILABLE")``.

Available htdemucs stems
------------------------
- "vocals"  — singing voice
- "drums"   — percussion
- "bass"    — bass guitar / sub frequencies
- "other"   — everything else (piano, keys, synths, guitars, …)

For piano transcription the recommended stem is "other".
"""

from __future__ import annotations

import contextlib
import os
import tempfile

from pianoflow_music.transcription.engine import TranscriptionError


def separate_target_stem(
    audio_bytes: bytes,
    *,
    stem: str = "other",
    segment: int = 7,
) -> bytes:
    """Return WAV bytes of the isolated *stem* separated from *audio_bytes*.

    Parameters
    ----------
    audio_bytes:
        Raw audio file content (WAV, MP3, FLAC, …) to separate.
    stem:
        Which htdemucs stem to keep.  One of "vocals", "drums", "bass",
        "other".  Defaults to "other" (piano / keys / synths).
    segment:
        Demucs segment length in seconds (smaller → less GPU RAM, slower).
        Default 7 s is safe on 8 GB VRAM; reduce to 5 or 3 if OOM persists.

    Returns
    -------
    bytes
        WAV-encoded audio of the isolated stem, ready to pass to a
        transcription engine.

    Raises
    ------
    TranscriptionError(code="ENGINE_UNAVAILABLE")
        When ``demucs`` or ``torch`` is not installed.
    TranscriptionError(code="SEPARATION_FAILED")
        On any other runtime failure (corrupt audio, bad stem name, etc.).
    """
    # Deferred import — keeps module import cheap even without the extra.
    try:
        import demucs.api
        import torch
    except ImportError as exc:
        raise TranscriptionError(
            "Demucs is not installed.  Install the 'separation' extra: "
            "pip install 'pianoflow-music[separation]'",
            code="ENGINE_UNAVAILABLE",
        ) from exc

    tmp_in: str | None = None
    tmp_out: str | None = None
    try:
        # Write raw bytes to a temp input file.
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f_in:
            f_in.write(audio_bytes)
            f_in.flush()
            tmp_in = f_in.name

        def _run(device: str) -> torch.Tensor:
            """Run Demucs inference on *tmp_in* and return the stem tensor."""
            separator = demucs.api.Separator(
                model="htdemucs",
                segment=segment,
                device=device,
            )
            # separate_audio_file returns (origin_tensor, dict[stem_name -> tensor])
            _origin, stems = separator.separate_audio_file(tmp_in)
            if stem not in stems:
                raise TranscriptionError(
                    f"Stem {stem!r} not found in htdemucs output.  "
                    f"Available: {sorted(stems)}",
                    code="SEPARATION_FAILED",
                )
            return stems[stem]

        # Try GPU first; fall back to CPU on OOM.
        device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            stem_tensor = _run(device)
        except torch.cuda.OutOfMemoryError:
            stem_tensor = _run("cpu")

        # Export stem tensor to WAV bytes via a temp output file.
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f_out:
            tmp_out = f_out.name

        demucs.api.save_audio(stem_tensor, tmp_out, samplerate=44100)

        with open(tmp_out, "rb") as fh:
            return fh.read()

    except TranscriptionError:
        raise
    except Exception as exc:
        raise TranscriptionError(
            f"Stem separation failed: {exc}",
            code="SEPARATION_FAILED",
        ) from exc
    finally:
        for path in (tmp_in, tmp_out):
            if path is not None:
                with contextlib.suppress(OSError):
                    os.unlink(path)
