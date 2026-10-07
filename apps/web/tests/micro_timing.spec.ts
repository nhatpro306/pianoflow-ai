import { test, expect } from '@playwright/test';
import {
  classifyMicroTiming,
  evaluateMicroTiming,
  MicroTimingTracker,
  createMicroTimingTracker,
  getMidiNoteName,
  TIMING_THRESHOLDS,
  TIMING_COLORS,
} from '../lib/practice/microTiming';

test.describe('Live Micro-Timing Engine (microTiming.ts)', () => {
  test.describe('TIMING_THRESHOLDS and TIMING_COLORS', () => {
    test('defines calibrated threshold constants and color tokens', () => {
      expect(TIMING_THRESHOLDS.POCKET_WINDOW_MS).toBe(35);
      expect(TIMING_THRESHOLDS.EARLY_LATE_WINDOW_MS).toBe(75);
      expect(TIMING_THRESHOLDS.MAX_GAUGE_WINDOW_MS).toBe(75);
      expect(TIMING_COLORS.pocket).toBe('#10b981');
      expect(TIMING_COLORS.early).toBe('#f59e0b');
      expect(TIMING_COLORS.late).toBe('#0284c7');
      expect(TIMING_COLORS.miss).toBe('#ef4444');
    });
  });

  test.describe('getMidiNoteName', () => {
    test('correctly maps standard pitches to note names', () => {
      expect(getMidiNoteName(60)).toBe('C4');
      expect(getMidiNoteName(69)).toBe('A4');
      expect(getMidiNoteName(48)).toBe('C3');
      expect(getMidiNoteName(72)).toBe('C5');
      expect(getMidiNoteName(61)).toBe('C#4');
      expect(getMidiNoteName(21)).toBe('A0');
      expect(getMidiNoteName(108)).toBe('C8');
    });

    test('handles out of range or negative pitches gracefully', () => {
      expect(getMidiNoteName(-1)).toBe('C-1');
      expect(getMidiNoteName(NaN)).toBe('C-1');
    });
  });

  test.describe('classifyMicroTiming', () => {
    test('classifies perfect pocket hits (|deltaMs| <= 35ms)', () => {
      const hit0 = classifyMicroTiming(0, 60, 60, 'R');
      expect(hit0.rating).toBe('pocket');
      expect(hit0.color).toBe(TIMING_COLORS.pocket);
      expect(hit0.label).toBe('PERFECT POCKET');
      expect(hit0.normalizedOffset).toBe(0);
      expect(hit0.notePitch).toBe(60);
      expect(hit0.noteName).toBe('C4');
      expect(hit0.hand).toBe('R');

      const hitEarly35 = classifyMicroTiming(-35, 60, 60, 'R');
      expect(hitEarly35.rating).toBe('pocket');
      expect(hitEarly35.color).toBe(TIMING_COLORS.pocket);

      const hitLate35 = classifyMicroTiming(35, 60, 60, 'L', 'C4');
      expect(hitLate35.rating).toBe('pocket');
      expect(hitLate35.color).toBe(TIMING_COLORS.pocket);
      expect(hitLate35.hand).toBe('L');
    });

    test('classifies early strikes (-75ms <= deltaMs < -35ms)', () => {
      const hitEarly42 = classifyMicroTiming(-42, 60, 60, 'R');
      expect(hitEarly42.rating).toBe('early');
      expect(hitEarly42.color).toBe(TIMING_COLORS.early);
      expect(hitEarly42.label).toBe('-42ms EARLY');
      expect(hitEarly42.normalizedOffset).toBeCloseTo(-42 / 75, 4);

      const hitEarly75 = classifyMicroTiming(-75, 64, 64, 'R');
      expect(hitEarly75.rating).toBe('early');
      expect(hitEarly75.color).toBe(TIMING_COLORS.early);
      expect(hitEarly75.label).toBe('-75ms EARLY');
      expect(hitEarly75.normalizedOffset).toBe(-1);
    });

    test('classifies late strikes (+35ms < deltaMs <= +75ms)', () => {
      const hitLate55 = classifyMicroTiming(55, 60, 60, 'R');
      expect(hitLate55.rating).toBe('late');
      expect(hitLate55.color).toBe(TIMING_COLORS.late);
      expect(hitLate55.label).toBe('+55ms LATE');
      expect(hitLate55.normalizedOffset).toBeCloseTo(55 / 75, 4);

      const hitLate75 = classifyMicroTiming(75, 67, 67, 'L');
      expect(hitLate75.rating).toBe('late');
      expect(hitLate75.color).toBe(TIMING_COLORS.late);
      expect(hitLate75.label).toBe('+75ms LATE');
      expect(hitLate75.normalizedOffset).toBe(1);
    });

    test('classifies misses when |deltaMs| > 75ms or pitch mismatches', () => {
      // Delta too early
      const hitWayEarly = classifyMicroTiming(-90, 60, 60, 'R');
      expect(hitWayEarly.rating).toBe('miss');
      expect(hitWayEarly.color).toBe(TIMING_COLORS.miss);
      expect(hitWayEarly.label).toBe('MISS');
      expect(hitWayEarly.normalizedOffset).toBe(-1); // Clamped

      // Delta too late
      const hitWayLate = classifyMicroTiming(120, 60, 60, 'R');
      expect(hitWayLate.rating).toBe('miss');
      expect(hitWayLate.color).toBe(TIMING_COLORS.miss);
      expect(hitWayLate.label).toBe('MISS');
      expect(hitWayLate.normalizedOffset).toBe(1); // Clamped

      // Pitch mismatch even if on time
      const wrongPitch = classifyMicroTiming(5, 62, 60, 'R');
      expect(wrongPitch.rating).toBe('miss');
      expect(wrongPitch.color).toBe(TIMING_COLORS.miss);
      expect(wrongPitch.label).toBe('MISS');
    });

    test('normalizedOffset correctly clamps to [-1.0, 1.0]', () => {
      expect(classifyMicroTiming(-200, 60, 60).normalizedOffset).toBe(-1);
      expect(classifyMicroTiming(200, 60, 60).normalizedOffset).toBe(1);
      expect(classifyMicroTiming(0, 60, 60).normalizedOffset).toBe(0);
      expect(classifyMicroTiming(-37.5, 60, 60).normalizedOffset).toBe(-0.5);
      expect(classifyMicroTiming(37.5, 60, 60).normalizedOffset).toBe(0.5);
    });
  });

  test.describe('evaluateMicroTiming', () => {
    test('computes delta from actualHitMs and expectedStartMs', () => {
      const feedback = evaluateMicroTiming(1050, 1000, 60, 60, 'R');
      expect(feedback.deltaMs).toBe(50);
      expect(feedback.rating).toBe('late');
      expect(feedback.label).toBe('+50ms LATE');
      expect(feedback.timestamp).toBe(1050);
    });
  });

  test.describe('MicroTimingTracker', () => {
    test('tracks pocket, early, late, miss counts and Welford running statistics', () => {
      const tracker = new MicroTimingTracker();

      expect(tracker.totalCount).toBe(0);
      expect(tracker.pocketCount).toBe(0);
      expect(tracker.accuracy).toBe(100);

      // 1. Pocket hit: 0ms
      tracker.recordHit(0, 60, 60);
      expect(tracker.pocketCount).toBe(1);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBe(0);

      // 2. Early hit: -40ms
      tracker.recordHit(-40, 62, 62);
      expect(tracker.earlyCount).toBe(1);
      expect(tracker.meanBiasMs).toBe(-20); // (0 + -40) / 2
      expect(tracker.jitterMs).toBe(20); // population std dev = sqrt(((20)^2 + (-20)^2)/2) = 20

      // 3. Late hit: +40ms
      tracker.recordHit(40, 64, 64);
      expect(tracker.lateCount).toBe(1);
      expect(tracker.meanBiasMs).toBe(0); // (0 - 40 + 40) / 3

      // 4. Miss hit (wrong key): should increment missCount but not distort timing mean
      tracker.recordHit(10, 65, 67);
      expect(tracker.missCount).toBe(1);
      expect(tracker.totalCount).toBe(4);
      expect(tracker.validHitCount).toBe(3);
      expect(tracker.meanBiasMs).toBe(0);

      const stats = tracker.getStats();
      expect(stats.pocketCount).toBe(1);
      expect(stats.earlyCount).toBe(1);
      expect(stats.lateCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.totalCount).toBe(4);
      expect(stats.accuracy).toBe(75); // 3 hits out of 4 = 75%
      expect(stats.pocketRate).toBe(25); // 1 out of 4 = 25%

      // Test reset
      tracker.reset();
      expect(tracker.totalCount).toBe(0);
      expect(tracker.pocketCount).toBe(0);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBe(0);
    });

    test('createMicroTimingTracker helper instantiates tracker', () => {
      const tracker = createMicroTimingTracker();
      expect(tracker).toBeInstanceOf(MicroTimingTracker);
      expect(tracker.totalCount).toBe(0);
    });
  });
});
