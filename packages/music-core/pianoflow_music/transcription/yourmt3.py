"""yourmt3 transcription engine.

Currently a stub placeholder until the real model weights and inference code are available.
"""

from pianoflow_music.transcription.engine import TranscriptionError, TranscriptionResult
from pianoflow_music.transcription.placeholder import PlaceholderDeterministicEngine

ENGINE_NAME = "yourmt3"


class YourMT3Engine(PlaceholderDeterministicEngine):
    name = ENGINE_NAME

    def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "",
        options: dict | None = None,
    ) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Audio is empty.", code="EMPTY_AUDIO")

        # For now, just defer to the placeholder implementation but override the engine name
        # in the result and reports.
        result = super().transcribe(audio_bytes, filename=filename, options=options)

        # Patch the results to reflect the yourmt3 engine
        result.report["engine"] = ENGINE_NAME
        result.report["engine_kind"] = "yourmt3_stub"
        result.report["is_real_transcription"] = False

        result.confidence["warnings"] = [
            "YourMT3 engine stub output — not real AI transcription.",
            "The generated MIDI is an editable draft and may need correction.",
        ]

        return TranscriptionResult(
            status=result.status,
            engine=ENGINE_NAME,
            duration_seconds=result.duration_seconds,
            draft_midi_bytes=result.draft_midi_bytes,
            notes=result.notes,
            confidence=result.confidence,
            report=result.report,
        )
