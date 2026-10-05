import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const SCREENSHOTS_DIR = path.join(rootDir, 'docs/e2e/multitrack');
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

async function setupPageRoutesAndMocks(page, state) {
  const { project, notes, settings } = getMultitrackFixtureData();

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      if (text.includes('webpack') || text.includes('hot-update') || text.includes('GenerateSW')) return;
      state.consoleErrors.push(text);
      console.log(`[BROWSER CONSOLE ERROR] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    state.pageErrors.push(err.message || String(err));
    console.log(`[BROWSER PAGE ERROR] ${err.message}`);
  });

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
    };

    window.WebSocket = class {
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
      });
      navigator.serviceWorker.addEventListener = () => {};
    }

    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      window.AudioContext = class extends OrigAudioContext {
        constructor(...args) {
          super(...args);
        }
      };
      OrigAudioContext.prototype.createMediaStreamSource = function () {
        const osc = this.createOscillator();
        const gain = this.createGain();
        gain.gain.value = 0.01;
        osc.connect(gain);
        try { osc.start(); } catch {}
        return gain;
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

    navigator.requestMIDIAccess = async () => mockAccess;
    window.__MOCK_MIDI_INPUT = mockInput;
  });

  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/workbox-*.js', (route) => route.abort());
  await page.route('**/_next/webpack-hmr', (route) => route.abort());
  await page.route('**/_next/static/webpack/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  await page.route('**/api/v1/**', async (route) => {
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

  await page.route('**/*.mp3', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) });
  });
}

async function runMultiTrackE2ESuite() {
  console.log('=================================================================');
  console.log(' PianoFlow Phase E: Multi-Track MIDI Isolation & Filtering E2E  ');
  console.log('=================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'],
  });

  const state = { consoleErrors: [], pageErrors: [] };
  const results = {
    scenario_1_project_editor_track_selector: { passed: false, assertions: [] },
    scenario_2_solo_piano_melody: { passed: false, assertions: [] },
    scenario_3_practice_mode_track_filter: { passed: false, assertions: [] },
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['microphone', 'midi'],
    });

    const page = await context.newPage();
    await setupPageRoutesAndMocks(page, state);

    // -------------------------------------------------------------
    // Scenario 1: Project Editor Track Selector Modal
    // -------------------------------------------------------------
    console.log('--- Scenario 1: Project Editor Track Selector Modal (/projects/123) ---');
    await page.goto('http://localhost:3000/projects/123', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await page.waitForSelector('main', { timeout: 10000 });
    console.log('✓ Project Editor page loaded');

    // Assert "Filter Tracks 🎛️" button
    const filterBtn = page.locator('button', { hasText: 'Filter Tracks 🎛️' }).first();
    await filterBtn.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_project_editor_track_selector.assertions.push('Filter Tracks 🎛️ button present');
    console.log('✓ Filter Tracks 🎛️ button found in toolbar');

    // Open modal
    await filterBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_project_editor_track_selector.assertions.push('TrackSelector modal dialog opened');
    console.log('✓ TrackSelector modal opened');

    // Assert track cards render with instrument emoji and details
    const pianoText = dialog.locator('text=Grand Piano (Melody & Harmony)');
    await pianoText.waitFor({ state: 'visible', timeout: 5000 });

    const bassText = dialog.locator('text=Electric Bass (Groove)');
    await bassText.waitFor({ state: 'visible', timeout: 5000 });

    const drumsText = dialog.locator('text=Rock Drum Kit (Percussion)');
    await drumsText.waitFor({ state: 'visible', timeout: 5000 });

    results.scenario_1_project_editor_track_selector.assertions.push('Multi-track items rendered with names and icons');
    console.log('✓ All 3 tracks rendered with correct instrument names and metadata');

    // Verify Solo [S] and Mute [M] buttons
    const sBtns = dialog.locator('button:text-is("S")');
    const mBtns = dialog.locator('button:text-is("M")');
    const sCount = await sBtns.count();
    const mCount = await mBtns.count();
    if (sCount < 3 || mCount < 3) {
      throw new Error(`Expected at least 3 S and 3 M buttons, got S: ${sCount}, M: ${mCount}`);
    }
    results.scenario_1_project_editor_track_selector.assertions.push(`Solo/Mute buttons rendered for all tracks (${sCount} S, ${mCount} M)`);
    console.log(`✓ Solo and Mute buttons verified (${sCount} S, ${mCount} M)`);

    // Capture screenshot 1: 01_track_selector_modal.png
    const s1Path = path.join(SCREENSHOTS_DIR, '01_track_selector_modal.png');
    await page.screenshot({ path: s1Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s1Path}`);
    results.scenario_1_project_editor_track_selector.passed = true;

    // -------------------------------------------------------------
    // Scenario 2: Solo Piano Melody Quick Action
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Solo Piano Melody Quick Action ---');
    const soloPianoBtn = dialog.locator('button', { hasText: 'Solo Piano Melody 🎹' });
    await soloPianoBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking "Solo Piano Melody 🎹"...');
    await soloPianoBtn.click();

    // Verify Active Output notes count: 1 of 3 tracks active, 4 / 12 notes rendered
    const activeSummary = dialog.locator('text=1 of 3');
    await activeSummary.waitFor({ state: 'visible', timeout: 5000 });
    const notesSummary = dialog.locator('text=4 / 12');
    await notesSummary.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_2_solo_piano_melody.assertions.push('Active output updated to 1 of 3 tracks and 4 / 12 notes');
    console.log('✓ Solo Piano Melody preset activated: 1 of 3 tracks, 4 / 12 notes');

    // Click Apply Filter
    const applyBtn = dialog.locator('button', { hasText: 'Apply Filter 🎛️' });
    await applyBtn.click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    results.scenario_2_solo_piano_melody.assertions.push('TrackSelector modal closed upon applying');
    console.log('✓ TrackSelector modal closed successfully');

    // Verify filter badge on ProjectEditor button
    const badgeCount = page.locator('span', { hasText: '4/12' });
    await badgeCount.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_2_solo_piano_melody.assertions.push('Project Editor toolbar shows 4/12 filter badge');
    console.log('✓ Filter badge 4/12 verified on toolbar button');

    // Capture screenshot 2: 02_solo_piano_applied.png
    const s2Path = path.join(SCREENSHOTS_DIR, '02_solo_piano_applied.png');
    await page.screenshot({ path: s2Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s2Path}`);
    results.scenario_2_solo_piano_melody.passed = true;

    // -------------------------------------------------------------
    // Scenario 3: Practice Mode Track Filter Integration
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Practice Mode Track Filter Integration (/projects/123/practice) ---');
    await page.goto('http://localhost:3000/projects/123/practice', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await page.waitForSelector('main', { timeout: 10000 });
    console.log('✓ Practice Mode loaded');

    // Assert "🎛️ Tracks" filter button
    const practiceTracksBtn = page.locator('button', { hasText: 'Tracks' }).first();
    await practiceTracksBtn.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_practice_mode_track_filter.assertions.push('🎛️ Tracks filter pill button present in Practice Mode');
    console.log('✓ 🎛️ Tracks filter pill button found in Practice Mode');

    // Open modal in Practice Mode
    await practiceTracksBtn.click();
    const practiceDialog = page.locator('div[role="dialog"]');
    await practiceDialog.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_practice_mode_track_filter.assertions.push('TrackSelector modal opened inside Practice Mode');
    console.log('✓ TrackSelector modal opened inside Practice Mode');

    // Capture screenshot 3: 03_practice_track_filter.png
    const s3Path = path.join(SCREENSHOTS_DIR, '03_practice_track_filter.png');
    await page.screenshot({ path: s3Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s3Path}`);

    // Click Mute Drums
    const muteDrumsBtn = practiceDialog.locator('button', { hasText: 'Mute Drums 🥁' });
    await muteDrumsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await muteDrumsBtn.click();
    console.log('✓ Mute Drums preset clicked');

    // Apply Filter
    const practiceApplyBtn = practiceDialog.locator('button', { hasText: 'Apply Filter 🎛️' });
    await practiceApplyBtn.click();
    await practiceDialog.waitFor({ state: 'hidden', timeout: 5000 });
    results.scenario_3_practice_mode_track_filter.assertions.push('TrackSelector modal closed inside Practice Mode');
    console.log('✓ Filter applied and modal closed');
    results.scenario_3_practice_mode_track_filter.passed = true;

    console.log('\n=================================================================');
    console.log(' All Phase E Multi-Track MIDI E2E Scenarios Passed Successfully! ');
    console.log('=================================================================');
    console.log(JSON.stringify(results, null, 2));

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'e2e_results.json'),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          results,
          consoleErrorsCount: state.consoleErrors.length,
          pageErrorsCount: state.pageErrors.length,
        },
        null,
        2
      )
    );

    await browser.close();
    return true;
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    await browser.close();
    process.exit(1);
  }
}

runMultiTrackE2ESuite();
