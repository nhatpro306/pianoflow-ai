/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

function getFixtureData() {
  const notes = [
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.1, end: 0.5, duration: 0.4, track: 1, hand: 'R' },
    { id: 2, pitch: 64, name: 'E4', velocity: 80, start: 0.6, end: 1.0, duration: 0.4, track: 1, hand: 'R' },
    { id: 3, pitch: 67, name: 'G4', velocity: 80, start: 1.1, end: 1.5, duration: 0.4, track: 1, hand: 'R' },
    { id: 4, pitch: 72, name: 'C5', velocity: 80, start: 1.6, end: 1.9, duration: 0.3, track: 1, hand: 'R' },
    { id: 5, pitch: 48, name: 'C3', velocity: 75, start: 0.1, end: 0.9, duration: 0.8, track: 0, hand: 'L' },
    { id: 6, pitch: 55, name: 'G3', velocity: 75, start: 1.0, end: 1.9, duration: 0.9, track: 0, hand: 'L' },
    { id: 7, pitch: 81, name: 'A5', velocity: 85, start: 2.1, end: 2.6, duration: 0.5, track: 1, hand: 'R' },
    { id: 8, pitch: 84, name: 'C6', velocity: 85, start: 2.7, end: 3.2, duration: 0.5, track: 1, hand: 'R' },
    { id: 9, pitch: 36, name: 'C2', velocity: 75, start: 2.1, end: 2.9, duration: 0.8, track: 0, hand: 'L' },
    { id: 10, pitch: 40, name: 'E2', velocity: 75, start: 3.0, end: 3.8, duration: 0.8, track: 0, hand: 'L' },
  ];

  return {
    project: {
      id: '123',
      name: 'Für Elise - Beethoven (Grand Staff)',
      status: 'ready',
      analysis_summary: {
        bpm: 120,
        duration_sec: 4.0,
        time_signature: '4/4',
        track_count: 2,
        note_count: notes.length,
        pitch_min: 36,
        pitch_max: 84,
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

async function setupMocks(page: any) {
  const { project, notes, settings } = getFixtureData();

  await page.addInitScript(() => {
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

    // Mock getUserMedia & createMediaStreamSource for headless environments
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
    } else if (url.includes('/user/progress')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: 'test-user',
          total_xp: 250,
          level: 2,
          xp_to_next_level: 100,
          current_streak_days: 3,
          highest_streak_days: 7,
          last_practice_date: '2026-10-03',
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

test.describe('Phase D: Sheet Music Viewer & Acoustic Mic Integration', () => {
  test('Scenario 1: Grand Staff Sheet Music Viewer renders and seeks', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/projects/123/sheet', { waitUntil: 'domcontentloaded' });

    const grandStaffSvg = page.locator('main svg[viewBox="0 0 1000 240"]').first();
    await grandStaffSvg.waitFor({ state: 'attached', timeout: 15000 });

    // Clefs
    await expect(grandStaffSvg.locator('text', { hasText: '𝄞' }).first()).toBeAttached();
    await expect(grandStaffSvg.locator('text', { hasText: '𝄢' }).first()).toBeAttached();

    // Staves & notes
    const staffLines = await grandStaffSvg.locator('line[stroke="currentColor"]').count();
    expect(staffLines).toBeGreaterThanOrEqual(10);

    const noteheads = await grandStaffSvg.locator('ellipse').count();
    expect(noteheads).toBeGreaterThanOrEqual(5);

    // HUD controls
    const playBtn = page.locator('header button', { hasText: 'Play' });
    await expect(playBtn).toBeVisible();

    for (const speed of ['0.5x', '0.75x', '1x', '1.25x']) {
      await expect(page.locator('header button', { hasText: speed })).toBeVisible();
    }
    await expect(page.locator('header button', { hasText: '+' })).toBeVisible();
    await expect(page.locator('header button', { hasText: '-' })).toBeVisible();
    await expect(page.locator('header button', { hasText: 'Print' })).toBeVisible();

    // Playhead advance
    await playBtn.click();
    await expect(page.locator('header button', { hasText: 'Pause' })).toBeVisible();

    const playhead = grandStaffSvg.locator('line[stroke="#06b6d4"]').first();
    await playhead.waitFor({ state: 'attached', timeout: 3000 });
    const x1_start = parseFloat((await playhead.getAttribute('x1')) || '0');

    await page.waitForTimeout(600);
    const x1_advanced = parseFloat((await playhead.getAttribute('x1')) || '0');
    expect(x1_advanced).toBeGreaterThan(x1_start);

    // Measure click seek
    const measure2 = grandStaffSvg.locator('g.cursor-pointer rect').nth(1);
    await measure2.click({ force: true });
    await page.waitForTimeout(200);

    const x1_seek = parseFloat((await playhead.getAttribute('x1')) || '0');
    expect(x1_seek).toBeGreaterThan(450);
  });

  test('Scenario 2: Practice Mode Input Mode Toggle & Microphone Integration', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupMocks(page);
    await page.goto('/projects/123/practice', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('text=Bar 1 /', { state: 'visible', timeout: 15000 });

    const midiBtn = page.locator('button').filter({ hasText: 'MIDI' }).first();
    const micBtn = page.locator('button').filter({ hasText: 'Mic' }).first();
    await expect(midiBtn).toBeVisible();
    await expect(micBtn).toBeVisible();

    // Toggle Mic mode (with hydration retry)
    for (let i = 0; i < 5; i++) {
      await micBtn.click({ force: true });
      await page.waitForTimeout(250);
      const cls = (await micBtn.getAttribute('class')) || '';
      if (cls.includes('bg-cyan-500')) break;
    }

    await expect(page.locator('header span', { hasText: 'Acoustic Mic Active' })).toBeVisible();
    const sheetLink = page.locator('header a[href="/projects/123/sheet"]');
    await expect(sheetLink).toBeVisible();
  });

  test('Scenario 3: Project Editor Navigation Integration', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/projects/123', { waitUntil: 'domcontentloaded' });

    const sheetBtn = page.locator('main button', { hasText: 'View Sheet Music 🎼' });
    await expect(sheetBtn).toBeVisible();

    await sheetBtn.click();
    await page.waitForURL('**/projects/123/sheet', { timeout: 10000 });
    expect(page.url()).toContain('/projects/123/sheet');
  });
});
