/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/live_browser_check');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function createSyntheticWavBuffer(): Buffer {
  const sampleRate = 44100;
  const numChannels = 1;
  const numFrames = 44100 * 2; // 2 seconds
  const buffer = Buffer.alloc(44 + numFrames * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numFrames * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buffer.writeUInt16LE(numChannels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numFrames * 2, 40);
  for (let i = 0; i < numFrames; i++) {
    const val = Math.round(Math.sin((i / 44100) * 440 * 2 * Math.PI) * 16000);
    buffer.writeInt16LE(val, 44 + i * 2);
  }
  return buffer;
}

function getMockProjects() {
  return [
    {
      id: 'proj-1',
      name: 'Beethoven - Für Elise',
      status: 'ready',
      analysis_summary: {
        bpm: 132,
        duration_sec: 165,
        time_signature: '3/8',
        track_count: 2,
        note_count: 842,
        pitch_min: 45,
        pitch_max: 89,
        hand_split: 'auto',
      },
      active_jobs: [],
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'proj-2',
      name: 'Chopin - Nocturne Op. 9 No. 2',
      status: 'ready',
      analysis_summary: {
        bpm: 64,
        duration_sec: 270,
        time_signature: '12/8',
        track_count: 2,
        note_count: 1200,
        pitch_min: 36,
        pitch_max: 96,
        hand_split: 'auto',
      },
      active_jobs: [],
      created_at: '2026-10-03T12:00:00Z',
    },
    {
      id: 'proj-3',
      name: 'Bach - Minuet in G Major',
      status: 'parsing',
      analysis_summary: {
        bpm: 110,
        duration_sec: 90,
        time_signature: '3/4',
        track_count: 2,
        note_count: 320,
        pitch_min: 43,
        pitch_max: 79,
        hand_split: 'auto',
      },
      active_jobs: [],
      created_at: '2026-10-04T08:00:00Z',
    },
    {
      id: 'proj-4',
      name: 'Debussy - Clair de Lune (Corrupted)',
      status: 'failed',
      analysis_summary: null,
      active_jobs: [],
      created_at: '2026-09-25T14:00:00Z',
    },
  ];
}

const mockUserProgress = {
  current_streak_days: 5,
  level: 4,
  total_xp: 520,
  xp_to_next_level: 800,
};

async function setupGlobalMocks(page: any, customProjects?: any[]) {
  const projects = customProjects ?? getMockProjects();

  await page.addInitScript(() => {
    // 1. Web MIDI Mock
    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = 'mock-piano-1';
      name = 'Virtual AI Piano';
      manufacturer = 'PianoFlow';
      state = 'connected';
      connection = 'open';
      onmidimessage = null;
    }

    const mockInput = new MockMIDIInput();
    const mockAccess = new MockMIDIAccess();
    mockAccess.inputs.set(mockInput.id, mockInput);

    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;

    // 2. Comprehensive Web Audio Mock with all AudioParam & Filter methods
    class MockAudioContext {
      state = 'running';
      destination = { connect: () => {}, disconnect: () => {} };

      get currentTime() {
        return performance.now() / 1000;
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: {
            value: 440,
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            cancelScheduledValues: () => {},
          },
          detune: { value: 0, setValueAtTime: () => {}, cancelScheduledValues: () => {} },
          connect: () => {},
          disconnect: () => {},
          start: () => {},
          stop: () => {},
        };
      }

      createGain() {
        return {
          gain: {
            value: 1,
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            cancelScheduledValues: () => {},
          },
          connect: () => {},
          disconnect: () => {},
        };
      }

      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: {
            value: 1000,
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            cancelScheduledValues: () => {},
          },
          Q: { value: 1, setValueAtTime: () => {}, cancelScheduledValues: () => {} },
          gain: { value: 0, setValueAtTime: () => {}, cancelScheduledValues: () => {} },
          connect: () => {},
          disconnect: () => {},
        };
      }

      createConvolver() {
        return {
          buffer: null,
          connect: () => {},
          disconnect: () => {},
        };
      }

      createBuffer(numChannels: number, length: number, sampleRate: number) {
        return {
          duration: length / sampleRate,
          length,
          sampleRate,
          numberOfChannels: numChannels,
          getChannelData: () => new Float32Array(length),
        };
      }

      createBufferSource() {
        const src: any = {
          buffer: null,
          connect: () => {},
          disconnect: () => {},
          start: () => {},
          stop: () => {
            if (src.onended) src.onended();
          },
          onended: null,
        };
        return src;
      }

      createAnalyser() {
        return {
          fftSize: 2048,
          frequencyBinCount: 1024,
          minDecibels: -100,
          maxDecibels: -30,
          smoothingTimeConstant: 0.8,
          getByteFrequencyData: () => {},
          getFloatFrequencyData: () => {},
          getByteTimeDomainData: () => {},
          getFloatTimeDomainData: () => {},
          connect: () => {},
          disconnect: () => {},
        };
      }

      createDynamicsCompressor() {
        return {
          threshold: { value: -24 },
          knee: { value: 30 },
          ratio: { value: 12 },
          attack: { value: 0.003 },
          release: { value: 0.25 },
          connect: () => {},
          disconnect: () => {},
        };
      }

      async decodeAudioData() {
        const data = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
          data[i] = Math.sin(i / 10) * 0.7;
        }
        return {
          duration: 3.5,
          sampleRate: 44100,
          numberOfChannels: 2,
          length: 44100 * 3.5,
          getChannelData: () => data,
        };
      }

      createStereoPanner() {
        return {
          pan: { value: 0 },
          connect: () => {},
          disconnect: () => {},
        };
      }

      async resume() {
        this.state = 'running';
      }

      async close() {
        this.state = 'closed';
      }
    }

    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;

    // 3. Supabase Auth Mock
    const mockUser = {
      id: 'mock-user-123',
      email: 'pianist@pianoflow.ai',
      app_metadata: {},
      user_metadata: { name: 'Test Pianist' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    const mockSession = {
      access_token: 'mock-access-token-12345',
      token_type: 'bearer',
      user: mockUser,
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
    };

    (window as any).__MOCK_SUPABASE_CLIENT__ = {
      auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        onAuthStateChange: (cb: any) => {
          setTimeout(() => cb('SIGNED_IN', mockSession), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
        signUp: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
      },
    };

    // 4. Mock EventSource & ServiceWorker
    (window as any).EventSource = class {
      addEventListener() {}
      removeEventListener() {}
      close() {}
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = async () => ({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as any);
    }
  });

  // Intercept background network traffic & CDN audio assets to fail fast cleanly
  await page.route('**/sw.js', (route: any) => route.abort());
  await page.route('**/workbox-*.js', (route: any) => route.abort());
  await page.route('**/_next/webpack-hmr', (route: any) => route.abort());
  await page.route('**/_next/static/webpack/**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/*smpldsnds.github.io/**', (route: any) => route.abort());
  await page.route('**/*splendid*/**', (route: any) => route.abort());
  await page.route('**/*soundfont*/**', (route: any) => route.abort());

  // API Project Mocks
  await page.route('**/api/v1/projects*', async (route: any) => {
    const url = route.request().url();
    if (url.includes('/outputs') || url.includes('/jobs')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: projects }),
      });
    }
  });

  await page.route('**/api/projects*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: projects }),
    });
  });

  await page.route('**/api/v1/user/progress*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserProgress),
    });
  });
}

test.describe('PianoFlow AI — Comprehensive Live Browser Inspection', () => {
  let uncaughtErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    uncaughtErrors = [];
    page.on('pageerror', (err) => {
      uncaughtErrors.push(`[PageError] ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network aborts from mocked service worker / webpack routes / smplr sample fetch
        if (
          !text.includes('Failed to load resource') &&
          !text.includes('net::ERR_FAILED') &&
          !text.includes('sample load timeout')
        ) {
          uncaughtErrors.push(`[ConsoleError] ${text}`);
        }
      }
    });

    await setupGlobalMocks(page);
  });

  test.afterEach(() => {
    expect(uncaughtErrors).toEqual([]);
  });

  test('WORKFLOW A: Landing Page (/) Navigation & Hero CTA Exploration', async ({ page }) => {
    // 1. Navigate to /
    await page.goto('/');

    // 2. Verify page title and hero heading
    await expect(page).toHaveTitle(/PianoFlow AI/);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('PianoFlow');
    await expect(heroHeading).toContainText('AI');

    // 3. Verify hero CTA buttons
    const demoCta = page.locator('button, a').filter({ hasText: 'Explore Demo Library ✨' }).first();
    await expect(demoCta).toBeVisible();

    const startPracticingCta = page.locator('button, a').filter({ hasText: /Upload audio or MIDI|Start Practicing Free/ }).first();
    await expect(startPracticingCta).toBeVisible();

    // 4. Capture screenshot: 01_landing_hero.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_landing_hero.png'),
      fullPage: true,
    });

    // 5. Click "Explore Demo Library ✨" and verify clean navigation to /demo
    await demoCta.click();
    await expect(page).toHaveURL(/\/demo/);
    await expect(page.locator('h1', { hasText: 'Interactive Classical Library Showcase' })).toBeVisible();
  });

  test('WORKFLOW B: Classical Demo Showcase & Practice Studio (/demo)', async ({ page }) => {
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/demo/);

    // 1. Verify 4 classical demo songs are present
    const furEliseCard = page.locator('[data-testid="song-card-fur-elise"]');
    const clairDeLuneCard = page.locator('[data-testid="song-card-clair-de-lune"]');
    const gymnopedieCard = page.locator('[data-testid="song-card-gymnopedie-1"]');
    const canonCard = page.locator('[data-testid="song-card-canon-in-d"]');

    await expect(furEliseCard).toBeVisible();
    await expect(clairDeLuneCard).toBeVisible();
    await expect(gymnopedieCard).toBeVisible();
    await expect(canonCard).toBeVisible();

    // Initial default: Für Elise (48 notes)
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('48 notes');

    // 2. Click each song in the song picker strip and verify active song metadata and note count
    // Clair de Lune
    await clairDeLuneCard.click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('42 notes');
    await expect(page.locator('text=Claude Debussy').first()).toBeVisible();
    await expect(page.locator('text=50 BPM').first()).toBeVisible();

    // Gymnopédie No. 1
    await gymnopedieCard.click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('38 notes');
    await expect(page.locator('text=Erik Satie').first()).toBeVisible();
    await expect(page.locator('text=65 BPM').first()).toBeVisible();

    // Canon in D
    await canonCard.click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('44 notes');
    await expect(page.locator('text=Johann Pachelbel').first()).toBeVisible();
    await expect(page.locator('text=75 BPM').first()).toBeVisible();

    // Switch back to Für Elise for detailed feature verification
    await furEliseCard.click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('48 notes');

    // 3. Test Dynamic Difficulty Selector (Original -> Easy -> Very Easy -> Original)
    const easyOption = page.locator('[data-testid="difficulty-option-easy"]');
    const veryEasyOption = page.locator('[data-testid="difficulty-option-very_easy"]');
    const originalOption = page.locator('[data-testid="difficulty-option-original"]');

    await easyOption.click();
    await expect(easyOption).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('28 notes');
    await expect(page.locator('[data-testid="active-song-voicing-status"]')).toHaveText('Easy (-42%)');

    // Capture screenshot: 03_demo_difficulty_beginner.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_demo_difficulty_beginner.png'),
      fullPage: true,
    });

    await veryEasyOption.click();
    await expect(veryEasyOption).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('18 notes');
    await expect(page.locator('[data-testid="active-song-voicing-status"]')).toHaveText('Very Easy (-63%)');

    // Revert to Original
    await originalOption.click();
    await expect(originalOption).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('48 notes');

    // 4. Test Mode 1: Falling Notes Visualizer
    await page.locator('[data-testid="tab-visualizer"]').click();
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const seekScrubber = page.locator('input[aria-label="Seek preview"]');
    await expect(seekScrubber).toBeVisible();

    const playBtn = page.locator('button', { hasText: 'Play' }).first();
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // Verify playhead begins moving / button flips to Pause (allow up to 8s for synth fallback/load)
    const pauseBtn = page.locator('button', { hasText: 'Pause' }).first();
    await expect(pauseBtn).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(400);

    // Pause playback
    await pauseBtn.click();
    await expect(page.locator('button', { hasText: 'Play' }).first()).toBeVisible({ timeout: 8000 });

    // Capture screenshot: 02_demo_visualizer.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_demo_visualizer.png'),
      fullPage: true,
    });

    // 5. Test Mode 2: Interactive Practice Mode
    await page.locator('[data-testid="tab-practice"]').click();
    await expect(page.locator('[data-testid="score-counter"]')).toBeVisible();
    await expect(page.locator('[data-testid="accuracy-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="combo-streak"]')).toBeVisible();

    // Toggle Wait Mode / Tempo Mode
    const waitModeBtn = page.locator('button', { hasText: /Wait Mode/ }).first();
    await expect(waitModeBtn).toBeVisible();
    await waitModeBtn.click();
    const tempoModeBtn = page.locator('button', { hasText: /Tempo Mode/ }).first();
    await expect(tempoModeBtn).toBeVisible();
    await tempoModeBtn.click();
    await expect(page.locator('button', { hasText: /Wait Mode/ }).first()).toBeVisible();

    // Interact with virtual keyboard & verify score HUD
    const c4Key = page.locator('button[aria-label="Key C4"]').first();
    await expect(c4Key).toBeVisible();
    await c4Key.dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await c4Key.dispatchEvent('pointerup');

    // Also trigger via simulated MIDI message for guaranteed registration
    await page.evaluate(({ p, v }) => {
      const input = (window as any).__MOCK_MIDI_INPUT;
      if (input && input.onmidimessage) {
        input.onmidimessage({ data: new Uint8Array([0x90, p, v]) });
      }
    }, { p: 76, v: 85 });

    await expect(page.locator('[data-testid="score-counter"]')).not.toHaveText('0');
    await expect(page.locator('[data-testid="combo-streak"]')).toHaveText(/1x|Combo/);

    // Capture screenshot: 04_demo_practice_interactive.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_demo_practice_interactive.png'),
      fullPage: true,
    });

    // 6. Test Mode 3: Grand Staff Sheet Music
    await page.locator('[data-testid="tab-sheet"]').click();
    const svgScore = page.locator('svg[viewBox="0 0 1000 240"]').first();
    await expect(svgScore).toBeVisible();
    await expect(page.locator('text=𝄞').first()).toBeVisible();
    await expect(page.locator('text=𝄢').first()).toBeVisible();

    // Zoom control
    const zoomPlusBtn = page.locator('button', { hasText: '+' }).first();
    await zoomPlusBtn.click();
    await expect(page.locator('text=110%')).toBeVisible();

    // Capture screenshot: 05_demo_sheet_music.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_demo_sheet_music.png'),
      fullPage: true,
    });

    // 7. Test Mode 4: AI Coaching & Practice Analytics
    await page.locator('[data-testid="tab-coaching"]').click();
    await expect(page.getByText('Pocket (±15ms)', { exact: true })).toBeVisible();
    await expect(page.locator('text=Rushing (-60ms Early)')).toBeVisible();
    await expect(page.locator('text=Dragging (+60ms Late)')).toBeVisible();
    await expect(page.locator('[data-testid="timing-gauge-pin"]')).toBeVisible();
    await expect(page.locator('text=Measure Accuracy Heatmap')).toBeVisible();
    await expect(page.locator('text=Targeted Loop Drills')).toBeVisible();

    // Capture screenshot: 06_demo_coaching_analytics.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06_demo_coaching_analytics.png'),
      fullPage: true,
    });

    // 8. Test Smart Metronome Engine
    const metronomeRegion = page.locator('[role="region"][aria-label="Metronome and tempo controls"]');
    await expect(metronomeRegion).toBeVisible();

    const bpmDisplay = page.locator('[data-testid="metronome-bpm-display"]');
    await expect(bpmDisplay).toContainText('130');

    // Stepper + and -
    const stepUpBtn = page.locator('[data-testid="metronome-step-up"]');
    const stepDownBtn = page.locator('[data-testid="metronome-step-down"]');
    await stepUpBtn.click();
    await expect(bpmDisplay).toContainText('131');
    await stepDownBtn.click();
    await expect(bpmDisplay).toContainText('130');

    // Metronome toggle and flashing beat indicator dots
    const metronomeToggle = page.locator('[data-testid="metronome-toggle"]');
    await metronomeToggle.click();
    await expect(metronomeToggle).toHaveAttribute('aria-label', 'Stop metronome');
    const beatLeds = page.locator('[data-testid="metronome-beat-leds"] span');
    await expect(beatLeds).toHaveCount(3); // 3/8 meter
    await page.waitForTimeout(200);
    await metronomeToggle.click();

    // 9. Test Export Center Hub Modal
    const exportHubBtn = page.locator('button', { hasText: /Export & Share 🚀|Export Hub 🚀/ }).first();
    await expect(exportHubBtn).toBeVisible();
    await exportHubBtn.click();

    const exportModal = page.locator('div[role="dialog"]');
    await expect(exportModal).toBeVisible();
    await expect(exportModal.locator('text=Export Center & Downloads')).toBeVisible();

    // Verify 4 tabs inside modal: Video, Sheet, MIDI, Audio
    await expect(exportModal.locator('button[role="tab"]', { hasText: /Video/i })).toBeVisible();
    await expect(exportModal.locator('button[role="tab"]', { hasText: /Sheet/i })).toBeVisible();
    await expect(exportModal.locator('button[role="tab"]', { hasText: /MIDI/i })).toBeVisible();
    await expect(exportModal.locator('button[role="tab"]', { hasText: /Audio/i })).toBeVisible();

    // Capture screenshot: 07_demo_export_hub_modal.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07_demo_export_hub_modal.png'),
    });

    // Close modal
    const closeDialogBtn = exportModal.locator('button[aria-label="Close export dialog"]');
    await closeDialogBtn.click();
    await expect(exportModal).not.toBeVisible();
  });

  test('WORKFLOW C: Repertoire Projects Dashboard (/projects)', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);

    // 1. Verify header, streak and level badges, and new project button
    await expect(page.locator('h1', { hasText: 'Projects' })).toBeVisible();
    await expect(page.locator('text=5 Days')).toBeVisible();
    await expect(page.locator('text=520 XP')).toBeVisible();

    // Verify "+ New project" button links to /create (not /upload)
    const newProjectBtn = page.locator('a', { hasText: '+ New project' });
    await expect(newProjectBtn).toBeVisible();
    await expect(newProjectBtn).toHaveAttribute('href', '/create');

    // Verify all 4 mock projects are rendered
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();

    // Capture screenshot: 08_projects_dashboard.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08_projects_dashboard.png'),
      fullPage: true,
    });

    // 2. Test Search Bar with real-time filtering and clear button
    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill('Beethoven');

    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).not.toBeVisible();

    const clearSearchBtn = page.locator('[data-testid="project-search-clear-button"]');
    await expect(clearSearchBtn).toBeVisible();
    await clearSearchBtn.click();

    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();

    // 3. Test Status Filter Tabs
    // Ready Tab (2 items)
    const readyTab = page.locator('[data-testid="status-tab-ready"]');
    await expect(page.locator('[data-testid="status-count-ready"]')).toHaveText('(2)');
    await readyTab.click();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).not.toBeVisible();

    // Processing Tab (1 item)
    const processingTab = page.locator('[data-testid="status-tab-processing"]');
    await expect(page.locator('[data-testid="status-count-processing"]')).toHaveText('(1)');
    await processingTab.click();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).not.toBeVisible();

    // Failed Tab (1 item)
    const failedTab = page.locator('[data-testid="status-tab-failed"]');
    await expect(page.locator('[data-testid="status-count-failed"]')).toHaveText('(1)');
    await failedTab.click();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).not.toBeVisible();

    // Return to All Tab
    await page.locator('[data-testid="status-tab-all"]').click();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();

    // 4. Test Sort Dropdown
    const sortSelect = page.locator('[data-testid="project-sort-select"]');
    await sortSelect.selectOption('title_asc');

    // First card under title_asc should be Bach
    const firstCardTitle = page.locator('[data-testid^="project-title-"]').first();
    await expect(firstCardTitle).toContainText('Bach');

    await sortSelect.selectOption('newest');

    // Capture screenshot: 09_projects_search_and_filter.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09_projects_search_and_filter.png'),
      fullPage: true,
    });

    // 5. Test Quick Action Buttons
    const practiceBtn = page.locator('[data-testid="project-practice-btn-proj-1"]');
    await expect(practiceBtn).toBeVisible();
    await expect(practiceBtn).toHaveAttribute('href', '/projects/proj-1/practice');

    const sheetBtn = page.locator('[data-testid="project-sheet-btn-proj-1"]');
    await expect(sheetBtn).toBeVisible();
    await expect(sheetBtn).toHaveAttribute('href', '/projects/proj-1/sheet');

    const exportBtn = page.locator('[data-testid="project-export-btn-proj-1"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify ExportCenterModal opens directly on dashboard
    const dashboardExportModal = page.locator('div[role="dialog"]');
    await expect(dashboardExportModal).toBeVisible();
    await expect(dashboardExportModal.locator('text=Export Center & Downloads')).toBeVisible();
    await expect(dashboardExportModal.locator('[data-testid="export-modal-project-title"]')).toContainText('Beethoven - Für Elise');

    // Capture screenshot: 10_projects_dashboard_export.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '10_projects_dashboard_export.png'),
    });

    // Close export modal
    await dashboardExportModal.locator('button[aria-label="Close export dialog"]').click();
    await expect(dashboardExportModal).not.toBeVisible();

    // 6. Test Zero-Match State & Clear Filters
    await searchInput.fill('NonExistentTitleQueryXYZ999');
    await expect(page.locator('[data-testid="zero-match-empty-state"]')).toBeVisible();
    await expect(page.locator('text=No projects match your filter')).toBeVisible();

    const clearFiltersBtn = page.locator('[data-testid="clear-filters-btn"]');
    await expect(clearFiltersBtn).toBeVisible();
    await clearFiltersBtn.click();

    await expect(page.locator('[data-testid="zero-match-empty-state"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
  });

  test('WORKFLOW D: Creation & Audio Auditioning (/create)', async ({ page }) => {
    // 1. Navigate to /create
    await page.goto('/create');
    await expect(page).toHaveURL(/\/create/);

    // 2. Verify upload dropzone, YouTube/TikTok URL input, and record button render
    const dropzone = page.locator('[aria-label="Audio file drop zone"]');
    await expect(dropzone).toBeVisible();

    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible();

    const recordContainer = page.locator('button', { hasText: /Record|Start/i }).first();
    await expect(recordContainer).toBeVisible();

    // 3. Drop/upload synthetic audio WAV file to mount AudioPreviewWaveform
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prelude-audition.wav',
      mimeType: 'audio/wav',
      buffer: createSyntheticWavBuffer(),
    });

    // 4. Verify audio waveform preview player component is mounted and responsive
    const previewContainer = page.locator('[data-testid="audio-preview-waveform-container"]');
    await expect(previewContainer).toBeVisible();

    await expect(page.locator('[data-testid="audio-preview-file-name"]')).toContainText('prelude-audition.wav');
    await expect(page.locator('[data-testid="audio-preview-duration-badge"]')).toBeVisible();

    const waveformCanvas = page.locator('[data-testid="audio-preview-waveform-canvas"]');
    await expect(waveformCanvas).toBeVisible();

    // Test Play/Pause audio waveform controls
    const waveformPlayBtn = page.locator('[data-testid="audio-preview-play-btn"]');
    await expect(waveformPlayBtn).toBeVisible();
    await waveformPlayBtn.click();
    await page.waitForTimeout(200);

    // 5. Capture screenshot: 11_create_ingestion.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '11_create_ingestion.png'),
      fullPage: true,
    });
  });
});
