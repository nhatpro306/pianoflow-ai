"use client";

import type { SplendidGrandPiano } from "smplr";

/**
 * Low-latency acoustic piano sound feedback for MIDI and touch interactions.
 * Uses smplr's SplendidGrandPiano with immediate Web Audio oscillator fallback.
 */
export class AcousticPianoFeedback {
  private ctx: AudioContext | null = null;
  private instrument: SplendidGrandPiano | null = null;
  private isInstrumentReady = false;
  private activeOscillators = new Map<number, { osc: OscillatorNode; gain: GainNode }>();

  public async initPianoAudio(): Promise<void> {
    return this.init();
  }

  public async init(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      this.ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (this.ctx.state === "suspended") {
        await this.ctx.resume().catch(() => undefined);
      }

      if (!this.instrument) {
        const { SplendidGrandPiano } = await import("smplr");
        this.instrument = new SplendidGrandPiano(this.ctx);
        this.instrument.load
          .then(() => {
            this.isInstrumentReady = true;
          })
          .catch(() => {
            this.isInstrumentReady = false;
          });
      }
    } catch (e) {
      console.warn("AcousticPianoFeedback init fallback to synth", e);
    }
  }

  public noteOn(pitch: number, velocity: number = 80): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      void this.init().then(() => this.playNote(pitch, velocity));
      return;
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().then(() => this.playNote(pitch, velocity));
      return;
    }

    this.playNote(pitch, velocity);
  }

  private playNote(pitch: number, velocity: number): void {
    if (!this.ctx) return;

    if (this.isInstrumentReady && this.instrument) {
      try {
        this.instrument.start({
          note: pitch,
          velocity: Math.max(1, Math.min(127, velocity)),
          time: this.ctx.currentTime,
          duration: 2.0,
        });
        return;
      } catch {
        // Fall back to synth below
      }
    }

    // Web Audio Fallback: Triangle oscillator with lowpass + exponential decay
    this.playSynthNote(pitch, velocity);
  }

  private playSynthNote(pitch: number, velocity: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // Warm piano-like filter envelope
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * 3.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 1.2);

    const velScale = velocity / 127;
    const maxGain = 0.3 * velScale;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(maxGain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.8);

    this.activeOscillators.set(pitch, { osc, gain });
    setTimeout(() => {
      if (this.activeOscillators.get(pitch)?.osc === osc) {
        this.activeOscillators.delete(pitch);
      }
    }, 1800);
  }

  public noteOff(pitch: number): void {
    if (!this.ctx) return;
    const active = this.activeOscillators.get(pitch);
    if (active) {
      const now = this.ctx.currentTime;
      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(active.gain.gain.value, now);
      active.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      active.osc.stop(now + 0.08);
      this.activeOscillators.delete(pitch);
    }
  }

  public destroy(): void {
    this.activeOscillators.clear();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.instrument = null;
    this.isInstrumentReady = false;
  }
}
