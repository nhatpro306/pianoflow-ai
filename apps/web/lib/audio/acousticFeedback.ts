"use client";

import type { PianoSoundId, ReverbLevel } from "@pianoflow/shared-types";
import { LIMITS } from "@pianoflow/shared-types";
import { Reverb, Soundfont, SplendidGrandPiano } from "smplr";
import { getSharedAudioContext } from "../sampledPiano";
import { PianoSynth } from "../pianoSynth";

export const mapAcousticVelocity = (vel: number): number =>
  Math.max(1, Math.min(127, Math.round(127 * Math.pow(Math.max(1, vel) / 127, 1.25))));

/**
 * Low-latency acoustic piano sound feedback for MIDI and touch interactions.
 * Uses smplr's velocity-layered instruments (Concert Grand, Bright Grand, Warm Grand,
 * Upright, Felt, Electric) with dynamic damper sustain pedal physics, master dynamics
 * compression, studio reverb, and immediate physical PianoSynth fallback.
 */
export class AcousticPianoFeedback {
  private ctx: AudioContext | null = null;
  private instrument: SplendidGrandPiano | Soundfont | null = null;
  private isInstrumentReady = false;
  private synthEngine: PianoSynth | null = null;
  private activeNotes = new Map<number, { stop: () => void }>();
  private currentSound: PianoSoundId = "concert_grand";
  private isSustainDown = false;
  private sustainedNotes = new Set<number>();
  private masterCompressor: DynamicsCompressorNode | null = null;
  private currentReverb: ReverbLevel = "light";
  private reverb: Reverb | null = null;
  private reverbAdded = false;

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

      this.ensureMasterCompressor();
      this.synthEngine ??= new PianoSynth(this.ctx);

      if (!this.instrument) {
        await this.setSound(this.currentSound);
      }
    } catch (e) {
      console.warn("AcousticPianoFeedback init fallback to synth", e);
    }
  }

  /**
   * Master DynamicsCompressorNode on master bus to prevent digital clipping on loud chords:
   * threshold: -6dB, knee: 12dB, ratio: 4:1, attack: 0.003s, release: 0.15s.
   */
  private ensureMasterCompressor(): DynamicsCompressorNode | null {
    if (!this.ctx) return null;
    if (!this.masterCompressor && typeof this.ctx.createDynamicsCompressor === "function") {
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-6, this.ctx.currentTime);
      comp.knee.setValueAtTime(12, this.ctx.currentTime);
      comp.ratio.setValueAtTime(4, this.ctx.currentTime);
      comp.attack.setValueAtTime(0.003, this.ctx.currentTime);
      comp.release.setValueAtTime(0.15, this.ctx.currentTime);
      if (this.ctx.destination) {
        comp.connect(this.ctx.destination);
      }
      this.masterCompressor = comp;
    }
    return this.masterCompressor;
  }

  /**
   * Dynamically changes the active instrument preset:
   * - concert_grand: SplendidGrandPiano
   * - bright_grand: Soundfont(ctx, { instrument: "bright_acoustic_piano" })
   * - warm_grand: Soundfont(ctx, { instrument: "acoustic_grand_piano" })
   * - upright: Soundfont(ctx, { instrument: "acoustic_grand_piano", kit: "FluidR3_GM" })
   * - felt: SplendidGrandPiano + lowpass 1800Hz filter
   * - electric: Soundfont(ctx, { instrument: "electric_piano_1" })
   * Gracefully falls back to PianoSynth if network fails or offline.
   */
  public async setSound(sound: PianoSoundId): Promise<void> {
    this.currentSound = sound;
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      this.ctx = getSharedAudioContext();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }

    const compressor = this.ensureMasterCompressor();
    const destination = compressor ?? this.ctx.destination;

    // Disconnect previous instrument safely
    if (this.instrument) {
      try {
        this.instrument.stop();
        if (
          "disconnect" in this.instrument &&
          typeof (this.instrument as { disconnect?: () => void }).disconnect === "function"
        ) {
          (this.instrument as { disconnect: () => void }).disconnect();
        }
      } catch {
        // ignore
      }
      this.instrument = null;
      this.isInstrumentReady = false;
      this.reverbAdded = false;
    }

    try {
      let inst: SplendidGrandPiano | Soundfont;
      switch (sound) {
        case "concert_grand":
          inst = new SplendidGrandPiano(this.ctx, destination ? { destination } : undefined);
          break;
        case "bright_grand":
          inst = new Soundfont(this.ctx, {
            instrument: "bright_acoustic_piano",
            destination: destination ?? undefined,
          });
          break;
        case "warm_grand":
          inst = new Soundfont(this.ctx, {
            instrument: "acoustic_grand_piano",
            destination: destination ?? undefined,
          });
          break;
        case "upright":
          inst = new Soundfont(this.ctx, {
            instrument: "acoustic_grand_piano",
            kit: "FluidR3_GM",
            destination: destination ?? undefined,
          });
          break;
        case "felt": {
          inst = new SplendidGrandPiano(this.ctx, destination ? { destination } : undefined);
          if (typeof this.ctx.createBiquadFilter === "function") {
            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
            filter.Q.setValueAtTime(0.7, this.ctx.currentTime);
            inst.output.addInsert(filter);
          }
          break;
        }
        case "electric":
          inst = new Soundfont(this.ctx, {
            instrument: "electric_piano_1",
            destination: destination ?? undefined,
          });
          break;
        default:
          inst = new SplendidGrandPiano(this.ctx, destination ? { destination } : undefined);
          break;
      }

      this.instrument = inst;
      this.applyReverbToInstrument(inst);

      inst.load
        .then(() => {
          if (this.instrument === inst && this.currentSound === sound) {
            this.isInstrumentReady = true;
          }
        })
        .catch(() => {
          if (this.instrument === inst && this.currentSound === sound) {
            this.isInstrumentReady = false;
          }
        });

      await inst.load;
      if (this.instrument === inst && this.currentSound === sound) {
        this.isInstrumentReady = true;
      }
    } catch (e) {
      console.warn("AcousticPianoFeedback setSound failed, falling back to PianoSynth", e);
      this.isInstrumentReady = false;
    }
  }

  public getSound(): PianoSoundId {
    return this.currentSound;
  }

  /**
   * Sets reverb ambience level: "off" | "light" | "medium" | "hall".
   */
  public setReverb(level: ReverbLevel): void {
    this.currentReverb = level;
    if (this.instrument) {
      this.applyReverbToInstrument(this.instrument);
    }
  }

  public getReverb(): ReverbLevel {
    return this.currentReverb;
  }

  private applyReverbToInstrument(inst: SplendidGrandPiano | Soundfont): void {
    if (!this.ctx) return;
    try {
      const mix = (LIMITS.REVERB_MIX as Record<ReverbLevel, number>)[this.currentReverb] ?? 0;
      if (mix <= 0) {
        if (this.reverbAdded) {
          inst.output.setEffectMix("reverb", 0);
        }
        return;
      }
      this.reverb ??= new Reverb(this.ctx);
      if (this.reverbAdded) {
        inst.output.setEffectMix("reverb", mix);
      } else {
        inst.output.addEffect("reverb", this.reverb, mix);
        this.reverbAdded = true;
      }
    } catch {
      // Ignore reverb routing in unsupported environments
    }
  }

  /**
   * Updates Damper Sustain pedal state.
   * If pedal is lifted (isDown = false), releases all sustained notes held by the pedal.
   */
  public setSustain(isDown: boolean): void {
    this.isSustainDown = isDown;
    if (!isDown) {
      for (const pitch of this.sustainedNotes) {
        const active = this.activeNotes.get(pitch);
        if (active) {
          active.stop();
          this.activeNotes.delete(pitch);
        }
      }
      this.sustainedNotes.clear();
    }
  }

  public getSustain(): boolean {
    return this.isSustainDown;
  }

  public noteOn(pitch: number, velocity: number = 80): void {
    if (typeof window === "undefined") return;
    const mappedVelocity = mapAcousticVelocity(velocity);

    // If note was already sounding or sustained, stop previous instance cleanly
    if (this.sustainedNotes.has(pitch)) {
      this.sustainedNotes.delete(pitch);
    }
    const previous = this.activeNotes.get(pitch);
    if (previous) {
      previous.stop();
      this.activeNotes.delete(pitch);
    }

    if (!this.ctx) {
      void this.init().then(() => this.playNote(pitch, mappedVelocity));
      return;
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().then(() => this.playNote(pitch, mappedVelocity));
      return;
    }

    this.playNote(pitch, mappedVelocity);
  }

  private playNote(pitch: number, velocity: number): void {
    if (!this.ctx) return;

    if (this.isInstrumentReady && this.instrument) {
      try {
        const noteHandle = this.instrument.start({
          note: pitch,
          velocity: Math.max(1, Math.min(127, velocity)),
          time: this.ctx.currentTime,
          duration: 10,
        });
        this.activeNotes.set(pitch, {
          stop: () => {
            try {
              if (typeof (noteHandle as unknown as { stop?: () => void })?.stop === "function") {
                (noteHandle as unknown as { stop: () => void }).stop();
              } else if (typeof noteHandle === "function") {
                (noteHandle as (time?: number) => void)();
              }
            } catch {
              // Ignore damping error
            }
          },
        });
        return;
      } catch {
        // Fall back to physical acoustic synth
      }
    }

    // High-Fidelity Physical Acoustic Piano Fallback
    this.synthEngine ??= new PianoSynth(this.ctx);
    const voice = this.synthEngine.triggerNote(pitch, velocity, 4.0);
    this.activeNotes.set(pitch, voice);
  }

  public noteOff(pitch: number): void {
    if (this.isSustainDown) {
      this.sustainedNotes.add(pitch);
    } else {
      const active = this.activeNotes.get(pitch);
      if (active) {
        active.stop();
        this.activeNotes.delete(pitch);
      }
      this.sustainedNotes.delete(pitch);
    }
  }

  public destroy(): void {
    for (const [, active] of this.activeNotes) {
      try {
        active.stop();
      } catch {
        // ignore
      }
    }
    this.activeNotes.clear();
    this.sustainedNotes.clear();
    this.synthEngine?.stop();
    this.synthEngine = null;
    if (this.instrument) {
      try {
        this.instrument.stop();
        if (
          "disconnect" in this.instrument &&
          typeof (this.instrument as { disconnect?: () => void }).disconnect === "function"
        ) {
          (this.instrument as { disconnect: () => void }).disconnect();
        }
      } catch {
        // ignore
      }
      this.instrument = null;
      this.isInstrumentReady = false;
    }
    if (this.masterCompressor) {
      try {
        this.masterCompressor.disconnect();
      } catch {
        // ignore
      }
      this.masterCompressor = null;
    }
  }
}
