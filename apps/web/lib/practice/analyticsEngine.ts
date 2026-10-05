import { ExpectedNote, HandType, ScoreLevel } from '../midi/MidiEngine';

export type TimingClassification = 'rushing' | 'pocket' | 'dragging';
export type MeasureStatus = 'mastered' | 'needs_polish' | 'critical';

export interface SignedTimingEvent {
  notePitch: number;
  expectedStartMs: number;
  actualHitMs: number;
  signedDeltaMs: number; // actualHitMs - expectedStartMs
  hand: HandType;
  score: ScoreLevel;

  // Compatibility aliases
  pitch?: number;
  deltaMs?: number;
  hitTime?: number;
  expectedTime?: number;
  judgment?: ScoreLevel;
  noteId?: string | number;
}

export interface HandTimingStats {
  noteCount: number;
  meanBiasMs: number;        // μ
  jitterMs: number;          // σ
  classification: TimingClassification;
}

export interface TimingAnalytics {
  globalMeanBiasMs: number;  // μ global
  globalJitterMs: number;    // σ global
  globalClassification: TimingClassification;
  rightHand: HandTimingStats;
  leftHand: HandTimingStats;
  handSyncGapMs: number;     // μ_RH - μ_LH
}

export interface MeasureMetric {
  measureNumber: number;      // 1-indexed
  startMs: number;
  endMs: number;
  expectedNotesCount: number;
  perfectHits: number;
  goodHits: number;
  missHits: number;
  accuracy: number;          // 0 - 100 (%)
  meanBiasMs: number;
  status: MeasureStatus;
  notesPerSecond: number;
  difficultyRating: number;   // 1.0 - 5.0
}

export interface DrillRecommendation {
  id: string;
  title: string;              // E.g., "Bars 5 – 8: Targeted Section"
  startMeasure: number;
  endMeasure: number;
  loopStartMs: number;
  loopEndMs: number;
  recommendedSpeed: number;   // E.g., 0.75x
  priorityScore: number;
  diagnosis: string;          // Pedagogical guidance
  prescribedHand: 'both' | 'right' | 'left';
  totalMisses: number;
  accuracy: number;

  // Compatibility aliases
  suggestedSpeed?: number;
  startMs?: number;
  endMs?: number;
}

export interface SessionAnalyticsReport {
  sessionId: string;
  totalNotes: number;
  evaluatedNotes: number;
  overallAccuracy: number;
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  timing: TimingAnalytics;
  measures: MeasureMetric[];
  drills: DrillRecommendation[];
  summaryMessage: string;
}

/**
 * Parses time signature string (e.g. "4/4", "3/4", "6/8") into numerator and denominator.
 */
export function parseTimeSignature(sig?: string): { numerator: number; denominator: number } {
  if (!sig || !sig.includes('/')) return { numerator: 4, denominator: 4 };
  const [num, den] = sig.split('/').map(Number);
  return {
    numerator: isNaN(num) || num <= 0 ? 4 : num,
    denominator: isNaN(den) || den <= 0 ? 4 : den,
  };
}

/**
 * Computes mean timing bias, jitter (standard deviation), and tendency classification.
 */
export function computeTimingStats(events: SignedTimingEvent[]): {
  mean: number;
  jitter: number;
  classification: TimingClassification;
} {
  const hitEvents = events.filter((e) => {
    const sc = e.score ?? e.judgment;
    return sc !== 'Miss';
  });

  if (hitEvents.length === 0) {
    return { mean: 0, jitter: 0, classification: 'pocket' };
  }

  const deltas = hitEvents.map((e) => {
    return e.signedDeltaMs ?? e.deltaMs ?? (e.actualHitMs - e.expectedStartMs);
  });

  const sum = deltas.reduce((acc, val) => acc + val, 0);
  const mean = Math.round((sum / deltas.length) * 10) / 10;

  const varianceSum = deltas.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const jitter = Math.round(Math.sqrt(varianceSum / deltas.length) * 10) / 10;

  let classification: TimingClassification = 'pocket';
  if (mean < -15) classification = 'rushing';
  else if (mean > 15) classification = 'dragging';

  return { mean, jitter, classification };
}

/**
 * Alias for computeTimingStats
 */
export const calculateTimingStats = computeTimingStats;

/**
 * Computes full timing analytics, decoupled globally and per hand.
 */
export function calculateTimingAnalytics(events: SignedTimingEvent[]): TimingAnalytics {
  const globalTiming = computeTimingStats(events);
  const rhEvents = events.filter((e) => e.hand === 'R');
  const lhEvents = events.filter((e) => e.hand === 'L');
  const rhTiming = computeTimingStats(rhEvents);
  const lhTiming = computeTimingStats(lhEvents);

  return {
    globalMeanBiasMs: globalTiming.mean,
    globalJitterMs: globalTiming.jitter,
    globalClassification: globalTiming.classification,
    rightHand: {
      noteCount: rhEvents.length,
      meanBiasMs: rhTiming.mean,
      jitterMs: rhTiming.jitter,
      classification: rhTiming.classification,
    },
    leftHand: {
      noteCount: lhEvents.length,
      meanBiasMs: lhTiming.mean,
      jitterMs: lhTiming.jitter,
      classification: lhTiming.classification,
    },
    handSyncGapMs: Math.round((rhTiming.mean - lhTiming.mean) * 10) / 10,
  };
}

/**
 * Partitions musical time and notes into discrete measures.
 */
export function partitionMeasures(
  expectedNotes: ExpectedNote[],
  events: SignedTimingEvent[],
  bpm: number,
  timeSignature: string = '4/4',
  totalDurationMs: number = 0
): MeasureMetric[] {
  const { numerator, denominator } = parseTimeSignature(timeSignature);
  const safeBpm = bpm > 0 ? bpm : 120;
  const beatDurationMs = (60000 / safeBpm) * (4 / denominator);
  const measureDurationMs = numerator * beatDurationMs;

  const maxNoteEnd = expectedNotes.length > 0 ? Math.max(...expectedNotes.map((n) => n.end)) : 0;
  const maxEventTime = events.length > 0 ? Math.max(...events.map((e) => e.expectedStartMs ?? e.expectedTime ?? 0)) : 0;
  const maxSongMs = Math.max(totalDurationMs, maxNoteEnd, maxEventTime);
  const totalMeasures = Math.max(1, Math.ceil(maxSongMs / measureDurationMs));

  const measures: MeasureMetric[] = [];

  for (let m = 1; m <= totalMeasures; m++) {
    const startMs = (m - 1) * measureDurationMs;
    const endMs = m * measureDurationMs;

    const mNotes = expectedNotes.filter((n) => n.start >= startMs && n.start < endMs);
    const mEvents = events.filter((e) => {
      const expStart = e.expectedStartMs ?? e.expectedTime ?? 0;
      return expStart >= startMs && expStart < endMs;
    });

    let perfectHits = 0;
    let goodHits = 0;
    let missHits = 0;
    const mDeltas: number[] = [];

    for (const ev of mEvents) {
      const score = ev.score ?? ev.judgment;
      const delta = ev.signedDeltaMs ?? ev.deltaMs ?? (ev.actualHitMs - ev.expectedStartMs);

      if (score === 'Perfect') {
        perfectHits++;
        mDeltas.push(delta);
      } else if (score === 'Good') {
        goodHits++;
        mDeltas.push(delta);
      } else if (score === 'Miss') {
        missHits++;
      }
    }

    const totalEvaluated = perfectHits + goodHits + missHits;
    const expectedCount = mNotes.length;
    let accuracy = 100;
    if (expectedCount > 0) {
      accuracy =
        Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((perfectHits * 1.0 + goodHits * 0.6) / Math.max(expectedCount, totalEvaluated)) * 1000
            ) / 10
          )
        );
    }

    let status: MeasureStatus = 'mastered';
    if (accuracy < 70 || missHits >= 2) {
      status = 'critical';
    } else if (accuracy < 85 || missHits === 1) {
      status = 'needs_polish';
    }

    const meanBiasMs =
      mDeltas.length > 0
        ? Math.round((mDeltas.reduce((a, b) => a + b, 0) / mDeltas.length) * 10) / 10
        : 0;

    const durSec = measureDurationMs / 1000;
    const notesPerSecond = Math.round((expectedCount / durSec) * 10) / 10;
    const difficultyRating = Math.min(5.0, Math.round((1.0 + notesPerSecond * 0.4) * 10) / 10);

    measures.push({
      measureNumber: m,
      startMs: Math.round(startMs),
      endMs: Math.round(endMs),
      expectedNotesCount: expectedCount,
      perfectHits,
      goodHits,
      missHits,
      accuracy,
      meanBiasMs,
      status,
      notesPerSecond,
      difficultyRating,
    });
  }

  return measures;
}

/**
 * Detects contiguous struggling measures and synthesizes targeted drill recommendations.
 */
export function generateDrillRecommendations(
  measures: MeasureMetric[],
  events: SignedTimingEvent[] = [],
  bpm: number = 120
): DrillRecommendation[] {
  // Tempo context influences drill speed suggestions
  const isFastTempo = bpm > 140;

  // Step 1: Detect raw runs of problematic measures
  const rawRuns: { startBar: number; endBar: number }[] = [];
  let currentRun: number[] = [];

  for (const m of measures) {
    const isProblematic =
      m.status === 'critical' ||
      (m.status === 'needs_polish' && m.missHits > 0) ||
      m.accuracy < 75 ||
      m.missHits >= 2;

    if (isProblematic) {
      currentRun.push(m.measureNumber);
    } else {
      if (currentRun.length > 0) {
        rawRuns.push({
          startBar: currentRun[0],
          endBar: currentRun[currentRun.length - 1],
        });
        currentRun = [];
      }
    }
  }

  if (currentRun.length > 0) {
    rawRuns.push({
      startBar: currentRun[0],
      endBar: currentRun[currentRun.length - 1],
    });
  }

  if (rawRuns.length === 0) {
    return [];
  }

  // Step 2: Bridge 1-measure gaps if intermediate measure is not mastered
  const mergedRuns: { startBar: number; endBar: number }[] = [];
  let i = 0;
  while (i < rawRuns.length) {
    const startBar = rawRuns[i].startBar;
    let endBar = rawRuns[i].endBar;
    while (i + 1 < rawRuns.length && rawRuns[i + 1].startBar === endBar + 2) {
      const intermediateBarNumber = endBar + 1;
      const intermediateMeasure = measures.find((m) => m.measureNumber === intermediateBarNumber);
      if (intermediateMeasure && intermediateMeasure.status !== 'mastered') {
        endBar = rawRuns[i + 1].endBar;
        i++;
      } else {
        break;
      }
    }
    mergedRuns.push({ startBar, endBar });
    i++;
  }

  // Step 3: Synthesize pedagogical drill recommendations
  const drills: DrillRecommendation[] = [];

  for (const run of mergedRuns) {
    const clusterMeasures = measures.filter(
      (m) => m.measureNumber >= run.startBar && m.measureNumber <= run.endBar
    );
    if (clusterMeasures.length === 0) continue;

    const totalMisses = clusterMeasures.reduce((acc, m) => acc + m.missHits, 0);
    const avgAcc =
      Math.round(
        (clusterMeasures.reduce((acc, m) => acc + m.accuracy, 0) / clusterMeasures.length) * 10
      ) / 10;

    const loopStartMs = clusterMeasures[0].startMs;
    const loopEndMs = clusterMeasures[clusterMeasures.length - 1].endMs;

    // Detect hand errors in the drill window
    const clusterEvents = events.filter((e) => {
      const expStart = e.expectedStartMs ?? e.expectedTime ?? 0;
      return expStart >= loopStartMs && expStart <= loopEndMs;
    });

    const lhMisses = clusterEvents.filter((e) => {
      const sc = e.score ?? e.judgment;
      return e.hand === 'L' && sc === 'Miss';
    }).length;

    const rhMisses = clusterEvents.filter((e) => {
      const sc = e.score ?? e.judgment;
      return e.hand === 'R' && sc === 'Miss';
    }).length;

    let prescribedHand: 'both' | 'right' | 'left' = 'both';
    let handDiagnosis = '';
    if (lhMisses > rhMisses * 2 && lhMisses >= 2) {
      prescribedHand = 'left';
      handDiagnosis = 'Left hand struggle detected.';
    } else if (rhMisses > lhMisses * 2 && rhMisses >= 2) {
      prescribedHand = 'right';
      handDiagnosis = 'Right hand stumble detected.';
    }

    const priorityScore = totalMisses * 20 + Math.round(100 - avgAcc);
    const recommendedSpeed = isFastTempo
      ? avgAcc < 75
        ? 0.7
        : 0.75
      : avgAcc < 60
      ? 0.7
      : avgAcc < 75
      ? 0.75
      : 0.8;

    const title =
      run.startBar === run.endBar
        ? `Bar ${run.startBar}: Targeted Drill`
        : `Bars ${run.startBar} – ${run.endBar}: Targeted Section`;

    drills.push({
      id: `drill-${run.startBar}-${run.endBar}`,
      title,
      startMeasure: run.startBar,
      endMeasure: run.endBar,
      loopStartMs,
      loopEndMs,
      recommendedSpeed,
      suggestedSpeed: recommendedSpeed,
      startMs: loopStartMs,
      endMs: loopEndMs,
      priorityScore,
      diagnosis: `Accuracy ${avgAcc}% with ${totalMisses} miss${totalMisses === 1 ? '' : 'es'}. ${
        handDiagnosis ? handDiagnosis + ' ' : ''
      }Recommended speed: ${recommendedSpeed}x.`,
      prescribedHand,
      totalMisses,
      accuracy: avgAcc,
    });
  }

  // Sort by priorityScore descending and return top 3
  drills.sort((a, b) => b.priorityScore - a.priorityScore);
  return drills.slice(0, 3);
}

/**
 * Master pipeline producing the full session analytics report.
 */
export function buildSessionAnalyticsReport(params: {
  events: SignedTimingEvent[];
  expectedNotes: ExpectedNote[];
  bpm: number;
  timeSignature?: string;
  totalDurationMs?: number;
  sessionId?: string;
}): SessionAnalyticsReport {
  const {
    events,
    expectedNotes,
    bpm,
    timeSignature = '4/4',
    totalDurationMs = 0,
    sessionId = 'session-' + Date.now(),
  } = params;

  // 1. Timing Analytics
  const timing = calculateTimingAnalytics(events);

  // 2. Measure Partitioning
  const measures = partitionMeasures(expectedNotes, events, bpm, timeSignature, totalDurationMs);

  // 3. Drill Clustering
  const drills = generateDrillRecommendations(measures, events, bpm);

  // 4. Overall Accuracy & Performance Grade
  const totalNotes = expectedNotes.length;
  const evaluatedNotes = events.length;

  const perfectCount = events.filter((e) => (e.score ?? e.judgment) === 'Perfect').length;
  const goodCount = events.filter((e) => (e.score ?? e.judgment) === 'Good').length;

  const overallAccuracy =
    evaluatedNotes > 0
      ? Math.round(((perfectCount * 1.0 + goodCount * 0.6) / evaluatedNotes) * 1000) / 10
      : 100;

  let overallGrade: 'S' | 'A' | 'B' | 'C' | 'D' = 'S';
  if (overallAccuracy >= 95) overallGrade = 'S';
  else if (overallAccuracy >= 88) overallGrade = 'A';
  else if (overallAccuracy >= 78) overallGrade = 'B';
  else if (overallAccuracy >= 65) overallGrade = 'C';
  else overallGrade = 'D';

  // 5. Pedagogical Summary Message
  let summaryMessage = 'Masterful performance! You are locked in the pocket with consistent groove.';
  if (timing.globalClassification === 'rushing') {
    summaryMessage = `You tend to rush the beat by an average of ${Math.abs(timing.globalMeanBiasMs)}ms. Relax your tempo on fast phrases.`;
  } else if (timing.globalClassification === 'dragging') {
    summaryMessage = `You tend to drag behind the beat by ${timing.globalMeanBiasMs}ms. Anticipate chord transitions earlier.`;
  }

  if (timing.globalJitterMs > 40) {
    summaryMessage += ` Work with a metronome to reduce timing jitter (±${timing.globalJitterMs}ms).`;
  } else if (Math.abs(timing.handSyncGapMs) > 25) {
    summaryMessage += ` Noticeable hand desynchronization (${Math.abs(timing.handSyncGapMs)}ms gap). Practice hands separately.`;
  }

  return {
    sessionId,
    totalNotes,
    evaluatedNotes,
    overallAccuracy,
    overallGrade,
    timing,
    measures,
    drills,
    summaryMessage,
  };
}

/**
 * Functional alias for buildSessionAnalyticsReport
 */
export const computeSessionAnalytics = buildSessionAnalyticsReport;
