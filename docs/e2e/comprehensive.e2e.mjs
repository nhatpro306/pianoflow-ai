import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(rootDir, 'plugins/virtual-pianist/node_modules/playwright'));

const SCREENSHOTS_DIR = path.join(rootDir, 'docs/e2e/comprehensive');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Generate realistic musical fixture notes (Beethoven Fur Elise motif + harmony)
function generateFixtureNotes() {
  const notes = [];
  const melodyPitches = [76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75];
  const bassPitches =   [48, 52, 55, 48, 45, 48, 53, 48, 45, 57, 60, 45, 40, 52, 56, 40, 45, 52, 57, 45];

  let id = 1;
  for (let i = 0; i < melodyPitches.length; i++) {
    const time = 0.5 + i * 0.8;
    // Right hand note (Melody)
    notes.push({
      id: id++,
      pitch: melodyPitches[i],
      name: `RH_${melodyPitches[i]}`,
      velocity: 85,
      start: Number(time.toFixed(2)),
      end: Number((time + 0.6).toFixed(2)),
      duration: 0.6,
      track: 1,
      hand: 'R',
    });
    // Left hand note (Bass / Harmony)
    notes.push({
      id: id++,
      pitch: bassPitches[i],
      name: `LH_${bassPitches[i]}`,
      velocity: 70,
      start: Number(time.toFixed(2)),
      end: Number((time + 0.75).toFixed(2)),
      duration: 0.75,
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
  duration_sec: 20,
  time_signature: '3/8',
  notes: fixtureNotes,
};

const mockProjects = [
  {
    id: 'proj-123',
    name: 'Beethoven - Für Elise',
    status: 'ready',
    analysis_summary: {
      bpm: 120,
      duration_sec: 145,
      time_signature: '3/8',
      track_count: 2,
      note_count: 842,
      pitch_min: 21,
      pitch_max: 108,
      hand_split: 'auto',
    },
    active_jobs: [],
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'proj-456',
    name: 'Chopin - Nocturne Op. 9 No. 2',
    status: 'ready',
    analysis_summary: {
      bpm: 80,
      duration_sec: 260,
      time_signature: '12/8',
      track_count: 2,
      note_count: 1250,
      pitch_min: 24,
      pitch_max: 100,
      hand_split: 'auto',
    },
    active_jobs: [],
    created_at: '2026-10-02T15:30:00Z',
  },
];

const mockSettings = {
  resolution: '1080p',
  fps: 60,
  speed_multiplier: 1.0,
  piano_sound: 'acoustic_grand',
  volume: 0.8,
  reverb: 'medium',
  difficulty: 'original',
  show_note_names: true,
  show_keyboard: true,
  theme_preset: 'synthesia',
  colors: {
    right_hand: '#38bdf8',
    left_hand: '#34d399',
    key_highlight: '#38bdf8',
    glow: '#0284c7',
    hit_effect: '#ffffff',
    background: '#09090b',
  },
  glow_intensity: 0.5,
  note_fall_speed: 1.0,
  keyboard_size: 1.0,
  version: 1,
};

const mockSession = {
  access_token: 'mock-e2e-jwt-token-123',
  refresh_token: 'mock-e2e-refresh-token-123',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: 'user-e2e-777',
    email: 'virtuoso@pianoflow.ai',
    app_metadata: {},
    user_metadata: { name: 'Virtuoso Pianist' },
    aud: 'authenticated',
    role: 'authenticated',
  },
};

function getSupabaseCookieValue(session) {
  return 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
}

async function setupPageMocksAndTracking(context, page, state, options = { authenticated: true }) {
  if (options.authenticated) {
    await context.addCookies([
      {
        name: 'sb-kcznjjnhtajwumhvbasq-auth-token',
        value: getSupabaseCookieValue(mockSession),
        domain: 'localhost',
        path: '/',
      },
    ]);
  }

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      if (text.includes('webpack') || text.includes('hot-update') || text.includes('GenerateSW') || text.includes('favicon')) return;
      state.consoleErrors.push({ url: page.url(), text });
      console.log(`  [CONSOLE ERROR @ ${page.url()}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    state.pageErrors.push({ url: page.url(), message: msg });
    console.log(`  [PAGE EXCEPTION @ ${page.url()}] ${msg}`);
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    // Ignore cancelled requests due to page navigation, prefetches or intentional aborts
    if (url.includes('/sw.js') || url.includes('/workbox') || url.includes('webpack') || url.includes('_rsc')) return;
    state.failedRequests.push({
      url,
      failure: req.failure()?.errorText || 'Unknown error',
    });
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && !url.includes('/non-existent-page-test-404') && !url.includes('favicon')) {
      state.httpErrors.push({ url, status });
    }
  });

  // Client init script: Mocks Web MIDI, Web Audio, and Supabase auth token
  await page.addInitScript(({ authenticated, session }) => {
    // Disable Service Worker in test environment
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

    // Mock Web MIDI Access
    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = 'mock-yamaha-piano';
      name = 'Yamaha Clavinova CLP-745';
      manufacturer = 'Yamaha';
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

    if (authenticated) {
      try {
        localStorage.setItem('sb-kcznjjnhtajwumhvbasq-auth-token', JSON.stringify(session));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('sb-kcznjjnhtajwumhvbasq-auth-token');
      } catch (e) {}
    }
  }, { authenticated: options.authenticated, session: mockSession });

  // Handle legacy /upload link prefetch to prevent 404
  await page.route('**/upload**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Upload redirect</body></html>',
    });
  });

  // Route interception for API requests
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
    } else if (url.includes('/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSettings),
      });
    } else if (url.includes('/outputs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ video: null, sheet: null, audio: null }),
      });
    } else if (url.includes('/jobs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else if (url.includes('/practice-sessions') && method === 'POST') {
      const postData = JSON.parse(req.postData() || '{}');
      state.sessionPostPayload = postData;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-e2e-123',
          project_id: postData.project_id || 'proj-123',
          score: postData.score || 950,
          accuracy_percent: postData.accuracy_percent || 95,
          xp_gained: 85,
          level_up: false,
          current_level: 3,
          total_xp: 535,
          current_streak: 5,
        }),
      });
    } else if (url.includes('/user/progress')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: 'user-e2e-777',
          total_xp: 450,
          level: 3,
          xp_to_next_level: 50,
          current_streak_days: 4,
          highest_streak_days: 7,
          last_practice_date: '2026-10-02',
        }),
      });
    } else if (url.includes('/stripe/checkout') || url.includes('/billing/create-checkout-session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/test_session_id' }),
      });
    } else if (url.endsWith('/projects') || url.includes('/projects?')) {
      if (method === 'POST') {
        const postData = JSON.parse(req.postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'proj-new-999',
            name: postData.name || 'New Project',
            status: 'created',
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: mockProjects }),
        });
      }
    } else if (url.includes('/projects/proj-123')) {
      if (method === 'DELETE') {
        await route.fulfill({
          status: 204,
          body: '',
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProjects[0]),
        });
      }
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });

  // Mock soundfont mp3 fetches to guarantee zero network lag
  await page.route('**/*.mp3', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from([]),
    });
  });
}

// Measure Navigation Timings
async function getNavigationTimings(page) {
  return await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0];
    if (!timing) return null;
    return {
      dnsTimeMs: Math.round(timing.domainLookupEnd - timing.domainLookupStart),
      tcpTimeMs: Math.round(timing.connectEnd - timing.connectStart),
      ttfbMs: Math.round(timing.responseStart - timing.requestStart),
      domContentLoadedMs: Math.round(timing.domContentLoadedEventEnd - timing.startTime),
      loadEventMs: Math.round(timing.loadEventEnd - timing.startTime),
    };
  });
}

// Measure FPS on active canvas
async function measureCanvasFps(page, framesToMeasure = 60) {
  return await page.evaluate((frameCount) => {
    return new Promise((resolve) => {
      let count = 0;
      let startTime = performance.now();
      function step(now) {
        count++;
        if (count >= frameCount) {
          const elapsed = (now - startTime) / 1000;
          const fps = Math.round(count / elapsed);
          resolve({ fps, durationSec: Number(elapsed.toFixed(2)), frameCount });
        } else {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    });
  }, framesToMeasure);
}

async function runComprehensiveE2E() {
  console.log('===============================================================');
  console.log('       PianoFlow AI - Comprehensive Web E2E Verification        ');
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });

  const state = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    sessionPostPayload: null,
  };

  const report = {
    timestamp: new Date().toISOString(),
    viewports: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 },
    },
    routes: {},
    practiceMetrics: {},
    timings: {},
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
    },
  };

  const recordResult = (testName, pass, details = {}) => {
    report.summary.totalTests++;
    if (pass) {
      report.summary.passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      report.summary.failedTests++;
      console.error(`[FAIL] ${testName}`, details);
    }
    report.routes[testName] = { pass, ...details };
  };

  try {
    // =========================================================================
    // 1. LANDING / HOME PAGE (/)
    // =========================================================================
    console.log('\n--- 1. Testing Route: Landing Page (/) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: false });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/ (Desktop)'] = timings;

      await page.waitForSelector('text=PianoFlow', { timeout: 8000 });
      const heroText = await page.textContent('h1');
      const hasCta1 = await page.isVisible('text=Upload audio or MIDI');
      const hasCta2 = await page.isVisible('text=My Projects');
      const featureCardsCount = await page.locator('.sm\\:grid-cols-2 > div').count();

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_desktop.png') });

      recordResult('Landing_Page_Desktop', hasCta1 && hasCta2 && featureCardsCount === 4, {
        heroText: heroText?.trim(),
        featuresCount: featureCardsCount,
        timings,
        durationMs: Date.now() - startTime,
      });

      // 1B. Tablet (768x1024)
      await page.setViewportSize(report.viewports.tablet);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_tablet.png') });
      recordResult('Landing_Page_Tablet', true, { viewport: '768x1024' });

      // 1C. Mobile (375x667) & Interactive Mobile Drawer
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_mobile.png') });

      const burgerButton = page.locator('button[aria-label="Toggle mobile menu"]');
      const isBurgerVisible = await burgerButton.isVisible();
      const initialExpanded = await burgerButton.getAttribute('aria-expanded');

      // Click to open drawer
      await burgerButton.click();
      await page.waitForTimeout(200);
      const openExpanded = await burgerButton.getAttribute('aria-expanded');
      const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
      const isDrawerVisible = await mobileNav.isVisible();
      const hasProjectsLink = await mobileNav.locator('text=Projects').isVisible();
      const hasPricingLink = await mobileNav.locator('text=Pricing').isVisible();

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_mobile_menu_open.png') });

      // Close drawer
      await burgerButton.click();
      await page.waitForTimeout(200);
      const closedExpanded = await burgerButton.getAttribute('aria-expanded');

      recordResult(
        'Landing_Page_Mobile_Drawer',
        isBurgerVisible && initialExpanded === 'false' && openExpanded === 'true' && isDrawerVisible && hasProjectsLink && hasPricingLink && closedExpanded === 'false',
        {
          initialExpanded,
          openExpanded,
          closedExpanded,
          isDrawerVisible,
        }
      );

      await context.close();
    }

    // =========================================================================
    // 2. PRICING PAGE (/pricing)
    // =========================================================================
    console.log('\n--- 2. Testing Route: Pricing Page (/pricing) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/pricing', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/pricing (Desktop)'] = timings;

      await page.waitForSelector('text=Simple, transparent pricing', { timeout: 8000 });
      const hasFreeTier = await page.isVisible('text=Free');
      const hasProTier = await page.isVisible('text=Pro');
      const hasProPrice = await page.isVisible('text=$10');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_pricing_desktop.png') });

      // Mobile view
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_pricing_mobile.png') });

      recordResult('Pricing_Page_Desktop_And_Mobile', hasFreeTier && hasProTier && hasProPrice, {
        timings,
        durationMs: Date.now() - startTime,
      });

      await context.close();
    }

    // =========================================================================
    // 3. AUTH / LOGIN PAGE (/login)
    // =========================================================================
    console.log('\n--- 3. Testing Route: Auth / Login (/login) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: false });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/login (Desktop)'] = timings;

      await page.waitForSelector('text=Sign in to PianoFlow', { timeout: 8000 });
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitBtn = page.locator('button[type="submit"]');

      const inputsExist = (await emailInput.count() === 1) && (await passwordInput.count() === 1);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_login_desktop.png') });

      // Test toggle mode to "Create your account"
      const toggleToSignup = page.locator('p button:has-text("Sign up")');
      let signupToggled = false;
      if (await toggleToSignup.isVisible()) {
        await toggleToSignup.click();
        await page.waitForTimeout(200);
        signupToggled = await page.isVisible('text=Create your account');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_signup_mode.png') });
        // Toggle back to login mode
        const toggleToLogin = page.locator('p button:has-text("Sign in")');
        await toggleToLogin.click();
        await page.waitForTimeout(200);
      }

      // Mobile view
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_login_mobile.png') });

      recordResult('Auth_Login_Page', inputsExist && (await submitBtn.isVisible()), {
        signupToggled,
        timings,
        durationMs: Date.now() - startTime,
      });

      await context.close();
    }

    // =========================================================================
    // 4. PROJECTS DASHBOARD (/projects)
    // =========================================================================
    console.log('\n--- 4. Testing Route: Projects Dashboard (/projects) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/projects', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/projects (Desktop)'] = timings;

      await page.waitForSelector('text=Projects', { timeout: 8000 });
      await page.waitForSelector('text=Beethoven - Für Elise', { timeout: 8000 });

      // Verify Level Progress and Streak Badges
      const hasXpText = await page.isVisible('text=450 XP');
      const hasNextLevel = await page.isVisible('text=50 to next');
      const hasStreak = await page.isVisible('text=4');
      const hasNewProjectBtn = await page.isVisible('text=+ New project');

      // Verify Project cards loaded
      const card1 = await page.isVisible('text=Beethoven - Für Elise');
      const card2 = await page.isVisible('text=Chopin - Nocturne Op. 9 No. 2');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_projects_desktop.png') });

      // Tablet View
      await page.setViewportSize(report.viewports.tablet);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_projects_tablet.png') });

      // Mobile View
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_projects_mobile.png') });

      // Interactive test: Delete project modal dialog
      await page.setViewportSize(report.viewports.desktop);
      const deleteBtn = page.locator('button:has-text("Delete")').first();
      await deleteBtn.click();
      await page.waitForTimeout(300);

      const hasDeleteModal = await page.isVisible('text=Delete Project?');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_projects_delete_modal.png') });

      // Cancel deletion
      await page.locator('button:has-text("Cancel")').click();
      await page.waitForTimeout(200);
      const modalClosed = !(await page.isVisible('text=Delete Project?'));

      recordResult('Projects_Dashboard', hasXpText && hasNextLevel && hasStreak && card1 && card2 && hasDeleteModal && modalClosed, {
        hasXpText,
        hasNextLevel,
        hasStreak,
        hasNewProjectBtn,
        card1,
        card2,
        hasDeleteModal,
        modalClosed,
        timings,
        durationMs: Date.now() - startTime,
      });

      await context.close();
    }

    // =========================================================================
    // 5. CREATE / UPLOAD PAGE (/create)
    // =========================================================================
    console.log('\n--- 5. Testing Route: Create / Upload (/create) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/create', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/create (Desktop)'] = timings;

      await page.waitForSelector('text=Create Project', { timeout: 8000 });
      const hasDropzone = await page.isVisible('div[aria-label="Audio file drop zone"]');
      const hasLinkInput = await page.isVisible('input[type="url"]');
      const hasRightsCheckbox = await page.isVisible('text=I own this content or have permission to transcribe it.');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_create_desktop.png') });

      // Interactive: toggle rights checkbox
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.check();
        const isChecked = await checkbox.isChecked();
        await page.waitForTimeout(100);
      }

      // Mobile View
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_create_mobile.png') });

      recordResult('Create_Upload_Page', hasDropzone && hasLinkInput && hasRightsCheckbox, {
        hasDropzone,
        hasLinkInput,
        hasRightsCheckbox,
        timings,
        durationMs: Date.now() - startTime,
      });

      await context.close();
    }

    // =========================================================================
    // 6. PROJECT EDITOR (/projects/proj-123)
    // =========================================================================
    console.log('\n--- 6. Testing Route: Project Editor (/projects/proj-123) ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/projects/proj-123', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/projects/proj-123 (Desktop)'] = timings;

      await page.waitForSelector('text=Beethoven - Für Elise', { timeout: 8000 });
      await page.waitForSelector('text=120 BPM', { timeout: 8000 });

      const hasStartPracticeBtn = await page.isVisible('text=Start Practice (MIDI)');
      const hasSettingsPanel = await page.isVisible('text=Beginner version');
      const hasFallingNotesPreview = await page.locator('canvas').isVisible();

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_editor_desktop.png') });

      // Mobile View
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_editor_mobile.png') });

      recordResult('Project_Editor', hasStartPracticeBtn && hasSettingsPanel && hasFallingNotesPreview, {
        hasStartPracticeBtn,
        hasSettingsPanel,
        hasFallingNotesPreview,
        timings,
        durationMs: Date.now() - startTime,
      });

      await context.close();
    }

    // =========================================================================
    // 7. PRACTICE MODE (/projects/proj-123/practice)
    // =========================================================================
    console.log('\n--- 7. Testing Route: Practice Mode (/projects/proj-123/practice) ---');
    {
      // 7A. Desktop (1920x1080)
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/projects/proj-123/practice', { waitUntil: 'domcontentloaded' });
      const timings = await getNavigationTimings(page);
      report.timings['/projects/proj-123/practice (Desktop)'] = timings;

      // 1. Verify MIDI Ready status
      await page.waitForSelector('text=MIDI Ready', { timeout: 10000 });
      const hasMidiReady = await page.isVisible('text=MIDI Ready');

      // 2. Verify Canvas rendering
      const canvas = page.locator('canvas');
      const isCanvasVisible = await canvas.isVisible();

      // 3. Verify Action Controls: Start, Reset, Continuous (toggle to Wait Mode), Finish
      const startBtn = page.locator('button:has-text("Start")');
      const resetBtn = page.locator('button:has-text("Reset")');
      const toggleModeBtn = page.locator('button:has-text("Continuous")');
      const finishBtn = page.locator('button:has-text("Finish")');

      const controlsVisible =
        (await startBtn.isVisible()) &&
        (await resetBtn.isVisible()) &&
        (await toggleModeBtn.isVisible()) &&
        (await finishBtn.isVisible());

      // 4. Test Play/Pause loop
      await startBtn.click();
      await page.waitForTimeout(500);
      const isPauseVisible = await page.isVisible('button:has-text("Pause")');

      // Measure Desktop Canvas FPS while playing
      const desktopFps = await measureCanvasFps(page, 75);
      report.practiceMetrics.desktopFps = desktopFps;
      console.log(`  Practice Mode Desktop Canvas FPS: ${desktopFps.fps} FPS (${desktopFps.frameCount} frames in ${desktopFps.durationSec}s)`);

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_desktop_running.png') });

      // Pause playback
      await page.locator('button:has-text("Pause")').click();
      await page.waitForTimeout(300);
      const isStartRestored = await page.isVisible('button:has-text("Start")');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_desktop_paused.png') });

      // 5. Test Mode Toggle (Continuous <-> Wait Mode)
      await toggleModeBtn.click();
      await page.waitForTimeout(200);
      const isWaitModeTextVisible = await page.isVisible('button:has-text("Wait Mode")');
      await page.locator('button:has-text("Wait Mode")').click();
      await page.waitForTimeout(200);
      const isContinuousRestored = await page.isVisible('button:has-text("Continuous")');

      // 6. Test Interactive Keyboard Key Press (Mouse / Pointer)
      const pianoKeys = page.locator('.touch-none');
      const keyCount = await pianoKeys.count();
      const firstKey = pianoKeys.nth(10);
      await firstKey.dispatchEvent('pointerdown');
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_key_pressed.png') });

      // Check AudioContext audio engine activity
      const audioContextsCount = await page.evaluate(() => window.__AUDIO_CONTEXTS ? window.__AUDIO_CONTEXTS.length : 0);
      await firstKey.dispatchEvent('pointerup');
      await page.waitForTimeout(200);

      // 7. Test Finish & Practice Complete Modal Dialog
      await finishBtn.click();
      await page.waitForSelector('text=Practice Session Complete!', { timeout: 6000 });
      const hasCompleteModal = await page.isVisible('text=Practice Session Complete!');
      const hasXpGained = await page.isVisible('text=+85 XP');
      const hasScore = await page.isVisible('text=Score');
      const hasStreakModal = await page.isVisible('text=Current Streak');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_finish_modal.png') });

      // Dismiss modal
      await page.locator('button:has-text("Keep Practicing!")').click();
      await page.waitForTimeout(200);
      const modalDismissed = !(await page.isVisible('text=Practice Session Complete!'));

      recordResult(
        'Practice_Mode_Desktop_Interactive',
        hasMidiReady && isCanvasVisible && controlsVisible && isPauseVisible && isStartRestored && isWaitModeTextVisible && isContinuousRestored && hasCompleteModal && modalDismissed,
        {
          hasMidiReady,
          isCanvasVisible,
          controlsVisible,
          keyCount,
          audioContextsCount,
          desktopFps,
          hasCompleteModal,
          hasXpGained,
          modalDismissed,
          timings,
          durationMs: Date.now() - startTime,
        }
      );

      // 7B. Tablet Viewport (768x1024)
      await page.setViewportSize(report.viewports.tablet);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_tablet.png') });
      recordResult('Practice_Mode_Tablet', true, { viewport: '768x1024' });

      // 7C. Mobile Viewport (375x667) & Octave Navigation
      await page.setViewportSize(report.viewports.mobile);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_mobile.png') });

      // Verify Mobile Octave Controls
      const octaveLabel = page.locator('.font-semibold.text-cyan-400');
      const initialOctaveText = (await octaveLabel.textContent())?.trim();
      const nextOctaveBtn = page.locator('button:has-text("Next")');
      const prevOctaveBtn = page.locator('button:has-text("Prev")');

      // Click Next Octave
      await nextOctaveBtn.click();
      await page.waitForTimeout(200);
      const shiftedOctaveText = (await octaveLabel.textContent())?.trim();

      // Click Prev Octave
      await prevOctaveBtn.click();
      await page.waitForTimeout(200);
      const restoredOctaveText = (await octaveLabel.textContent())?.trim();

      // Test Full 88 Keys Toggle
      const fullToggleBtn = page.locator('button[title*="view"]');
      let full88Toggled = false;
      if (await fullToggleBtn.isVisible()) {
        await fullToggleBtn.click();
        await page.waitForTimeout(200);
        full88Toggled = await page.isVisible('text=Full 88 Keys (Scrollable)');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_practice_mobile_octave_nav.png') });
        // Toggle back to zoomed view
        await fullToggleBtn.click();
        await page.waitForTimeout(200);
      }

      // Measure Mobile Canvas FPS
      await page.locator('button:has-text("Start")').click();
      await page.waitForTimeout(300);
      const mobileFps = await measureCanvasFps(page, 60);
      report.practiceMetrics.mobileFps = mobileFps;
      console.log(`  Practice Mode Mobile Canvas FPS: ${mobileFps.fps} FPS (${mobileFps.frameCount} frames in ${mobileFps.durationSec}s)`);
      await page.locator('button:has-text("Pause")').click();

      recordResult(
        'Practice_Mode_Mobile_Octave_Controls',
        initialOctaveText === 'C3 - B4 (Mid)' && shiftedOctaveText === 'C4 - B5 (Mid/High)' && restoredOctaveText === 'C3 - B4 (Mid)' && full88Toggled,
        {
          initialOctaveText,
          shiftedOctaveText,
          restoredOctaveText,
          full88Toggled,
          mobileFps,
        }
      );

      await context.close();
    }

    // =========================================================================
    // 8. SPECIAL & UTILITY ROUTES (/project missing id, /404)
    // =========================================================================
    console.log('\n--- 8. Testing Utility Routes: Missing ID (/project) & 404 ---');
    {
      const context = await browser.newContext({ viewport: report.viewports.desktop });
      const page = await context.newPage();
      await setupPageMocksAndTracking(context, page, state, { authenticated: true });

      // 8A. Legacy /project without query parameter
      await page.goto('http://localhost:3000/project', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Project id is missing.', { timeout: 6000 });
      const hasMissingIdPrompt = await page.isVisible('text=Project id is missing.');
      const hasBackLink = await page.isVisible('text=Back to projects');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_legacy_project_redirect.png') });

      recordResult('Legacy_Project_No_ID', hasMissingIdPrompt && hasBackLink, {
        hasMissingIdPrompt,
        hasBackLink,
      });

      // 8B. 404 Route
      await page.goto('http://localhost:3000/non-existent-page-test-404', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=404', { timeout: 6000 });
      const has404 = await page.isVisible('text=404');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_not_found.png') });

      recordResult('Not_Found_404_Page', has404, { has404 });

      await context.close();
    }

  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    recordResult('Fatal_Execution_Error', false, { error: String(err) });
  } finally {
    await browser.close();
  }

  // Record integrity metrics
  report.integrity = {
    pageErrorsCount: state.pageErrors.length,
    pageErrors: state.pageErrors,
    consoleErrorsCount: state.consoleErrors.length,
    consoleErrors: state.consoleErrors,
    failedRequestsCount: state.failedRequests.length,
    failedRequests: state.failedRequests,
    httpErrorsCount: state.httpErrors.length,
    httpErrors: state.httpErrors,
    zeroUnhandledExceptions: state.pageErrors.length === 0,
    zeroBrokenAssets: state.failedRequests.length === 0,
  };

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'results.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${report.summary.passedTests}/${report.summary.totalTests} Passed | ${report.summary.failedTests} Failed`);
  console.log(`Console Errors: ${state.consoleErrors.length} | Page Exceptions: ${state.pageErrors.length}`);
  console.log(`Failed Network Requests: ${state.failedRequests.length} | HTTP Errors: ${state.httpErrors.length}`);
  console.log('Screenshots saved to docs/e2e/comprehensive/');
  console.log('===============================================================\n');

  return report;
}

runComprehensiveE2E().then((rep) => {
  if (rep.summary.failedTests > 0 || rep.integrity.pageErrorsCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
