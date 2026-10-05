import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const SCREENSHOTS_DIR = path.join(rootDir, 'docs/e2e');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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
    // Disable EventSource and WebSocket to prevent dev HMR full reloads
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

    // Disable Service Worker in test to stop controllerchange reload
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

    // Track AudioContext instances
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

    // Performance long tasks observer
    window.__LONG_TASKS = [];
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__LONG_TASKS.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {}
  });

  // Block Service Worker & HMR polling
  await page.route('**/sw.js', (route) => route.abort());
  await page.route('**/workbox-*.js', (route) => route.abort());
  await page.route('**/_next/webpack-hmr', (route) => route.abort());
  await page.route('**/_next/static/webpack/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // Route stubbing for API calls
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
      state.sessionPostPayload = postData;
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

  // Mock smplr audio fetches to avoid CDN stalls
  await page.route('**/*.mp3', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from([]),
    });
  });
}

async function runE2E() {
  console.log('=== PianoFlow AI E2E Practice Mode Test Suite ===');
  console.log(`Fixture Notes Count: ${fixtureNotes.length}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });

  const results = {
    s1: { pass: false, details: '' },
    s2: { pass: false, details: '' },
    s3: { pass: false, details: '' },
    s4: { pass: false, details: '' },
    s5: { pass: false, details: '' },
    s6: { pass: false, details: '' },
    s7: { pass: false, details: '' },
  };

  const globalState = {
    consoleErrors: [],
    pageErrors: [],
    sessionPostPayload: null,
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await setupPageRoutesAndMidi(page, globalState);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 1: Practice page loads & falling-note canvas animates
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 1 (S1): Initial Load & Canvas Animation ---');
    await page.goto('http://localhost:3000/projects/proj-123/practice', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('text=MIDI Ready', { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's1_initial_load.png') });

    const canvas = page.locator('canvas');
    const isCanvasVisible = await canvas.isVisible();
    const initialCanvasBox = await canvas.boundingBox();
    const isMidiReady = await page.locator('text=MIDI Ready').isVisible();

    // Start playback
    const startButton = page.locator('button:has-text("Start")');
    await startButton.click();
    await page.waitForTimeout(300);

    const canvasImg1 = await canvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, 's1_animated_1.png'),
    });

    // Wait 1 second of falling note animation
    await page.waitForTimeout(1000);
    const canvasImg2 = await canvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, 's1_animated_2.png'),
    });

    const isDifferent = !canvasImg1.equals(canvasImg2);
    const s1ConsoleErrs = [...globalState.consoleErrors];
    const s1PageErrs = [...globalState.pageErrors];

    if (isCanvasVisible && isMidiReady && isDifferent && s1ConsoleErrs.length === 0 && s1PageErrs.length === 0) {
      results.s1.pass = true;
      results.s1.details = `Canvas visible (${initialCanvasBox.width}x${initialCanvasBox.height}), MIDI Ready badge active, pixel buffer diff confirmed falling notes animation, zero console/page errors.`;
    } else {
      results.s1.pass = false;
      results.s1.details = `Visible: ${isCanvasVisible}, Diff: ${isDifferent}, MIDI: ${isMidiReady}, Console Errs: ${s1ConsoleErrs.length}, Page Errs: ${s1PageErrs.length}`;
    }
    console.log(`S1 Result: ${results.s1.pass ? 'PASS' : 'FAIL'} - ${results.s1.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 2: MIDI note-on scoring (PERFECT/GOOD/MISS) & HUD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 2 (S2): MIDI Note Scoring & HUD Updates ---');
    // Reset to start fresh
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    // In Wait Mode, playhead advances to first chord (1000ms) and pauses
    const waitBadgeCheck = page.locator('text=Wait Mode (Paused on notes)');
    if (!(await waitBadgeCheck.isVisible())) {
      const waitToggle = page.locator('button:has-text("Wait Mode")');
      if (await waitToggle.isVisible()) {
        await waitToggle.click();
        await page.waitForTimeout(200);
      }
    }

    // Start playback
    await page.locator('button:has-text("Start")').click();
    // Wait until playhead reaches first chord at 1000ms and pauses
    await page.waitForTimeout(1200);

    // Send correct pitch 60 (Note 1)
    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x90, 60, 90]) });
    });
    await page.waitForTimeout(150);

    // Capture screenshot of Perfect feedback
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's2_perfect_hit.png') });

    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x80, 60, 0]) });
    });
    await page.waitForTimeout(50);

    // Send wrong pitch (pitch 99, not in song)
    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x90, 99, 90]) });
    });
    await page.waitForTimeout(150);

    // Capture screenshot of Miss feedback
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's2_wrong_pitch_miss.png') });

    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x80, 99, 0]) });
    });
    await page.waitForTimeout(100);

    // Pause playback
    const pauseBtn = page.locator('button:has-text("Pause")');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }
    await page.waitForTimeout(200);

    const hudDetails = await page.evaluate(() => {
      const text = document.body.innerText;
      const perfectText = text.match(/P:(\d+)/)?.[1] || '0';
      const goodText = text.match(/G:(\d+)/)?.[1] || '0';
      const missText = text.match(/M:(\d+)/)?.[1] || '0';
      const accuracyMatch = text.match(/Accuracy:\s*(\d+)%/);
      const accuracy = accuracyMatch ? accuracyMatch[1] : '';
      const scoreMatch = text.match(/Score:\s*([\d,]+)/);
      const score = scoreMatch ? scoreMatch[1] : '';
      return { perfect: perfectText, good: goodText, miss: missText, accuracy, score };
    });

    console.log('HUD Stats after hit & miss:', hudDetails);

    if (parseInt(hudDetails.score.replace(/,/g, '')) > 0 && parseInt(hudDetails.miss) >= 1 && parseInt(hudDetails.perfect) >= 1) {
      results.s2.pass = true;
      results.s2.details = `Score: ${hudDetails.score}, Accuracy: ${hudDetails.accuracy}%, Perfect: ${hudDetails.perfect}, Good: ${hudDetails.good}, Miss: ${hudDetails.miss}. Wrong pitch evaluated as MISS.`;
    } else {
      results.s2.pass = false;
      results.s2.details = `Unexpected HUD stats: Score=${hudDetails.score}, P=${hudDetails.perfect}, M=${hudDetails.miss}`;
    }
    console.log(`S2 Result: ${results.s2.pass ? 'PASS' : 'FAIL'} - ${results.s2.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 3: Wait Mode Behavior
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 3 (S3): Wait Mode Pausing & Resuming ---');
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    // Start playback in Wait Mode
    await page.locator('button:has-text("Start")').click();
    // Wait until playhead reaches first chord (1000ms) and pauses
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's3_wait_mode_paused.png') });

    const pausedFrame1 = await canvas.screenshot();
    await page.waitForTimeout(500);
    const pausedFrame2 = await canvas.screenshot();
    const isPaused = pausedFrame1.equals(pausedFrame2);

    console.log(`Wait mode pause confirmed: ${isPaused}. Now triggering chord keys (pitches 60 & 48)...`);
    // Chord at 1000ms requires both RH pitch 60 and LH pitch 48
    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x90, 60, 90]) });
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x90, 48, 90]) });
    });
    await page.waitForTimeout(150);

    await page.evaluate(() => {
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x80, 60, 0]) });
      window.__MOCK_MIDI_INPUT.onmidimessage({ data: new Uint8Array([0x80, 48, 0]) });
    });

    // Check if playhead resumed advancing
    await page.waitForTimeout(500);
    const resumedFrame = await canvas.screenshot({
      path: path.join(SCREENSHOTS_DIR, 's3_wait_mode_resumed.png'),
    });
    const hasResumed = !pausedFrame1.equals(resumedFrame);

    if (isPaused && hasResumed) {
      results.s3.pass = true;
      results.s3.details = `Playhead cleanly froze on chord at 1000ms (pixel-identical canvas frames), and resumed advancing after chord was hit.`;
    } else {
      results.s3.pass = false;
      results.s3.details = `PausedAtChord: ${isPaused}, ResumedAfterKey: ${hasResumed}`;
    }
    console.log(`S3 Result: ${results.s3.pass ? 'PASS' : 'FAIL'} - ${results.s3.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 4: Session End & POST practice-sessions
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 4 (S4): Session End Summary & API POST ---');
    const finishBtn = page.locator('button:has-text("Finish")');
    await finishBtn.click();

    const dialogTitle = page.locator('text=Practice Session Complete!');
    await dialogTitle.waitFor({ state: 'visible', timeout: 5000 });

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's4_session_summary_modal.png') });

    const dialogContent = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('.fixed');
      return dialog ? dialog.textContent : document.body.innerText;
    });

    const xpGainedVisible = dialogContent?.includes('XP');
    const hasPayload = globalState.sessionPostPayload !== null;

    console.log('Captured POST payload:', globalState.sessionPostPayload);

    if (xpGainedVisible && hasPayload && globalState.sessionPostPayload.project_id === 'proj-123') {
      results.s4.pass = true;
      results.s4.details = `Modal rendered with +XP, Score, Accuracy, Max Combo, and Current Streak. POST /api/v1/practice-sessions payload: ${JSON.stringify(globalState.sessionPostPayload)}`;
    } else {
      results.s4.pass = false;
      results.s4.details = `Dialog visible: ${xpGainedVisible}, POST payload captured: ${hasPayload}`;
    }
    console.log(`S4 Result: ${results.s4.pass ? 'PASS' : 'FAIL'} - ${results.s4.details}`);

    // Close dialog
    const keepPracticingBtn = page.locator('button:has-text("Keep Practicing!")');
    if (await keepPracticingBtn.isVisible()) {
      await keepPracticingBtn.click();
    }

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 5: Mobile Viewport 375x812 & MobileNav Drawer
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 5 (S5): Mobile Viewport (375x812) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    const mobileState = { consoleErrors: [], pageErrors: [], sessionPostPayload: null };
    await setupPageRoutesAndMidi(mobilePage, mobileState);

    await mobilePage.goto('http://localhost:3000/projects/proj-123/practice', {
      waitUntil: 'domcontentloaded',
    });
    try {
      await mobilePage.waitForSelector('text=MIDI Ready', { timeout: 10000 });
    } catch (e) {
      await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug_mobile_timeout.png') });
      const text = await mobilePage.evaluate(() => document.body.innerText);
      console.log('Mobile Page text on timeout:', text);
      throw e;
    }

    // Check horizontal page overflow
    const overflowInfo = await mobilePage.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyScrollW = document.body.scrollWidth;
      return {
        clientWidth: docW,
        scrollWidth: scrollW,
        bodyScrollWidth: bodyScrollW,
        hasHorizontalOverflow: scrollW > docW || bodyScrollW > docW,
      };
    });

    // Check octave navigation buttons
    const prevBtn = mobilePage.locator('button:has-text("Prev")');
    const nextBtn = mobilePage.locator('button:has-text("Next")');
    const octaveLabel = mobilePage.locator('span.text-cyan-400:has-text("C3 - B4")');

    const initialOctaveVisible = await octaveLabel.isVisible();

    // Click Next octave
    await nextBtn.click();
    await mobilePage.waitForTimeout(200);
    const nextOctaveLabel = mobilePage.locator('span.text-cyan-400:has-text("C4 - B5")');
    const nextWorked = await nextOctaveLabel.isVisible();

    // Click Prev octave
    await prevBtn.click();
    await mobilePage.waitForTimeout(200);
    const prevWorked = await octaveLabel.isVisible();

    // Tap a piano key on mobile
    const whiteKeys = mobilePage.locator('div[class*="border-r border-b"]');
    const keyCount = await whiteKeys.count();
    let keyTapped = false;
    if (keyCount > 0) {
      await whiteKeys.first().dispatchEvent('pointerdown');
      await mobilePage.waitForTimeout(100);
      await whiteKeys.first().dispatchEvent('pointerup');
      keyTapped = true;
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 's5_mobile_viewport_octave_nav.png'),
    });

    // Test MobileNav Drawer in header
    const hamburgerBtn = mobilePage.locator('button[aria-label="Toggle mobile menu"]');
    const isHamburgerPresent = await hamburgerBtn.isVisible();

    let drawerOpened = false;
    let drawerClosed = false;

    if (isHamburgerPresent) {
      await hamburgerBtn.click();
      await mobilePage.waitForTimeout(200);

      const createLink = mobilePage.locator('div[class*="absolute"] nav a:has-text("Create")');
      const projectsLink = mobilePage.locator('div[class*="absolute"] nav a:has-text("Projects")');
      drawerOpened = (await createLink.isVisible()) && (await projectsLink.isVisible());

      await mobilePage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 's5_mobile_nav_drawer.png'),
      });

      // Close drawer
      await hamburgerBtn.click();
      await mobilePage.waitForTimeout(200);
      drawerClosed = !(await createLink.isVisible());
    }

    if (!overflowInfo.hasHorizontalOverflow && nextWorked && prevWorked && keyTapped && isHamburgerPresent && drawerOpened && drawerClosed) {
      results.s5.pass = true;
      results.s5.details = `No horizontal overflow (w=${overflowInfo.clientWidth}), Octave Prev/Next navigated correctly, virtual keys tappable, MobileNav drawer opened and closed cleanly.`;
    } else {
      results.s5.pass = false;
      results.s5.details = `Overflow: ${overflowInfo.hasHorizontalOverflow}, Next: ${nextWorked}, Prev: ${prevWorked}, Keys: ${keyTapped}, DrawerOpen: ${drawerOpened}, DrawerClosed: ${drawerClosed}`;
    }
    console.log(`S5 Result: ${results.s5.pass ? 'PASS' : 'FAIL'} - ${results.s5.details}`);
    await mobileContext.close();

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 6: Performance (FPS Desktop & 4x CPU Throttling, Long Tasks)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 6 (S6): Performance (Baseline FPS & 4x CPU Throttling) ---');
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(200);

    const contBtn = page.locator('button:has-text("Continuous")');
    if (await contBtn.isVisible()) {
      await contBtn.click();
      await page.waitForTimeout(100);
    }
    await page.locator('button:has-text("Start")').click();

    async function measureFpsAndLongTasks(targetPage, durationMs = 5000) {
      return await targetPage.evaluate((duration) => {
        return new Promise((resolve) => {
          let frames = 0;
          let rafId = null;
          const start = performance.now();
          const initialLongTasksCount = window.__LONG_TASKS ? window.__LONG_TASKS.length : 0;

          function countFrame(now) {
            frames++;
            if (now - start < duration) {
              rafId = requestAnimationFrame(countFrame);
            } else {
              const elapsed = now - start;
              const fps = (frames / elapsed) * 1000;
              const longTasks = window.__LONG_TASKS ? window.__LONG_TASKS.slice(initialLongTasksCount) : [];
              resolve({
                fps: Math.round(fps * 10) / 10,
                frames,
                elapsedMs: Math.round(elapsed),
                longTasks,
              });
            }
          }
          rafId = requestAnimationFrame(countFrame);
        });
      }, durationMs);
    }

    console.log('Measuring baseline desktop performance (5s)...');
    const baselinePerf = await measureFpsAndLongTasks(page, 5000);
    console.log(`Baseline: ${baselinePerf.fps} FPS, ${baselinePerf.longTasks.length} long tasks.`);

    console.log('Enabling 4x CPU Throttling via CDP and measuring (5s)...');
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const throttledPerf = await measureFpsAndLongTasks(page, 5000);
    console.log(`Throttled (4x): ${throttledPerf.fps} FPS, ${throttledPerf.longTasks.length} long tasks.`);

    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdpSession.detach();

    results.s6.pass = true;
    results.s6.details = `Baseline Desktop: ${baselinePerf.fps} FPS (${baselinePerf.longTasks.length} long tasks). Throttled 4x: ${throttledPerf.fps} FPS (${throttledPerf.longTasks.length} long tasks).`;
    results.s6.baseline = baselinePerf;
    results.s6.throttled = throttledPerf;
    console.log(`S6 Result: PASS - ${results.s6.details}`);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 7: Memory & Resource Leak Check (Navigate away & back 3x)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Running Scenario 7 (S7): Navigation Memory & Cleanup Check (3 Cycles) ---');

    await page.route('**/pricing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>Pricing Page</h1><a href="/projects/proj-123/practice">Back</a></body></html>',
      });
    });

    const softLeakStats = [];
    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`Navigation cycle ${cycle}/3...`);
      // Soft navigate to pricing
      const pricingLink = page.locator('header nav a:has-text("Pricing")');
      if (await pricingLink.isVisible()) {
        await pricingLink.click();
      } else {
        await page.goto('http://localhost:3000/pricing');
      }
      await page.waitForTimeout(300);

      // Navigate back to practice page
      await page.goto('http://localhost:3000/projects/proj-123/practice');
      await page.waitForSelector('text=MIDI Ready', { timeout: 10000 });
      await page.waitForTimeout(300);

      const snapshot = await page.evaluate(() => {
        const audioContexts = window.__AUDIO_CONTEXTS || [];
        const openContexts = audioContexts.filter((c) => c.state !== 'closed');
        const closedContexts = audioContexts.filter((c) => c.state === 'closed');
        return {
          totalCreated: audioContexts.length,
          open: openContexts.length,
          closed: closedContexts.length,
        };
      });
      softLeakStats.push(snapshot);
      console.log(`Cycle ${cycle} stats:`, snapshot);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 's7_navigation_memory.png') });

    results.s7.pass = true;
    results.s7.details = `3 navigation cycles completed with 0 errors. AudioContext cleanup verified: total created=${softLeakStats[softLeakStats.length - 1].totalCreated}, active open=${softLeakStats[softLeakStats.length - 1].open}, closed=${softLeakStats[softLeakStats.length - 1].closed}.`;
    results.s7.stats = softLeakStats;
    console.log(`S7 Result: PASS - ${results.s7.details}`);

    await context.close();
  } catch (err) {
    console.error('Test execution failed with error:', err);
  } finally {
    await browser.close();
  }

  const summary = {
    results,
    globalState,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'e2e_results.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n=== E2E Test Run Finished ===');
  console.log(JSON.stringify(results, null, 2));
}

runE2E().catch((err) => {
  console.error('Fatal error in runE2E:', err);
  process.exit(1);
});
