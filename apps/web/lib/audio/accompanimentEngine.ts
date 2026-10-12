"use client";

import type { SplendidGrandPiano } from "smplr";
import type { ExpectedNote, HandPracticeMode } from "../midi/MidiEngine";
import { getSharedAudioContext } from "../sampledPiano";

export interface AccompanimentEngineOptions {
  volume?: number;
  enabled?: boolean;
  handMode?: HandPracticeMode;
  autoPlayAll?: boolean;
}

/**
 * Hands-Separate Virtual SoundFont Accompaniment Audio Loop
 *
 * Automatically plays the unpracticed hand with full acoustic nuance
 * using smplr SplendidGrandPiano (with immediate Web Audio oscillator fallback),
 * maintaining harmonic context and steady rhythmic support during isolated hand drills.
 */
export class AccompanimentEngine {
  private ctx: AudioContext | null = null;
  private ownsContext = false;
  private masterGain: GainNode | null = null;
  private instrument: SplendidGrandPiano | null = null;
  private isInstrumentReady = false;
  private notes: ExpectedNote[] = [];
  private handMode: HandPracticeMode = "both";
  private volume = 0.7; // Default 70% volume for pedagogical balance
  private enabled = true;
  private autoPlayAll = false;
  private speed = 1.0;
  private activeOscillators = new Map<number, { osc: OscillatorNode; gain: GainNode }>();
  private activeTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    ctxOrOptions?: AudioContext | null | AccompanimentEngineOptions,
    options?: AccompanimentEngineOptions
  ) {
    let opts = options;
    if (ctxOrOptions && typeof ctxOrOptions === "object" && !("currentTime" in ctxOrOptions)) {
      opts = ctxOrOptions as AccompanimentEngineOptions;
    } else if (ctxOrOptions) {
      this.ctx = ctxOrOptions as AudioContext;
      this.ownsContext = false;
    }

    if (opts?.volume !== undefined) {
      this.volume = Math.max(0, Math.min(1, opts.volume));
    }
    if (opts?.enabled !== undefined) {
      this.enabled = opts.enabled;
    }
    if (opts?.handMode !== undefined) {
      this.handMode = opts.handMode;
    }
    if (opts?.autoPlayAll !== undefined) {
      this.autoPlayAll = opts.autoPlayAll;
    }
  }

  /**
   * Initializes the AudioContext and loads the smplr SoundFont synth lazily.
   */
  public async init(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        this.ctx = getSharedAudioContext();
        this.ownsContext = false;
      }

      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume().catch(() => undefined);
      }

      this.ensureMasterGain();
      await this.initInstrument();
    } catch (e) {
      console.warn("AccompanimentEngine init fallback to synth", e);
    }
  }

  private ensureMasterGain(): void {
    if (!this.ctx) return;
    if (!this.masterGain && typeof this.ctx.createGain === "function") {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      if (this.ctx.destination) {
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  private async initInstrument(): Promise<void> {
    if (!this.ctx || this.instrument) return;
    try {
      const { SplendidGrandPiano } = await import("smplr");
      this.instrument = new SplendidGrandPiano(this.ctx);
      this.applyVolumeToInstrument();
      this.instrument.load
        .then(() => {
          this.isInstrumentReady = true;
        })
        .catch(() => {
          this.isInstrumentReady = false;
        });
    } catch {
      this.isInstrumentReady = false;
    }
  }

  private applyVolumeToInstrument(): void {
    if (this.instrument && "output" in this.instrument) {
      try {
        const vol = this.enabled ? Math.round(this.volume * 127 * 0.75) : 0;
        this.instrument.output.setVolume(vol);
      } catch {
        // Output channel may not support setVolume in mock environments
      }
    }
  }

  /**
   * Populates the score notes, sorted chronologically by start timestamp.
   */
  public setNotes(notes: ExpectedNote[]): void {
    this.notes = [...notes].sort((a, b) => a.start - b.start);
  }

  public getNotes(): ExpectedNote[] {
    return this.notes;
  }

  /**
   * Sets the hand isolation mode.
   * - "right": user plays Right Hand, accompaniment plays Left Hand ("L").
   * - "left": user plays Left Hand, accompaniment plays Right Hand ("R").
   * - "both": user plays both hands; accompaniment is silent unless autoPlayAll is active.
   */
  public setHandMode(mode: HandPracticeMode): void {
    this.handMode = mode;
    if (mode === "both" && !this.autoPlayAll) {
      this.pause();
    }
  }

  public getHandMode(): HandPracticeMode {
    return this.handMode;
  }

  /**
   * Configures whether all notes should be automatically played with Grand Piano sound.
   */
  public setAutoPlayAll(autoPlayAll: boolean): void {
    this.autoPlayAll = autoPlayAll;
    if (!autoPlayAll && this.handMode === "both") {
      this.pause();
    }
  }

  public isAutoPlayAll(): boolean {
    return this.autoPlayAll;
  }

  /**
   * Sets the accompaniment volume level [0.0, 1.0].
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.applyVolumeToInstrument();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Enables or disables accompaniment audio playback.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pause();
    }
    this.applyVolumeToInstrument();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sets current playback speed factor (e.g. 0.5x, 1.0x, 1.5x).
   */
  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(3.0, speed));
  }

  public getSpeed(): number {
    return this.speed;
  }

  /**
   * Binary searches for the first note with start >= timeMs.
   */
  private findStartIndex(timeMs: number): number {
    let low = 0;
    let high = this.notes.length - 1;
    let result = this.notes.length;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.notes[mid].start >= timeMs) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  }

  /**
   * Frame-by-frame tick evaluator:
   * Plays notes that start in the half-open interval [prevTimeMs, currentTimeMs)
   * for the unpracticed hand (or all notes if autoPlayAll is enabled).
   */
  public tick(currentTimeMs: number, prevTimeMs: number): void {
    if (!this.enabled || this.volume <= 0) return;
    if (this.handMode === "both" && !this.autoPlayAll) return;
    if (currentTimeMs <= prevTimeMs) return;
    // Guard against massive jump (e.g. background tab wake-up without explicit seek)
    if (currentTimeMs - prevTimeMs > 500) return;

    const startIdx = this.findStartIndex(prevTimeMs);
    for (let i = startIdx; i < this.notes.length; i++) {
      const note = this.notes[i];
      if (note.start >= currentTimeMs) break;

      const isRH = note.hand ? note.hand === "R" : note.pitch >= 60;
      const isAccompanimentNote =
        this.autoPlayAll ||
        (this.handMode === "right" && !isRH) ||
        (this.handMode === "left" && isRH);

      if (isAccompanimentNote) {
        this.playNote(note);
      }
    }
  }

  /**
   * Triggers acoustic soundfont playback (or oscillator fallback).
   */
  public playNote(note: ExpectedNote): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      void this.init().then(() => this.triggerNoteAudio(note));
      return;
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().then(() => this.triggerNoteAudio(note));
      return;
    }

    this.triggerNoteAudio(note);
  }

  private triggerNoteAudio(note: ExpectedNote): void {
    if (!this.ctx || this.volume <= 0 || !this.enabled) return;

    const pitch = note.pitch;
    const rawVelocity = note.velocity ?? 75;
    const durationSec = Math.max(0.1, (note.end - note.start) / (1000 * Math.max(0.1, this.speed)));

    if (this.isInstrumentReady && this.instrument) {
      try {
        this.instrument.start({
          note: pitch,
          velocity: Math.max(1, Math.min(127, rawVelocity)),
          time: this.ctx.currentTime,
          duration: durationSec,
        });
        return;
      } catch {
        // Fall back to Web Audio oscillator synth
      }
    }

    this.playSynthNote(pitch, rawVelocity, durationSec);
  }

  private playSynthNote(pitch: number, velocity: number, durationSec: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 3.5, now);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq * 1.2),
        now + Math.min(1.2, durationSec)
      );

      const velScale = velocity / 127;
      const maxGain = Math.max(0.0001, 0.22 * velScale * this.volume);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else if (this.ctx.destination) {
        gain.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + durationSec + 0.05);

      const entry = { osc, gain };
      this.activeOscillators.set(pitch, entry);

      const timer = setTimeout(() => {
        if (this.activeOscillators.get(pitch)?.osc === osc) {
          this.activeOscillators.delete(pitch);
        }
        this.activeTimers.delete(timer);
      }, Math.round((durationSec + 0.1) * 1000));
      this.activeTimers.add(timer);
    } catch {
      // Audio node failure fallback
    }
  }

  /**
   * Silences all currently sounding accompaniment notes cleanly.
   */
  public pause(): void {
    if (this.instrument) {
      try {
        this.instrument.stop();
      } catch {
        // ignore
      }
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;
      for (const [, { osc, gain }] of this.activeOscillators) {
        try {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
          osc.stop(now + 0.04);
        } catch {
          // ignore
        }
      }
    }
    this.activeOscillators.clear();

    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  private lastPlayheadMs = 0;

  /**
   * Clears active notes and resets playhead pointer.
   */
  public seek(timeMs: number): void {
    this.pause();
    this.lastPlayheadMs = timeMs;
  }

  public getLastPlayheadMs(): number {
    return this.lastPlayheadMs;
  }

  /**
   * Disconnects and cleans up all audio nodes and references.
   */
  public destroy(): void {
    this.pause();
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

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }

    if (this.ownsContext && this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.notes = [];
  }
}
