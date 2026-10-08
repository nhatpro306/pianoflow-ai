/**
 * High-fidelity physical acoustic piano simulation for preview fallback (PIANO_SOUND_SPEC.md).
 *
 * Implements a physically inspired acoustic model:
 * 1. Hammer strike transient: 0-6ms bandpassed noise impulse scaled by velocity.
 * 2. Multi-partial additive synthesis: f0, 2*f0, 3*f0, 4*f0 with realistic piano harmonic weights.
 * 3. Natural frequency-dependent exponential decay: higher partials decay rapidly while fundamental rings.
 * 4. Acoustic body resonance filter: soundboard formant peaking filter at 550 Hz (400-800 Hz range).
 * 5. Velocity-to-timbre dynamics: velocity controls brightness, attack transient punch, and harmonic distribution.
 *
 * Scheduling: lookahead loop (100 ms tick, 300 ms window) synchronized to AudioContext.currentTime.
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
  private soundboard: BiquadFilterNode | null = null;
  private hammerBuffer: AudioBuffer | null = null;
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

  private getHammerBuffer(ctx: AudioContext): AudioBuffer | null {
    if (typeof ctx.createBuffer !== "function") return null;
    if (this.hammerBuffer && this.hammerBuffer.sampleRate === ctx.sampleRate) {
      return this.hammerBuffer;
    }
    try {
      // 6ms hammer impact transient
      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.006));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
      this.hammerBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  /** Start playback from `fromSec` (scaled timeline seconds). */
  play(notes: Note[], speed: number, fromSec: number): void {
    this.stop();
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;

    // Acoustic soundboard body resonance (formant filter at ~550 Hz)
    if (typeof this.ctx.createBiquadFilter === "function") {
      this.soundboard = this.ctx.createBiquadFilter();
      this.soundboard.type = "peaking";
      this.soundboard.frequency.value = 550;
      this.soundboard.Q.value = 1.3;
      this.soundboard.gain.value = 4.5;
      this.soundboard.connect(this.master);
    }

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
    this.soundboard = null;
    this.hammerBuffer = null;
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
    const velocity = Math.min(1, Math.max(0.05, note.velocity / 127));
    const t0 = Math.max(when, this.ctx.currentTime);
    const freq = midiToFreq(note.pitch);

    const destinationNode = this.soundboard ?? this.master;

    // ── Velocity-to-Timbre Dynamic Lowpass Filter ──
    // Soft hits produce warm, mellow tone (~1200-2400 Hz); hard hits open up to ~9000+ Hz
    const noteFilter =
      typeof this.ctx.createBiquadFilter === "function"
        ? this.ctx.createBiquadFilter()
        : null;
    if (noteFilter) {
      noteFilter.type = "lowpass";
      const cutoff = Math.min(16000, 1000 + freq * 1.8 + Math.pow(velocity, 1.8) * 6500);
      noteFilter.frequency.setValueAtTime(cutoff, t0);
      noteFilter.Q.value = 0.8;
      noteFilter.connect(destinationNode);
    }

    const noteTarget = noteFilter ?? destinationNode;

    // ── 1. Hammer Strike Transient (0-6ms bandpassed noise impulse) ──
    const hammerBuf = this.getHammerBuffer(this.ctx);
    if (hammerBuf && typeof this.ctx.createBufferSource === "function") {
      try {
        const hammerSrc = this.ctx.createBufferSource();
        hammerSrc.buffer = hammerBuf;

        const hammerFilter = this.ctx.createBiquadFilter();
        hammerFilter.type = "bandpass";
        hammerFilter.frequency.value = Math.min(5000, Math.max(1500, freq * 2.2 + 1000));
        hammerFilter.Q.value = 2.0;

        const hammerGain = this.ctx.createGain();
        const hammerPeak = 0.05 * Math.pow(velocity, 1.6);
        hammerGain.gain.setValueAtTime(hammerPeak, t0);
        hammerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.006);

        hammerSrc.connect(hammerFilter);
        hammerFilter.connect(hammerGain);
        hammerGain.connect(noteTarget);

        hammerSrc.start(t0);
        hammerSrc.stop(t0 + 0.007);
      } catch {
        // Fallback gracefully if node creation is unsupported in minimal environment
      }
    }

    // ── 2 & 3. Multi-Partial Additive Synthesis with Frequency-Dependent Exponential Decay ──
    // Fundamental (f0), 2nd partial (2*f0), 3rd partial (3*f0), 4th partial (4*f0)
    // Partials are weighted according to acoustic piano string vibrations and velocity brightness
    const partials = [
      {
        ratio: 1.0,
        detune: 0,
        weight: 1.0,
        decayScale: 1.0,
      },
      {
        ratio: 2.0006, // slight inharmonicity detune
        detune: 2,
        weight: 0.52 * (0.35 + 0.65 * velocity),
        decayScale: 0.62,
      },
      {
        ratio: 3.0018,
        detune: -3,
        weight: 0.26 * (0.2 + 0.8 * velocity),
        decayScale: 0.42,
      },
      {
        ratio: 4.0035,
        detune: 4,
        weight: 0.14 * (0.1 + 0.9 * velocity),
        decayScale: 0.28,
      },
    ];

    // Master base sustain: low bass sustains longer than high soprano
    const pitchDamping = Math.max(0.4, 1.3 - freq / 2200);
    const baseDecay = Math.max(0.25, duration * pitchDamping + 0.35);
    const peakVelocityGain = (0.08 + velocity * 0.22) / 1.6;

    for (const partial of partials) {
      const partialFreq = freq * partial.ratio;
      if (partialFreq > 18000) continue; // Nyquist headroom

      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(partialFreq, t0);
      if (typeof osc.detune?.setValueAtTime === "function") {
        osc.detune.setValueAtTime(partial.detune, t0);
      }

      const pPeak = peakVelocityGain * partial.weight;
      const pDecayDuration = Math.max(0.08, baseDecay * partial.decayScale);

      pGain.gain.setValueAtTime(0, t0);
      pGain.gain.linearRampToValueAtTime(pPeak, t0 + 0.003); // 3ms attack ramp
      pGain.gain.exponentialRampToValueAtTime(0.00008, t0 + pDecayDuration);

      osc.connect(pGain);
      pGain.connect(noteTarget);

      osc.start(t0);
      osc.stop(t0 + pDecayDuration + 0.02);
    }
  }
}
