"use client";

import type { SplendidGrandPiano } from "smplr";
import { getSharedAudioContext } from "../sampledPiano";
import { PianoSynth } from "../pianoSynth";

/**
 * Low-latency acoustic piano sound feedback for MIDI and touch interactions.
 * Uses smplr's SplendidGrandPiano with immediate high-fidelity physical PianoSynth fallback.
 */
export class AcousticPianoFeedback {
  private ctx: AudioContext | null = null;
  private instrument: SplendidGrandPiano | null = null;
  private isInstrumentReady = false;
  private synthEngine: PianoSynth | null = null;
  private activeNotes = new Map<number, { stop: () => void }>();

  public async initPianoAudio(): Promise<void> {
    return this.init();
  }

  public async init(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      this.ctx = getSharedAudioContext();
      if (this.ctx.state === "suspended") {
        await this.ctx.resume().catch(() => undefined);
      }

      this.synthEngine ??= new PianoSynth(this.ctx);

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
          duration: 2.5,
        });
        return;
      } catch {
        // Fall back to physical acoustic synth
      }
    }

    // High-Fidelity Physical Acoustic Piano Fallback
    this.synthEngine ??= new PianoSynth(this.ctx);
    const voice = this.synthEngine.triggerNote(pitch, velocity, 2.5);
    this.activeNotes.set(pitch, voice);
  }

  public noteOff(pitch: number): void {
    const active = this.activeNotes.get(pitch);
    if (active) {
      active.stop();
      this.activeNotes.delete(pitch);
    }
  }

  public destroy(): void {
    this.activeNotes.clear();
    this.synthEngine?.stop();
    this.synthEngine = null;
    this.instrument = null;
    this.isInstrumentReady = false;
  }
}
