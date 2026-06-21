"""Transkun piano transcription engine adapter (Beta / scaffold).

Transkun (https://github.com/Yujia-Yan/Transkun) is a piano-specific
automatic music transcription model that produces both note events and
sustain-pedal (CC64) events with higher accuracy than general-purpose
transcribers.

Heavy imports are deferred to ``_run_model`` so importing this module is
cheap and safe in all deployment contexts.  Install the optional extra to
enable:

    pip install "pianoflow-music[transkun]"
    # or: uv add "pianoflow-music[transkun]"

Without the extra, instantiation is fine but ``transcribe()`` raises
``TranscriptionError(code="ENGINE_UNAVAILABLE")``.

``_run_model`` contract (the monkeypatch seam used by tests):
  Returns ``(note_events, pedal_events, bpm)`` where:
    note_events  — list of ``(start_sec, end_sec, pitch, velocity_0to127)``
    pedal_events — list of ``(time_sec, value_0to127)``
    bpm          — float
"""

import contextlib
import os
import tempfile

from pianoflow_music.midi.hands import estimate_hands
from pianoflow_music.midi.write import note_data_to_midi_bytes
from pianoflow_music.notes.model import SCHEMA_VERSION, Note, NoteData
from pianoflow_music.transcription.engine import TranscriptionError, TranscriptionResult
from pianoflow_music.transcription.postprocess import clean_notes

ENGINE_NAME = "transkun_v1"

_NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

_BPM_MIN = 40.0
_BPM_MAX = 240.0
_BPM_FALLBACK = 120.0

# Constant confidence baseline — transkun does not expose per-note probabilities
# in this scaffold so we use a fixed value that reflects the model's known accuracy.
_BASE_CONFIDENCE = 0.7
_TEMPO_CONFIDENCE = 0.6

# ---------------------------------------------------------------------------
# Model singleton cache — keyed by device string, built once per device.
# ---------------------------------------------------------------------------

import threading  # noqa: E402 — imported here to keep top-of-file imports minimal

_model_cache: dict = {}
_model_lock = threading.Lock()


def _build_model(device: str):
    """Construct the TransKun model for *device*. Deferred imports keep startup cheap.

    Separated into its own function so tests can monkeypatch it without ever
    importing the real ``transkun`` / ``torch`` packages.
    """
    import moduleconf  # type: ignore[import]
    import pkg_resources  # type: ignore[import]
    import torch  # type: ignore[import]

    conf_path = pkg_resources.resource_filename("transkun", "pretrained/2.0.conf")
    ckpt_path = pkg_resources.resource_filename("transkun", "pretrained/2.0.pt")

    conf_manager = moduleconf.parseFromFile(conf_path)
    TransKun = conf_manager["Model"].module.TransKun
    conf = conf_manager["Model"].config

    model = TransKun(conf=conf).to(device)
    model.eval()

    checkpoint = torch.load(ckpt_path, map_location=device, weights_only=False)
    if "best_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["best_state_dict"], strict=False)
    else:
        model.load_state_dict(checkpoint["state_dict"], strict=False)

    return model


def _get_model(device: str):
    """Return the cached TransKun model for *device*, building it on the first call.

    Thread-safe via double-checked locking. Each unique *device* value gets its
    own cache entry so CPU and GPU models can coexist in the same process.

    Raises:
        TranscriptionError(code="ENGINE_UNAVAILABLE"): if transkun deps are not installed.
    """
    if device not in _model_cache:
        with _model_lock:
            if device not in _model_cache:
                try:
                    _model_cache[device] = _build_model(device)
                except ImportError as exc:
                    raise TranscriptionError(
                        "Transkun engine is not installed. Install the 'transkun' extra.",
                        code="ENGINE_UNAVAILABLE",
                    ) from exc
    return _model_cache[device]


def _pitch_name(pitch: int) -> str:
    """Return scientific pitch name for a MIDI pitch number, e.g. 60 → 'C4'."""
    return f"{_NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}"


class TranskunEngine:
    name = ENGINE_NAME

    def _run_model(self, audio_path: str) -> tuple[list[tuple], list[tuple], float]:
        """Call Transkun inference. Single monkeypatch seam for tests.

        Returns normalised ``(note_events, pedal_events, bpm)``:
          note_events  — list of ``(start_sec, end_sec, pitch, velocity_0to127)``
          pedal_events — list of ``(time_sec, value_0to127)``
          bpm          — float

        The TransKun model is retrieved from the module-level cache (built once per
        device per process) so the expensive ``torch.load`` + ``load_state_dict``
        path is never repeated across jobs.
        """
        try:
            import numpy as np
            import pydub  # type: ignore[import]
            import soxr  # type: ignore[import]
            import torch  # type: ignore[import]
        except ImportError as exc:
            raise TranscriptionError(
                "Transkun engine is not installed. Install the 'transkun' extra.",
                code="ENGINE_UNAVAILABLE",
            ) from exc

        device = "cpu"

        # Retrieve (or build on first call) the cached model for this device.
        model = _get_model(device)

        # Decode audio file → numpy float32 array (samples, channels).
        audio_seg = pydub.AudioSegment.from_file(audio_path)
        fs = audio_seg.frame_rate
        y = np.array(audio_seg.get_array_of_samples(), dtype=np.float32)
        y = y.reshape(-1, audio_seg.channels) / (2**15)

        # Resample to the model's expected sample rate if necessary.
        if fs != model.fs:
            y = soxr.resample(y, fs, model.fs)

        # Run inference.
        x = torch.from_numpy(y).to(device)
        torch.set_grad_enabled(False)
        raw_notes = model.transcribe(
            x,
            stepInSecond=None,
            segmentSizeInSecond=None,
            discardSecondHalf=False,
        )
        torch.set_grad_enabled(True)

        # Map Transkun Note objects to the normalised contract.
        note_events: list[tuple] = []
        pedal_events: list[tuple] = []
        for n in raw_notes:
            if n.pitch > 0:
                note_events.append((float(n.start), float(n.end), int(n.pitch), int(n.velocity)))
            elif n.pitch < 0:
                # Negative pitch encodes a CC event: control = -pitch.
                # Emit on-event at n.start and off-event (value=0) at n.end.
                # Only CC64 (sustain pedal) is used downstream but we capture all.
                cc = -n.pitch
                if cc == 64:
                    pedal_events.append((float(n.start), int(n.velocity)))
                    pedal_events.append((float(n.end), 0))
            # pitch == 0 is not a valid MIDI note — skip silently.

        # Estimate tempo from the already-decoded array — no second file decode needed.
        bpm = 0.0
        try:
            from pianoflow_music.transcription.beat import estimate_tempo_from_array

            result = estimate_tempo_from_array(y, model.fs)
            if result is not None:
                bpm = result
        except Exception:
            pass  # Tempo failure must not crash inference; caller falls back to _BPM_FALLBACK.

        return note_events, pedal_events, bpm

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Audio is empty.", code="EMPTY_AUDIO")

        # Derive temp-file suffix from the original filename (e.g. ".mp3", ".wav").
        suffix = ".wav"
        if filename:
            dot = filename.rfind(".")
            if dot != -1:
                suffix = filename[dot:]

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                tmp_path = tmp.name

            note_events, pedal_events, bpm = self._run_model(tmp_path)

            # Tempo is now derived from the already-decoded array inside _run_model.
            # No second file decode needed.
            in_range = _BPM_MIN <= float(bpm) <= _BPM_MAX
            tempo_source = "transkun_librosa" if in_range else "fallback_120"
        finally:
            if tmp_path is not None:
                with contextlib.suppress(OSError):
                    os.unlink(tmp_path)

        # Build raw Note list from normalised note_events.
        raw_notes: list[Note] = []
        for i, (start_s, end_s, pitch, velocity_raw) in enumerate(note_events):
            velocity = max(1, min(127, int(velocity_raw)))
            start = round(float(start_s), 6)
            end = round(float(end_s), 6)
            raw_notes.append(
                Note(
                    id=i,
                    pitch=int(pitch),
                    name=_pitch_name(int(pitch)),
                    velocity=velocity,
                    start=start,
                    end=end,
                    duration=round(end - start, 6),
                    track=0,
                    hand="R",  # placeholder — estimate_hands assigns real values below
                )
            )

        if not raw_notes:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        cleaned, clean_stats = clean_notes(raw_notes)
        if not cleaned:
            raise TranscriptionError("No notes detected in audio.", code="NO_NOTES_DETECTED")

        notes, hand_method = estimate_hands(cleaned)

        # Clamp bpm to [40, 240]; fall back to 120 if out of range.
        bpm = round(float(bpm), 2) if _BPM_MIN <= float(bpm) <= _BPM_MAX else _BPM_FALLBACK

        # Opt-in quantization (onset-snap only; duration preserved by quantize_notes).
        if options and options.get("quantize"):
            from pianoflow_music.transcription.quantize import quantize_notes

            grid = options.get("grid", "1/16")
            notes = quantize_notes(notes, bpm, grid=grid)

        # Build sustain list from normalised pedal_events.
        sustain = [
            {"time": round(float(t), 6), "value": int(max(0, min(127, v)))} for t, v in pedal_events
        ]

        duration_sec = max(n.end for n in notes)

        note_data = NoteData(
            schema_version=SCHEMA_VERSION,
            bpm=bpm,
            duration_sec=duration_sec,
            time_signature="4/4",
            notes=notes,
            tracks=[{"index": 0, "name": "transcribed", "note_count": len(notes)}],
            meta={
                "source": "audio_transcription",
                "engine": ENGINE_NAME,
                "hand_split": hand_method,
            },
            sustain=sustain,
        )

        draft_midi_bytes = note_data_to_midi_bytes(note_data)

        tempo_confidence = 0.8 if tempo_source == "transkun_librosa" else 0.5
        confidence = {
            "overall_confidence": _BASE_CONFIDENCE,
            "pitch_confidence": _BASE_CONFIDENCE,
            "timing_confidence": _BASE_CONFIDENCE,
            "tempo_confidence": tempo_confidence,
            "warnings": [
                "AI transcription (beta) — the generated MIDI is an editable draft"
                " and may need correction.",
            ],
        }

        report: dict = {
            "engine": ENGINE_NAME,
            "engine_kind": "ml_transkun",
            "is_real_transcription": True,
            "input_bytes": len(audio_bytes),
            "draft_note_count": len(notes),
            "bpm": bpm,
            "has_pedal": bool(sustain),
            "tempo_source": tempo_source,
        }
        report.update(clean_stats)

        return TranscriptionResult(
            status="completed",
            engine=ENGINE_NAME,
            duration_seconds=round(duration_sec, 2),
            draft_midi_bytes=draft_midi_bytes,
            notes=note_data,
            confidence=confidence,
            report=report,
        )
