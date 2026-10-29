/**
 * High-fidelity physical acoustic piano simulation engine (PIANO_SOUND_SPEC.md).
 *
 * Implements a physically inspired acoustic concert grand model:
 * 1. 8-partial string inharmonicity synthesis: f_n = n * f0 * sqrt(1 + B * n^2), where B is string stiffness.
 * 2. Soft felt hammer transient: warm 5ms filtered impulse eliminating metallic click.
 * 3. Dynamic velocity lowpass filter: natural acoustic opening and settling (mellow felt to luminous forte).
 * 4. Stereo soundboard body resonance: 3-stage formant filter bank (480Hz, 820Hz, 1400Hz) with natural spatial panning.
 * 5. Natural damper & release envelopes: smooth exponential decay on key release mimicking damper felt contact.
 */
import type { Note } from "@pianoflow/shared-types";

const LOOKAHEAD_SEC = 0.3;
const TICK_MS = 100;

export function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

export interface PartialConfig {
  n: number;
  freq: number;
  weight: number;
  decayScale: number;
  detune: number;
}

/**
 * Calculates the frequencies and harmonic distribution for 8 physical partials
 * incorporating piano string inharmonicity: f_n = n * f0 * sqrt(1 + B * n^2).
 */
export function calculatePianoPartials(f0: number, velocity: number): PartialConfig[] {
  // Physical string inharmonicity: f_n = n * f0 * sqrt(1 + 0.0002 * n^2)
  const inharmonicityFactor = 0.0002;

  // Natural grand piano harmonic energy distribution
  const baseWeights = [
    1.0,                                   // n=1: Fundamental
    0.58 * (0.32 + 0.68 * velocity),       // n=2: Octave
    0.34 * (0.24 + 0.76 * velocity),       // n=3: 5th
    0.22 * (0.18 + 0.82 * velocity),       // n=4: 2nd Octave
    0.14 * (0.14 + 0.86 * velocity),       // n=5: Major 3rd
    0.08 * (0.10 + 0.90 * velocity),       // n=6: Octave + 5th
    0.045 * (0.08 + 0.92 * velocity),      // n=7: Harmonic 7th
    0.025 * (0.05 + 0.95 * velocity),      // n=8: 3rd Octave
  ];

  const decayScales = [1.0, 0.72, 0.54, 0.40, 0.30, 0.22, 0.16, 0.12];
  // Subtle unison course chorus detuning in cents
  const detunes = [0, 1.8, -2.2, 2.5, -2.8, 3.1, -3.4, 3.8];

  const partials: PartialConfig[] = [];
  for (let n = 1; n <= 8; n++) {
    const fn = n * f0 * Math.sqrt(1 + inharmonicityFactor * n * n);
    if (fn > 18500) break; // Nyquist headroom
    partials.push({
      n,
      freq: fn,
      weight: baseWeights[n - 1],
      decayScale: decayScales[n - 1],
      detune: detunes[n - 1],
    });
  }
  return partials;
}

export class PianoSynth {
  private ctx: AudioContext | null = null;
  private isExternalCtx = false;
  private master: GainNode | null = null;
  private soundboardStage1: BiquadFilterNode | null = null;
  private soundboardStage2: BiquadFilterNode | null = null;
  private soundboardStage3: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private hammerBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextIndex = 0;
  private startCtxTime = 0; // ctx.currentTime at timeline t=0
  private notes: Note[] = [];
  private speed = 1;

  constructor(providedCtx?: AudioContext | null) {
    if (providedCtx) {
      this.ctx = providedCtx;
      this.isExternalCtx = true;
    }
  }

  /** Current timeline position in (speed-scaled) seconds. */
  get time(): number {
    if (!this.ctx) return 0;
    return this.ctx.currentTime - this.startCtxTime;
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Generates a warm, filtered 5ms felt hammer strike buffer (no metallic clicks).
   */
  private getHammerBuffer(ctx: AudioContext): AudioBuffer | null {
    if (typeof ctx.createBuffer !== "function") return null;
    if (this.hammerBuffer && this.hammerBuffer.sampleRate === ctx.sampleRate) {
      return this.hammerBuffer;
    }
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.005));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.4);
        // Lowpass smoothed noise pulse mimicking felt-wrapped wood hammer impact
        const white = Math.random() * 2 - 1;
        prev = prev * 0.65 + white * 0.35;
        data[i] = prev * decay;
      }
      this.hammerBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Initializes the stereo soundboard resonance filter bank:
   * 480 Hz (main soundboard body wood resonance)
   * 820 Hz (bridge and rib acoustic formant)
   * 1400 Hz (rim & casing air presence)
   */
  private setupAudioGraph(ctx: AudioContext): void {
    if (this.master) return;

    this.master = ctx.createGain();
    this.master.gain.value = 0.65;

    if (typeof ctx.createDynamicsCompressor === "function") {
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4.0;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
    }

    if (typeof ctx.createBiquadFilter === "function") {
      this.soundboardStage1 = ctx.createBiquadFilter();
      this.soundboardStage1.type = "peaking";
      this.soundboardStage1.frequency.value = 480;
      this.soundboardStage1.Q.value = 1.4;
      this.soundboardStage1.gain.value = 1.2;

      this.soundboardStage2 = ctx.createBiquadFilter();
      this.soundboardStage2.type = "peaking";
      this.soundboardStage2.frequency.value = 820;
      this.soundboardStage2.Q.value = 1.6;
      this.soundboardStage2.gain.value = 1.0;

      this.soundboardStage3 = ctx.createBiquadFilter();
      this.soundboardStage3.type = "peaking";
      this.soundboardStage3.frequency.value = 1400;
      this.soundboardStage3.Q.value = 2.0;
      this.soundboardStage3.gain.value = 0.8;

      this.soundboardStage1.connect(this.soundboardStage2);
      this.soundboardStage2.connect(this.soundboardStage3);
      this.soundboardStage3.connect(this.master);
    }

    if (this.compressor) {
      this.master.connect(this.compressor);
      this.compressor.connect(ctx.destination);
    } else {
      this.master.connect(ctx.destination);
    }
  }

  private getSoundboardInput(): AudioNode {
    return this.soundboardStage1 ?? this.master!;
  }

  /** Start playback from `fromSec` (scaled timeline seconds). */
  play(notes: Note[], speed: number, fromSec: number, audioCtx?: AudioContext): void {
    this.stopPlaybackTimer();

    if (audioCtx) {
      this.ctx = audioCtx;
      this.isExternalCtx = true;
    } else if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isExternalCtx = false;
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }

    this.setupAudioGraph(this.ctx);

    this.notes = notes;
    this.speed = speed;
    this.startCtxTime = this.ctx.currentTime - fromSec;

    // First note at or after fromSec
    this.nextIndex = this.notes.findIndex((n) => n.start / this.speed >= fromSec);
    if (this.nextIndex === -1) this.nextIndex = this.notes.length;

    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private stopPlaybackTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stop(): void {
    this.stopPlaybackTimer();
    if (!this.isExternalCtx && this.ctx) {
      this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
    this.master = null;
    this.soundboardStage1 = null;
    this.soundboardStage2 = null;
    this.soundboardStage3 = null;
    this.hammerBuffer = null;
  }

  private tick(): void {
    if (!this.ctx || !this.master) return;
    const horizon = this.time + LOOKAHEAD_SEC;
    while (this.nextIndex < this.notes.length) {
      const note = this.notes[this.nextIndex];
      const start = note.start / this.speed;
      if (start > horizon) break;
      const scheduleTime = this.startCtxTime + note.start / this.speed;
      this.scheduleNote(note, scheduleTime);
      this.nextIndex++;
    }
  }

  /**
   * Schedules a single note on the physical acoustic audio graph.
   */
  public scheduleNote(note: Note, when: number): void {
    if (!this.ctx || !this.master) return;

    const duration = Math.max(0.08, note.duration / this.speed);
    const velocity = Math.min(1, Math.max(0.05, note.velocity / 127));
    const t0 = Math.max(when, this.ctx.currentTime);
    const freq = midiToFreq(note.pitch);

    const soundboardInput = this.getSoundboardInput();

    // ── Stereo Spatial Panning ──
    // Bass strings span to left, treble strings span to right
    let noteBus: AudioNode = soundboardInput;
    if (typeof this.ctx.createStereoPanner === "function") {
      try {
        const panner = this.ctx.createStereoPanner();
        const panValue = Math.max(-0.55, Math.min(0.55, (note.pitch - 60) / 48));
        panner.pan.setValueAtTime(panValue, t0);
        panner.connect(soundboardInput);
        noteBus = panner;
      } catch {
        // Fall back to direct soundboard bus
      }
    }

    // ── Dynamic Velocity Lowpass Filter ──
    // Soft notes produce warm, mellow woody tone; forte strikes open luminous presence
    const noteFilter =
      typeof this.ctx.createBiquadFilter === "function" ? this.ctx.createBiquadFilter() : null;
    if (noteFilter) {
      noteFilter.type = "lowpass";
      const cutoff = Math.min(14500, 850 + freq * 1.5 + Math.pow(velocity, 1.6) * 5500);
      noteFilter.frequency.setValueAtTime(cutoff, t0);
      noteFilter.frequency.exponentialRampToValueAtTime(
        Math.max(400, cutoff * 0.72),
        t0 + duration
      );
      noteFilter.Q.value = 0.75;
      noteFilter.connect(noteBus);
    }

    const noteTarget = noteFilter ?? noteBus;

    // ── 1. Soft Felt Hammer Impact Transient (Warm Cushion Thump) ──
    const hammerBuf = this.getHammerBuffer(this.ctx);
    if (hammerBuf && typeof this.ctx.createBufferSource === "function") {
      try {
        const hammerSrc = this.ctx.createBufferSource();
        hammerSrc.buffer = hammerBuf;

        const hammerFilter = this.ctx.createBiquadFilter();
        hammerFilter.type = "bandpass";
        hammerFilter.frequency.value = Math.min(1200, Math.max(400, freq * 1.2 + 250));
        hammerFilter.Q.value = 1.2;

        const hammerGain = this.ctx.createGain();
        const hammerPeak = 0.026 * Math.pow(velocity, 1.5);
        hammerGain.gain.setValueAtTime(hammerPeak, t0);
        hammerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.005);

        hammerSrc.connect(hammerFilter);
        hammerFilter.connect(hammerGain);
        hammerGain.connect(noteTarget);

        hammerSrc.start(t0);
        hammerSrc.stop(t0 + 0.006);
      } catch {
        // Fallback gracefully
      }
    }

    // ── 2. 8-Partial Inharmonic Physical Acoustic Synthesis ──
    const partials = calculatePianoPartials(freq, velocity);

    // Natural frequency damping: bass rings longer than high soprano
    const pitchDamping = Math.max(0.38, 1.25 - freq / 2400);
    const naturalDecay = Math.max(0.35, (duration + 1.2) * pitchDamping);
    const peakVelocityGain = (0.075 + velocity * 0.22) / 2.2;
    const releaseTime = t0 + duration;
    const damperDecaySec = 0.12; // 120ms damper felt contact decay

    for (const partial of partials) {
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(partial.freq, t0);
      if (typeof osc.detune?.setValueAtTime === "function") {
        osc.detune.setValueAtTime(partial.detune, t0);
      }

      const pPeak = peakVelocityGain * partial.weight;
      const pDecayDuration = Math.max(0.08, naturalDecay * partial.decayScale);

      pGain.gain.setValueAtTime(0, t0);
      pGain.gain.linearRampToValueAtTime(pPeak, t0 + 0.0035); // 3.5ms attack ramp

      // Sustain decay until release
      const sustainDecayTarget = Math.max(0.0001, pPeak * 0.25);
      pGain.gain.exponentialRampToValueAtTime(
        sustainDecayTarget,
        Math.min(releaseTime, t0 + pDecayDuration)
      );

      // Natural damper felt decay at note release
      pGain.gain.setValueAtTime(sustainDecayTarget, releaseTime);
      pGain.gain.exponentialRampToValueAtTime(0.00001, releaseTime + damperDecaySec);

      osc.connect(pGain);
      pGain.connect(noteTarget);

      osc.start(t0);
      osc.stop(releaseTime + damperDecaySec + 0.02);
    }
  }

  /**
   * Triggers a single acoustic piano note for low-latency interactive feedback (<2ms).
   */
  public triggerNote(
    pitch: number,
    velocity: number = 80,
    duration: number = 2.0
  ): { stop: () => void } {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }
    this.setupAudioGraph(this.ctx);

    const now = this.ctx.currentTime;
    const note: Note = {
      id: 0,
      pitch,
      name: "",
      velocity,
      start: 0,
      end: duration,
      duration,
      track: 0,
      hand: pitch >= 60 ? "R" : "L",
    };
    this.scheduleNote(note, now);

    return {
      stop: () => {
        // Individual note stop is handled by damper felt decay envelope
      },
    };
  }
}
