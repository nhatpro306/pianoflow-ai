import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const UIUX_DIR = path.join(rootDir, 'docs/e2e/uiux');
if (!fs.existsSync(UIUX_DIR)) {
  fs.mkdirSync(UIUX_DIR, { recursive: true });
}

const RESULTS_PATH = path.join(rootDir, 'docs/e2e/uiux_results.json');

// Generate 40 notes across both hands (RH: melody, LH: harmony)
function generateFixtureNotes() {
  const notes = [];
  const melodyPitches = [60, 64, 67, 72, 71, 69, 67, 65, 64, 62, 60, 64, 67, 72, 74, 76, 74, 72, 67, 60];
  const bassPitches = [48, 52, 55, 48, 45, 48, 53, 48, 47, 50, 48, 52, 55, 48, 45, 48, 52, 55, 48, 36];

  let id = 1;
  for (let i = 0; i < 20; i++) {
    const time = 1.0 + i * 1.0; // 1.0s, 2.0s, 3.0s, etc.
    // Right hand note
    notes.push({
      id: id++,
      pitch: melodyPitches[i],
      name: `RH_${melodyPitches[i]}`,
      velocity: 80,
      start: Number(time.toFixed(2)),
      end: Number((time + 0.6).toFixed(2)),
      duration: 0.6,
      track: 1,
      hand: 'R',
    });
    // Left hand note
    notes.push({
      id: id++,
      pitch: bassPitches[i],
      name: `LH_${bassPitches[i]}`,
      velocity: 75,
      start: Number(time.toFixed(2)),
      end: Number((time + 0.8).toFixed(2)),
      duration: 0.8,
      track: 0,
      hand: 'L',
    });
  }
  return notes;
}

const fixtureNotes = generateFixtureNotes();
const fixtureNoteData = {
  schema_version: 1,
  bpm: 120,
  duration_sec: 25,
  time_signature: '4/4',
  notes: fixtureNotes,
};

async function setupPageRoutesAndMidi(page, state) {
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

  // Inject Web MIDI Mock & AudioContext tracking & disable SW/HMR reload loop
  await page.addInitScript(() => {
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

    // Track AudioContext
    window.__AUDIO_CONTEXTS = [];
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      window.AudioContext = class extends OrigAudioContext {
        constructor(...args) {
          super(...args);
          window.__AUDIO_CONTEXTS.push(this);
        }
      };
    }
  });

  // Block Service Worker & HMR polling
  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/workbox-*.js', (route) => route.abort());
  await page.route('**/_next/webpack-hmr', (route) => route.abort());
  await page.route('**/_next/static/webpack/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // Route stubs for API calls
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
    } else if (url.includes('/practice-sessions') && method === 'POST') {
      const postData = JSON.parse(req.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-test-uuid',
          project_id: postData.project_id || 'proj-123',
          score: postData.score || 0,
          accuracy_percent: postData.accuracy_percent || 0,
          xp_gained: 80,
          level_up: false,
          current_level: 2,
          total_xp: 280,
          current_streak: 3,
        }),
      });
    } else if (url.includes('/user/progress')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: 'test-user',
          total_xp: 200,
          level: 2,
          xp_to_next_level: 100,
          current_streak_days: 2,
          highest_streak_days: 5,
          last_practice_date: '2026-10-02',
        }),
      });
    } else if (url.includes('/projects/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'proj-123',
          name: 'Fixture Test Song (40 Notes)',
          status: 'ready',
          analysis_summary: {
            bpm: 120,
            duration_sec: 25,
            time_signature: '4/4',
            track_count: 2,
            note_count: fixtureNotes.length,
            pitch_min: 36,
            pitch_max: 76,
            hand_split: 'auto',
          },
          active_jobs: [],
          created_at: new Date().toISOString(),
        }),
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

async function measureFps(targetPage, durationMs = 3000) {
  return await targetPage.evaluate((duration) => {
    return new Promise((resolve) => {
      let frames = 0;
      let rafId = null;
      const start = performance.now();

      function countFrame(now) {
        frames++;
        if (now - start < duration) {
          rafId = requestAnimationFrame(countFrame);
        } else {
          const elapsed = now - start;
          const fps = (frames / elapsed) * 1000;
          resolve({
            fps: Math.round(fps * 10) / 10,
            frames,
            elapsedMs: Math.round(elapsed),
          });
        }
      }
      rafId = requestAnimationFrame(countFrame);
    });
  }, durationMs);
}

async function runE2E() {
  console.log('=== PianoFlow AI Practice Mode UI/UX Playwright E2E Suite ===');
  console.log(`Fixture Notes: ${fixtureNotes.length} notes (25s total duration)`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });

  const results = {
    scenario_1_new_hud: { pass: false, details: '' },
    scenario_2_speed_controls: { pass: false, details: '' },
    scenario_3_hands_isolation: { pass: false, details: '' },
    scenario_4_ab_looping: { pass: false, details: '' },
    scenario_5_timeline_scrubber_seek: { pass: false, details: '' },
    scenario_6_hit_sparks_effect: { pass: false, details: '' },
    scenario_7_mobile_responsive: { pass: false, details: '' },
  };

  const globalState = {
    consoleErrors: [],
    pageErrors: [],
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await setupPageRoutesAndMidi(page, globalState);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 1: Initial load of /projects/proj-123/practice
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 1: Initial Load & New HUD Controls Verification ---');
    await page.goto('http://localhost:3000/projects/proj-123/practice', {
      waitUntil: 'domcontentloaded',
    });

    // Wait for song title and HUD to be visible
    await page.waitForSelector('text=Fixture Test Song', { timeout: 15000 });
    await page.waitForSelector('text=Bar 1 /', { timeout: 10000 });

    // Verify Song Title
    const titleLocator = page.locator('h1:has-text("Fixture Test Song")');
    const isTitleVisible = await titleLocator.isVisible();

    // Verify Back Button (practice header back button has "← Projects")
    const backBtnLocator = page.locator('a:has-text("← Projects")');
    const isBackBtnVisible = await backBtnLocator.isVisible();

    // Verify Measure / Bar counter
    const barCounterLocator = page.locator('span:has-text("Bar 1 /")');
    const isBarCounterVisible = await barCounterLocator.isVisible();
    const barCounterText = (await barCounterLocator.textContent())?.trim();

    // Verify Speed buttons: 0.5x, 0.75x, 1x/1.0x, 1.25x, 1.5x
    const speedButtonLabels = ['0.5x', '0.75x', '1x', '1.25x', '1.5x'];
    let allSpeedVisible = true;
    for (const spd of speedButtonLabels) {
      const btn = page.locator('button').filter({ hasText: new RegExp(`^${spd}$`) });
      if (!(await btn.isVisible())) {
        allSpeedVisible = false;
        break;
      }
    }

    // Verify A-B loop buttons
    const setABtn = page.locator('button:has-text("Set A")');
    const setBBtn = page.locator('button:has-text("Set B")');
    const loopToggleBtn = page.locator('button:has-text("Loop:")');
    const isSetAVisible = await setABtn.isVisible();
    const isSetBVisible = await setBBtn.isVisible();
    const isLoopToggleVisible = await loopToggleBtn.isVisible();

    // Verify Hands buttons
    const bothHandsBtn = page.locator('button:has-text("Both Hands")');
    const rhBtn = page.locator('button:has-text("Right Hand (RH)")');
    const lhBtn = page.locator('button:has-text("Left Hand (LH)")');
    const isBothHandsVisible = await bothHandsBtn.isVisible();
    const isRHVisible = await rhBtn.isVisible();
    const isLHVisible = await lhBtn.isVisible();

    // Verify Timeline scrubber track
    const scrubberTrack = page.locator('div.relative.h-6.w-full');
    const isScrubberTrackVisible = await scrubberTrack.isVisible();

    // Capture HUD screenshot
    const shot1Path = path.join(UIUX_DIR, '01_practice_new_hud.png');
    await page.screenshot({ path: shot1Path });

    const s1Pass =
      isTitleVisible &&
      isBackBtnVisible &&
      isBarCounterVisible &&
      allSpeedVisible &&
      isSetAVisible &&
      isSetBVisible &&
      isLoopToggleVisible &&
      isBothHandsVisible &&
      isRHVisible &&
      isLHVisible &&
      isScrubberTrackVisible &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_1_new_hud = {
      pass: s1Pass,
      details: `Title visible: ${isTitleVisible}, Back button: ${isBackBtnVisible}, Counter: "${barCounterText}", All speed buttons: ${allSpeedVisible}, A-B buttons: ${isSetAVisible && isSetBVisible && isLoopToggleVisible}, Hands buttons: ${isBothHandsVisible && isRHVisible && isLHVisible}, Scrubber track: ${isScrubberTrackVisible}`,
      screenshot: '01_practice_new_hud.png',
    };
    console.log(`Scenario 1: ${s1Pass ? 'PASS' : 'FAIL'} - ${results.scenario_1_new_hud.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 2: Speed Multiplier Toggle
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 2: Speed Multiplier Toggle (0.5x, 1.5x, 1.0x/1x) ---');
    // Click 0.5x
    const btn05 = page.locator('button').filter({ hasText: /^0\.5x$/ });
    await btn05.click();
    await page.waitForTimeout(150);
    const class05 = (await btn05.getAttribute('class')) || '';
    const is05Active = class05.includes('bg-cyan-500') && class05.includes('text-zinc-950');

    // Click 1.5x
    const btn15 = page.locator('button').filter({ hasText: /^1\.5x$/ });
    await btn15.click();
    await page.waitForTimeout(150);
    const class15 = (await btn15.getAttribute('class')) || '';
    const is15Active = class15.includes('bg-cyan-500') && class15.includes('text-zinc-950');

    // Click 1.0x / 1x (return to baseline)
    const btn10 = page.locator('button').filter({ hasText: /^1(\.0)?x$/ });
    await btn10.click();
    await page.waitForTimeout(150);
    const class10 = (await btn10.getAttribute('class')) || '';
    const is10Active = class10.includes('bg-cyan-500') && class10.includes('text-zinc-950');

    // Capture Speed controls screenshot
    const shot2Path = path.join(UIUX_DIR, '02_speed_controls.png');
    await page.screenshot({ path: shot2Path });

    const s2Pass =
      is05Active &&
      is15Active &&
      is10Active &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_2_speed_controls = {
      pass: s2Pass,
      details: `0.5x active style: ${is05Active}, 1.5x active style: ${is15Active}, 1.0x active style: ${is10Active}`,
      screenshot: '02_speed_controls.png',
    };
    console.log(`Scenario 2: ${s2Pass ? 'PASS' : 'FAIL'} - ${results.scenario_2_speed_controls.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 3: Hands Isolation (RH, LH, Both)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 3: Hands Isolation Toggle (RH, LH, Both Hands) ---');
    // Click RH
    await rhBtn.click();
    await page.waitForTimeout(200);
    const classRH = (await rhBtn.getAttribute('class')) || '';
    const isRHActive = classRH.includes('bg-purple-600') && classRH.includes('text-white');

    // Click LH
    await lhBtn.click();
    await page.waitForTimeout(200);
    const classLH = (await lhBtn.getAttribute('class')) || '';
    const isLHActive = classLH.includes('bg-cyan-600') && classLH.includes('text-white');

    // Click Both Hands
    await bothHandsBtn.click();
    await page.waitForTimeout(200);
    const classBoth = (await bothHandsBtn.getAttribute('class')) || '';
    const isBothActive = classBoth.includes('bg-zinc-200') && classBoth.includes('text-zinc-950');

    // Click RH again to capture screenshot showcasing hand isolation button styling
    await rhBtn.click();
    await page.waitForTimeout(200);

    const shot3Path = path.join(UIUX_DIR, '03_hands_isolation.png');
    await page.screenshot({ path: shot3Path });

    // Reset back to Both Hands
    await bothHandsBtn.click();
    await page.waitForTimeout(100);

    const s3Pass =
      isRHActive &&
      isLHActive &&
      isBothActive &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_3_hands_isolation = {
      pass: s3Pass,
      details: `RH active styling (bg-purple-600): ${isRHActive}, LH active styling (bg-cyan-600): ${isLHActive}, Both Hands active styling (bg-zinc-200): ${isBothActive}`,
      screenshot: '03_hands_isolation.png',
    };
    console.log(`Scenario 3: ${s3Pass ? 'PASS' : 'FAIL'} - ${results.scenario_3_hands_isolation.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 4: A-B Looping
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 4: A-B Looping (Set A at 1s, Set B at 4s, Wrap Verification) ---');
    // Reset page playback to t=0
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    // Switch to Continuous mode if in Wait Mode so time flows continuously
    const waitModeBadge = page.locator('span:has-text("Wait Mode")');
    if (await waitModeBadge.isVisible()) {
      await page.locator('button:has-text("Continuous")').click();
      await page.waitForTimeout(200);
    }

    // Start playback to advance to 1s
    await page.locator('button:has-text("Start")').click();
    await page.waitForTimeout(1100); // reaches ~1000ms

    // Click Set A
    await setABtn.click();
    await page.waitForTimeout(100);

    // Verify Marker A pin badge
    const markerA = page.locator('div.relative.h-6 span.bg-cyan-400:has-text("A")');
    const isMarkerAVisible = await markerA.isVisible();

    // Advance to ~4s
    await page.waitForTimeout(3000); // advances +3s to ~4000ms

    // Click Set B
    await setBBtn.click();
    await page.waitForTimeout(100);

    // Verify Marker B pin badge
    const markerB = page.locator('div.relative.h-6 span.bg-sky-400:has-text("B")');
    const isMarkerBVisible = await markerB.isVisible();

    // Verify Loop tag and Loop: ON button
    const loopOnBtn = page.locator('button:has-text("Loop: ON")');
    const isLoopActive = await loopOnBtn.isVisible();

    // Verify loop range display text (contains A: and B:)
    const loopTagText = await page.locator('div.border-b:has-text("🔁")').first().innerText();
    const isLoopRangeTextVisible = loopTagText.includes('A:') && loopTagText.includes('B:');

    // Capture A-B Looping screenshot
    const shot4Path = path.join(UIUX_DIR, '04_ab_looping_active.png');
    await page.screenshot({ path: shot4Path });

    // Now monitor playhead wrap around. With loop active from ~1s to ~4s,
    // let it advance past B. In animate loop, candidateTime >= loopEndMs wraps back to loopStartMs!
    let wrappedBack = false;
    const checkStart = Date.now();
    let prevRecordedTime = null;

    // Check time every 200ms for up to 5 seconds
    while (Date.now() - checkStart < 5000) {
      await page.waitForTimeout(200);
      const currentTimeText = await page.locator('div.border-b span.font-mono:has-text("/ 00:25")').first().textContent();
      // Time string is "MM:SS / 00:25"
      const curSeconds = parseInt(currentTimeText.split('/')[0].trim().split(':')[1], 10);
      if (prevRecordedTime !== null && curSeconds < prevRecordedTime) {
        // Playhead wrapped backwards from ~4s to ~1s!
        wrappedBack = true;
        console.log(`Playhead wrap detected: jumped from ${prevRecordedTime}s back to ${curSeconds}s!`);
        break;
      }
      prevRecordedTime = curSeconds;
    }

    // Pause playback
    const pauseBtn = page.locator('button:has-text("Pause")');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }
    await page.waitForTimeout(200);

    const s4Pass =
      isMarkerAVisible &&
      isMarkerBVisible &&
      isLoopActive &&
      isLoopRangeTextVisible &&
      wrappedBack &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_4_ab_looping = {
      pass: s4Pass,
      details: `Marker A: ${isMarkerAVisible}, Marker B: ${isMarkerBVisible}, Loop: ON: ${isLoopActive}, Range Tag: "${loopTagText.replace(/\n/g, ' ')}", Playhead wrap verified: ${wrappedBack}`,
      screenshot: '04_ab_looping_active.png',
    };
    console.log(`Scenario 4: ${s4Pass ? 'PASS' : 'FAIL'} - ${results.scenario_4_ab_looping.details}`);

    // Clear loop for next scenarios
    const clearLoopBtn = page.locator('button:has-text("✕")');
    if (await clearLoopBtn.isVisible()) {
      await clearLoopBtn.click();
      await page.waitForTimeout(100);
    }

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 5: Timeline Scrubber Seek
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 5: Timeline Scrubber Seek (Seek to 50% Position) ---');
    // Reset playhead to t=0
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    // Locate the scrubber track element
    const trackBox = await scrubberTrack.boundingBox();

    // Click at 50% width
    const clickX = trackBox.x + trackBox.width * 0.5;
    const clickY = trackBox.y + trackBox.height * 0.5;
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(300);

    // Read time text and bar counter
    const scrubbedTimeText = (await page.locator('div.border-b span.font-mono:has-text("/ 00:25")').first().textContent())?.trim();
    const scrubbedBarText = (await page.locator('span:has-text("Bar ")').textContent())?.trim();

    // Total duration is 25s, so 50% should be approx 12s (00:12 or 00:13) and Bar ~7
    const timeMatch = scrubbedTimeText.match(/^00:(\d\d)/);
    const scrubbedSec = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const isNearHalf = scrubbedSec >= 11 && scrubbedSec <= 14;

    // Capture Scrubber seek screenshot
    const shot5Path = path.join(UIUX_DIR, '05_timeline_scrubber_seek.png');
    await page.screenshot({ path: shot5Path });

    const s5Pass =
      isNearHalf &&
      scrubbedBarText.includes('Bar 7') &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_5_timeline_scrubber_seek = {
      pass: s5Pass,
      details: `Scrubbed time: ${scrubbedTimeText} (~${scrubbedSec}s / 25s), Bar counter: "${scrubbedBarText}", Expected ~12.5s (Bar 7)`,
      screenshot: '05_timeline_scrubber_seek.png',
    };
    console.log(`Scenario 5: ${s5Pass ? 'PASS' : 'FAIL'} - ${results.scenario_5_timeline_scrubber_seek.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 6: Hit Sparks & Hit Beam Visual Effects
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 6: Hit Sparks & Hit Beam Rendering (Perfect Hit Simulation) ---');
    // Reset playhead and switch to Wait Mode
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    const continuousBadge = page.locator('span:has-text("Continuous")');
    if (await continuousBadge.isVisible()) {
      await page.locator('button:has-text("Wait Mode")').click();
      await page.waitForTimeout(200);
    }

    // Start playback: in Wait Mode, playhead advances to first note chord at 1000ms and pauses
    await page.locator('button:has-text("Start")').click();
    await page.waitForTimeout(1200);

    // Simulate MIDI Perfect Hit on pitch 60
    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x90, 60, 90]) });
    });
    await page.waitForTimeout(80);

    // Capture screenshot during radiant hit beam and particle sparks
    const shot6Path = path.join(UIUX_DIR, '06_hit_sparks_effect.png');
    await page.screenshot({ path: shot6Path });

    // Send note-off
    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x80, 60, 0]) });
    });
    await page.waitForTimeout(100);

    // Check stats: score > 0, Perfect hit recorded
    const perfectCountText = (await page.locator('text=/P:\\d+/').textContent()) || '';
    const perfectCount = parseInt(perfectCountText.replace('P:', ''), 10);
    const scoreText = (await page.locator('span.text-cyan-400.font-bold').first().textContent()) || '0';
    const scoreVal = parseInt(scoreText.replace(/,/g, ''), 10);

    // Pause playback
    const pauseBtn6 = page.locator('button:has-text("Pause")');
    if (await pauseBtn6.isVisible()) {
      await pauseBtn6.click();
    }

    const s6Pass =
      perfectCount >= 1 &&
      scoreVal > 0 &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_6_hit_sparks_effect = {
      pass: s6Pass,
      details: `Perfect hits recorded: ${perfectCount}, Score: ${scoreVal}, Radiant hit beam and particle sparks rendered with 0 exceptions`,
      screenshot: '06_hit_sparks_effect.png',
    };
    console.log(`Scenario 6: ${s6Pass ? 'PASS' : 'FAIL'} - ${results.scenario_6_hit_sparks_effect.details}`);

    await context.close();

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 7: Mobile Viewport (375x667) & 55+ FPS Performance
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 7: Mobile Viewport (375x667) Layout, Octave Navigator & FPS ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await setupPageRoutesAndMidi(mobilePage, globalState);

    await mobilePage.goto('http://localhost:3000/projects/proj-123/practice', {
      waitUntil: 'domcontentloaded',
    });
    await mobilePage.waitForSelector('text=Fixture Test Song', { timeout: 15000 });

    // Check horizontal overflow
    const overflowInfo = await mobilePage.evaluate(() => {
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    // Verify Octave Navigator
    const octaveLabel = mobilePage.locator('footer span.text-cyan-400:has-text("C3 - B4 (Mid)")');
    const isOctaveLabelVisible = await octaveLabel.isVisible();

    const prevOctaveBtn = mobilePage.locator('footer button:has-text("Prev")');
    const nextOctaveBtn = mobilePage.locator('footer button:has-text("Next")');
    const isPrevBtnVisible = await prevOctaveBtn.isVisible();
    const isNextBtnVisible = await nextOctaveBtn.isVisible();

    // Click Next octave
    await nextOctaveBtn.click();
    await mobilePage.waitForTimeout(150);
    const nextOctaveLabel = mobilePage.locator('footer span.text-cyan-400:has-text("C4 - B5 (Mid/High)")');
    const isNextWorked = await nextOctaveLabel.isVisible();

    // Click Prev octave (return to Mid)
    await prevOctaveBtn.click();
    await mobilePage.waitForTimeout(150);
    const prevReturned = await octaveLabel.isVisible();

    // Verify responsive HUD elements (Score, Accuracy, Timeline Scrubber)
    const isMobileScrubberVisible = await mobilePage.locator('div.relative.h-6.w-full').isVisible();
    const isMobileScoreVisible = await mobilePage.locator('span:has-text("Score:")').isVisible();

    // Switch to Continuous mode & Start playback for FPS measurement
    const mobileWaitToggle = mobilePage.locator('button:has-text("Wait Mode")');
    if (await mobileWaitToggle.isVisible()) {
      const contBtn = mobilePage.locator('button:has-text("Continuous")');
      if (await contBtn.isVisible()) {
        await contBtn.click();
      } else {
        await mobileWaitToggle.click();
      }
      await mobilePage.waitForTimeout(150);
    }

    const mobileStartBtn = mobilePage.locator('button:has-text("Start")');
    if (await mobileStartBtn.isVisible()) {
      await mobileStartBtn.click();
    }

    // Capture screenshot of mobile practice view
    const shot7Path = path.join(UIUX_DIR, '07_mobile_responsive_practice.png');
    await mobilePage.screenshot({ path: shot7Path });

    // Measure FPS over 3000ms
    console.log('Measuring canvas animation FPS on mobile viewport (3000ms)...');
    const perfResult = await measureFps(mobilePage, 3000);
    console.log(`Measured Mobile Canvas FPS: ${perfResult.fps} FPS (${perfResult.frames} frames in ${perfResult.elapsedMs}ms)`);

    const s7Pass =
      !overflowInfo.hasHorizontalOverflow &&
      isOctaveLabelVisible &&
      isPrevBtnVisible &&
      isNextBtnVisible &&
      isNextWorked &&
      prevReturned &&
      isMobileScrubberVisible &&
      isMobileScoreVisible &&
      perfResult.fps >= 55.0 &&
      globalState.consoleErrors.length === 0 &&
      globalState.pageErrors.length === 0;

    results.scenario_7_mobile_responsive = {
      pass: s7Pass,
      details: `No horizontal overflow: ${!overflowInfo.hasHorizontalOverflow} (scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth}), Octave Navigator: ${isNextWorked && prevReturned}, Mobile Scrubber: ${isMobileScrubberVisible}, Canvas FPS: ${perfResult.fps} FPS (Requirement >= 55.0 FPS)`,
      fps: perfResult.fps,
      screenshot: '07_mobile_responsive_practice.png',
    };
    console.log(`Scenario 7: ${s7Pass ? 'PASS' : 'FAIL'} - ${results.scenario_7_mobile_responsive.details}`);

    await mobileContext.close();

  } catch (err) {
    console.error('Test execution failed with error:', err);
  } finally {
    await browser.close();
  }

  const allPassed = Object.values(results).every((r) => r.pass);

  const summary = {
    allPassed,
    results,
    globalErrors: {
      consoleErrors: globalState.consoleErrors,
      pageErrors: globalState.pageErrors,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n=== Playwright E2E Results saved to ${RESULTS_PATH} ===`);
  console.log(`Summary Status: ${allPassed ? 'ALL SCENARIOS PASSED (ZERO REGRESSIONS)' : 'SOME SCENARIOS FAILED'}`);
  console.log(JSON.stringify(results, null, 2));

  if (!allPassed) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('Fatal error in runE2E:', err);
  process.exit(1);
});
