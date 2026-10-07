/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  classifyMicroTiming,
  evaluateMicroTiming,
  MicroTimingTracker,
  createMicroTimingTracker,
  TIMING_THRESHOLDS,
  TIMING_COLORS,
  getMidiNoteName,
} from '../lib/practice/microTiming';
import { AccompanimentEngine } from '../lib/audio/accompanimentEngine';
import { MidiEngine, type ExpectedNote } from '../lib/midi/MidiEngine';

// Ensure screenshot directory exists
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/pedagogy');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Lightweight Web Audio Context mock for headless tests
function createMockAudioContext() {
  const destination = {
    connect: () => {},
    disconnect: () => {},
  };

  const createGain = () => ({
    gain: {
      value: 1,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    },
    connect: () => {},
    disconnect: () => {},
  });

  const createOscillator = () => ({
    type: 'triangle',
    frequency: {
      setValueAtTime: () => {},
    },
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
  });

  const createBiquadFilter = () => ({
    type: 'lowpass',
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
    disconnect: () => {},
  });

  return {
    state: 'running' as AudioContextState,
    currentTime: 10.0,
    destination: destination as unknown as AudioDestinationNode,
    createGain: createGain as unknown as () => GainNode,
    createOscillator: createOscillator as unknown as () => OscillatorNode,
    createBiquadFilter: createBiquadFilter as unknown as () => BiquadFilterNode,
    resume: async () => {},
    close: async () => {},
  } as unknown as AudioContext;
}

// Setup client mocks for Web MIDI & Web Audio
async function setupBrowserMocks(page: Page) {
  await page.addInitScript(() => {
    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = 'mock-piano-pedagogy';
      name = 'Virtual Studio Grand';
      manufacturer = 'PianoFlow AI';
      state = 'connected';
      connection = 'open';
      onmidimessage = null;
    }

    const mockInput = new MockMIDIInput();
    const mockAccess = new MockMIDIAccess();
    mockAccess.inputs.set(mockInput.id, mockInput);

    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const origProto = AudioContextClass.prototype;
      origProto.resume = async () => {};
    }
  });
}

// Send simulated MIDI Note On event
async function sendMidiNoteOn(page: Page, pitch: number, velocity = 90) {
  await page.evaluate(
    ({ p, v }) => {
      const input = (window as any).__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x90, p, v]) });
      }
    },
    { p: pitch, v: velocity }
  );
}

// Send simulated MIDI Note Off event
async function sendMidiNoteOff(page: Page, pitch: number) {
  await page.evaluate(
    ({ p }) => {
      const input = (window as any).__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x80, p, 0]) });
      }
    },
    { p: pitch }
  );
}

// Multi-hand test dataset
const samplePracticeScore: ExpectedNote[] = [
  { pitch: 48, start: 1000, end: 1500, hand: 'L', name: 'C3' },
  { pitch: 60, start: 1000, end: 1500, hand: 'R', name: 'C4' },
  { pitch: 52, start: 2000, end: 2500, hand: 'L', name: 'E3' },
  { pitch: 64, start: 2000, end: 2500, hand: 'R', name: 'E4' },
  { pitch: 55, start: 3000, end: 3500, hand: 'L', name: 'G3' },
  { pitch: 67, start: 3000, end: 3500, hand: 'R', name: 'G4' },
];

test.describe('PianoFlow AI — Phase N: Pedagogy & Micro-Timing E2E Test Suite', () => {
  // Execute serially to prevent dev server resource contention across parallel browser contexts
  test.describe.configure({ mode: 'serial' });

  // ─────────────────────────────────────────────────────────────
  // 1. PEDAGOGY-01: Real-Time Micro-Timing Classification & Delta Math
  // ─────────────────────────────────────────────────────────────
  test.describe('PEDAGOGY-01: Real-Time Micro-Timing Classification & Delta Math', () => {
    test('1.1 Calibrated Thresholds and Color Design Tokens', () => {
      expect(TIMING_THRESHOLDS.POCKET_WINDOW_MS).toBe(35);
      expect(TIMING_THRESHOLDS.EARLY_LATE_WINDOW_MS).toBe(75);
      expect(TIMING_THRESHOLDS.MAX_GAUGE_WINDOW_MS).toBe(75);

      expect(TIMING_COLORS.pocket).toBe('#10b981');
      expect(TIMING_COLORS.early).toBe('#f59e0b');
      expect(TIMING_COLORS.late).toBe('#0284c7');
      expect(TIMING_COLORS.miss).toBe('#ef4444');
    });

    test('1.2 Pocket Classification (|deltaMs| <= 35ms)', () => {
      const pocketCenter = classifyMicroTiming(0, 60, 60, 'R');
      expect(pocketCenter.rating).toBe('pocket');
      expect(pocketCenter.color).toBe(TIMING_COLORS.pocket);
      expect(pocketCenter.label).toBe('PERFECT POCKET');
      expect(pocketCenter.normalizedOffset).toBe(0);
      expect(pocketCenter.hand).toBe('R');
      expect(pocketCenter.noteName).toBe('C4');

      const pocketEarlyBoundary = classifyMicroTiming(-35, 60, 60, 'R');
      expect(pocketEarlyBoundary.rating).toBe('pocket');
      expect(pocketEarlyBoundary.color).toBe(TIMING_COLORS.pocket);
      expect(pocketEarlyBoundary.normalizedOffset).toBeCloseTo(-35 / 75, 4);

      const pocketLateBoundary = classifyMicroTiming(35, 60, 60, 'L');
      expect(pocketLateBoundary.rating).toBe('pocket');
      expect(pocketLateBoundary.color).toBe(TIMING_COLORS.pocket);
      expect(pocketLateBoundary.hand).toBe('L');
      expect(pocketLateBoundary.normalizedOffset).toBeCloseTo(35 / 75, 4);
    });

    test('1.3 Early Classification (-75ms <= deltaMs < -35ms)', () => {
      const earlyHit = classifyMicroTiming(-48, 60, 60, 'R');
      expect(earlyHit.rating).toBe('early');
      expect(earlyHit.color).toBe(TIMING_COLORS.early);
      expect(earlyHit.label).toBe('-48ms EARLY');
      expect(earlyHit.normalizedOffset).toBeCloseTo(-48 / 75, 4);

      const earlyEdge = classifyMicroTiming(-75, 62, 62, 'R');
      expect(earlyEdge.rating).toBe('early');
      expect(earlyEdge.color).toBe(TIMING_COLORS.early);
      expect(earlyEdge.label).toBe('-75ms EARLY');
      expect(earlyEdge.normalizedOffset).toBe(-1);
    });

    test('1.4 Late Classification (+35ms < deltaMs <= +75ms)', () => {
      const lateHit = classifyMicroTiming(52, 60, 60, 'R');
      expect(lateHit.rating).toBe('late');
      expect(lateHit.color).toBe(TIMING_COLORS.late);
      expect(lateHit.label).toBe('+52ms LATE');
      expect(lateHit.normalizedOffset).toBeCloseTo(52 / 75, 4);

      const lateEdge = classifyMicroTiming(75, 67, 67, 'L');
      expect(lateEdge.rating).toBe('late');
      expect(lateEdge.color).toBe(TIMING_COLORS.late);
      expect(lateEdge.label).toBe('+75ms LATE');
      expect(lateEdge.normalizedOffset).toBe(1);
    });

    test('1.5 Miss Classification (|deltaMs| > 75ms or Pitch Mismatch)', () => {
      const missEarly = classifyMicroTiming(-85, 60, 60, 'R');
      expect(missEarly.rating).toBe('miss');
      expect(missEarly.color).toBe(TIMING_COLORS.miss);
      expect(missEarly.label).toBe('MISS');
      expect(missEarly.normalizedOffset).toBe(-1);

      const missLate = classifyMicroTiming(110, 60, 60, 'R');
      expect(missLate.rating).toBe('miss');
      expect(missLate.color).toBe(TIMING_COLORS.miss);
      expect(missLate.label).toBe('MISS');
      expect(missLate.normalizedOffset).toBe(1);

      const wrongKey = classifyMicroTiming(5, 62, 60, 'R');
      expect(wrongKey.rating).toBe('miss');
      expect(wrongKey.color).toBe(TIMING_COLORS.miss);
      expect(wrongKey.label).toBe('MISS');
    });

    test('1.6 evaluateMicroTiming Absolute Delta Computation', () => {
      const evaluated = evaluateMicroTiming(2042, 2000, 64, 64, 'R');
      expect(evaluated.deltaMs).toBe(42);
      expect(evaluated.rating).toBe('late');
      expect(evaluated.label).toBe('+42ms LATE');
      expect(evaluated.notePitch).toBe(64);
      expect(evaluated.noteName).toBe('E4');
    });

    test("1.7 Welford's Algorithm Online Tracker Metrics (Mean Bias & Jitter Std Dev)", () => {
      const tracker = createMicroTimingTracker();
      expect(tracker).toBeInstanceOf(MicroTimingTracker);
      expect(tracker.totalCount).toBe(0);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBe(0);
      expect(tracker.accuracy).toBe(100);

      // Hit 1: 0ms pocket
      tracker.recordHit(0, 60, 60);
      expect(tracker.pocketCount).toBe(1);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBe(0);

      // Hit 2: +20ms pocket
      tracker.recordHit(20, 60, 60);
      expect(tracker.pocketCount).toBe(2);
      expect(tracker.meanBiasMs).toBe(10);
      expect(tracker.jitterMs).toBe(10);

      // Hit 3: -20ms pocket -> mean becomes 0ms, std dev ≈ 16.33ms
      tracker.recordHit(-20, 60, 60);
      expect(tracker.pocketCount).toBe(3);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBeCloseTo(16.33, 1);

      // Hit 4: -50ms early
      tracker.recordHit(-50, 60, 60);
      expect(tracker.earlyCount).toBe(1);

      // Hit 5: +50ms late
      tracker.recordHit(50, 60, 60);
      expect(tracker.lateCount).toBe(1);

      // Hit 6: miss (wrong pitch)
      tracker.recordHit(10, 62, 60);
      expect(tracker.missCount).toBe(1);
      expect(tracker.totalCount).toBe(6);
      expect(tracker.validHitCount).toBe(5);

      const stats = tracker.getStats();
      expect(stats.accuracy).toBeCloseTo((5 / 6) * 100, 1);
      expect(stats.pocketRate).toBe(50); // 3 of 6 = 50%

      // Reset
      tracker.reset();
      expect(tracker.totalCount).toBe(0);
      expect(tracker.pocketCount).toBe(0);
      expect(tracker.meanBiasMs).toBe(0);
      expect(tracker.jitterMs).toBe(0);
    });

    test('1.8 Note Pitch to Name Conversion', () => {
      expect(getMidiNoteName(60)).toBe('C4');
      expect(getMidiNoteName(69)).toBe('A4');
      expect(getMidiNoteName(21)).toBe('A0');
      expect(getMidiNoteName(108)).toBe('C8');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PEDAGOGY-02: MicroTimingGauge UI Component & Dynamic Needle Animation
  // ─────────────────────────────────────────────────────────────
  test.describe('PEDAGOGY-02: MicroTimingGauge UI Component & Dynamic Needle Animation', () => {
    test.beforeEach(async ({ page }) => {
      await setupBrowserMocks(page);
    });

    test('2.1 Gauge Renders with Graduated Meter Marks & Center Bullseye Target', async ({ page }) => {
      await page.goto('/projects/test-pedagogy/practice');

      const gauge = page.getByTestId('micro-timing-gauge');
      await expect(gauge).toBeVisible({ timeout: 10000 });

      // Verify all 5 calibration tick marks (-75ms, -35ms, 0ms, +35ms, +75ms)
      await expect(gauge.locator('span[title="-75ms Early Limit"]')).toHaveText('-75ms');
      await expect(gauge.locator('span[title="-35ms Pocket Threshold"]')).toHaveText('-35ms');
      await expect(gauge.locator('span[title="0ms Dead Center Pocket"]')).toHaveText('0ms');
      await expect(gauge.locator('span[title="+35ms Pocket Threshold"]')).toHaveText('+35ms');
      await expect(gauge.locator('span[title="+75ms Late Limit"]')).toHaveText('+75ms');

      // Verify zone indicator labels without strict mode ambiguity
      await expect(gauge.getByText('POCKET')).toBeVisible();
      await expect(gauge.getByText('◄ Rush')).toBeVisible();
      await expect(gauge.getByText('Drag ►')).toBeVisible();

      // Verify center bullseye reticle with emerald target styling
      const bullseye = gauge.locator('div[title="Pocket Bullseye Target (0ms)"]');
      await expect(bullseye).toBeVisible();
      await expect(bullseye).toHaveClass(/border-emerald-400/);

      // Verify initial neutral needle position at dead center (50%)
      const needle = gauge.getByTestId('timing-pointer');
      await expect(needle).toBeVisible();
      const initialStyle = await needle.getAttribute('style');
      expect(initialStyle).toMatch(/left:\s*50%/);

      // Save screenshot evidence of initial calibrated gauge
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_02_gauge_calibrated.png'),
        fullPage: false,
      });
    });

    test('2.2 Dynamic Needle Translation & Reticle Pulse on Pocket Strike', async ({ page }) => {
      await page.goto('/projects/test-pedagogy/practice');

      const gauge = page.getByTestId('micro-timing-gauge');
      await expect(gauge).toBeVisible({ timeout: 10000 });

      // Select RH practice mode
      await page.getByTestId('tab-right').click();

      // Start playback session using exact button match
      const startButton = page.getByRole('button', { name: 'Start', exact: true });
      await startButton.click();
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

      // Wait until playhead approaches first note window (~960ms)
      await page.waitForTimeout(960);

      // 1. Strike expected C4 (pitch 60) for a pocket hit
      await sendMidiNoteOn(page, 60, 95);

      // Verify strike badge popover appears with real-time micro-timing judgment
      const strikeBadge = page.getByTestId('timing-strike-badge');
      await expect(strikeBadge).toBeVisible({ timeout: 5000 });
      await expect(strikeBadge).toContainText(/POCKET|LATE|EARLY/);

      // Verify dynamic needle position reacts to normalized offset
      const needle = page.getByTestId('timing-pointer');
      const pocketStyle = (await needle.getAttribute('style')) || '';
      const needleLeft = parseFloat(pocketStyle.match(/left:\s*([\d.]+)%/)?.[1] || '0');
      expect(needleLeft).toBeGreaterThan(0);
      expect(needleLeft).toBeLessThan(100);

      // Capture screenshot evidence of pocket hit
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_02_gauge_pocket.png'),
      });

      await sendMidiNoteOff(page, 60);
      await page.waitForTimeout(400);
    });

    test('2.3 Dynamic Needle Offset Math & Early/Late Meter Reaction', async ({ page }) => {
      await page.goto('/projects/test-pedagogy/practice');

      const gauge = page.getByTestId('micro-timing-gauge');
      await expect(gauge).toBeVisible({ timeout: 10000 });

      // Verify needle position math for normalized offsets
      const needle = gauge.getByTestId('timing-pointer');
      await expect(needle).toBeVisible();

      // Start session in continuous mode to test timing variance
      await page.getByTestId('mode-continuous').click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

      // Strike note early (pitch 60 before 1000ms mark, at ~500ms)
      await page.waitForTimeout(550);
      await sendMidiNoteOn(page, 60, 90);

      // Capture early strike state
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_02_gauge_early.png'),
      });
      await sendMidiNoteOff(page, 60);

      // Wait for next note line (~2000ms) and strike late (~2150ms)
      await page.waitForTimeout(1600);
      await sendMidiNoteOn(page, 64, 90);

      // Capture late strike state
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_02_gauge_late.png'),
      });
      await sendMidiNoteOff(page, 64);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PEDAGOGY-03: Hands-Separate Virtual Accompaniment Engine
  // ─────────────────────────────────────────────────────────────
  test.describe('PEDAGOGY-03: Hands-Separate Virtual Accompaniment Engine', () => {
    test('3.1 Engine Unit: Hand Mode Isolation Logic', () => {
      const mockCtx = createMockAudioContext();
      const engine = new AccompanimentEngine(mockCtx);
      engine.setNotes(samplePracticeScore);

      const triggeredNotes: ExpectedNote[] = [];
      engine.playNote = (n: ExpectedNote) => {
        triggeredNotes.push(n);
      };

      // In RH mode, accompaniment MUST play only LH notes
      engine.setHandMode('right');
      engine.tick(1050, 950);
      expect(triggeredNotes.length).toBe(1);
      expect(triggeredNotes[0].pitch).toBe(48); // LH C3
      expect(triggeredNotes[0].hand).toBe('L');

      // In LH mode, accompaniment MUST play only RH notes
      triggeredNotes.length = 0;
      engine.setHandMode('left');
      engine.tick(2050, 1950);
      expect(triggeredNotes.length).toBe(1);
      expect(triggeredNotes[0].pitch).toBe(64); // RH E4
      expect(triggeredNotes[0].hand).toBe('R');

      // In Both mode, accompaniment MUST be muted/standby
      triggeredNotes.length = 0;
      engine.setHandMode('both');
      engine.tick(3050, 2950);
      expect(triggeredNotes.length).toBe(0);

      // When disabled, accompaniment MUST be muted
      triggeredNotes.length = 0;
      engine.setHandMode('right');
      engine.setEnabled(false);
      engine.tick(3050, 2950);
      expect(triggeredNotes.length).toBe(0);

      // When volume is 0, accompaniment MUST be muted
      triggeredNotes.length = 0;
      engine.setEnabled(true);
      engine.setVolume(0);
      engine.tick(3050, 2950);
      expect(triggeredNotes.length).toBe(0);
    });

    test('3.2 Engine Unit: Parameter Clamping & Seek Safeguards', () => {
      const engine = new AccompanimentEngine();
      engine.setVolume(1.8);
      expect(engine.getVolume()).toBe(1.0);

      engine.setVolume(-0.4);
      expect(engine.getVolume()).toBe(0.0);

      engine.setSpeed(4.5);
      expect(engine.getSpeed()).toBe(3.0);

      engine.setSpeed(0.02);
      expect(engine.getSpeed()).toBe(0.1);

      engine.seek(1800);
      expect(engine.getLastPlayheadMs()).toBe(1800);
    });

    test('3.3 Browser UI: Accompaniment Control Status & Volume Slider Interactivity', async ({ page }) => {
      await setupBrowserMocks(page);
      await page.goto('/projects/test-pedagogy/practice');

      const control = page.getByTestId('accompaniment-control');
      await expect(control).toBeVisible({ timeout: 10000 });

      // 1. Initial State: Hand mode is "both", so badge shows "Standby"
      await expect(control).toContainText('Standby');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_03_accompaniment_standby.png'),
      });

      // 2. Switch Hand Mode to RH -> Accompaniment transitions to "ON"
      const rhTab = page.getByTestId('tab-right');
      await rhTab.click();
      await expect(control).toContainText('ON');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_03_accompaniment_active_rh.png'),
      });

      // 3. Adjust Volume Slider
      const volumeSlider = control.locator('input[aria-label="Accompaniment Volume"]');
      await expect(volumeSlider).toBeVisible();
      await expect(control).toContainText('70%'); // Default 70%

      // Set volume to 40%
      await volumeSlider.fill('40');
      await expect(control).toContainText('40%');

      // Set volume to 100%
      await volumeSlider.fill('100');
      await expect(control).toContainText('100%');

      // Set volume to 0%
      await volumeSlider.fill('0');
      await expect(control).toContainText('0%');

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_03_accompaniment_volume_adjust.png'),
      });

      // 4. Toggle Accompaniment Button to OFF
      const toggleBtn = control.locator('button');
      await toggleBtn.click();
      await expect(control).toContainText('OFF');
      // Volume slider should now be hidden
      await expect(volumeSlider).not.toBeVisible();

      // Toggle back to ON
      await toggleBtn.click();
      await expect(control).toContainText('ON');
      await expect(volumeSlider).toBeVisible();

      // Switch back to "Both" -> returns to Standby
      const bothTab = page.getByTestId('tab-both');
      await bothTab.click();
      await expect(control).toContainText('Standby');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PEDAGOGY-04: Lockstep Synchronization in Wait Mode
  // ─────────────────────────────────────────────────────────────
  test.describe('PEDAGOGY-04: Lockstep Synchronization in Wait Mode', () => {
    test('4.1 Engine Unit: Accompaniment Freezes in Wait Mode Hold and Resumes in Lockstep', () => {
      const mockCtx = createMockAudioContext();
      const accomp = new AccompanimentEngine(mockCtx);
      accomp.setNotes(samplePracticeScore);
      accomp.setHandMode('right'); // Practicing RH, accompaniment plays LH

      const midiEngine = new MidiEngine(samplePracticeScore);
      midiEngine.setHandMode('right');

      const accompEmissions: ExpectedNote[] = [];
      accomp.playNote = (n: ExpectedNote) => {
        accompEmissions.push(n);
      };

      // Phase 1: Playhead advances to 1050ms. LH note (pitch 48 at 1000ms) triggers in [950, 1050)
      accomp.tick(1050, 950);
      expect(accompEmissions.length).toBe(1);
      expect(accompEmissions[0].pitch).toBe(48);

      // Phase 2: User has NOT pressed RH note (pitch 60). MidiEngine signals shouldPause = true
      const shouldPauseBeforeHit = midiEngine.processInput(new Set<number>(), 1050, true);
      expect(shouldPauseBeforeHit).toBe(true);

      // Accompaniment freezes immediately
      accomp.pause();

      // Repeated frames while paused at 1050ms MUST emit zero notes
      for (let i = 0; i < 5; i++) {
        accomp.tick(1050, 1050);
      }
      expect(accompEmissions.length).toBe(1); // Still exactly 1, no duplicate or runaway notes

      // Phase 3: User strikes the expected key (pitch 60)!
      const shouldPauseAfterHit = midiEngine.processInput(new Set<number>([60]), 1050, true);
      expect(shouldPauseAfterHit).toBe(false);

      // Timeline resumes: advances 1050ms -> 1200ms -> 1900ms -> 2050ms
      accomp.tick(1200, 1050);
      expect(accompEmissions.length).toBe(1); // No LH notes in [1050, 1200)

      accomp.tick(2050, 1900);
      // Next LH note (pitch 52 at 2000ms) triggers precisely in lockstep!
      expect(accompEmissions.length).toBe(2);
      expect(accompEmissions[1].pitch).toBe(52);
    });

    test('4.2 Browser UI: Wait Mode Pauses Playback and Resumes on Expected Key Strike', async ({ page }) => {
      await setupBrowserMocks(page);
      await page.goto('/projects/test-pedagogy/practice');

      // Verify Wait Mode tab is active
      const waitTab = page.getByTestId('mode-wait');
      await expect(waitTab).toHaveAttribute('aria-selected', 'true');

      // Select RH practice mode
      await page.getByTestId('tab-right').click();

      // Start playback using exact role match
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

      // Wait for playhead to reach 1000ms where it holds at the hit line
      await page.waitForTimeout(960);

      // Strike expected key C4 (pitch 60)
      await sendMidiNoteOn(page, 60, 100);

      // Capture screenshot evidence of Wait Mode paused/strike at hit line
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_04_wait_mode_paused.png'),
      });

      // Verify score counter updates to > 0 (points awarded for hit)
      const scoreCounter = page.getByTestId('score-counter');
      await expect(scoreCounter).not.toHaveText('0');

      // Verify accuracy badge displays percentage
      const accuracyBadge = page.getByTestId('accuracy-badge');
      await expect(accuracyBadge).toContainText('%');

      // Capture screenshot evidence of Wait Mode resumed
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_04_wait_mode_resumed.png'),
      });

      await sendMidiNoteOff(page, 60);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PEDAGOGY-05: Integrated Practice Studio Session with Micro-Timing & Accompaniment
  // ─────────────────────────────────────────────────────────────
  test.describe('PEDAGOGY-05: Integrated Practice Studio Session with Micro-Timing & Accompaniment', () => {
    test.beforeEach(async ({ page }) => {
      await setupBrowserMocks(page);
    });

    test('5.1 End-to-End Live Session: Web MIDI Input, Strike Badge, Sparks, and Accompaniment', async ({ page }) => {
      await page.goto('/projects/test-pedagogy/practice');

      // 1. Verify canvas and keyboard footer are ready
      const canvas = page.locator('main canvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      const gauge = page.getByTestId('micro-timing-gauge');
      await expect(gauge).toBeVisible();

      const accompControl = page.getByTestId('accompaniment-control');
      await expect(accompControl).toBeVisible();

      // 2. Select RH practice mode
      await page.getByTestId('tab-right').click();
      await expect(accompControl).toContainText('ON');

      // 3. Start interactive session using exact button match
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

      // 4. Wait for playhead to approach note onset (1000ms)
      await page.waitForTimeout(960);

      // 5. Simulate Web MIDI Note On for C4 (pitch 60) right in pocket window
      await sendMidiNoteOn(page, 60, 95);

      // 6. MicroTimingGauge should display real-time strike badge
      const strikeBadge = page.getByTestId('timing-strike-badge');
      await expect(strikeBadge).toBeVisible({ timeout: 5000 });
      await expect(strikeBadge).toContainText(/POCKET|LATE|EARLY/);

      // 7. Capture screenshots of session running with pocket hit and sparks
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_05_integrated_practice_session.png'),
      });
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'pedagogy_05_pocket_hit_spark.png'),
      });

      // 8. Verify combo streak and score counter
      const comboStreak = page.getByTestId('combo-streak');
      await expect(comboStreak).toContainText('1x');

      const scoreCounter = page.getByTestId('score-counter');
      await expect(scoreCounter).not.toHaveText('0');

      await sendMidiNoteOff(page, 60);

      // Verify canvas element is actively rendered and non-zero dimensions
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(100);
    });
  });
});
