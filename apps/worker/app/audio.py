"""AudioRenderer adapter: MIDI bytes → WAV bytes via FluidSynth CLI.

Same adapter pattern as storage/queue — job code depends on render_wav()
only, so a different synth (or a test fake) swaps in without touching the
render_video handler. SoundFont: FluidR3_GM baked into the worker image
(SOUNDFONT_PATH); velocities and CC64 sustain are native to the synth.
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

from app.config import get_settings


class AudioRenderError(Exception):
    code = "AUDIO_RENDER_FAILED"


class FluidSynthAudioRenderer:
    def __init__(self, soundfont_path: str, binary: str = "fluidsynth") -> None:
        self.soundfont_path = soundfont_path
        self.binary = binary

    def available(self) -> bool:
        return bool(shutil.which(self.binary)) and Path(self.soundfont_path).is_file()

    def render_wav(self, midi_bytes: bytes, sample_rate: int = 44100) -> bytes:
        if not shutil.which(self.binary):
            raise AudioRenderError("fluidsynth binary not found in worker image.")
        if not Path(self.soundfont_path).is_file():
            raise AudioRenderError(f"SoundFont missing: {self.soundfont_path}")

        with tempfile.TemporaryDirectory(prefix="pf-audio-") as tmp:
            midi_path = Path(tmp) / "in.mid"
            wav_path = Path(tmp) / "out.wav"
            midi_path.write_bytes(midi_bytes)
            result = subprocess.run(
                [
                    self.binary,
                    "-ni",
                    self.soundfont_path,
                    str(midi_path),
                    "-F",
                    str(wav_path),
                    "-r",
                    str(sample_rate),
                ],
                capture_output=True,
                timeout=300,
            )
            if result.returncode != 0:
                raise AudioRenderError(
                    f"fluidsynth exited {result.returncode}: {result.stderr[-300:]!r}"
                )
            if not wav_path.is_file() or wav_path.stat().st_size < 100:
                raise AudioRenderError("fluidsynth produced an empty WAV.")
            return wav_path.read_bytes()


def get_audio_renderer() -> FluidSynthAudioRenderer:
    settings = get_settings()
    return FluidSynthAudioRenderer(soundfont_path=settings.soundfont_path)
