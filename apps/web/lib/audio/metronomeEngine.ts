export type TimeSignature = "4/4" | "3/4" | "3/8" | "6/8" | "2/4";

export interface MetronomeState {
  bpm: number;
  timeSignature: TimeSignature;
  isPlaying: boolean;
  volume: number; // 0.0 to 1.0
  currentBeat: number; // 0 to beatsPerMeasure - 1
  isAccent: boolean;
}

export interface MetronomeCallbacks {
  onBeat?: (beatNumber: number, isAccent: boolean) => void;
  onStateChange?: (state: MetronomeState) => void;
}

/**
 * Lookahead Precision Metronome Engine
 * Implements the Chris Wilson "Two Clocks" scheduling model:
 * Web Audio hardware clock (AudioContext.currentTime) for jitter-free acoustic clicks,
 * coupled with a 25ms JavaScript timer lookahead window (100ms horizon).
 */
export class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private bpm: number = 120;
  private timeSignature: TimeSignature = "4/4";
  private isPlaying: boolean = false;
  private volume: number = 0.8;

  // Two-clock scheduler variables
  private nextBeatTime: number = 0.0;
  private currentBeat: number = 0;
  private timerWorkerId: number | null = null;
  private readonly lookaheadMs: number = 100.0; // 100ms lookahead horizon
  private readonly scheduleIntervalMs: number = 25.0; // Check every 25ms
  private pendingTimeouts: Set<number> = new Set();

  // Tap tempo state
  private tapTimestamps: number[] = [];
  private readonly maxTapIntervalMs: number = 2500;
  private readonly minTapIntervalMs: number = 180;

  private callbacks: MetronomeCallbacks = {};

  constructor(initialBpm: number = 120, timeSignature: TimeSignature = "4/4") {
    this.bpm = Math.max(30, Math.min(300, Math.round(initialBpm)));
    this.timeSignature = timeSignature;
  }

  public setCallbacks(callbacks: MetronomeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private initAudioContext(): AudioContext {
    if (typeof window === "undefined") {
      throw new Error("Cannot initialize AudioContext in a non-browser environment");
    }
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  public start(): void {
    if (this.isPlaying) return;
    if (typeof window === "undefined") return;

    const ctx = this.initAudioContext();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextBeatTime = ctx.currentTime + 0.05; // 50ms buffer before first scheduled beat

    this.timerWorkerId = window.setInterval(() => {
      this.scheduler();
    }, this.scheduleIntervalMs);

    this.notifyState();
  }

  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerWorkerId !== null) {
      clearInterval(this.timerWorkerId);
      this.timerWorkerId = null;
    }
    for (const timeoutId of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
    this.currentBeat = 0;
    this.notifyState();
  }

  public toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setBpm(newBpm: number): void {
    this.bpm = Math.max(30, Math.min(300, Math.round(newBpm)));
    this.notifyState();
  }

  public setTimeSignature(sig: TimeSignature): void {
    this.timeSignature = sig;
    this.currentBeat = 0;
    this.notifyState();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0.0, Math.min(1.0, vol));
    this.notifyState();
  }

  /**
   * Tap Tempo calculator with outlier rejection and moving average filter.
   * Returns newly computed BPM clamped to [30..300].
   */
  public tap(): number {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.tapTimestamps.length > 0) {
      const last = this.tapTimestamps[this.tapTimestamps.length - 1];
      const diff = now - last;
      if (diff > this.maxTapIntervalMs || diff < this.minTapIntervalMs) {
        this.tapTimestamps = [];
      }
    }

    this.tapTimestamps.push(now);
    if (this.tapTimestamps.length > 5) {
      this.tapTimestamps.shift();
    }

    if (this.tapTimestamps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.tapTimestamps.length; i++) {
        intervals.push(this.tapTimestamps[i] - this.tapTimestamps[i - 1]);
      }
      const sum = intervals.reduce((acc, v) => acc + v, 0);
      const avgInterval = sum / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        this.setBpm(calculatedBpm);
        return this.bpm;
      }
    }
    return this.bpm;
  }

  private scheduler(): void {
    if (!this.audioCtx || !this.isPlaying) return;

    while (this.nextBeatTime < this.audioCtx.currentTime + this.lookaheadMs / 1000.0) {
      this.scheduleClick(this.currentBeat, this.nextBeatTime);
      this.advanceBeat();
    }
  }

  private advanceBeat(): void {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const beatUnit = this.getBeatUnit();
    const secondsPerBeat = (60.0 / this.bpm) * beatUnit;

    this.nextBeatTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % beatsPerMeasure;
  }

  private scheduleClick(beat: number, time: number): void {
    if (!this.audioCtx) return;

    const isAccent = beat === 0;
    const isCompoundSubAccent = this.timeSignature === "6/8" && beat === 3;
    const freq = isAccent ? 1200 : isCompoundSubAccent ? 1000 : 800;
    const peakGain = isAccent
      ? this.volume
      : isCompoundSubAccent
        ? this.volume * 0.8
        : this.volume * 0.65;
    const decayDuration = isAccent ? 0.045 : 0.03;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      // Exponential pitch chirp for woodblock impact
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq * 0.6),
        time + decayDuration
      );

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + decayDuration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(time);
      osc.stop(time + decayDuration + 0.01);
    } catch (e) {
      // In headless or unmocked contexts, ignore node creation errors
      console.warn("Metronome click synthesis error:", e);
    }

    // Synchronize UI callback to exact audio timestamp
    const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
    const timeoutId = window.setTimeout(() => {
      this.pendingTimeouts.delete(timeoutId);
      if (this.isPlaying) {
        this.callbacks.onBeat?.(beat, isAccent);
      }
    }, delayMs);
    this.pendingTimeouts.add(timeoutId);
  }

  public getBeatsPerMeasure(): number {
    switch (this.timeSignature) {
      case "3/4":
      case "3/8":
        return 3;
      case "6/8":
        return 6;
      case "2/4":
        return 2;
      case "4/4":
      default:
        return 4;
    }
  }

  public getBeatUnit(): number {
    switch (this.timeSignature) {
      case "3/8":
      case "6/8":
        return 0.5;
      case "4/4":
      case "3/4":
      case "2/4":
      default:
        return 1.0;
    }
  }

  public getState(): MetronomeState {
    return {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      isPlaying: this.isPlaying,
      volume: this.volume,
      currentBeat: this.currentBeat,
      isAccent: this.currentBeat === 0,
    };
  }

  private notifyState(): void {
    this.callbacks.onStateChange?.(this.getState());
  }

  public destroy(): void {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }
  }
}

if (typeof window !== "undefined") {
  (window as unknown as { MetronomeEngine?: typeof MetronomeEngine }).MetronomeEngine = MetronomeEngine;
}
