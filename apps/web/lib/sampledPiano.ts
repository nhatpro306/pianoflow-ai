/**
 * High-quality sampled piano engine for preview (PIANO_SOUND_SPEC.md).
 *
 * smplr instruments (CDN-loaded, velocity-layered samples) with Zero-Wait Fast-Start:
 * - Centralized singleton AudioContext automatically resumed on user gesture.
 * - Zero startup delay (<5ms latency): instantly plays via high-fidelity physical PianoSynth
 *   if network sample layers are loading or offline, seamlessly loading samples in background.
 * - Perfectly synchronized lookahead scheduler aligned to AudioContext.currentTime.
 */
import type { Note, PianoSoundId, ReverbLevel } from "@pianoflow/shared-types";
import { LIMITS } from "@pianoflow/shared-types";
import { Reverb, Soundfont, SplendidGrandPiano } from "smplr";

import { PianoSynth } from "./pianoSynth";

const LOOKAHEAD_SEC = 0.5;
const TICK_MS = 120;
const SAMPLE_LOAD_TIMEOUT_MS = 15000;

let sharedAudioContext: AudioContext | null = null;

/**
 * Returns the centralized singleton AudioContext.
 */
export function getSharedAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    return {} as unknown as AudioContext;
  }
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

/**
 * Proactively resumes the singleton AudioContext upon first user interaction.
 */
export function autoResumeSharedAudioContext(): void {
  if (typeof window === "undefined") return;
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
}

// Global user interaction listener for zero-delay AudioContext unlocking
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    autoResumeSharedAudioContext();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("click", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
  window.addEventListener("click", unlockAudio, { once: true });
}

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
  private readyInstruments = new Set<string>();
  private loadingPromises = new Map<string, Promise<SmplrInstrument | null>>();
  private reverb: Reverb | null = null;
  private reverbAdded = new Set<string>();
  private feltFilterAdded = new Set<string>();
  private fallback: PianoSynth | null = null;
  private usingFallback = false;

  private config: SoundConfig = { sound: "concert_grand", volume: 0.8, reverb: "light" };
  private timer: number | null = null;
  private nextIndex = 0;
  private startCtxTime = 0;
  private notes: Note[] = [];
  private speed = 1;

  constructor() {
    if (typeof window !== "undefined") {
      this.ctx = getSharedAudioContext();
    }
  }

  get time(): number {
    if (this.usingFallback && this.fallback) return this.fallback.time;
    if (!this.ctx) return 0;
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
    const scale = this.config.sound === "felt" ? 0.75 : 0.8;
    instrument.output.setVolume(Math.round(this.config.volume * 127 * scale));
    if (this.ctx) {
      const key = this.instrumentKey();
      if (
        this.config.sound === "felt" &&
        !this.feltFilterAdded.has(key) &&
        typeof this.ctx.createBiquadFilter === "function"
      ) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1800;
        filter.Q.value = 0.7;
        instrument.output.addInsert(filter);
        this.feltFilterAdded.add(key);
      }

      this.reverb ??= new Reverb(this.ctx);
      const mix = (LIMITS.REVERB_MIX as Record<ReverbLevel, number>)[this.config.reverb] ?? 0;
      if (this.reverbAdded.has(key)) {
        instrument.output.setEffectMix("reverb", mix);
      } else {
        instrument.output.addEffect("reverb", this.reverb, mix);
        this.reverbAdded.add(key);
      }
    }
  }

  async resumeContext(): Promise<void> {
    this.ctx = getSharedAudioContext();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }
  }

  /**
   * Prepares the instrument in the background without blocking the UI thread.
   */
  async ensureInstrument(): Promise<SmplrInstrument | null> {
    this.ctx = getSharedAudioContext();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }

    const key = this.instrumentKey();
    if (this.readyInstruments.has(key)) {
      const inst = this.instruments.get(key);
      if (inst) return inst;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadPromise = (async () => {
      let instrument = this.instruments.get(key);
      if (!instrument) {
        instrument = createInstrument(this.ctx!, this.config.sound);
        this.instruments.set(key, instrument);
      }
      try {
        await withTimeout(instrument.load, SAMPLE_LOAD_TIMEOUT_MS);
        this.applyOutputSettings(instrument);
        this.readyInstruments.add(key);
        return instrument;
      } catch {
        try {
          const retry = createInstrument(this.ctx!, this.config.sound);
          await withTimeout(retry.load, SAMPLE_LOAD_TIMEOUT_MS);
          this.instruments.set(key, retry);
          this.applyOutputSettings(retry);
          this.readyInstruments.add(key);
          return retry;
        } catch {
          this.instruments.delete(key);
          this.feltFilterAdded.delete(key);
          this.reverbAdded.delete(key);
          return null;
        }
      } finally {
        this.loadingPromises.delete(key);
      }
    })();

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * Zero-Wait Fast-Start playback:
   * Starts playback IMMEDIATELY (<5ms). If the sampled instrument is ready,
   * it uses samples; otherwise, it immediately plays via physical acoustic PianoSynth
   * and loads samples in the background.
   */
  async play(notes: Note[], speed: number, fromSec: number): Promise<void> {
    this.stop();
    this.ctx = getSharedAudioContext();
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }

    const key = this.instrumentKey();
    const isReady = this.readyInstruments.has(key);
    const instrument = isReady ? this.instruments.get(key) : null;

    if (!instrument) {
      // ── Zero-Wait Fast-Start: Instant playback on high-fidelity physical acoustic synth ──
      this.usingFallback = true;
      this.fallback ??= new PianoSynth(this.ctx);
      this.fallback.play(notes, speed, fromSec, this.ctx);

      // Trigger background sample loading without blocking playback
      void this.ensureInstrument();
      return;
    }

    // Instrument samples are ready — execute sample playback
    this.usingFallback = false;
    this.notes = notes;
    this.speed = speed;
    this.startCtxTime = this.ctx.currentTime - fromSec;
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
      const scheduleTime = this.startCtxTime + note.start / this.speed;
      const velocity =
        this.config.sound === "felt"
          ? Math.round(30 + (note.velocity / 127) * 50)
          : note.velocity;
      instrument.start({
        note: note.pitch,
        velocity,
        time: scheduleTime,
        duration: Math.max(0.08, note.duration / this.speed),
      });
      this.nextIndex++;
    }
  }
}
