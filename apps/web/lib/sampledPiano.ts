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
let prewarmedGrandPiano: SplendidGrandPiano | null = null;
let prewarmedGrandPianoPromise: Promise<SplendidGrandPiano | null> | null = null;

/**
 * Pre-warms the default SplendidGrandPiano instrument eagerly in the background.
 */
export function prewarmGrandPiano(ctx?: AudioContext): Promise<SplendidGrandPiano | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const audioCtx = ctx ?? getSharedAudioContext();
  if (!audioCtx || typeof audioCtx.createBuffer !== "function") return Promise.resolve(null);
  if (prewarmedGrandPiano) return Promise.resolve(prewarmedGrandPiano);
  if (prewarmedGrandPianoPromise) return prewarmedGrandPianoPromise;

  try {
    const inst = new SplendidGrandPiano(audioCtx);
    prewarmedGrandPianoPromise = inst.load
      .then(() => {
        prewarmedGrandPiano = inst;
        return inst;
      })
      .catch(() => {
        prewarmedGrandPianoPromise = null;
        return null;
      });
  } catch {
    prewarmedGrandPianoPromise = null;
    return Promise.resolve(null);
  }

  return prewarmedGrandPianoPromise;
}

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
 * Proactively resumes the singleton AudioContext upon first user interaction
 * and eagerly pre-warms SplendidGrandPiano samples.
 */
export function autoResumeSharedAudioContext(): void {
  if (typeof window === "undefined") return;
  const ctx = getSharedAudioContext();
  if (ctx && typeof ctx.resume === "function") {
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => {
          void prewarmGrandPiano(ctx);
        })
        .catch(() => undefined);
    } else {
      void prewarmGrandPiano(ctx);
    }
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

export type VelocityCurve = "linear" | "soft" | "hard" | "compressed";

export interface SampledPianoConfig {
  sound: PianoSoundId;
  volume: number; // 0..1
  reverb: ReverbLevel;
  velocityCurve?: VelocityCurve;
  pedalMode?: "original" | "assisted" | "off";
}

export type SoundConfig = SampledPianoConfig;

export function applyVelocityCurve(rawVel: number, curve?: VelocityCurve): number {
  if (!curve || curve === "linear") return rawVel;
  const normalized = Math.max(0, Math.min(1, rawVel / 127));
  switch (curve) {
    case "soft":
      // Natural nuance at lower velocities
      return Math.pow(normalized, 1.35) * 127;
    case "hard":
      // More punch at medium velocities
      return Math.pow(normalized, 0.75) * 127;
    case "compressed":
      // Mild dynamic compression
      return 36 + normalized * 74;
    default:
      return rawVel;
  }
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
  private playSessionId = 0;

  private config: SampledPianoConfig = {
    sound: "concert_grand",
    volume: 0.8,
    reverb: "light",
    pedalMode: "original",
  };
  private timer: number | null = null;
  private nextIndex = 0;
  private startCtxTime = 0;
  private notes: Note[] = [];
  private speed = 1;

  constructor() {
    if (typeof window !== "undefined") {
      this.ctx = getSharedAudioContext();
      void this.ensureInstrument();
    }
  }

  public isReady(): boolean {
    return this.readyInstruments.has(this.instrumentKey());
  }

  get time(): number {
    if (this.usingFallback && this.fallback) return this.fallback.time;
    if (!this.ctx) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  get approximate(): boolean {
    return this.usingFallback;
  }

  configure(config: SampledPianoConfig): void {
    const sound = config.sound || this.config.sound || "concert_grand";
    const soundChanged = sound !== this.config.sound;
    this.config = {
      ...this.config,
      ...config,
      sound,
      pedalMode: config.pedalMode ?? this.config.pedalMode ?? "original",
    };
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
    // Lower max output volume scale slightly to prevent polyphonic Web Audio summing distortion
    instrument.output.setVolume(Math.round(this.config.volume * 92 * scale));
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
    if (this.ctx && typeof this.ctx.resume === "function" && this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }
    void prewarmGrandPiano(this.ctx);
    void this.ensureInstrument();
  }

  /**
   * Prepares the instrument in the background without blocking the UI thread.
   */
  async ensureInstrument(): Promise<SmplrInstrument | null> {
    this.ctx = getSharedAudioContext();
    if (this.ctx && typeof this.ctx.resume === "function" && this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }

    const key = this.instrumentKey();
    if (this.readyInstruments.has(key)) {
      const inst = this.instruments.get(key);
      if (inst) return inst;
    }

    if (key === "concert_grand" && prewarmedGrandPiano) {
      this.instruments.set(key, prewarmedGrandPiano);
      this.applyOutputSettings(prewarmedGrandPiano);
      this.readyInstruments.add(key);
      return prewarmedGrandPiano;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadPromise = (async () => {
      if (key === "concert_grand" && prewarmedGrandPianoPromise) {
        try {
          const prewarmed = await withTimeout(prewarmedGrandPianoPromise, SAMPLE_LOAD_TIMEOUT_MS);
          if (prewarmed) {
            this.instruments.set(key, prewarmed);
            this.applyOutputSettings(prewarmed);
            this.readyInstruments.add(key);
            return prewarmed;
          }
        } catch {
          // Fall back to direct instantiation below
        }
      }

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
    const sessionId = ++this.playSessionId;
    this.notes = notes;
    this.speed = speed;
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

      // Trigger background sample loading and hot-swap seamlessly
      void this.ensureInstrument().then((loadedInst) => {
        if (
          this.playSessionId !== sessionId ||
          !this.usingFallback ||
          !loadedInst ||
          !this.ctx
        ) {
          return;
        }

        const curSec = this.fallback ? this.fallback.time : fromSec;
        this.fallback?.stop();
        this.usingFallback = false;

        this.startCtxTime = this.ctx.currentTime - curSec;
        this.nextIndex = this.notes.findIndex((n) => n.start / speed >= curSec);
        if (this.nextIndex === -1) this.nextIndex = this.notes.length;

        if (this.timer !== null) {
          clearInterval(this.timer);
        }
        this.timer = window.setInterval(() => this.tick(loadedInst), TICK_MS);
        this.tick(loadedInst);
      });
      return;
    }

    // Instrument samples are ready — execute sample playback
    this.usingFallback = false;
    this.startCtxTime = this.ctx.currentTime - fromSec;
    this.nextIndex = this.notes.findIndex((n) => n.start / speed >= fromSec);
    if (this.nextIndex === -1) this.nextIndex = this.notes.length;

    this.timer = window.setInterval(() => this.tick(instrument), TICK_MS);
    this.tick(instrument);
  }

  stop(): void {
    this.playSessionId++;
    this.usingFallback = false;
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

      // Full dynamic expression from pp to ff without artificial compression
      const rawVel = note.velocity ?? 76;
      let velocity = Math.max(1, Math.min(127, Math.round(applyVelocityCurve(rawVel, this.config.velocityCurve))));
      if (this.config.sound === "felt") {
        velocity = Math.round(Math.max(1, Math.min(100, velocity * 0.85)));
      }

      const rawDur = note.duration / this.speed;
      instrument.start({
        note: note.pitch,
        velocity,
        time: scheduleTime,
        duration: Math.max(0.01, rawDur),
      });
      this.nextIndex++;
    }
  }
}
