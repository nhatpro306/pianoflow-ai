/**
 * Approximate real-time piano for PREVIEW only (VIDEO_TUTORIAL_SPEC.md §7).
 * Export audio is FluidSynth ground truth; this is a lightweight Web Audio
 * synth: two detuned triangle oscillators + lowpass + exponential decay.
 *
 * Scheduling: lookahead loop (100 ms tick, 300 ms window) against
 * AudioContext.currentTime — the same clock the canvas animation reads, so
 * preview audio and visuals cannot drift.
 */
import type { Note } from "@pianoflow/shared-types";

const LOOKAHEAD_SEC = 0.3;
const TICK_MS = 100;

function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

export class PianoSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextIndex = 0;
  private startCtxTime = 0; // ctx.currentTime at timeline t=0
  private notes: Note[] = [];
  private speed = 1;

  /** Current timeline position in (speed-scaled) seconds. */
  get time(): number {
    if (!this.ctx) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  /** Start playback from `fromSec` (scaled timeline seconds). */
  play(notes: Note[], speed: number, fromSec: number): void {
    this.stop();
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.notes = notes;
    this.speed = speed;
    this.startCtxTime = this.ctx.currentTime - fromSec;

    // First note at or after fromSec (notes start-sorted by parser).
    this.nextIndex = this.notes.findIndex((n) => n.start / this.speed >= fromSec);
    if (this.nextIndex === -1) this.nextIndex = this.notes.length;

    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }

  private tick(): void {
    if (!this.ctx || !this.master) return;
    const horizon = this.time + LOOKAHEAD_SEC;
    while (this.nextIndex < this.notes.length) {
      const note = this.notes[this.nextIndex];
      const start = note.start / this.speed;
      if (start > horizon) break;
      this.scheduleNote(note, this.startCtxTime + start);
      this.nextIndex++;
    }
  }

  private scheduleNote(note: Note, when: number): void {
    if (!this.ctx || !this.master) return;
    const duration = Math.max(0.08, note.duration / this.speed);
    const velocity = note.velocity / 127;

    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800 + velocity * 3000;
    gain.connect(filter);
    filter.connect(this.master);

    const peak = 0.12 + velocity * 0.25;
    const t0 = Math.max(when, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.25);

    const freq = midiToFreq(note.pitch);
    for (const detune of [0, 4]) {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.3);
    }
  }
}
