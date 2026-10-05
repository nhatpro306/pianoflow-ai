/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/multitrack');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function getMultitrackFixtureData() {
  const tracks = [
    { index: 0, name: 'Grand Piano (Melody & Harmony)', program: 0, is_drum: false },
    { index: 1, name: 'Electric Bass (Groove)', program: 33, is_drum: false },
    { index: 2, name: 'Rock Drum Kit (Percussion)', program: 0, is_drum: true },
  ];

  const notes = [
    // Track 0 (Piano): 4 notes
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.2, end: 0.8, duration: 0.6, track: 0, hand: 'R' },
    { id: 2, pitch: 64, name: 'E4', velocity: 80, start: 1.0, end: 1.6, duration: 0.6, track: 0, hand: 'R' },
    { id: 3, pitch: 67, name: 'G4', velocity: 80, start: 1.8, end: 2.4, duration: 0.6, track: 0, hand: 'R' },
    { id: 4, pitch: 72, name: 'C5', velocity: 85, start: 2.6, end: 3.4, duration: 0.8, track: 0, hand: 'R' },
    // Track 1 (Bass): 3 notes
    { id: 5, pitch: 36, name: 'C2', velocity: 90, start: 0.2, end: 1.0, duration: 0.8, track: 1, hand: 'L' },
    { id: 6, pitch: 43, name: 'G2', velocity: 85, start: 1.2, end: 2.0, duration: 0.8, track: 1, hand: 'L' },
    { id: 7, pitch: 48, name: 'C3', velocity: 90, start: 2.2, end: 3.2, duration: 1.0, track: 1, hand: 'L' },
    // Track 2 (Drums): 5 hits
    { id: 8, pitch: 36, name: 'Bass Drum 1', velocity: 100, start: 0.2, end: 0.4, duration: 0.2, track: 2, hand: 'R' },
    { id: 9, pitch: 38, name: 'Acoustic Snare', velocity: 95, start: 1.0, end: 1.2, duration: 0.2, track: 2, hand: 'R' },
    { id: 10, pitch: 36, name: 'Bass Drum 1', velocity: 100, start: 1.8, end: 2.0, duration: 0.2, track: 2, hand: 'R' },
    { id: 11, pitch: 38, name: 'Acoustic Snare', velocity: 95, start: 2.6, end: 2.8, duration: 0.2, track: 2, hand: 'R' },
    { id: 12, pitch: 42, name: 'Closed Hi-Hat', velocity: 90, start: 3.2, end: 3.4, duration: 0.2, track: 2, hand: 'R' },
  ];

  return {
    project: {
      id: '123',
      name: 'Autumn Leaves - Multi-Track Ensemble Demo',
      status: 'ready',
      analysis_summary: {
        bpm: 120,
        duration_sec: 4.0,
        time_signature: '4/4',
        track_count: 3,
        note_count: notes.length,
        pitch_min: 36,
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
      tracks,
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

async function setupMultitrackMocks(page: any) {
  const { project, notes, settings } = getMultitrackFixtureData();

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

    window.EventSource = class {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      close() {}
    } as any;

    window.WebSocket = class {
      constructor() {}
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any;

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = async () => ({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as any;
      navigator.serviceWorker.addEventListener = () => {};
    }

    const OrigAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (OrigAudioContext) {
      window.AudioContext = class extends OrigAudioContext {
        constructor(...args: any[]) {
          super(...args);
        }
      };
      OrigAudioContext.prototype.createMediaStreamSource = function () {
        const osc = this.createOscillator();
        const gain = this.createGain();
        gain.gain.value = 0.01;
        osc.connect(gain);
        try { osc.start(); } catch {}
        return gain as any;
      };
    }

    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => new MediaStream();
    }

    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = 'mock-piano-1';
      name = 'Virtual MultiTrack Piano';
      manufacturer = 'Antigravity';
      state = 'connected';
      connection = 'open';
      onmidimessage = null;
    }

    const mockInput = new MockMIDIInput();
    const mockAccess = new MockMIDIAccess();
    mockAccess.inputs.set(mockInput.id, mockInput);

    navigator.requestMIDIAccess = async () => mockAccess as any;
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(notes),
      });
    } else if (url.includes('/projects/123/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settings),
      });
    } else if (url.includes('/projects/123/outputs') || url.includes('/projects/123/jobs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    } else if (url.includes('/practice-sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          xp_gained: 50,
          level_up: false,
          current_level: 2,
          total_xp: 300,
          current_streak: 3,
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
          current_streak_days: 3,
          highest_streak_days: 5,
          last_practice_date: '2026-10-04',
        }),
      });
    } else if (url.includes('/projects/123')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(project),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });

  await page.route('**/*.mp3', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) });
  });
}

test.describe('Phase E: Multi-Track MIDI Track Isolation & Instrument Channel Filtering', () => {
  test('Scenario 1 & 2: Project Editor Track Selector Modal and Solo Piano Melody Quick Action', async ({ page }) => {
    await setupMultitrackMocks(page);

    // 1. Navigate to Project Editor
    await page.goto('/projects/123');
    await page.waitForSelector('main');

    // Assert "Filter Tracks 🎛️" button is present in toolbar
    const filterBtn = page.getByRole('button', { name: /Filter Tracks 🎛️/i });
    await expect(filterBtn).toBeVisible({ timeout: 10000 });

    // Click "Filter Tracks 🎛️"
    await filterBtn.click();

    // Assert TrackSelector dialog opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Multi-Track MIDI Track Isolation/i)).toBeVisible();

    // Assert track cards render with instrument emoji, note counts, and Solo [S] / Mute [M] buttons
    await expect(dialog.getByText('Grand Piano (Melody & Harmony)')).toBeVisible();
    await expect(dialog.getByText('Electric Bass (Groove)')).toBeVisible();
    await expect(dialog.getByText('Rock Drum Kit (Percussion)')).toBeVisible();
    await expect(dialog.getByText('4 Notes')).toBeVisible(); // Piano track
    await expect(dialog.getByText('3 Notes')).toBeVisible(); // Bass track
    await expect(dialog.getByText('5 Notes')).toBeVisible(); // Drum track

    // Verify Solo [S] and Mute [M] buttons are present
    const soloButtons = dialog.getByRole('button', { name: 'S' });
    const muteButtons = dialog.getByRole('button', { name: 'M' });
    expect(await soloButtons.count()).toBeGreaterThanOrEqual(3);
    expect(await muteButtons.count()).toBeGreaterThanOrEqual(3);

    // Capture screenshot 1: 01_track_selector_modal.png
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_track_selector_modal.png'), fullPage: false });

    // --- Scenario 2: Solo Piano Melody Quick Action ---
    // Click "Solo Piano Melody 🎹"
    const soloPianoBtn = dialog.getByRole('button', { name: /Solo Piano Melody 🎹/i });
    await expect(soloPianoBtn).toBeVisible();
    await soloPianoBtn.click();

    // Assert active output updates: Piano is active (4 / 12 notes)
    await expect(dialog.getByText(/1 of 3/i)).toBeVisible();
    await expect(dialog.getByText(/4 \/ 12/i)).toBeVisible();

    // Click "Apply Filter 🎛️"
    const applyBtn = dialog.getByRole('button', { name: /Apply Filter 🎛️/i });
    await applyBtn.click();

    // Assert dialog closes
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Assert toolbar button now reflects filtered count badge (e.g. 4/12)
    await expect(filterBtn.getByText('4/12')).toBeVisible();

    // Capture screenshot 2: 02_solo_piano_applied.png
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_solo_piano_applied.png'), fullPage: false });
  });

  test('Scenario 3: Practice Mode Track Filter Integration', async ({ page }) => {
    await setupMultitrackMocks(page);

    // 1. Navigate to Practice Mode
    await page.goto('/projects/123/practice');
    await page.waitForSelector('main');

    // Assert "🎛️ Tracks" filter button is present in toolbar / secondary controls
    const tracksBtn = page.getByRole('button', { name: /Tracks/i });
    await expect(tracksBtn).toBeVisible({ timeout: 10000 });

    // Click "🎛️ Tracks"
    await tracksBtn.click();

    // Assert TrackSelector dialog opens inside Practice Mode
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Multi-Track MIDI Track Isolation/i)).toBeVisible();

    // Capture screenshot 3: 03_practice_track_filter.png
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_practice_track_filter.png'), fullPage: false });

    // Test quick preset Mute Drums inside practice mode
    const muteDrumsBtn = dialog.getByRole('button', { name: /Mute Drums 🥁/i });
    await expect(muteDrumsBtn).toBeVisible();
    await muteDrumsBtn.click();

    // Apply Filter
    const applyBtn = dialog.getByRole('button', { name: /Apply Filter 🎛️/i });
    await applyBtn.click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
