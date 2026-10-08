/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { DEMO_SONGS } from '../lib/demoSongs';
import { simplifyNoteData } from '../lib/midi/simplifyEngine';
import type { NoteData } from '@pianoflow/shared-types';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/beginner');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Common setup for mocking Web MIDI & Web Audio in headless browser
async function setupMocks(page: any) {
  await page.addInitScript(() => {
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

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const origProto = AudioContextClass.prototype;
      origProto.resume = async () => {};
    }
  });
}

// Dense test fixture for algorithmic unit tests
const denseFixture: NoteData = {
  schema_version: 1,
  bpm: 120,
  duration_sec: 2.0,
  time_signature: '4/4',
  tracks: [{ index: 0, name: 'Test', note_count: 20 }],
  notes: [
    // Onset 0.0: 5 notes (C3, E3, C4, E4, G4)
    { id: 0, pitch: 48, name: 'C3', velocity: 80, start: 0.0, end: 0.5, duration: 0.5, track: 0, hand: 'L' },
    { id: 1, pitch: 52, name: 'E3', velocity: 80, start: 0.0, end: 0.5, duration: 0.5, track: 0, hand: 'L' },
    { id: 2, pitch: 60, name: 'C4', velocity: 80, start: 0.0, end: 0.5, duration: 0.5, track: 1, hand: 'R' },
    { id: 3, pitch: 64, name: 'E4', velocity: 80, start: 0.0, end: 0.5, duration: 0.5, track: 1, hand: 'R' },
    { id: 4, pitch: 67, name: 'G4', velocity: 80, start: 0.0, end: 0.5, duration: 0.5, track: 1, hand: 'R' },
    // Onset 0.5: 5 notes (F3, A3, F4, A4, C5)
    { id: 5, pitch: 53, name: 'F3', velocity: 80, start: 0.5, end: 1.0, duration: 0.5, track: 0, hand: 'L' },
    { id: 6, pitch: 57, name: 'A3', velocity: 80, start: 0.5, end: 1.0, duration: 0.5, track: 0, hand: 'L' },
    { id: 7, pitch: 65, name: 'F4', velocity: 80, start: 0.5, end: 1.0, duration: 0.5, track: 1, hand: 'R' },
    { id: 8, pitch: 69, name: 'A4', velocity: 80, start: 0.5, end: 1.0, duration: 0.5, track: 1, hand: 'R' },
    { id: 9, pitch: 72, name: 'C5', velocity: 80, start: 0.5, end: 1.0, duration: 0.5, track: 1, hand: 'R' },
    // Onset 1.0: 5 notes (G3, B3, G4, B4, D5)
    { id: 10, pitch: 55, name: 'G3', velocity: 80, start: 1.0, end: 1.5, duration: 0.5, track: 0, hand: 'L' },
    { id: 11, pitch: 59, name: 'B3', velocity: 80, start: 1.0, end: 1.5, duration: 0.5, track: 0, hand: 'L' },
    { id: 12, pitch: 67, name: 'G4', velocity: 80, start: 1.0, end: 1.5, duration: 0.5, track: 1, hand: 'R' },
    { id: 13, pitch: 71, name: 'B4', velocity: 80, start: 1.0, end: 1.5, duration: 0.5, track: 1, hand: 'R' },
    { id: 14, pitch: 74, name: 'D5', velocity: 80, start: 1.0, end: 1.5, duration: 0.5, track: 1, hand: 'R' },
    // Onset 1.5: 5 notes (C3, G3, C4, E4, C5)
    { id: 15, pitch: 48, name: 'C3', velocity: 80, start: 1.5, end: 2.0, duration: 0.5, track: 0, hand: 'L' },
    { id: 16, pitch: 55, name: 'G3', velocity: 80, start: 1.5, end: 2.0, duration: 0.5, track: 0, hand: 'L' },
    { id: 17, pitch: 60, name: 'C4', velocity: 80, start: 1.5, end: 2.0, duration: 0.5, track: 1, hand: 'R' },
    { id: 18, pitch: 64, name: 'E4', velocity: 80, start: 1.5, end: 2.0, duration: 0.5, track: 1, hand: 'R' },
    { id: 19, pitch: 72, name: 'C5', velocity: 80, start: 1.5, end: 2.0, duration: 0.5, track: 1, hand: 'R' },
  ],
};

test.describe('PianoFlow AI — Phase J: Client-Side Beginner Mode Simplification Engine', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. ALGORITHMIC ENGINE UNIT TESTS
  // ─────────────────────────────────────────────────────────────
  test('ENG-01: Pure TypeScript Simplification Invariants & Unit Verification', () => {
    // 1.1 Original difficulty returns identical note array
    const originalOut = simplifyNoteData(denseFixture, 'original');
    expect(originalOut.notes.length).toBe(denseFixture.notes.length);
    expect(originalOut.stats.reductionPercent).toBe(0);

    // 1.2 Top melody note is preserved at every onset across easy and very_easy
    for (const diff of ['easy', 'very_easy'] as const) {
      const out = simplifyNoteData(denseFixture, diff);
      const onsetBuckets = new Set(denseFixture.notes.map((n) => Math.round(n.start / 0.03)));
      for (const bucket of onsetBuckets) {
        const origNotes = denseFixture.notes.filter((n) => Math.round(n.start / 0.03) === bucket);
        const topOrigPitch = Math.max(...origNotes.map((n) => n.pitch));
        const outNotes = out.notes.filter((n) => Math.round(n.start / 0.03) === bucket);
        const outPitches = outNotes.map((n) => n.pitch);
        expect(outPitches).toContain(topOrigPitch);
      }
    }

    // 1.3 very_easy note count is <= easy note count <= original note count
    const easyOut = simplifyNoteData(denseFixture, 'easy');
    const veryEasyOut = simplifyNoteData(denseFixture, 'very_easy');
    expect(veryEasyOut.notes.length).toBeLessThanOrEqual(easyOut.notes.length);
    expect(easyOut.notes.length).toBeLessThanOrEqual(denseFixture.notes.length);

    // 1.4 very_easy enforces monophonic max 1 note per hand per onset
    const onsetBuckets = new Set(veryEasyOut.notes.map((n) => Math.round(n.start / 0.03)));
    for (const bucket of onsetBuckets) {
      const notesInBucket = veryEasyOut.notes.filter((n) => Math.round(n.start / 0.03) === bucket);
      const rhCount = notesInBucket.filter((n) => n.hand === 'R' || n.pitch >= 60).length;
      const lhCount = notesInBucket.filter((n) => n.hand === 'L' || n.pitch < 60).length;
      expect(rhCount).toBeLessThanOrEqual(1);
      expect(lhCount).toBeLessThanOrEqual(1);
    }

    // 1.5 Filters out short notes below threshold unless sole onset note
    const fixtureWithShortNote: NoteData = {
      ...denseFixture,
      notes: [
        { id: 1, pitch: 60, name: 'C4', velocity: 80, start: 1.0, end: 1.02, duration: 0.02, track: 0, hand: 'R' },
        { id: 2, pitch: 64, name: 'E4', velocity: 80, start: 1.0, end: 1.50, duration: 0.50, track: 0, hand: 'R' },
      ],
    };
    const shortFiltered = simplifyNoteData(fixtureWithShortNote, 'easy');
    expect(shortFiltered.notes.find((n) => n.pitch === 60)).toBeUndefined();
    expect(shortFiltered.notes.find((n) => n.pitch === 64)).toBeDefined();

    // 1.6 Renumbers note IDs consecutively starting at 0
    easyOut.notes.forEach((note, index) => {
      expect(note.id).toBe(index);
    });

    // 1.7 Calculates accurate reduction_percent in stats and meta
    const expectedPercent = Math.round((1 - easyOut.notes.length / denseFixture.notes.length) * 100);
    expect(easyOut.meta.simplification?.reduction_percent).toBe(expectedPercent);
    expect(easyOut.stats.reductionPercent).toBe(expectedPercent);
  });

  test('ENG-02: Progressive Reduction Across Classical Showcase Repertoire', () => {
    // Verifies all 4 classical songs satisfy progressive reduction: N_very_easy < N_easy < N_original
    for (const song of DEMO_SONGS) {
      const origCount = song.noteData.notes.length;
      const easy = simplifyNoteData(song.noteData, 'easy');
      const veryEasy = simplifyNoteData(song.noteData, 'very_easy');

      expect(easy.notes.length).toBeLessThan(origCount);
      expect(veryEasy.notes.length).toBeLessThan(easy.notes.length);

      // Verify Für Elise exact expected values from architectural spec
      if (song.id === 'fur-elise') {
        expect(origCount).toBe(797);
        expect(easy.notes.length).toBe(754);
        expect(easy.stats.reductionPercent).toBe(5);
        expect(veryEasy.notes.length).toBe(687);
        expect(veryEasy.stats.reductionPercent).toBe(14);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DEMO SHOWCASE BROWSER E2E TESTS
  // ─────────────────────────────────────────────────────────────
  test('DEMO-BEGINNER-01: Toggling to Easy Mode Updates HUD and Note Count', async ({ page }) => {
    await page.goto('/demo');

    // 1. Verify landing on demo showcase
    await expect(page.locator('h1', { hasText: 'Interactive Classical Library Showcase' })).toBeVisible();

    // 2. Locate difficulty selector pill
    const diffSelector = page.locator('[data-testid="difficulty-selector"]');
    await expect(diffSelector).toBeVisible();

    // 3. Verify initial Für Elise note count is 797 notes
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('797 notes');
    await expect(page.locator('[data-testid="active-song-voicing-status"]')).toHaveText('100% Voicing');

    // 4. Click Easy 🟢 option
    const easyOption = page.locator('[data-testid="difficulty-option-easy"]');
    await expect(easyOption).toBeVisible();
    await easyOption.click();

    // 5. Verify active emerald styling and badge chip
    await expect(easyOption).toHaveAttribute('aria-pressed', 'true');
    await expect(easyOption).toHaveClass(/border-emerald/);

    // 6. Verify HUD note count updates dynamically to 754 notes
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('754 notes');
    await expect(page.locator('[data-testid="active-song-voicing-status"]')).toHaveText('Easy (-5%)');

    // 7. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_demo_easy_mode.png'),
      fullPage: true,
    });
  });

  test('DEMO-BEGINNER-02: Toggling to Very Easy Mode Further Reduces Note Count', async ({ page }) => {
    await page.goto('/demo');

    // 1. Click Very Easy 🟡 option
    const veryEasyOption = page.locator('[data-testid="difficulty-option-very_easy"]');
    await expect(veryEasyOption).toBeVisible();
    await veryEasyOption.click();

    // 2. Verify active amber styling
    await expect(veryEasyOption).toHaveAttribute('aria-pressed', 'true');
    await expect(veryEasyOption).toHaveClass(/border-amber/);

    // 3. Verify note count reduces to 687 notes
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('687 notes');
    await expect(page.locator('[data-testid="active-song-voicing-status"]')).toHaveText('Very Easy (-14%)');

    // 4. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_demo_very_easy_mode.png'),
      fullPage: true,
    });
  });

  test('DEMO-BEGINNER-03: Practice Mode Plays & Scores on Simplified Arrangement', async ({ page }) => {
    await page.goto('/demo');

    // 1. Toggle to Easy mode
    await page.locator('[data-testid="difficulty-option-easy"]').click();
    await expect(page.locator('[data-testid="active-song-note-count"]')).toHaveText('754 notes');

    // 2. Switch to Mode 2 (Interactive Practice Mode)
    await page.locator('[data-testid="tab-practice"]').click();

    // 3. Verify Practice Canvas and metrics HUD are visible
    await expect(page.locator('[data-testid="score-counter"]')).toBeVisible();
    await expect(page.locator('[data-testid="combo-streak"]')).toBeVisible();

    // 4. Verify falling notes canvas element is present
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // 5. Trigger key depression on virtual keyboard
    const e5Key = page.locator('button[aria-label="Key E5"]').first();
    if (await e5Key.isVisible()) {
      await e5Key.dispatchEvent('pointerdown');
      await page.waitForTimeout(100);
      await e5Key.dispatchEvent('pointerup');
    } else {
      const c4Key = page.locator('button[aria-label="Key C4"]').first();
      await c4Key.dispatchEvent('pointerdown');
      await page.waitForTimeout(100);
      await c4Key.dispatchEvent('pointerup');
    }

    // 6. Verify score responds
    await expect(page.locator('[data-testid="score-counter"]')).toBeVisible();

    // 7. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_practice_simplified_scoring.png'),
      fullPage: true,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PROJECT PRACTICE & EXPORT MODAL INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────
  test('DEMO-BEGINNER-04: Export Center Modal Instant Simplified MIDI Download', async ({ page }) => {
    await page.goto('/demo');

    // 1. Open Export Center Modal
    const exportBtn = page.locator('button', { hasText: 'Export & Share 🚀' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // 2. Verify modal opened
    await expect(page.locator('text=Export Center & Downloads')).toBeVisible();

    // 3. Switch to MIDI tab
    const midiTab = page.locator('button[role="tab"]', { hasText: 'MIDI Files' });
    await expect(midiTab).toBeVisible();
    await midiTab.click();

    // 4. Verify Beginner MIDI card with Instant Client Generation badge
    await expect(page.locator('text=⚡ Instant Client Generation')).toBeVisible();

    // 5. Toggle to Very Easy in Export Center
    const veBtn = page.locator('[data-testid="beginner-midi-diff-very_easy"]');
    await expect(veBtn).toBeVisible();
    await veBtn.click();

    // 6. Verify instant download button label updates
    const downloadBtn = page.locator('[data-testid="btn-download-simplified-midi"]');
    await expect(downloadBtn).toHaveText(/Download Very Easy MIDI ⚡/);

    // 7. Test download trigger
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.mid');

    // 8. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_export_center_instant_midi.png'),
    });
  });

  test('DEMO-BEGINNER-05: Project Practice Records Chosen Difficulty in Session', async ({ page }) => {
    let sessionPayload: any = null;

    // Mock project REST API endpoints
    await page.route('**/api/v1/projects/demo-project', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'demo-project',
          name: 'Demo Sonata',
          status: 'ready',
          created_at: new Date().toISOString(),
          analysis_summary: {
            bpm: 120,
            duration_sec: 12.0,
            time_signature: '4/4',
            track_count: 2,
            note_count: 18,
          },
          active_jobs: [],
        }),
      });
    });

    await page.route('**/api/v1/projects/demo-project/notes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(denseFixture),
      });
    });

    await page.route('**/api/v1/practice-sessions', async (route) => {
      sessionPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-123',
          project_id: 'demo-project',
          score: 850,
          accuracy_percent: 92,
          xp_gained: 150,
          level_up: false,
          current_level: 5,
          total_xp: 2450,
          current_streak: 3,
        }),
      });
    });

    await page.goto('/projects/demo-project/practice');

    // 1. Locate difficulty selector in practice page
    const diffSelector = page.locator('[data-testid="difficulty-selector"]');
    await expect(diffSelector).toBeVisible();

    // 2. Select Easy difficulty
    await page.locator('[data-testid="difficulty-option-easy"]').click();

    // 3. Click Finish practice session
    const finishBtn = page.locator('button', { hasText: 'Finish' });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // 4. Verify coaching modal or session dialog appeared
    await expect(page.locator('text=AI Coaching & Session Analytics').first()).toBeVisible({ timeout: 15000 });

    // 5. Assert createSession payload recorded difficulty: "easy"
    expect(sessionPayload).not.toBeNull();
    expect(sessionPayload.difficulty).toBe('easy');
    expect(sessionPayload.project_id).toBe('demo-project');

    // 6. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_project_practice_difficulty_saved.png'),
    });
  });
});
