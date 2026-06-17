/**
 * High-quality sampled piano for preview (PIANO_SOUND_SPEC.md).
 *
 * smplr instruments (CDN-loaded, velocity-layered samples) behind the same
 * lookahead-scheduler model as PianoSynth. Falls back to PianoSynth when
 * sample loading fails (offline dev). Single persistent AudioContext so
 * loaded samples survive play/pause cycles.
 */
import type { Note, PianoSoundId, ReverbLevel } from "@pianoflow/shared-types";
import { LIMITS } from "@pianoflow/shared-types";
import { Reverb, Soundfont, SplendidGrandPiano } from "smplr";

import { PianoSynth } from "./pianoSynth";

const LOOKAHEAD_SEC = 0.5;
const TICK_MS = 120;
const SAMPLE_LOAD_TIMEOUT_MS = 4000;

interface SoundConfig {
  sound: PianoSoundId;
  volume: number; // 0..1
  reverb: ReverbLevel;
}

type SmplrInstrument = SplendidGrandPiano | Soundfont;

function createInstrument(ctx: AudioContext, sound: PianoSoundId): SmplrInstrument {
  switch (sound) {
    case "concert_grand":
    case "felt":
      return new SplendidGrandPiano(ctx);
    case "bright_grand":
      return new Soundfont(ctx, { instrument: "bright_acoustic_piano" });
    case "warm_grand":
      return new Soundfont(ctx, { instrument: "acoustic_grand_piano" });
    case "upright":
      return new Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "FluidR3_GM" });
    case "electric":
      return new Soundfont(ctx, { instrument: "electric_piano_1" });
    default:
      return new SplendidGrandPiano(ctx);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("sample load timeout")), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class SampledPiano {
  private ctx: AudioContext | null = null;
  private instruments = new Map<string, SmplrInstrument>();
  private reverb: Reverb | null = null;
  private reverbAdded = new Set<string>();
  private fallback: PianoSynth | null = null;
  private usingFallback = false;

  private config: SoundConfig = { sound: "concert_grand", volume: 0.8, reverb: "light" };
  private timer: number | null = null;
  private nextIndex = 0;
  private startCtxTime = 0;
  private notes: Note[] = [];
  private speed = 1;

  get time(): number {
    if (this.usingFallback) return this.fallback?.time ?? 0;
    if (!this.ctx || this.timer === null) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  get approximate(): boolean {
    return this.usingFallback;
  }

  configure(config: SoundConfig): void {
    const soundChanged = config.sound !== this.config.sound;
    this.config = config;
    const instrument = this.instruments.get(this.instrumentKey());
    if (instrument && !soundChanged) {
      this.applyOutputSettings(instrument);
    }
  }

  private instrumentKey(): string {
    return this.config.sound;
  }

  private applyOutputSettings(instrument: SmplrInstrument): void {
    // Headroom: cap at ~100/127 to avoid clipping dense chords; felt is softer.
    const scale = this.config.sound === "felt" ? 0.55 : 0.8;
    instrument.output.setVolume(Math.round(this.config.volume * 127 * scale));
    if (this.ctx) {
      this.reverb ??= new Reverb(this.ctx);
      const mix = (LIMITS.REVERB_MIX as Record<ReverbLevel, number>)[this.config.reverb] ?? 0;
      const key = this.instrumentKey();
      // Add the reverb send ONCE per instrument; subsequent calls only adjust the
      // mix. smplr's addEffect pushes a new send each call (no dedup), so calling
      // it on every seek/play would stack reverb buses -> cumulative wet + gain.
      if (this.reverbAdded.has(key)) {
        instrument.output.setEffectMix("reverb", mix);
      } else {
        instrument.output.addEffect("reverb", this.reverb, mix);
        this.reverbAdded.add(key);
      }
    }
  }

  private async ensureInstrument(): Promise<SmplrInstrument | null> {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);

    const key = this.instrumentKey();
    let instrument = this.instruments.get(key);
    if (!instrument) {
      instrument = createInstrument(this.ctx, this.config.sound);
      this.instruments.set(key, instrument);
    }
    try {
      await withTimeout(instrument.load, SAMPLE_LOAD_TIMEOUT_MS);
      this.applyOutputSettings(instrument);
      this.usingFallback = false;
      return instrument;
    } catch {
      this.instruments.delete(key);
      this.usingFallback = true;
      return null;
    }
  }

  async play(notes: Note[], speed: number, fromSec: number): Promise<void> {
    this.stop();
    let instrument: SmplrInstrument | null;
    try {
      instrument = await withTimeout(this.ensureInstrument(), SAMPLE_LOAD_TIMEOUT_MS);
    } catch {
      this.usingFallback = true;
      instrument = null;
    }

    if (!instrument) {
      this.fallback ??= new PianoSynth();
      this.fallback.play(notes, speed, fromSec);
      return;
    }

    this.notes = notes;
    this.speed = speed;
    this.startCtxTime = this.ctx!.currentTime - fromSec;
    this.nextIndex = this.notes.findIndex((n) => n.start / speed >= fromSec);
    if (this.nextIndex === -1) this.nextIndex = this.notes.length;

    this.timer = window.setInterval(() => this.tick(instrument), TICK_MS);
    this.tick(instrument);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.fallback?.stop();
    for (const instrument of this.instruments.values()) {
      try {
        instrument.stop();
      } catch {
        // instrument may not have started — ignore
      }
    }
  }

  private tick(instrument: SmplrInstrument): void {
    if (!this.ctx) return;
    const horizon = this.time + LOOKAHEAD_SEC;
    while (this.nextIndex < this.notes.length) {
      const note = this.notes[this.nextIndex];
      const start = note.start / this.speed;
      if (start > horizon) break;
      // Felt piano: soften velocities for the muted character.
      const velocity =
        this.config.sound === "felt"
          ? Math.round(30 + (note.velocity / 127) * 50)
          : note.velocity;
      instrument.start({
        note: note.pitch,
        velocity,
        time: this.startCtxTime + start,
        duration: Math.max(0.08, note.duration / this.speed),
      });
      this.nextIndex++;
    }
  }
}
