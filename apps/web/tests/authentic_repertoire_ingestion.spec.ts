import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ALL_REPERTOIRE_SONGS,
  getSongById,
  isSongFullLength,
  loadSongNoteData,
  fetchFullSongJson,
} from '../lib/songs';
import { parseMidiBytes } from '../lib/midi/midiParser';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test.describe('PianoFlow AI — Authentic Landmark Repertoire & MIDI Ingestion Engine', () => {
  test('REP-01: Canonical Landmark Studio Master Corpus Verification', () => {
    // 1. Gather all studio master pieces
    const studioMasters = ALL_REPERTOIRE_SONGS.filter(
      (s) => s.isCanonical === true || s.qualityTier === 'studio_master'
    );

    // Expect at least the 25 landmark pieces
    expect(studioMasters.length).toBeGreaterThanOrEqual(25);

    // 2. Verify all landmark pieces note-for-note invariants
    const REQUIRED_LANDMARKS = [
      'fur-elise',
      'clair-de-lune',
      'gymnopedie-1',
      'canon-in-d',
      'moonlight-sonata',
      'moonlight-sonata-3rd',
      'river-flows-in-you',
      'prelude-in-c',
      'interstellar-main-theme',
      'sparkle-your-name',
      'autumn-leaves',
      'the-entertainer-joplin',
      'merry-go-round-of-life',
      'chopin-nocturne-op9-no2',
      'chopin-waltz-a-minor',
      'rondo-alla-turca',
      'ode-to-joy',
      'bach-minuet-in-g',
      'one-summers-day',
      'kiss-the-rain',
      'fly-me-to-the-moon',
      'fly-me-to-the-moon-jazz',
      'love-story-taylor-swift',
      'the-scientist-coldplay',
      'spring-day-bts',
    ];

    for (const songId of REQUIRED_LANDMARKS) {
      const song = getSongById(songId);
      expect(song, `Expected song ${songId} to exist in repertoire`).toBeDefined();
      if (!song) continue;

      expect(song.isCanonical).toBe(true);
      expect(song.qualityTier).toBe('studio_master');
      expect(song.noteData.notes.length).toBeGreaterThan(0);
      expect(song.noteData.tracks?.length).toBeGreaterThanOrEqual(2);

      // Verify Left Hand and Right Hand note separation
      const lhNotes = song.noteData.notes.filter((n) => n.hand === 'L' || n.track === 0);
      const rhNotes = song.noteData.notes.filter((n) => n.hand === 'R' || n.track === 1);
      expect(lhNotes.length, `${songId} must have left hand notes`).toBeGreaterThan(0);
      expect(rhNotes.length, `${songId} must have right hand notes`).toBeGreaterThan(0);

      // Verify musical dynamics & velocity bounds
      const invalidNote = song.noteData.notes.find(
        (n) =>
          n.velocity < 20 ||
          n.velocity > 127 ||
          n.duration <= 0 ||
          n.pitch < 21 ||
          n.pitch > 108
      );
      expect(invalidNote, `All notes in ${songId} must satisfy MIDI bounds`).toBeUndefined();
    }
  });

  test('REP-02: Pure TypeScript SMF Parser Validates Standard MIDI Binary Format', () => {
    const candidatePaths = [
      path.resolve(process.cwd(), 'scripts/fixtures/test.mid'),
      path.resolve(process.cwd(), '../scripts/fixtures/test.mid'),
      path.resolve(process.cwd(), '../../scripts/fixtures/test.mid'),
      path.resolve(__dirname, '../../../scripts/fixtures/test.mid'),
    ];
    const fixturePath = candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0];
    expect(fs.existsSync(fixturePath)).toBe(true);

    const buffer = fs.readFileSync(fixturePath);
    const parsed = parseMidiBytes(buffer);

    expect(parsed.schema_version).toBe(1);
    expect(parsed.bpm).toBe(120);
    expect(parsed.time_signature).toBe('4/4');
    expect(parsed.notes.length).toBeGreaterThan(0);
    expect(parsed.tracks?.length).toBe(2);
    expect(parsed.duration_sec).toBeGreaterThan(0);
  });

  test('REP-03: Filter Pill Strip Displays Studio Master Filter and Filters Accurately', async ({ page }) => {
    await page.goto('/demo');

    // 1. Check Studio Master filter pill
    const studioMasterPill = page.locator('[data-testid="genre-pill-studio-master"]');
    await expect(studioMasterPill).toBeVisible();

    // 2. Click the Studio Master filter pill
    await studioMasterPill.click();
    await expect(studioMasterPill).toHaveAttribute('aria-selected', 'true');

    // 3. Verify cards show the Studio Master badge
    const chopinCard = page.locator('[data-testid="song-card-chopin-nocturne-op9-no2"]');
    await expect(chopinCard).toBeVisible();

    const masterBadge = page.locator('[data-testid="badge-studio-master-chopin-nocturne-op9-no2"]');
    await expect(masterBadge).toBeVisible();
    await expect(masterBadge).toContainText(/Verified Score Arrangement|Studio Master/);

    // 4. Click the card and verify active song header badge
    await chopinCard.click();
    const activeMasterBadge = page.locator('[data-testid="studio-master-active-badge"]');
    await expect(activeMasterBadge).toBeVisible();

    // 5. Open MIDI Importer Modal
    const importBtn = page.getByRole('button', { name: /Import MIDI/i }).first();
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await expect(page.locator('text=Authentic MIDI Repertoire Importer')).toBeVisible();
      await expect(page.locator('text=Direct MIDI Importer')).toBeVisible();
      await expect(page.locator('input[type="url"]')).toBeVisible();
    }

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07_studio_master_repertoire.png'),
    });
  });

  test('REP-04: Full-Length Complete Masterworks (Zero Truncation, duration >= 120s, noteCount >= 300)', async ({
    page,
  }) => {
    // 1. In-memory and static loader validation for landmark masterworks
    const LANDMARK_FULL_PIECES = [
      'fur-elise',
      'moonlight-sonata',
      'canon-in-d',
      'clair-de-lune',
      'gymnopedie-1',
      'river-flows-in-you',
      'interstellar-main-theme',
      'sparkle-your-name',
      'chopin-nocturne-op9-no2',
      'rondo-alla-turca',
    ];

    for (const songId of LANDMARK_FULL_PIECES) {
      const song = getSongById(songId);
      expect(song, `Landmark piece ${songId} must exist`).toBeDefined();
      if (!song) continue;

      expect(isSongFullLength(song)).toBe(true);
      expect(song.duration_sec, `${songId} duration must be >= 120s`).toBeGreaterThanOrEqual(120);
      expect(song.noteCount, `${songId} note count must be >= 300`).toBeGreaterThanOrEqual(300);

      // Verify async loader / static distribution
      const fullNoteData = await loadSongNoteData(song);
      expect(fullNoteData.notes.length).toBeGreaterThanOrEqual(300);
      expect(fullNoteData.duration_sec ?? song.duration_sec).toBeGreaterThanOrEqual(120);

      const staticJson = await fetchFullSongJson(songId);
      expect(staticJson).toBeDefined();
      expect(staticJson!.notes.length).toBeGreaterThanOrEqual(300);
    }

    // 2. Browser Verification of Full Song Badges and UI Indicators
    await page.goto('/songs');
    await page.waitForLoadState('domcontentloaded');

    // Default song Für Elise active badge
    const fullSongBadge = page.locator('[data-testid="full-song-active-badge"]');
    await expect(fullSongBadge).toBeVisible();
    await expect(fullSongBadge).toContainText('Full Song (Trọn vẹn)');

    // Repertoire header badge
    const headerFullBadge = page.locator('[data-testid="repertoire-header-full-song-badge"]');
    await expect(headerFullBadge).toBeVisible();

    // Song card badge on Für Elise
    const furEliseCardBadge = page.locator('[data-testid="badge-full-song-fur-elise"]');
    await expect(furEliseCardBadge).toBeVisible();
    await expect(furEliseCardBadge).toContainText('Full Song (Trọn vẹn)');

    // Active note count should reflect full masterwork
    const noteCountEl = page.locator('[data-testid="active-song-note-count"]');
    const noteCountText = await noteCountEl.innerText();
    const parsedNotes = parseInt(noteCountText, 10);
    expect(parsedNotes).toBeGreaterThanOrEqual(300);
  });
});
