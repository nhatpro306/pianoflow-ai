/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/demo');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Common setup for mocking Web MIDI & Web Audio in headless browser
async function setupMocks(page: any) {
  await page.addInitScript(() => {
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

    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;

    // Stub AudioContext if necessary
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const origProto = AudioContextClass.prototype;
      origProto.resume = async () => {};
    }
  });
}

test.describe('PianoFlow AI — Phase H: Interactive Demo Experience & Classical Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('DEMO-E2E-01: No Dead Redirect & Landing Showcase', async ({ page }) => {
    await page.goto('/demo');

    // 1. Verify URL stays on /demo and does NOT redirect to /upload-audio
    expect(page.url()).toContain('/demo');
    expect(page.url()).not.toContain('/upload-audio');

    // 2. Verify page header, branding, and subtitle
    await expect(page.locator('h1', { hasText: 'Interactive Classical Library Showcase' })).toBeVisible();

    // 3. Verify all 4 classical song cards are rendered
    await expect(page.locator('[data-testid="song-card-fur-elise"]')).toBeVisible();
    await expect(page.locator('[data-testid="song-card-clair-de-lune"]')).toBeVisible();
    await expect(page.locator('[data-testid="song-card-gymnopedie-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="song-card-canon-in-d"]')).toBeVisible();

    // 4. Verify initial default song Für Elise (797 notes)
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('797 notes');

    // 5. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_demo_landing.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-02: Song Switching & Repertoire Details', async ({ page }) => {
    await page.goto('/demo');

    // 1. Switch to Clair de Lune
    await page.locator('[data-testid="song-card-clair-de-lune"]').click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('963 notes');
    await expect(page.locator('text=Claude Debussy').first()).toBeVisible();
    await expect(page.locator('text=46 BPM').first()).toBeVisible();

    // 2. Switch to Canon in D
    await page.locator('[data-testid="song-card-canon-in-d"]').click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('1088 notes');
    await expect(page.locator('text=Johann Pachelbel').first()).toBeVisible();
    await expect(page.locator('text=72 BPM').first()).toBeVisible();

    // 3. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_song_switched.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-03: Visualizer Mode & Tempo Controls', async ({ page }) => {
    await page.goto('/demo');

    // 1. Select Mode 1 (Visualizer)
    await page.locator('[data-testid="tab-visualizer"]').click();

    // 2. Verify HTML5 Canvas element exists
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // 3. Toggle tempo button to 0.75x
    const tempoBtn = page.locator('[data-testid="speed-0.75x"]');
    await expect(tempoBtn).toBeVisible();
    await tempoBtn.click();
    await expect(tempoBtn).toHaveClass(/bg-cyan-500/);

    // 4. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_visualizer_mode.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-04: Practice Mode & Virtual Keyboard', async ({ page }) => {
    await page.goto('/demo');

    // 1. Switch to Mode 2 (Practice)
    await page.locator('[data-testid="tab-practice"]').click();

    // 2. Verify Practice Canvas and Keyboard are visible
    await expect(page.locator('[data-testid="score-counter"]')).toBeVisible();
    await expect(page.locator('[data-testid="accuracy-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="combo-streak"]')).toBeVisible();

    const c4Key = page.locator('button[aria-label="Key C4"]').first();
    await expect(c4Key).toBeVisible();

    // 3. Click virtual piano key C4 (pitch 60)
    await c4Key.dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await c4Key.dispatchEvent('pointerup');

    // 4. Verify score HUD responds (score > 0, combo >= 1)
    await expect(page.locator('[data-testid="score-counter"]')).not.toHaveText('0');
    await expect(page.locator('[data-testid="combo-streak"]')).toHaveText(/1x|Combo/);
    await expect(page.locator('[data-testid="accuracy-badge"]')).toContainText('%');

    // 5. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_practice_interactive.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-05: Sheet Music Mode & Zoom Controls', async ({ page }) => {
    await page.goto('/demo');

    // 1. Switch to Mode 3 (Sheet Music)
    await page.locator('[data-testid="tab-sheet"]').click();

    // 2. Verify SVG grand staff score container renders with clefs
    const svgScore = page.locator('svg[viewBox="0 0 1000 240"]').first();
    await expect(svgScore).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=𝄞').first()).toBeVisible();
    await expect(page.locator('text=𝄢').first()).toBeVisible();

    // 3. Verify zoom control buttons exist and function
    const zoomPlusBtn = page.locator('[data-testid="zoom-in-btn"]').or(page.locator('button', { hasText: '+' })).first();
    await expect(zoomPlusBtn).toBeVisible();
    await zoomPlusBtn.click();
    await expect(page.locator('[data-testid="zoom-percentage"]').or(page.locator('text=110%'))).toBeVisible();

    // 4. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_sheet_music_mode.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-06: AI Coaching Analytics & Timing Gauge', async ({ page }) => {
    await page.goto('/demo');

    // 1. Switch to Mode 4 (AI Coaching)
    await page.locator('[data-testid="tab-coaching"]').click();

    // 2. Verify Bi-directional Timing Gauge elements
    await expect(page.getByText('Pocket (±15ms)', { exact: true })).toBeVisible();
    await expect(page.locator('text=Rushing (-60ms Early)')).toBeVisible();
    await expect(page.locator('text=Dragging (+60ms Late)')).toBeVisible();
    await expect(page.locator('[data-testid="timing-gauge-pin"]')).toBeVisible();

    // 3. Verify Measure Accuracy Heatmap and Loop Drills
    await expect(page.locator('text=Measure Accuracy Heatmap')).toBeVisible();
    await expect(page.locator('text=Targeted Loop Drills')).toBeVisible();

    // 4. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06_coaching_analytics.png'),
      fullPage: true,
    });
  });

  test('DEMO-E2E-07: Unified Export Center Modal & MIDI Export', async ({ page }) => {
    await page.goto('/demo');

    // 1. Click 'Export & Share 🚀' button in the header
    const exportBtn = page.locator('button', { hasText: 'Export & Share 🚀' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // 2. Verify ExportCenterModal is open with song title
    await expect(page.locator('text=Export Center & Downloads')).toBeVisible();
    await expect(page.locator('text=Für Elise').first()).toBeVisible();

    // 3. Switch to MIDI tab
    const midiTab = page.locator('button[role="tab"]', { hasText: 'MIDI Files' });
    await expect(midiTab).toBeVisible();
    await midiTab.click();

    // 4. Verify isolated MIDI download button exists
    const isolatedMidiBtn = page.locator('button', { hasText: 'Export Isolated MIDI' });
    await expect(isolatedMidiBtn).toBeVisible();

    // 5. Capture screenshot of open modal
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07_export_center_modal.png'),
    });

    // 6. Close modal
    const closeBtn = page.locator('button[aria-label="Close export dialog"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('text=Export Center & Downloads')).not.toBeVisible();
  });
});
