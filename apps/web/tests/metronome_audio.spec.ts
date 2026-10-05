/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/metronome');
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

async function setupWebAudioAndMidiMocks(page: any) {
  await page.addInitScript(() => {
    class MockAudioContext {
      state = 'running';
      destination = {};

      get currentTime() {
        return performance.now() / 1000;
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }

      createBufferSource() {
        const src: any = {
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {
            if (src.onended) src.onended();
          },
          onended: null,
        };
        return src;
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

      async resume() {
        this.state = 'running';
      }

      async close() {
        this.state = 'closed';
      }
    }

    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;

    // Web MIDI Mock
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

    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;

    // Mock Supabase Auth Client for E2E tests
    const mockUser = {
      id: 'mock-pianist-1',
      email: 'pianist@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    const mockSession = {
      user: mockUser,
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      expires_in: 3600,
    };
    (window as any).__MOCK_SUPABASE_CLIENT__ = {
      auth: {
        getSession: async () => ({
          data: { session: mockSession },
          error: null,
        }),
        onAuthStateChange: (cb: any) => {
          cb('SIGNED_IN', mockSession);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
      },
    };
  });
}

test.describe('PianoFlow AI — Phase K: Smart Metronome Engine & Audio Waveform Auditioning', () => {
  test.beforeEach(async ({ page }) => {
    await setupWebAudioAndMidiMocks(page);
  });

  test('MET-01: Metronome engine initializes, starts/stops, and triggers beat callbacks', async ({ page }) => {
    await page.goto('/demo');

    // Run unit checks on MetronomeEngine within the browser's Web Audio runtime
    const result = await page.evaluate(async () => {
      const EngineClass = (window as any).MetronomeEngine;
      if (!EngineClass) throw new Error('MetronomeEngine is not defined on window');

      const engine = new EngineClass(120, '4/4');
      const initialState = engine.getState();

      const receivedBeats: Array<{ beat: number; isAccent: boolean }> = [];
      engine.setCallbacks({
        onBeat: (beatNumber: number, isAccent: boolean) => {
          receivedBeats.push({ beat: beatNumber, isAccent });
        },
      });

      engine.start();
      const playingState = engine.getState();

      // Wait 150ms to verify scheduled lookahead clicks
      await new Promise((resolve) => setTimeout(resolve, 150));

      engine.stop();
      const stoppedState = engine.getState();

      // Test meter properties
      engine.setTimeSignature('3/4');
      const b34 = engine.getBeatsPerMeasure();
      const u34 = engine.getBeatUnit();

      engine.setTimeSignature('6/8');
      const b68 = engine.getBeatsPerMeasure();
      const u68 = engine.getBeatUnit();

      engine.destroy();

      return {
        initialBpm: initialState.bpm,
        initialTimeSignature: initialState.timeSignature,
        wasPlaying: playingState.isPlaying,
        isStopped: !stoppedState.isPlaying,
        receivedBeatsCount: receivedBeats.length,
        firstBeatAccent: receivedBeats.length > 0 ? receivedBeats[0].isAccent : null,
        b34,
        u34,
        b68,
        u68,
      };
    });

    expect(result.initialBpm).toBe(120);
    expect(result.initialTimeSignature).toBe('4/4');
    expect(result.wasPlaying).toBe(true);
    expect(result.isStopped).toBe(true);
    expect(result.receivedBeatsCount).toBeGreaterThan(0);
    expect(result.firstBeatAccent).toBe(true);
    expect(result.b34).toBe(3);
    expect(result.u34).toBe(1.0);
    expect(result.b68).toBe(6);
    expect(result.u68).toBe(0.5);
  });

  test('MET-02: Tap Tempo calculates BPM accurately based on tap intervals', async ({ page }) => {
    await page.goto('/demo');

    const tapResult = await page.evaluate(() => {
      const EngineClass = (window as any).MetronomeEngine;
      const engine = new EngineClass(120, '4/4');

      const origNow = performance.now;
      let mockTime = 10000;
      performance.now = () => mockTime;

      // 4 taps at 500ms intervals = 120 BPM
      engine.tap(); // tap 0 at 10000ms
      mockTime += 500;
      engine.tap(); // tap 1 at 10500ms
      mockTime += 500;
      engine.tap(); // tap 2 at 11000ms
      mockTime += 500;
      const bpm120 = engine.tap(); // tap 3 at 11500ms

      // Fast taps at 300ms intervals = 200 BPM
      mockTime = 20000; // >2500ms gap resets history
      engine.tap(); // tap 0 at 20000ms
      mockTime += 300;
      engine.tap(); // tap 1 at 20300ms
      mockTime += 300;
      engine.tap(); // tap 2 at 20600ms
      mockTime += 300;
      const bpm200 = engine.tap(); // tap 3 at 20900ms

      // Extreme fast tap clamped to 300 BPM max
      mockTime = 30000;
      engine.tap();
      mockTime += 100;
      engine.tap();
      mockTime += 100;
      const clampedBpm = engine.tap();

      // Restore
      performance.now = origNow;
      engine.destroy();

      return { bpm120, bpm200, clampedBpm };
    });

    expect(tapResult.bpm120).toBe(120);
    expect(tapResult.bpm200).toBe(200);
    expect(tapResult.clampedBpm).toBeLessThanOrEqual(300);
  });

  test('MET-03: Demo page metronome control toggles, steps BPM, and displays flashing beat LEDs', async ({ page }) => {
    await page.goto('/demo');

    // 1. Verify metronome toolbar is rendered
    const metronomeRegion = page.locator('[role="region"][aria-label="Metronome and tempo controls"]');
    await expect(metronomeRegion).toBeVisible();

    // 2. Default song is Für Elise (130 BPM, 3/8)
    const bpmDisplay = page.locator('[data-testid="metronome-bpm-display"]');
    await expect(bpmDisplay).toContainText('130');

    // 3. Verify 3 beat dots for 3/8 meter
    const beatDots = page.locator('[data-testid="metronome-beat-leds"] span');
    await expect(beatDots).toHaveCount(3);

    // 4. Stepper test: +1 BPM and -1 BPM
    const stepUpBtn = page.locator('[data-testid="metronome-step-up"]');
    const stepDownBtn = page.locator('[data-testid="metronome-step-down"]');

    await stepUpBtn.click();
    await expect(bpmDisplay).toContainText('131');

    await stepDownBtn.click();
    await expect(bpmDisplay).toContainText('130');

    // 5. Toggle metronome on
    const toggleBtn = page.locator('[data-testid="metronome-toggle"]');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Stop metronome');

    // Wait a brief moment to observe beat pulse
    await page.waitForTimeout(100);

    // 6. Switch classical song to Canon in D (75 BPM, 4/4)
    const canonCard = page.locator('[data-testid="song-card-canon-in-d"]');
    await canonCard.click();

    // 7. Verify metronome syncs automatically to 75 BPM and 4 beat dots
    await expect(bpmDisplay).toContainText('75');
    await expect(beatDots).toHaveCount(4);

    // 8. Open Metronome Popover
    const settingsBtn = page.locator('[data-testid="metronome-settings-btn"]');
    await settingsBtn.click();

    const popover = page.locator('[data-testid="metronome-popover"]');
    await expect(popover).toBeVisible();

    // Step +5 in popover
    const stepPlus5 = page.locator('[data-testid="metronome-step-plus-5"]');
    await stepPlus5.click();
    await expect(bpmDisplay).toContainText('80');

    // Switch meter to 3/4 in popover
    const meter34Btn = page.locator('[data-testid="metronome-meter-3-4"]');
    await meter34Btn.click();
    await expect(beatDots).toHaveCount(3);

    // Tap tempo button in popover
    const tapBtn = page.locator('[data-testid="metronome-tap-tempo-btn"]');
    await tapBtn.click();

    // 9. Capture screenshot of Demo Showcase with Metronome
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'metronome-demo-showcase.png'),
    });
  });

  test('MET-04: AudioPreviewWaveform renders in /create when audio file is loaded', async ({ page }) => {
    // Navigate to create page
    await page.goto('/create');

    // Drop/upload synthetic WAV file into file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prelude-audition.wav',
      mimeType: 'audio/wav',
      buffer: createSyntheticWavBuffer(),
    });

    // Verify AudioPreviewWaveform appears
    const previewContainer = page.locator('[data-testid="audio-preview-waveform-container"]');
    await expect(previewContainer).toBeVisible();

    // Verify file name and duration badge
    await expect(page.locator('[data-testid="audio-preview-file-name"]')).toContainText('prelude-audition.wav');
    await expect(page.locator('[data-testid="audio-preview-duration-badge"]')).toBeVisible();

    // Verify waveform canvas
    const canvas = page.locator('[data-testid="audio-preview-waveform-canvas"]');
    await expect(canvas).toBeVisible();

    // Test Play/Pause auditioning
    const playBtn = page.locator('[data-testid="audio-preview-play-btn"]');
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    await expect(playBtn).toHaveAttribute('aria-label', 'Pause audio preview');

    // Pause auditioning
    await playBtn.click();
    await expect(playBtn).toHaveAttribute('aria-label', 'Play audio preview');

    // Capture screenshot of Waveform Preview in /create
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'create-audio-waveform-preview.png'),
    });
  });

  test('MET-05: Practice Mode Metronome Integration & Screenshots', async ({ page }) => {
    // Mock project & notes API for practice session
    await page.route('**/api/v1/projects/demo-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'demo-session',
          name: 'Clair de Lune (Study)',
          status: 'ready',
          created_at: new Date().toISOString(),
          analysis_summary: {
            bpm: 100,
            duration_sec: 15.0,
            time_signature: '4/4',
            track_count: 2,
            note_count: 20,
          },
          active_jobs: [],
        }),
      });
    });

    await page.route('**/api/v1/projects/demo-session/notes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schema_version: 1,
          bpm: 100,
          duration_sec: 15.0,
          time_signature: '4/4',
          tracks: [{ index: 0, name: 'Piano', note_count: 4 }],
          notes: [
            { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 0.5, end: 1.5, duration: 1.0, track: 0, hand: 'R' },
            { id: 2, pitch: 64, name: 'E4', velocity: 80, start: 1.5, end: 2.5, duration: 1.0, track: 0, hand: 'R' },
            { id: 3, pitch: 67, name: 'G4', velocity: 80, start: 2.5, end: 3.5, duration: 1.0, track: 0, hand: 'R' },
            { id: 4, pitch: 72, name: 'C5', velocity: 80, start: 3.5, end: 4.5, duration: 1.0, track: 0, hand: 'R' },
          ],
        }),
      });
    });

    await page.goto('/projects/demo-session/practice');

    // 1. Locate Metronome Control in Practice Secondary Toolbar
    const metronomeRegion = page.locator('[role="region"][aria-label="Metronome and tempo controls"]');
    await expect(metronomeRegion).toBeVisible();

    // 2. Start metronome
    const toggleBtn = page.locator('[data-testid="metronome-toggle"]');
    await toggleBtn.click();
    await page.waitForTimeout(100);

    // 3. Capture active practice metronome screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'metronome-practice-active.png'),
    });

    // 4. Open popover in Practice Mode
    const settingsBtn = page.locator('[data-testid="metronome-settings-btn"]');
    await settingsBtn.click();

    const popover = page.locator('[data-testid="metronome-popover"]');
    await expect(popover).toBeVisible();

    // 5. Capture expanded popover screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'metronome-popover-expanded.png'),
    });
  });
});
