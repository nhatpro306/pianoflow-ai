import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ALL_REPERTOIRE_SONGS,
  getSongById,
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

      // Verify musical dynamics & velocity
      for (const note of song.noteData.notes) {
        expect(note.velocity).toBeGreaterThanOrEqual(20);
        expect(note.velocity).toBeLessThanOrEqual(127);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.pitch).toBeGreaterThanOrEqual(21);
        expect(note.pitch).toBeLessThanOrEqual(108);
      }
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
    await expect(masterBadge).toContainText('Studio Master');

    // 4. Click the card and verify active song header badge
    await chopinCard.click();
    const activeMasterBadge = page.locator('[data-testid="studio-master-active-badge"]');
    await expect(activeMasterBadge).toBeVisible();

    // 5. Open MIDI Importer Modal
    const importBtn = page.getByRole('button', { name: /Import MIDI/i });
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
});
