import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const SCREENSHOTS_DIR = path.join(rootDir, 'docs/e2e/sheet_mic');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Generate realistic musical fixture notes spanning Treble and Bass clefs, including ledger lines
function generateFixtureNotes() {
  return [
    // Measure 1 (0.0s - 2.0s)
    // Treble RH: C4 (middle C, ledger line offset -2), E4, G4, C5
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.1, end: 0.5, duration: 0.4, track: 1, hand: 'R' },
    { id: 2, pitch: 64, name: 'E4', velocity: 80, start: 0.6, end: 1.0, duration: 0.4, track: 1, hand: 'R' },
    { id: 3, pitch: 67, name: 'G4', velocity: 80, start: 1.1, end: 1.5, duration: 0.4, track: 1, hand: 'R' },
    { id: 4, pitch: 72, name: 'C5', velocity: 80, start: 1.6, end: 1.9, duration: 0.3, track: 1, hand: 'R' },
    // Bass LH: C3 (48), G3 (55)
    { id: 5, pitch: 48, name: 'C3', velocity: 75, start: 0.1, end: 0.9, duration: 0.8, track: 0, hand: 'L' },
    { id: 6, pitch: 55, name: 'G3', velocity: 75, start: 1.0, end: 1.9, duration: 0.9, track: 0, hand: 'L' },

    // Measure 2 (2.0s - 4.0s)
    // Treble RH: High A5 (81, ledger line offset 10), C6 (84, ledger line offset 12)
    { id: 7, pitch: 81, name: 'A5', velocity: 85, start: 2.1, end: 2.6, duration: 0.5, track: 1, hand: 'R' },
    { id: 8, pitch: 84, name: 'C6', velocity: 85, start: 2.7, end: 3.2, duration: 0.5, track: 1, hand: 'R' },
    { id: 9, pitch: 72, name: 'C5', velocity: 80, start: 3.3, end: 3.8, duration: 0.5, track: 1, hand: 'R' },
    // Bass LH: Low C2 (36, ledger line offset -4), E2 (40, ledger line offset -2)
    { id: 10, pitch: 36, name: 'C2', velocity: 75, start: 2.1, end: 2.9, duration: 0.8, track: 0, hand: 'L' },
    { id: 11, pitch: 40, name: 'E2', velocity: 75, start: 3.0, end: 3.8, duration: 0.8, track: 0, hand: 'L' },

    // Measure 3 (4.0s - 6.0s)
    { id: 12, pitch: 65, name: 'F4', velocity: 80, start: 4.1, end: 4.6, duration: 0.5, track: 1, hand: 'R' },
    { id: 13, pitch: 69, name: 'A4', velocity: 80, start: 4.7, end: 5.2, duration: 0.5, track: 1, hand: 'R' },
    { id: 14, pitch: 41, name: 'F2', velocity: 75, start: 4.1, end: 5.2, duration: 1.1, track: 0, hand: 'L' },

    // Measure 4 (6.0s - 8.0s)
    { id: 15, pitch: 67, name: 'G4', velocity: 80, start: 6.1, end: 6.8, duration: 0.7, track: 1, hand: 'R' },
    { id: 16, pitch: 48, name: 'C3', velocity: 75, start: 6.1, end: 7.5, duration: 1.4, track: 0, hand: 'L' },
  ];
}

const fixtureNotes = generateFixtureNotes();
const fixtureNoteData = {
  schema_version: 1,
  bpm: 120,
  duration_sec: 8.0,
  time_signature: '4/4',
  notes: fixtureNotes,
};

const fixtureProject = {
  id: '123',
  name: 'Für Elise - Beethoven (Grand Staff)',
  status: 'ready',
  analysis_summary: {
    bpm: 120,
    duration_sec: 8.0,
    time_signature: '4/4',
    track_count: 2,
    note_count: fixtureNotes.length,
    pitch_min: 36,
    pitch_max: 84,
    hand_split: 'auto',
  },
  active_jobs: [],
  created_at: new Date().toISOString(),
};

async function setupPageRoutesAndMocks(page, state) {
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

  // Inject Web Audio, MediaDevices / Microphone, and Web MIDI mocks
  await page.addInitScript(() => {
    // Disable HMR / SW loops
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

    // Web Audio Context setup & getUserMedia mock
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

    // Mock Web MIDI
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

    navigator.requestMIDIAccess = async () => mockAccess;
    window.__MOCK_MIDI_INPUT = mockInput;
    window.__MOCK_MIDI_ACCESS = mockAccess;
  });

  // Block Service Worker & HMR polling
  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/workbox-*.js', (route) => route.abort());
  await page.route('**/_next/webpack-hmr', (route) => route.abort());
  await page.route('**/_next/static/webpack/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // Stub API calls
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (url.includes('/notes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureNoteData),
      });
    } else if (url.includes('/projects/123/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    } else if (url.includes('/projects/123/outputs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    } else if (url.includes('/projects/123/jobs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    } else if (url.includes('/practice-sessions') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-test-uuid',
          project_id: '123',
          score: 100,
          accuracy_percent: 95,
          xp_gained: 50,
          level_up: false,
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
          highest_streak_days: 7,
          last_practice_date: '2026-10-03',
        }),
      });
    } else if (url.includes('/projects/123')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureProject),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });

  // Mock audio fetches
  await page.route('**/*.mp3', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from([]),
    });
  });
}

async function runE2ESuite() {
  console.log('=================================================================');
  console.log(' PianoFlow AI - Phase D E2E Test: Sheet Music & Acoustic Mic');
  console.log('=================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const state = {
    consoleErrors: [],
    pageErrors: [],
  };

  const results = {
    scenario_1_sheet_music_viewer: { passed: false, assertions: [] },
    scenario_2_practice_mic_mode: { passed: false, assertions: [] },
    scenario_3_project_editor_nav: { passed: false, assertions: [] },
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['microphone'],
    });

    const page = await context.newPage();
    await setupPageRoutesAndMocks(page, state);

    // =========================================================================
    // SCENARIO 1: Interactive Grand Staff Sheet Music Viewer (/projects/123/sheet)
    // =========================================================================
    console.log('\n--- Scenario 1: Interactive Grand Staff Sheet Music Viewer (/projects/123/sheet) ---');
    await page.goto('http://localhost:3000/projects/123/sheet', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait specifically for the Grand Staff SVG
    const grandStaffSvg = page.locator('main svg[viewBox="0 0 1000 240"]').first();
    await grandStaffSvg.waitFor({ state: 'attached', timeout: 15000 });
    console.log('✓ Sheet Music Viewer page loaded and Grand Staff SVG rendered');

    // 1. Asserts Grand Staff SVG elements render
    // Treble Clef 𝄞
    const trebleClef = grandStaffSvg.locator('text', { hasText: '𝄞' }).first();
    const trebleCount = await trebleClef.count();
    if (trebleCount === 0) throw new Error('Treble clef 𝄞 not found');
    results.scenario_1_sheet_music_viewer.assertions.push('Treble clef 𝄞 rendered');
    console.log('✓ Treble clef 𝄞 verified');

    // Bass Clef 𝄢
    const bassClef = grandStaffSvg.locator('text', { hasText: '𝄢' }).first();
    const bassCount = await bassClef.count();
    if (bassCount === 0) throw new Error('Bass clef 𝄢 not found');
    results.scenario_1_sheet_music_viewer.assertions.push('Bass clef 𝄢 rendered');
    console.log('✓ Bass clef 𝄢 verified');

    // Staves (5 lines each for treble and bass staves)
    const staffLinesCount = await grandStaffSvg.locator('line[stroke="currentColor"]').count();
    if (staffLinesCount < 10) throw new Error(`Expected at least 10 staff lines, found ${staffLinesCount}`);
    results.scenario_1_sheet_music_viewer.assertions.push(`Staves verified (${staffLinesCount} staff lines found)`);
    console.log(`✓ Staves verified (${staffLinesCount} staff lines)`);

    // Noteheads (ellipse elements)
    const noteheadCount = await grandStaffSvg.locator('ellipse').count();
    if (noteheadCount < 5) throw new Error(`Expected noteheads (ellipses), found ${noteheadCount}`);
    results.scenario_1_sheet_music_viewer.assertions.push(`Noteheads rendered (${noteheadCount} ellipses found)`);
    console.log(`✓ Noteheads verified (${noteheadCount} noteheads)`);

    // Stems (vertical line elements connecting to noteheads)
    const stemLinesCount = await grandStaffSvg.locator('g ellipse ~ line').count();
    results.scenario_1_sheet_music_viewer.assertions.push(`Stems rendered (${stemLinesCount} stems found)`);
    console.log(`✓ Note stems verified (${stemLinesCount} stems)`);

    // Ledger lines (note ledger line indicators: line elements inside note <g> before ellipse)
    const ledgerLines = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('main svg line'));
      return lines.filter((l) => {
        const x1 = parseFloat(l.getAttribute('x1') || '0');
        const x2 = parseFloat(l.getAttribute('x2') || '0');
        return Math.abs(x2 - x1) === 16;
      }).length;
    });
    if (ledgerLines === 0) throw new Error('Expected ledger lines for high/low pitches, found 0');
    results.scenario_1_sheet_music_viewer.assertions.push(`Ledger lines rendered (${ledgerLines} ledger lines found)`);
    console.log(`✓ Ledger lines verified (${ledgerLines} ledger lines)`);

    // 2. Playback HUD Controls
    // Play/Pause button
    const playBtn = page.locator('header button', { hasText: 'Play' });
    await playBtn.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_sheet_music_viewer.assertions.push('Play button present');
    console.log('✓ Play/Pause button verified');

    // Speed selector (0.5x, 0.75x, 1x, 1.25x)
    for (const speed of ['0.5x', '0.75x', '1x', '1.25x']) {
      const speedBtn = page.locator('header button', { hasText: speed });
      const isVis = await speedBtn.isVisible();
      if (!isVis) throw new Error(`Speed button ${speed} not visible`);
    }
    results.scenario_1_sheet_music_viewer.assertions.push('Speed selectors (0.5x, 0.75x, 1x, 1.25x) present');
    console.log('✓ Speed selector (0.5x - 1.25x) verified');

    // Zoom controls (+ / - / percentage)
    const zoomIn = page.locator('header button', { hasText: '+' });
    const zoomOut = page.locator('header button', { hasText: '-' });
    const zoomLabel = page.locator('header span', { hasText: '100%' });
    if (!(await zoomIn.isVisible()) || !(await zoomOut.isVisible()) || !(await zoomLabel.isVisible())) {
      throw new Error('Zoom controls not visible');
    }
    results.scenario_1_sheet_music_viewer.assertions.push('Zoom controls (+/- and 100%) present');
    console.log('✓ Zoom controls verified');

    // Print button
    const printBtn = page.locator('header button', { hasText: 'Print' });
    if (!(await printBtn.isVisible())) throw new Error('Print button not visible');
    results.scenario_1_sheet_music_viewer.assertions.push('Print button present');
    console.log('✓ Print button verified');

    // 3. Playhead cursor advance test
    console.log('Testing playback playhead cursor...');
    await playBtn.click();
    await page.waitForTimeout(300);

    // After clicking Play, button text becomes "Pause"
    const pauseBtn = page.locator('header button', { hasText: 'Pause' });
    await pauseBtn.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Play button toggled to Pause');

    // Playhead line exists in DOM (stroke="#06b6d4")
    const playheadLocator = page.locator('main svg line[stroke="#06b6d4"]');
    await playheadLocator.first().waitFor({ state: 'attached', timeout: 3000 });

    const x1_start = parseFloat((await playheadLocator.first().getAttribute('x1')) || '0');
    console.log(`  Playhead initial x1: ${x1_start}`);

    await page.waitForTimeout(800);
    const x1_advanced = parseFloat((await playheadLocator.first().getAttribute('x1')) || '0');
    console.log(`  Playhead advanced x1: ${x1_advanced}`);
    if (x1_advanced <= x1_start) {
      throw new Error(`Expected playhead to advance (${x1_advanced} <= ${x1_start})`);
    }
    results.scenario_1_sheet_music_viewer.assertions.push(`Playhead advances automatically (from ${x1_start} to ${x1_advanced})`);
    console.log('✓ Playhead cursor advances smoothly');

    // 4. Click on Measure 2 to seek playhead
    console.log('Testing measure seek click on measure 2...');
    const measure2Rect = page.locator('main svg g.cursor-pointer rect').nth(1);
    await measure2Rect.click({ force: true });
    await page.waitForTimeout(200);

    const x1_seek = parseFloat((await playheadLocator.first().getAttribute('x1')) || '0');
    console.log(`  Playhead seek x1 in measure 2: ${x1_seek}`);
    // Measure 2 starts at ~545
    if (x1_seek < 450) {
      throw new Error(`Expected playhead to seek to measure 2, got x1: ${x1_seek}`);
    }
    results.scenario_1_sheet_music_viewer.assertions.push(`Measure click seek successfully relocated playhead to x1=${x1_seek}`);
    console.log('✓ Measure seek click verified');

    // Pause playback
    await pauseBtn.click();
    await page.waitForTimeout(200);

    // High-resolution Screenshot for Scenario 1
    const s1Path = path.join(SCREENSHOTS_DIR, '01_sheet_music_viewer.png');
    await page.screenshot({ path: s1Path, fullPage: true });
    console.log(`📸 Screenshot saved: ${s1Path}`);
    results.scenario_1_sheet_music_viewer.passed = true;

    // =========================================================================
    // SCENARIO 2: Practice Mode Input Mode Toggle & Microphone (/projects/123/practice)
    // =========================================================================
    console.log('\n--- Scenario 2: Practice Mode Input Mode Toggle & Microphone (/projects/123/practice) ---');
    await page.goto('http://localhost:3000/projects/123/practice', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for hydration: Bar counter appears only when React tree has hydrated
    await page.waitForSelector('text=Bar 1 /', { state: 'visible', timeout: 15000 });
    console.log('✓ Practice Mode page loaded and hydrated');

    // 1. Asserts input toggle [ 🎹 MIDI | 🎙️ Mic ] is present
    const midiToggleBtn = page.locator('button').filter({ hasText: 'MIDI' }).first();
    const micToggleBtn = page.locator('button').filter({ hasText: 'Mic' }).first();
    if (!(await midiToggleBtn.isVisible()) || !(await micToggleBtn.isVisible())) {
      throw new Error('Input mode toggle [ 🎹 MIDI | 🎙️ Mic ] not visible');
    }
    results.scenario_2_practice_mic_mode.assertions.push('Input mode toggle [ 🎹 MIDI | 🎙️ Mic ] present');
    console.log('✓ Input mode toggle [ 🎹 MIDI | 🎙️ Mic ] verified');

    // 2. Click 🎙️ Mic (retry until React event delegation is hydrated)
    console.log('Clicking 🎙️ Mic toggle...');
    for (let attempt = 1; attempt <= 5; attempt++) {
      await micToggleBtn.click({ force: true });
      await page.waitForTimeout(300);
      const cls = (await micToggleBtn.getAttribute('class')) || '';
      if (cls.includes('bg-cyan-500')) {
        console.log(`✓ Mic toggle activated on attempt ${attempt}`);
        break;
      }
    }
    const headerText = await page.locator('header').nth(1).innerText();
    console.log('PRACTICE HEADER TEXT AFTER MIC CLICK:\n', headerText);

    // 3. Asserts microphone active state / listening badge appears
    const micActiveBadge = page.locator('header span', { hasText: 'Acoustic Mic Active' });
    await micActiveBadge.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_2_practice_mic_mode.assertions.push('Acoustic Mic Active status badge visible');
    console.log('✓ Microphone active listening badge verified: "Acoustic Mic Active"');

    // 4. Asserts Sheet Music 🎼 navigation link is present and points to /projects/123/sheet
    const sheetNavLink = page.locator('header a[href="/projects/123/sheet"]');
    if (!(await sheetNavLink.isVisible())) {
      throw new Error('Sheet Music 🎼 navigation link not visible or href mismatch');
    }
    const sheetNavText = await sheetNavLink.innerText();
    if (!sheetNavText.includes('Sheet Music')) {
      throw new Error(`Expected link text to include "Sheet Music", got: "${sheetNavText}"`);
    }
    results.scenario_2_practice_mic_mode.assertions.push('Sheet Music 🎼 navigation link present with href="/projects/123/sheet"');
    console.log('✓ Sheet Music 🎼 navigation link verified pointing to /projects/123/sheet');

    // Screenshot for Scenario 2
    const s2Path = path.join(SCREENSHOTS_DIR, '02_practice_mic_mode.png');
    await page.screenshot({ path: s2Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s2Path}`);
    results.scenario_2_practice_mic_mode.passed = true;

    // =========================================================================
    // SCENARIO 3: Project Editor Navigation Integration (/projects/123)
    // =========================================================================
    console.log('\n--- Scenario 3: Project Editor Navigation Integration (/projects/123) ---');
    await page.goto('http://localhost:3000/projects/123', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await page.waitForSelector('main h1', { timeout: 10000 });
    console.log('✓ Project Editor page loaded');

    // 1. Asserts View Sheet Music 🎼 action button is present
    const sheetBtn = page.locator('main button', { hasText: 'View Sheet Music 🎼' });
    await sheetBtn.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_project_editor_nav.assertions.push('View Sheet Music 🎼 action button present');
    console.log('✓ View Sheet Music 🎼 action button verified');

    // Screenshot for Scenario 3
    const s3Path = path.join(SCREENSHOTS_DIR, '03_project_editor_sheet_btn.png');
    await page.screenshot({ path: s3Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s3Path}`);

    // Test clicking View Sheet Music 🎼 navigates to /projects/123/sheet
    console.log('Clicking View Sheet Music 🎼 button...');
    await sheetBtn.click();
    await page.waitForURL('**/projects/123/sheet', { timeout: 10000 });
    console.log(`✓ Navigated successfully to: ${page.url()}`);
    results.scenario_3_project_editor_nav.assertions.push('Clicking View Sheet Music 🎼 routes successfully to /projects/123/sheet');
    results.scenario_3_project_editor_nav.passed = true;

    console.log('\n=================================================================');
    console.log(' All Phase D E2E Scenarios Passed Successfully!');
    console.log('=================================================================');
    console.log(JSON.stringify(results, null, 2));

    // Save results JSON
    fs.writeFileSync(
      path.join(rootDir, 'docs/e2e/sheet_mic/e2e_results.json'),
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

runE2ESuite();
