import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const SCREENSHOTS_DIR = path.join(rootDir, 'docs/e2e/coaching');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function generateCoachingFixtureNotes() {
  return [
    // Measure 1 (0.0s - 2.0s)
    { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.3, end: 0.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 2, pitch: 48, name: 'C3', velocity: 75, start: 0.3, end: 0.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 3, pitch: 64, name: 'E4', velocity: 80, start: 1.0, end: 1.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 4, pitch: 55, name: 'G3', velocity: 75, start: 1.4, end: 1.9, duration: 0.5, track: 0, hand: 'L' },

    // Measure 2 (2.0s - 4.0s)
    { id: 5, pitch: 67, name: 'G4', velocity: 80, start: 2.3, end: 2.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 6, pitch: 52, name: 'E3', velocity: 75, start: 2.3, end: 2.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 7, pitch: 72, name: 'C5', velocity: 80, start: 3.0, end: 3.4, duration: 0.4, track: 1, hand: 'R' },
    { id: 8, pitch: 55, name: 'G3', velocity: 75, start: 3.4, end: 3.9, duration: 0.5, track: 0, hand: 'L' },

    // Measure 3 (4.0s - 6.0s) - Weak section for drill clustering (2 hits, 1 intentional miss)
    { id: 9, pitch: 69, name: 'A4', velocity: 80, start: 4.3, end: 4.7, duration: 0.4, track: 1, hand: 'R' },
    { id: 10, pitch: 53, name: 'F3', velocity: 75, start: 4.3, end: 4.9, duration: 0.6, track: 0, hand: 'L' },
    { id: 11, pitch: 71, name: 'B4', velocity: 80, start: 5.0, end: 5.5, duration: 0.5, track: 1, hand: 'R' }, // Intentionally missed

    // Measure 4 (6.0s - 8.0s)
    { id: 12, pitch: 72, name: 'C5', velocity: 80, start: 6.3, end: 6.9, duration: 0.6, track: 1, hand: 'R' },
    { id: 13, pitch: 48, name: 'C3', velocity: 75, start: 6.3, end: 7.5, duration: 1.2, track: 0, hand: 'L' },
  ];
}

const fixtureNotes = generateCoachingFixtureNotes();
const fixtureNoteData = {
  schema_version: 1,
  bpm: 120,
  duration_sec: 8.0,
  time_signature: '4/4',
  notes: fixtureNotes,
};

const fixtureProject = {
  id: '123',
  name: 'Für Elise - AI Coaching Analytics Demo',
  status: 'ready',
  analysis_summary: {
    bpm: 120,
    duration_sec: 8.0,
    time_signature: '4/4',
    track_count: 2,
    note_count: fixtureNotes.length,
    pitch_min: 48,
    pitch_max: 72,
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

  // Inject Web Audio, Web MIDI mocks, and safe pointer capture
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

  await page.route('**/*.mp3', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) });
  });
}

// Reliable seek using mouse click on Scrubber Track
async function seekTo(page, targetMs, totalDurationMs = 8000) {
  const track = page.locator('div.relative.h-6.w-full').first();
  const box = await track.boundingBox();
  if (!box) throw new Error('Scrubber track bounding box not found');
  const ratio = Math.max(0.01, Math.min(0.99, targetMs / totalDurationMs));
  const clickX = box.x + box.width * ratio;
  const clickY = box.y + box.height / 2;
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(50);
}

// Strike MIDI pitches
async function strikePitches(page, pitches, velocity = 100) {
  for (const p of pitches) {
    await page.evaluate(({ pitch, vel }) => {
      const input = window.__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x90, pitch, vel]) });
      }
    }, { pitch: p, vel: velocity });
  }

  await page.waitForTimeout(40);

  for (const p of pitches) {
    await page.evaluate(({ pitch }) => {
      const input = window.__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x80, pitch, 0]) });
      }
    }, { pitch: p });
  }

  await page.waitForTimeout(40);
}

async function seekAndStrikePitches(page, targetMs, pitches, totalDurationMs = 8000) {
  await seekTo(page, targetMs, totalDurationMs);
  await strikePitches(page, pitches);
}

async function runCoachingE2ESuite() {
  console.log('=================================================================');
  console.log(' PianoFlow Phase F: AI Coaching & Practice Analytics E2E Suite  ');
  console.log('=================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'],
  });

  const state = { consoleErrors: [], pageErrors: [] };
  const results = {
    scenario_1_coaching_modal_overview: { passed: false, assertions: [] },
    scenario_2_measure_heatmap: { passed: false, assertions: [] },
    scenario_3_targeted_drill_action: { passed: false, assertions: [] },
    scenario_bonus_dragging_verification: { passed: false, assertions: [] },
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ['microphone', 'midi'],
    });

    const page = await context.newPage();
    await setupPageRoutesAndMocks(page, state);

    console.log('--- Step 1: Navigating to Practice Mode (/projects/123/practice) ---');
    await page.goto('http://localhost:3000/projects/123/practice', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await page.waitForSelector('main', { timeout: 10000 });
    console.log('✓ Practice page loaded successfully');

    // Switch from Wait Mode to Continuous Mode
    const continuousToggle = page.locator('header button', { hasText: 'Continuous' });
    if (await continuousToggle.isVisible()) {
      await continuousToggle.click();
      console.log('✓ Switched to Continuous Mode');
    }

    // Verify MIDI hardware indicator
    const midiBadge = page.locator('header', { hasText: 'MIDI Hardware Connected' });
    await midiBadge.first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Mock MIDI hardware connected badge confirmed');

    // =========================================================================
    // SCENARIO 1: AI Coaching Modal & Timing Gauge
    // Simulate notes with early strikes (-30ms) to test Rushing tendency
    // =========================================================================
    console.log('\n--- Scenario 1: Simulating MIDI Notes with Early Strikes (-30ms) ---');

    // Bar 1 Notes (Expected start: 300ms, 1000ms, 1400ms):
    // Struck at -30ms: 270ms, 970ms, 1370ms
    console.log('Simulating Bar 1 hits at -30ms delta...');
    await seekAndStrikePitches(page, 270, [60, 48]); // RH C4 + LH C3
    await seekAndStrikePitches(page, 970, [64]);     // RH E4
    await seekAndStrikePitches(page, 1370, [55]);    // LH G3

    // Bar 2 Notes (Expected start: 2300ms, 3000ms, 3400ms):
    // Struck at -30ms: 2270ms, 2970ms, 3370ms
    console.log('Simulating Bar 2 hits at -30ms delta...');
    await seekAndStrikePitches(page, 2270, [67, 52]); // RH G4 + LH E3
    await seekAndStrikePitches(page, 2970, [72]);      // RH C5
    await seekAndStrikePitches(page, 3370, [55]);      // LH G3

    // Bar 3 Notes (Expected start: 4300ms, 5000ms):
    // Struck at -30ms: 4270ms (RH 69, LH 53 hit; pitch 71 at 5000ms intentionally skipped)
    console.log('Simulating Bar 3 hits (with 1 intentional miss)...');
    await seekAndStrikePitches(page, 4270, [69, 53]); // RH A4 + LH F3
    // Note 71 at 5000ms is unplayed -> produces weak section accuracy (66.7%)

    // Bar 4 Notes (Expected start: 6300ms):
    // Struck at -30ms: 6270ms
    console.log('Simulating Bar 4 hits at -30ms delta...');
    await seekAndStrikePitches(page, 6270, [72, 48]); // RH C5 + LH C3

    // Trigger Finish to open CoachingModal
    console.log('Clicking "Finish" button...');
    const finishBtn = page.locator('header button', { hasText: 'Finish' });
    await finishBtn.click();

    // 1. Assert modal title "AI Coaching & Session Analytics" is visible
    const modalTitle = page.locator('h2', { hasText: 'AI Coaching & Session Analytics' });
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_coaching_modal_overview.assertions.push('Modal title "AI Coaching & Session Analytics" is visible');
    console.log('✓ Modal title "AI Coaching & Session Analytics" verified');

    // 2. Assert Performance Grade Banner (Grade, XP, summary) renders
    const gradeBanner = page.locator('div.text-xl', { hasText: 'Accuracy' });
    await gradeBanner.waitFor({ state: 'visible', timeout: 5000 });
    const xpBanner = page.locator('div', { hasText: '+85 XP' }).first();
    await xpBanner.waitFor({ state: 'visible', timeout: 5000 });
    const streakBanner = page.locator('div', { hasText: 'Day Streak' }).first();
    await streakBanner.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_coaching_modal_overview.assertions.push('Performance Grade Banner (Grade, +85 XP, Streak) rendered');
    console.log('✓ Performance Grade Banner verified');

    // 3. Assert Bi-Directional Timing Gauge renders with Rushing indicator pin
    const rushingBadge = page.locator('span', { hasText: 'Systematically Rushing' });
    await rushingBadge.waitFor({ state: 'visible', timeout: 5000 });
    const rushingLabel = page.locator('span', { hasText: '◄ Rushing (-60ms Early)' });
    await rushingLabel.waitFor({ state: 'visible', timeout: 5000 });
    const pocketLabel = page.locator('span', { hasText: 'Pocket (±15ms)' });
    await pocketLabel.waitFor({ state: 'visible', timeout: 5000 });
    const draggingLabel = page.locator('span', { hasText: 'Dragging (+60ms Late) ►' });
    await draggingLabel.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_coaching_modal_overview.assertions.push('Bi-Directional Timing Gauge with Rushing indicator badge & labels rendered');
    console.log('✓ Bi-Directional Timing Gauge rendered with Rushing status');

    // 4. Assert Decoupled Hand Breakdown (Right Hand vs Left Hand metrics) is displayed
    const rhHeader = page.locator('span', { hasText: 'Right Hand (Treble / Melody)' });
    await rhHeader.waitFor({ state: 'visible', timeout: 5000 });
    const lhHeader = page.locator('span', { hasText: 'Left Hand (Bass / Harmony)' });
    await lhHeader.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_1_coaching_modal_overview.assertions.push('Decoupled Hand Breakdown (Right Hand vs Left Hand metrics) displayed');
    console.log('✓ Decoupled Hand Breakdown (Right Hand vs Left Hand) verified');

    // Capture screenshot 1: 01_coaching_modal_overview.png
    const s1Path = path.join(SCREENSHOTS_DIR, '01_coaching_modal_overview.png');
    await page.screenshot({ path: s1Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s1Path}`);
    results.scenario_1_coaching_modal_overview.passed = true;

    // =========================================================================
    // SCENARIO 2: Measure Difficulty Heatmap
    // =========================================================================
    console.log('\n--- Scenario 2: Measure Difficulty Heatmap Inspection ---');

    // 1. Assert MeasureHeatmap renders measure tiles with color-coded status badges
    const heatmapHeader = page.locator('span', { hasText: 'Measure Accuracy Heatmap' });
    await heatmapHeader.waitFor({ state: 'visible', timeout: 5000 });

    const measureTiles = page.locator('button[aria-label*="Measure"]');
    const tileCount = await measureTiles.count();
    console.log(`Found ${tileCount} measure tiles in heatmap`);
    if (tileCount < 4) {
      throw new Error(`Expected at least 4 measure tiles, got ${tileCount}`);
    }
    results.scenario_2_measure_heatmap.assertions.push(`MeasureHeatmap renders ${tileCount} measure tiles`);

    // 2. Hover / click on measure tile #3 to view inspect card
    const bar3Tile = page.locator('button', { hasText: '#3' });
    await bar3Tile.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Hovering over Measure #3 tile to inspect details...');
    await bar3Tile.hover();
    await page.waitForTimeout(300);

    // Assert inspect card displays accuracy %, hits breakdown, mean bias
    const inspectCard = page.locator('div', { hasText: 'Bar 3' }).locator('..').first();
    await inspectCard.waitFor({ state: 'visible', timeout: 5000 });
    const inspectText = await inspectCard.innerText();
    console.log(`Inspect card contents:\n${inspectText}`);

    if (!inspectText.includes('Accuracy:') || !inspectText.includes('Hits:') || !inspectText.includes('Timing Bias:')) {
      throw new Error(`Inspect card missing metrics breakdown: "${inspectText}"`);
    }
    results.scenario_2_measure_heatmap.assertions.push('Measure inspect card displays accuracy %, hits breakdown, and timing bias');
    console.log('✓ Measure inspect card verified with accuracy, hits, and bias');

    // Capture screenshot 2: 02_measure_heatmap.png
    const s2Path = path.join(SCREENSHOTS_DIR, '02_measure_heatmap.png');
    await page.screenshot({ path: s2Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s2Path}`);
    results.scenario_2_measure_heatmap.passed = true;

    // =========================================================================
    // SCENARIO 3: Targeted Drill Action
    // =========================================================================
    console.log('\n--- Scenario 3: Targeted Drill Action ---');

    // 1. Assert CoachRecommendations renders drill recommendation cards for weak sections
    const drillsHeader = page.locator('h3', { hasText: 'Targeted Loop Drills' });
    await drillsHeader.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_targeted_drill_action.assertions.push('Targeted Loop Drills header rendered');

    // 2. Click "🎯 Drill This Section (0.75x Speed)"
    const drillButton = page.locator('button', { hasText: '🎯 Drill This Section (0.75x Speed)' }).first();
    await drillButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking "🎯 Drill This Section (0.75x Speed)"...');
    await drillButton.click();

    // 3. Verify modal closes
    await modalTitle.waitFor({ state: 'hidden', timeout: 5000 });
    results.scenario_3_targeted_drill_action.assertions.push('CoachingModal closed upon applying drill');
    console.log('✓ CoachingModal closed successfully');

    // 4. Verify A-B loop pins/overlay activate with drill boundaries
    const loopPinA = page.locator('span', { hasText: 'A' }).first();
    await loopPinA.waitFor({ state: 'visible', timeout: 5000 });
    const loopPinB = page.locator('span', { hasText: 'B' }).first();
    await loopPinB.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_targeted_drill_action.assertions.push('A-B loop pins A and B activated on timeline scrubber');
    console.log('✓ A-B loop pins A and B activated on timeline scrubber');

    // Verify Loop: ON button indicator
    const loopToggleBtn = page.locator('button', { hasText: 'Loop: ON' });
    await loopToggleBtn.waitFor({ state: 'visible', timeout: 5000 });
    results.scenario_3_targeted_drill_action.assertions.push('Loop status indicates "Loop: ON"');
    console.log('✓ Scrubber indicates Loop: ON');

    // 5. Verify playback speed updates to 0.75x
    const speed075Btn = page.locator('button', { hasText: '0.75x' });
    await speed075Btn.waitFor({ state: 'visible', timeout: 5000 });
    const speedClasses = await speed075Btn.getAttribute('class');
    if (!speedClasses || !speedClasses.includes('bg-cyan-500')) {
      throw new Error(`Speed button 0.75x does not have active style: "${speedClasses}"`);
    }
    results.scenario_3_targeted_drill_action.assertions.push('Playback speed preset updated and highlighted at 0.75x');
    console.log('✓ Playback speed preset verified active at 0.75x');

    await page.waitForTimeout(400);

    // Capture screenshot 3: 03_drill_loop_configured.png
    const s3Path = path.join(SCREENSHOTS_DIR, '03_drill_loop_configured.png');
    await page.screenshot({ path: s3Path, fullPage: false });
    console.log(`📸 Screenshot saved: ${s3Path}`);
    results.scenario_3_targeted_drill_action.passed = true;

    // =========================================================================
    // BONUS SUB-TEST: Late Strikes (+40ms) Dragging Tendency Verification
    // =========================================================================
    console.log('\n--- Bonus Verification: Late Strikes (+40ms) Dragging Tendency ---');
    // Click Reset
    const resetBtn = page.locator('header button', { hasText: 'Reset' });
    await resetBtn.click();
    await page.waitForTimeout(200);

    // Simulate notes at +40ms late
    // Expected start: 300ms, 1000ms, 1400ms -> Struck at 340ms, 1040ms, 1440ms
    console.log('Simulating notes at +40ms late delta...');
    await seekAndStrikePitches(page, 340, [60, 48]); // RH C4 + LH C3
    await seekAndStrikePitches(page, 1040, [64]);    // RH E4
    await seekAndStrikePitches(page, 1440, [55]);    // LH G3

    // Finish session
    await finishBtn.click();
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });

    // Verify Dragging badge
    const draggingBadge = page.locator('span', { hasText: 'Systematically Dragging' });
    await draggingBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Dragging tendency badge verified: "⏳ Systematically Dragging"');
    results.scenario_bonus_dragging_verification.passed = true;

    // Close modal
    const closeBtn = page.locator('button', { hasText: 'Keep Practicing Full Song' });
    await closeBtn.click();
    await modalTitle.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('✓ Dragging tendency verification complete');

    console.log('\n=================================================================');
    console.log(' All Phase F AI Coaching E2E Scenarios Passed Successfully!      ');
    console.log('=================================================================');
    console.log(JSON.stringify(results, null, 2));

    // Save test results JSON
    fs.writeFileSync(
      path.join(rootDir, 'docs/e2e/coaching/e2e_results.json'),
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

runCoachingE2ESuite();
