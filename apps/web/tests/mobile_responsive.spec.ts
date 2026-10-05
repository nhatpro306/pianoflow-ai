/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/mobile');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function getFixtureData() {
  const notes = [
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.3, end: 0.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 2, pitch: 48, name: 'C3', velocity: 75, start: 0.3, end: 0.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 3, pitch: 64, name: 'E4', velocity: 80, start: 1.0, end: 1.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 4, pitch: 55, name: 'G3', velocity: 75, start: 1.4, end: 1.9, duration: 0.5, track: 0, hand: 'L' },
    { id: 5, pitch: 67, name: 'G4', velocity: 80, start: 2.3, end: 2.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 6, pitch: 52, name: 'E3', velocity: 75, start: 2.3, end: 2.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 7, pitch: 72, name: 'C5', velocity: 80, start: 3.0, end: 3.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 8, pitch: 55, name: 'G3', velocity: 75, start: 3.4, end: 3.9, duration: 0.5, track: 0, hand: 'L' },
  ];

  return {
    project: {
      id: '123',
      name: 'Für Elise - Mobile Suite Demo',
      status: 'ready',
      analysis_summary: {
        bpm: 120,
        duration_sec: 4.0,
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
      duration_sec: 4.0,
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

async function setupPageMocks(page: any) {
  const { project, notes, settings } = getFixtureData();

  await page.addInitScript(() => {
    if (window.Element) {
      const origSetCapture = Element.prototype.setPointerCapture;
      Element.prototype.setPointerCapture = function (id) {
        try {
          if (origSetCapture) origSetCapture.call(this, id);
        } catch {
          // ignore
        }
      };
      const origReleaseCapture = Element.prototype.releasePointerCapture;
      Element.prototype.releasePointerCapture = function (id) {
        try {
          if (origReleaseCapture) origReleaseCapture.call(this, id);
        } catch {
          // ignore
        }
      };
    }

    (window as any).EventSource = class {
      addEventListener() {}
      removeEventListener() {}
      close() {}
    };

    (window as any).WebSocket = class {
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = async () =>
        ({
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
      id = 'mock-piano-mobile';
      name = 'Virtual Mobile Piano';
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
    } else if (url.includes('/projects/123')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(project) });
    } else if (url.includes('/projects')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [project], total: 1 }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });
}

test.describe('Mobile Viewport & Responsiveness Suite', () => {
  test('1. Mobile Navigation Drawer (<768px iPhone 14)', async ({ page }) => {
    // 390x844 (iPhone 14 Viewport)
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPageMocks(page);

    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Find and click hamburger menu button
    const hamburgerBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Verify MobileNavDrawer dialog opens
    const drawerDialog = page.locator('div[role="dialog"][aria-label="Mobile Navigation Menu"]');
    await expect(drawerDialog).toBeVisible();

    // Verify Title and Navigation links
    await expect(drawerDialog.getByText('PianoFlow').first()).toBeVisible();
    const createLink = drawerDialog.getByRole('link', { name: /Create \/ Transcribe/i });
    const projectsLink = drawerDialog.getByRole('link', { name: /My Projects/i });
    const pricingLink = drawerDialog.getByRole('link', { name: /Pro Membership/i });

    await expect(createLink).toBeVisible();
    await expect(projectsLink).toBeVisible();
    await expect(pricingLink).toBeVisible();

    // Take mobile navigation drawer screenshot
    const drawerScreenshotPath = path.join(SCREENSHOTS_DIR, '01_mobile_nav_drawer.png');
    await page.screenshot({ path: drawerScreenshotPath, fullPage: false });

    // Close drawer via close button
    const closeBtn = drawerDialog.locator('button[aria-label="Close navigation menu"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify drawer is closed
    await expect(drawerDialog).not.toBeVisible();

    // Reopen and test closing with Escape key
    await hamburgerBtn.click();
    await expect(drawerDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawerDialog).not.toBeVisible();
  });

  test('2. Mobile Piano Keyboard Viewport & Octave Shift (<768px)', async ({ page }) => {
    // 390x844 Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPageMocks(page);

    await page.goto('/projects/123/practice');
    await page.waitForLoadState('domcontentloaded');

    // Wait for practice keyboard to be rendered
    const keyboardEl = page.locator('div[role="application"][aria-label="Interactive piano keyboard"]');
    await expect(keyboardEl).toBeVisible();

    // Verify octave controls exist
    const prevOctBtn = page.locator('button[aria-label="Previous Octave Range"]');
    const nextOctBtn = page.locator('button[aria-label="Next Octave Range"]');
    await expect(prevOctBtn).toBeVisible();
    await expect(nextOctBtn).toBeVisible();

    // Verify default active octave pill (C3 - B4 (Middle))
    await expect(page.getByText('C3 - B4 (Middle)')).toBeVisible();

    // Measure white key width to ensure playable touch target (>= 24px)
    const whiteKeys = keyboardEl.locator('.bg-gradient-to-b');
    const firstKey = whiteKeys.first();
    await expect(firstKey).toBeVisible();
    const keyBox = await firstKey.boundingBox();
    expect(keyBox).not.toBeNull();
    if (keyBox) {
      expect(keyBox.width).toBeGreaterThanOrEqual(24);
    }

    // Click Next Octave button to shift up
    await nextOctBtn.click();

    // Verify octave window shifted to C4 - B5 (Treble) or C5 - B6
    await expect(page.getByText('C4 - B5 (Treble)')).toBeVisible();

    // Capture screenshot of octave-shifted mobile keyboard
    const octaveScreenshotPath = path.join(SCREENSHOTS_DIR, '02_mobile_keyboard_octave_shift.png');
    await page.screenshot({ path: octaveScreenshotPath, fullPage: false });
  });

  test('3. Auto-Tracking Centroid Camera & Canvas Synchronization', async ({ page }) => {
    // 390x844 Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await setupPageMocks(page);

    await page.goto('/projects/123/practice');
    await page.waitForLoadState('domcontentloaded');

    // Ensure PracticeCanvas exists
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Verify Auto-Follow toggle button or state
    // Let's test viewport width switch / full 88 key toggle
    const toggleViewBtn = page.locator('button[aria-label*="Full 88-Key View"], button[aria-label*="Zoomed 2-Octave View"]');
    await expect(toggleViewBtn).toBeVisible();

    // Play practice session to trigger animation / camera synchronization
    const startBtn = page.getByRole('button', { name: /^Start$/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    await page.waitForTimeout(600);

    // Capture screenshot of mobile canvas autotracking & active practice view
    const canvasScreenshotPath = path.join(SCREENSHOTS_DIR, '03_mobile_canvas_autotracking.png');
    await page.screenshot({ path: canvasScreenshotPath, fullPage: false });
  });

  test('4. Desktop Viewport (1440x900) Responsive Baseline', async ({ page }) => {
    // 1440x900 Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupPageMocks(page);

    await page.goto('/projects/123/practice');
    await page.waitForLoadState('domcontentloaded');

    // On desktop, hamburger button should be hidden (md:hidden)
    const hamburgerBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(hamburgerBtn).not.toBeVisible();

    // Desktop nav should be visible
    const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(desktopNav).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Projects' })).toBeVisible();

    // Auto-Follow button is visible on desktop
    const autoFollowBtn = page.getByRole('button', { name: /Auto Follow/i });
    await expect(autoFollowBtn).toBeVisible();
  });
});
