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
htdemucs sources order: ['drums', 'bass', 'other', 'vocals']

- "drums"   — percussion
- "bass"    — bass guitar / sub frequencies
- "other"   — everything else (piano, keys, synths, guitars, …)
- "vocals"  — singing voice

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
        Which htdemucs stem to keep.  One of "drums", "bass", "other",
        "vocals".  Defaults to "other" (piano / keys / synths).
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
    # Deferred imports — keep module import cheap even without the extra.
    try:
        import torch
        from demucs.apply import apply_model
        from demucs.audio import AudioFile, save_audio
        from demucs.pretrained import get_model
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

        model = get_model("htdemucs")
        model.eval()
        if stem not in model.sources:
            raise TranscriptionError(
                f"Stem {stem!r} not found in htdemucs output. Available: {sorted(model.sources)}",
                code="SEPARATION_FAILED",
            )
        stem_index = model.sources.index(stem)

        # Load audio at the model's native rate/channels.
        wav = AudioFile(tmp_in).read(
            streams=0,
            samplerate=model.samplerate,
            channels=model.audio_channels,
        )
        ref = wav.mean(0)
        wav = (wav - ref.mean()) / (ref.std() + 1e-8)

        def _run(device: str):
            model.to(device)
            sources = apply_model(
                model,
                wav[None],
                device=device,
                segment=segment,
                overlap=0.1,
                progress=False,
            )[0]
            sources = sources * ref.std() + ref.mean()
            return sources[stem_index]

        device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            stem_tensor = _run(device)
        except torch.cuda.OutOfMemoryError:
            stem_tensor = _run("cpu")

        # Export stem tensor to WAV bytes via a temp output file.
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f_out:
            tmp_out = f_out.name
        save_audio(stem_tensor, tmp_out, samplerate=model.samplerate)
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
