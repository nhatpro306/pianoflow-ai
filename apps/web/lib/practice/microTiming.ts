/**
 * Live Micro-Timing Engine for PianoFlow AI.
 *
 * Implements real-time sub-millisecond strike evaluation, pocket classification,
 * normalized visual offset mapping for HUD gauges, and zero-allocation running
 * statistics tracking (Welford's algorithm) for high-frequency interactive loops.
 *
 * Milestone N.1 (Intelligent Piano Pedagogy Suite).
 */

export type TimingRating = "pocket" | "early" | "late" | "miss";

export interface LiveMicroTimingFeedback {
  /** Signed timestamp offset: t_hit - t_expected (ms). Negative = early, Positive = late. */
  deltaMs: number;
  /** Categorical timing rating */
  rating: TimingRating;
  /** MIDI pitch struck */
  notePitch: number;
  /** Musical note name (e.g. "C4", "F#3") */
  noteName: string;
  /** Hand responsible for strike */
  hand: "L" | "R";
  /** Performance / physical hit timestamp in ms */
  timestamp: number;
  /** Clamped to [-1.0, 1.0] representing -75ms to +75ms for UI gauges */
  normalizedOffset: number;
  /** User-facing display label (e.g. "PERFECT POCKET", "-42ms EARLY", "+55ms LATE", "MISS") */
  label: string;
  /** Display hex color code (#10b981 emerald, #f59e0b amber, #0284c7 sky, #ef4444 rose) */
  color: string;

  // Architectural blueprint aliases for backward-compatible consumption
  pocket?: TimingRating;
  scoreText?: string;
  displayColor?: string;
}

export interface MicroTimingSessionStats {
  pocketCount: number;
  earlyCount: number;
  lateCount: number;
  missCount: number;
  totalCount: number;
  validHitCount: number;
  meanBiasMs: number;
  jitterMs: number;
  accuracy: number;
  pocketRate: number;
}

export const TIMING_THRESHOLDS = {
  POCKET_WINDOW_MS: 35,
  EARLY_LATE_WINDOW_MS: 75,
  MAX_GAUGE_WINDOW_MS: 75,
} as const;

export const TIMING_COLORS: Record<TimingRating, string> = {
  pocket: "#10b981", // Emerald
  early: "#f59e0b",  // Amber
  late: "#0284c7",   // Sky
  miss: "#ef4444",   // Rose
} as const;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/**
 * Converts a MIDI pitch (0-127) to standard note name with octave (e.g. 60 -> "C4").
 */
export function getMidiNoteName(pitch: number): string {
  if (!Number.isFinite(pitch) || pitch < 0) return "C-1";
  const octave = Math.floor(pitch / 12) - 1;
  const note = NOTE_NAMES[((pitch % 12) + 12) % 12];
  return `${note}${octave}`;
}

/**
 * Classifies a single note strike into rhythmic micro-timing feedback.
 *
 * Rules:
 * - Pocket: |deltaMs| <= 35ms -> rating: 'pocket', color: '#10b981'
 * - Early: -75ms <= deltaMs < -35ms -> rating: 'early', color: '#f59e0b'
 * - Late: +35ms < deltaMs <= +75ms -> rating: 'late', color: '#0284c7'
 * - Miss: |deltaMs| > 75ms or pitch !== expectedPitch -> rating: 'miss', color: '#ef4444'
 * - normalizedOffset: Math.max(-1, Math.min(1, deltaMs / 75))
 *
 * @param deltaMs Signed offset in ms (actualHit - expectedStart)
 * @param pitch The MIDI pitch actually struck by user
 * @param expectedPitch The scheduled target MIDI pitch
 * @param hand The hand assigned to the target note ("L" | "R", defaults to "R")
 * @param noteName Optional human-readable note name; derived from pitch if omitted
 * @param timestamp Optional physical hit timestamp; defaults to Date.now()
 */
export function classifyMicroTiming(
  deltaMs: number,
  pitch: number,
  expectedPitch: number,
  hand: "L" | "R" = "R",
  noteName?: string,
  timestamp: number = Date.now()
): LiveMicroTimingFeedback {
  const safeDelta = Number.isFinite(deltaMs) ? deltaMs : 0;
  const resolvedName = noteName || getMidiNoteName(pitch);
  const normalizedOffset = Math.max(
    -1,
    Math.min(1, safeDelta / TIMING_THRESHOLDS.EARLY_LATE_WINDOW_MS)
  );

  let rating: TimingRating;
  let color: string;
  let label: string;

  const isPitchMatch = pitch === expectedPitch;
  const absDelta = Math.abs(safeDelta);

  if (!isPitchMatch || absDelta > TIMING_THRESHOLDS.EARLY_LATE_WINDOW_MS) {
    rating = "miss";
    color = TIMING_COLORS.miss;
    label = "MISS";
  } else if (absDelta <= TIMING_THRESHOLDS.POCKET_WINDOW_MS) {
    rating = "pocket";
    color = TIMING_COLORS.pocket;
    label = "PERFECT POCKET";
  } else if (safeDelta < -TIMING_THRESHOLDS.POCKET_WINDOW_MS && safeDelta >= -TIMING_THRESHOLDS.EARLY_LATE_WINDOW_MS) {
    rating = "early";
    color = TIMING_COLORS.early;
    const rounded = Math.round(safeDelta);
    label = `${rounded}ms EARLY`;
  } else {
    // safeDelta > +35ms && safeDelta <= +75ms
    rating = "late";
    color = TIMING_COLORS.late;
    const rounded = Math.round(safeDelta);
    label = `+${rounded}ms LATE`;
  }

  return {
    deltaMs: safeDelta,
    rating,
    notePitch: pitch,
    noteName: resolvedName,
    hand,
    timestamp,
    normalizedOffset,
    label,
    color,
    pocket: rating,
    scoreText: label,
    displayColor: color,
  };
}

/**
 * Convenience evaluator matching the pedagogical roadmap blueprint Section 5.5:
 * evaluates micro-timing given actual hit timestamp and scheduled expected start timestamp.
 */
export function evaluateMicroTiming(
  actualHitMs: number,
  expectedStartMs: number,
  pitch: number = 60,
  expectedPitch: number = 60,
  hand: "L" | "R" = "R",
  noteName?: string
): LiveMicroTimingFeedback {
  const deltaMs = actualHitMs - expectedStartMs;
  return classifyMicroTiming(deltaMs, pitch, expectedPitch, hand, noteName, actualHitMs);
}

/**
 * Zero-allocation running micro-timing tracker.
 *
 * Employs Welford's algorithm to compute online mean timing bias (μ) and timing
 * jitter standard deviation (σ) without allocating heap arrays in high-frequency
 * animation frames or MIDI callback loops.
 */
export class MicroTimingTracker {
  public pocketCount: number = 0;
  public earlyCount: number = 0;
  public lateCount: number = 0;
  public missCount: number = 0;
  public totalCount: number = 0;
  public validHitCount: number = 0;
  public meanBiasMs: number = 0;
  public jitterMs: number = 0;

  // Welford's variance accumulator: sum of squared differences from running mean
  private m2: number = 0;

  /**
   * Resets all internal statistics back to zero. Zero allocations.
   */
  public reset(): void {
    this.pocketCount = 0;
    this.earlyCount = 0;
    this.lateCount = 0;
    this.missCount = 0;
    this.totalCount = 0;
    this.validHitCount = 0;
    this.meanBiasMs = 0;
    this.jitterMs = 0;
    this.m2 = 0;
  }

  /**
   * Records a live micro-timing feedback event.
   *
   * @param feedback The feedback object generated by classifyMicroTiming
   * @param includeMissInTiming If true, allows misses with finite delta to factor into timing bias (defaults to false)
   */
  public record(feedback: LiveMicroTimingFeedback, includeMissInTiming = false): void {
    this.totalCount++;

    switch (feedback.rating) {
      case "pocket":
        this.pocketCount++;
        break;
      case "early":
        this.earlyCount++;
        break;
      case "late":
        this.lateCount++;
        break;
      case "miss":
        this.missCount++;
        break;
    }

    const eligibleForTiming =
      Number.isFinite(feedback.deltaMs) && (includeMissInTiming || feedback.rating !== "miss");

    if (eligibleForTiming) {
      this.validHitCount++;
      const delta = feedback.deltaMs;
      const prevMean = this.meanBiasMs;
      this.meanBiasMs += (delta - prevMean) / this.validHitCount;
      this.m2 += (delta - prevMean) * (delta - this.meanBiasMs);
      this.jitterMs = this.validHitCount > 0 ? Math.sqrt(this.m2 / this.validHitCount) : 0;
    }
  }

  /**
   * Directly classifies and records a strike with a single call.
   */
  public recordHit(
    deltaMs: number,
    pitch: number,
    expectedPitch: number,
    hand: "L" | "R" = "R",
    noteName?: string,
    timestamp?: number
  ): LiveMicroTimingFeedback {
    const feedback = classifyMicroTiming(deltaMs, pitch, expectedPitch, hand, noteName, timestamp);
    this.record(feedback);
    return feedback;
  }

  /**
   * Percentage of evaluated notes that were successfully hit (pocket, early, late).
   */
  public get accuracy(): number {
    if (this.totalCount === 0) return 100;
    const hits = this.pocketCount + this.earlyCount + this.lateCount;
    return (hits / this.totalCount) * 100;
  }

  /**
   * Percentage of evaluated notes struck inside the rhythmic pocket (|Δt| <= 35ms).
   */
  public get pocketRate(): number {
    if (this.totalCount === 0) return 100;
    return (this.pocketCount / this.totalCount) * 100;
  }

  /**
   * Returns a point-in-time snapshot summary of session metrics.
   */
  public getStats(): MicroTimingSessionStats {
    return {
      pocketCount: this.pocketCount,
      earlyCount: this.earlyCount,
      lateCount: this.lateCount,
      missCount: this.missCount,
      totalCount: this.totalCount,
      validHitCount: this.validHitCount,
      meanBiasMs: Math.round(this.meanBiasMs * 10) / 10,
      jitterMs: Math.round(this.jitterMs * 10) / 10,
      accuracy: Math.round(this.accuracy * 10) / 10,
      pocketRate: Math.round(this.pocketRate * 10) / 10,
    };
  }
}

/**
 * Factory helper for creating a new MicroTimingTracker instance.
 */
export function createMicroTimingTracker(): MicroTimingTracker {
  return new MicroTimingTracker();
}
