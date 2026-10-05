/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/coaching');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function getCoachingFixtureData() {
  const notes = [
    // Measure 1 (0.0s - 2.0s) - 4 notes, all hit Perfect (100% accuracy, Mastered)
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.3, end: 0.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 2, pitch: 48, name: 'C3', velocity: 75, start: 0.3, end: 0.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 3, pitch: 64, name: 'E4', velocity: 80, start: 1.0, end: 1.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 4, pitch: 55, name: 'G3', velocity: 75, start: 1.4, end: 1.9, duration: 0.5, track: 0, hand: 'L' },

    // Measure 2 (2.0s - 4.0s) - 4 notes, all hit Perfect (100% accuracy, Mastered)
    { id: 5, pitch: 67, name: 'G4', velocity: 80, start: 2.3, end: 2.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 6, pitch: 52, name: 'E3', velocity: 75, start: 2.3, end: 2.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 7, pitch: 72, name: 'C5', velocity: 80, start: 3.0, end: 3.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 8, pitch: 55, name: 'G3', velocity: 75, start: 3.4, end: 3.9, duration: 0.5, track: 0, hand: 'L' },

    // Measure 3 (4.0s - 6.0s) - 3 notes: 2 hit Perfect, 1 missed (66.7% accuracy -> Critical -> 0.75x drill)
    { id: 9, pitch: 69, name: 'A4', velocity: 80, start: 4.3, end: 4.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 10, pitch: 53, name: 'F3', velocity: 75, start: 4.3, end: 4.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 11, pitch: 71, name: 'B4', velocity: 80, start: 5.0, end: 5.5, duration: 0.5, track: 1, hand: 'R' }, // Intentionally missed

    // Measure 4 (6.0s - 8.0s) - 2 notes, all hit Perfect (100% accuracy, Mastered)
    { id: 12, pitch: 72, name: 'C5', velocity: 80, start: 6.3, end: 6.9, duration: 0.6, track: 1, hand: 'R' },
    { id: 13, pitch: 48, name: 'C3', velocity: 75, start: 6.3, end: 7.5, duration: 1.2, track: 0, hand: 'L' },
  ];

  return {
    project: {
      id: '123',
      name: 'Für Elise - AI Coaching Analytics Demo',
      status: 'ready',
      analysis_summary: {
        bpm: 120,
        duration_sec: 8.0,
        time_signature: '4/4',
        track_count: 2,
        note_count: notes.length,
        pitch_min: 48,
        pitch_max: 72,
        hand_split: 'auto',
      },
      active_jobs: [],
      created_at: new Date().toISOString(),
    },
    notes: {
      schema_version: 1,
      bpm: 120,
      duration_sec: 8.0,
      time_signature: '4/4',
      notes,
    },
    settings: {
      resolution: '1080p',
      fps: 60,
      speed_multiplier: 1.0,
      piano_sound: 'acoustic_grand',
      volume: 0.8,
      reverb: 'medium',
      difficulty: 'original',
      show_note_names: true,
      show_keyboard: true,
      theme_preset: 'neon',
      colors: {
        right_hand: '#06b6d4',
        left_hand: '#a855f7',
        key_highlight: '#38bdf8',
        glow: '#06b6d4',
        hit_effect: '#22d3ee',
        background: '#09090b',
      },
      glow_intensity: 0.5,
      note_fall_speed: 1.0,
      keyboard_size: 1.0,
      version: 1,
    },
  };
}

async function setupCoachingMocks(page: any) {
  const { project, notes, settings } = getCoachingFixtureData();

  await page.addInitScript(() => {
    if (window.Element) {
      const origSetCapture = Element.prototype.setPointerCapture;
      Element.prototype.setPointerCapture = function(id) {
        try {
          if (origSetCapture) origSetCapture.call(this, id);
        } catch {
          // ignore
        }
      };
      const origReleaseCapture = Element.prototype.releasePointerCapture;
      Element.prototype.releasePointerCapture = function(id) {
        try {
          if (origReleaseCapture) origReleaseCapture.call(this, id);
        } catch {
          // ignore
        }
      };
    }

    (window as any).EventSource = class {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      close() {}
    };

    (window as any).WebSocket = class {
      constructor() {}
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = async () => ({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as any);
      navigator.serviceWorker.addEventListener = () => {};
    }

    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = 'mock-piano-1';
      name = 'Virtual AI Piano';
      manufacturer = 'Antigravity';
      state = 'connected';
      connection = 'open';
      onmidimessage = null;
    }

    const mockInput = new MockMIDIInput();
    const mockAccess = new MockMIDIAccess();
    mockAccess.inputs.set(mockInput.id, mockInput);

    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => new MediaStream();
    }
    const OrigAudio = window.AudioContext || (window as any).webkitAudioContext;
    if (OrigAudio) {
      OrigAudio.prototype.createMediaStreamSource = function () {
        const osc = this.createOscillator();
        const gain = this.createGain();
        gain.gain.value = 0.01;
        osc.connect(gain);
        try { osc.start(); } catch {}
        return gain as any;
      };
    }

    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;
  });

  await page.route('**/sw.js', (route: any) => route.abort());
  await page.route('**/workbox-*.js', (route: any) => route.abort());
  await page.route('**/_next/webpack-hmr', (route: any) => route.abort());
  await page.route('**/_next/static/webpack/**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  await page.route('**/api/v1/**', async (route: any) => {
    const url = route.request().url();
    if (url.includes('/notes')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(notes) });
    } else if (url.includes('/projects/123/settings')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings) });
    } else if (url.includes('/projects/123/outputs') || url.includes('/projects/123/jobs')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    } else if (url.includes('/practice-sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          xp_gained: 85,
          level_up: false,
          current_level: 2,
          total_xp: 335,
          current_streak: 4,
        }),
      });
    } else if (url.includes('/user/progress')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: 'test-user',
          total_xp: 250,
          level: 2,
          xp_to_next_level: 100,
          current_streak_days: 4,
          highest_streak_days: 7,
          last_practice_date: '2026-10-04',
        }),
      });
    } else if (url.includes('/projects/123')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  await page.route('**/*.mp3', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) });
  });
}

async function seekTo(page: any, targetMs: number, totalDurationMs = 8000) {
  const track = page.locator('div.relative.h-6.w-full').first();
  const box = await track.boundingBox();
  if (!box) throw new Error('Scrubber track bounding box not found');
  const ratio = Math.max(0.01, Math.min(0.99, targetMs / totalDurationMs));
  const clickX = box.x + box.width * ratio;
  const clickY = box.y + box.height / 2;
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(50);
}

async function strikePitches(page: any, pitches: number[], velocity = 100) {
  for (const p of pitches) {
    await page.evaluate(({ pitch, vel }: { pitch: number; vel: number }) => {
      const input = (window as any).__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x90, pitch, vel]) });
      }
    }, { pitch: p, vel: velocity });
  }

  await page.waitForTimeout(40);

  for (const p of pitches) {
    await page.evaluate(({ pitch }: { pitch: number }) => {
      const input = (window as any).__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x80, pitch, 0]) });
      }
    }, { pitch: p });
  }

  await page.waitForTimeout(40);
}

async function seekAndStrikePitches(page: any, targetMs: number, pitches: number[], totalDurationMs = 8000) {
  await seekTo(page, targetMs, totalDurationMs);
  await strikePitches(page, pitches);
}

test.describe('Phase F: AI Piano Coaching & Practice Analytics', () => {
  test('Scenario 1, 2, and 3: Coaching Modal, Timing Gauge, Measure Heatmap, and Targeted Drill Action', async ({ page }) => {
    await setupCoachingMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to practice page
    await page.goto('/projects/123/practice', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header', { hasText: 'MIDI Hardware Connected' }).first()).toBeVisible();

    // Switch from Wait Mode to Continuous Mode
    const continuousToggle = page.locator('header button', { hasText: 'Continuous' });
    if (await continuousToggle.isVisible()) {
      await continuousToggle.click();
    }

    // -------------------------------------------------------------
    // SCENARIO 1: Early Strikes (-30ms) -> Systematically Rushing
    // -------------------------------------------------------------
    // Bar 1: Notes at 300ms, 1000ms, 1400ms -> Struck at 270ms, 970ms, 1370ms
    await seekAndStrikePitches(page, 270, [60, 48]); // RH C4 + LH C3
    await seekAndStrikePitches(page, 970, [64]);     // RH E4
    await seekAndStrikePitches(page, 1370, [55]);    // LH G3

    // Bar 2: Notes at 2300ms, 3000ms, 3400ms -> Struck at 2270ms, 2970ms, 3370ms
    await seekAndStrikePitches(page, 2270, [67, 52]); // RH G4 + LH E3
    await seekAndStrikePitches(page, 2970, [72]);      // RH C5
    await seekAndStrikePitches(page, 3370, [55]);      // LH G3

    // Bar 3: Weak section (Notes at 4300ms, 5000ms -> Struck 4270ms, skip 5000ms)
    await seekAndStrikePitches(page, 4270, [69, 53]); // RH A4 + LH F3
    // Note 71 at 5000ms intentionally unplayed -> 66.7% accuracy for Bar 3

    // Bar 4: Notes at 6300ms -> Struck at 6270ms
    await seekAndStrikePitches(page, 6270, [72, 48]); // RH C5 + LH C3

    // Click Finish to open CoachingModal
    await page.locator('header button', { hasText: 'Finish' }).click();

    // Assert modal title
    const modalTitle = page.locator('h2', { hasText: 'AI Coaching & Session Analytics' });
    await expect(modalTitle).toBeVisible();

    // Assert Performance Grade Banner
    await expect(page.locator('div.text-xl', { hasText: 'Accuracy' })).toBeVisible();
    await expect(page.locator('div', { hasText: '+85 XP' }).first()).toBeVisible();
    await expect(page.locator('div', { hasText: 'Day Streak' }).first()).toBeVisible();

    // Assert Bi-Directional Timing Gauge
    await expect(page.locator('span', { hasText: 'Systematically Rushing' })).toBeVisible();
    await expect(page.locator('span', { hasText: '◄ Rushing (-60ms Early)' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Pocket (±15ms)' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Dragging (+60ms Late) ►' })).toBeVisible();

    // Assert Decoupled Hand Breakdown
    await expect(page.locator('span', { hasText: 'Right Hand (Treble / Melody)' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Left Hand (Bass / Harmony)' })).toBeVisible();

    // Capture screenshot 1: 01_coaching_modal_overview.png
    const s1Path = path.join(SCREENSHOTS_DIR, '01_coaching_modal_overview.png');
    await page.screenshot({ path: s1Path, fullPage: false });

    // -------------------------------------------------------------
    // SCENARIO 2: Measure Difficulty Heatmap
    // -------------------------------------------------------------
    await expect(page.locator('span', { hasText: 'Measure Accuracy Heatmap' })).toBeVisible();
    const measureTiles = page.locator('button[aria-label*="Measure"]');
    expect(await measureTiles.count()).toBeGreaterThanOrEqual(4);

    // Hover on Measure #3 tile to view inspect card
    const bar3Tile = page.locator('button', { hasText: '#3' });
    await expect(bar3Tile).toBeVisible();
    await bar3Tile.hover();
    await page.waitForTimeout(300);

    const inspectCard = page.locator('div', { hasText: 'Bar 3' }).locator('..').first();
    await expect(inspectCard).toBeVisible();
    const inspectContent = await inspectCard.innerText();
    expect(inspectContent).toContain('Accuracy:');
    expect(inspectContent).toContain('Hits:');
    expect(inspectContent).toContain('Timing Bias:');

    // Capture screenshot 2: 02_measure_heatmap.png
    const s2Path = path.join(SCREENSHOTS_DIR, '02_measure_heatmap.png');
    await page.screenshot({ path: s2Path, fullPage: false });

    // -------------------------------------------------------------
    // SCENARIO 3: Targeted Drill Action
    // -------------------------------------------------------------
    await expect(page.locator('h3', { hasText: 'Targeted Loop Drills' })).toBeVisible();

    // Click "🎯 Drill This Section (0.75x Speed)"
    const drillBtn = page.locator('button', { hasText: '🎯 Drill This Section (0.75x Speed)' }).first();
    await expect(drillBtn).toBeVisible();
    await drillBtn.click();

    // Verify modal closes
    await expect(modalTitle).toBeHidden();

    // Verify A-B loop pins and Loop: ON
    await expect(page.locator('span', { hasText: 'A' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: 'B' }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Loop: ON' })).toBeVisible();

    // Verify speed updated to 0.75x
    const speed075Btn = page.locator('button', { hasText: '0.75x' });
    await expect(speed075Btn).toBeVisible();
    const speedClasses = await speed075Btn.getAttribute('class');
    expect(speedClasses).toContain('bg-cyan-500');

    await page.waitForTimeout(400);

    // Capture screenshot 3: 03_drill_loop_configured.png
    const s3Path = path.join(SCREENSHOTS_DIR, '03_drill_loop_configured.png');
    await page.screenshot({ path: s3Path, fullPage: false });
  });

  test('Bonus: Late Strikes (+40ms) Dragging Tendency Verification', async ({ page }) => {
    await setupCoachingMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/projects/123/practice', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header', { hasText: 'MIDI Hardware Connected' }).first()).toBeVisible();

    // Switch to continuous mode
    const continuousToggle = page.locator('header button', { hasText: 'Continuous' });
    if (await continuousToggle.isVisible()) {
      await continuousToggle.click();
    }

    // Simulate late strikes (+40ms)
    // Notes at 300ms, 1000ms, 1400ms -> Struck at 340ms, 1040ms, 1440ms
    await seekAndStrikePitches(page, 340, [60, 48]); // RH C4 + LH C3
    await seekAndStrikePitches(page, 1040, [64]);    // RH E4
    await seekAndStrikePitches(page, 1440, [55]);    // LH G3

    // Finish session
    await page.locator('header button', { hasText: 'Finish' }).click();

    const modalTitle = page.locator('h2', { hasText: 'AI Coaching & Session Analytics' });
    await expect(modalTitle).toBeVisible();

    // Verify Dragging tendency badge
    await expect(page.locator('span', { hasText: 'Systematically Dragging' })).toBeVisible();
  });
});
