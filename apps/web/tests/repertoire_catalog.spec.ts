import { test, expect } from '@playwright/test';
import path from 'path';
import {
  ALL_REPERTOIRE_SONGS,
  CLASSICAL_SONGS,
  ANIME_SONGS,
  KPOP_SONGS,
  MODERN_POP_SONGS,
  CINEMATIC_GAME_SONGS,
  getSongsByGenre,
  searchRepertoire,
  getSongById,
} from '../lib/songs';
import { simplifyNoteData } from '../lib/midi/simplifyEngine';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test.describe('PianoFlow AI — Step 4: 250-Piece Multi-Genre Repertoire Catalog', () => {
  test('CATALOG-01: In-Memory Verification of 250 Curated Pieces across 5 Genres', () => {
    // 1. Verify exact counts
    expect(ALL_REPERTOIRE_SONGS.length).toBe(250);
    expect(CLASSICAL_SONGS.length).toBe(50);
    expect(ANIME_SONGS.length).toBe(50);
    expect(KPOP_SONGS.length).toBe(50);
    expect(MODERN_POP_SONGS.length).toBe(50);
    expect(CINEMATIC_GAME_SONGS.length).toBe(50);

    // 2. Verify unique IDs
    const idSet = new Set<string>();
    for (const song of ALL_REPERTOIRE_SONGS) {
      expect(idSet.has(song.id)).toBe(false);
      idSet.add(song.id);

      // Verify song fields
      expect(song.title.length).toBeGreaterThan(0);
      expect(song.composer.length).toBeGreaterThan(0);
      expect(song.bpm).toBeGreaterThan(0);
      expect(song.noteCount).toBeGreaterThan(0);
      expect(song.noteData.notes.length).toBe(song.noteCount);
      expect(song.duration_sec).toBeGreaterThan(0);
    }

    // 3. Verify helper functions
    expect(getSongsByGenre('Anime & Ghibli').length).toBe(50);
    expect(getSongsByGenre('K-Pop').length).toBe(50);
    expect(getSongsByGenre('Modern & Pop').length).toBe(50);
    expect(getSongsByGenre('Cinematic & Game').length).toBe(50);
    expect(getSongsByGenre('Classical').length).toBe(50);
    expect(getSongsByGenre('All').length).toBe(250);

    // 4. Verify search helper
    const searchSparkle = searchRepertoire('Sparkle');
    expect(searchSparkle.length).toBeGreaterThanOrEqual(1);
    expect(searchSparkle[0].id).toBe('sparkle-your-name');

    const searchBTS = searchRepertoire('BTS', 'K-Pop');
    expect(searchBTS.length).toBeGreaterThanOrEqual(5);

    // 5. Verify getSongById helper
    expect(getSongById('fur-elise')).toBeDefined();
    expect(getSongById('river-flows-in-you')).toBeDefined();
    expect(getSongById('interstellar-main-theme')).toBeDefined();
  });

  test('CATALOG-02: Progressive Reduction Guaranteed for All 250 Repertoire Pieces', () => {
    for (const song of ALL_REPERTOIRE_SONGS) {
      const orig = song.noteData.notes.length;
      const easy = simplifyNoteData(song.noteData, 'easy');
      const veryEasy = simplifyNoteData(song.noteData, 'very_easy');

      expect(easy.notes.length).toBeLessThan(orig);
      expect(veryEasy.notes.length).toBeLessThan(easy.notes.length);
    }
  });

  test('CATALOG-03: Genre Pill Filter Strip & Live Selection on Demo Page', async ({ page }) => {
    await page.goto('/demo');

    // 1. Verify initial All (250) pill is active
    const allPill = page.locator('[data-testid="genre-pill-all"]');
    await expect(allPill).toBeVisible();
    await expect(allPill).toHaveAttribute('aria-selected', 'true');

    // 2. Switch to Anime & Ghibli pill
    const animePill = page.locator('[data-testid="genre-pill-anime---ghibli"]');
    await expect(animePill).toBeVisible();
    await animePill.click();
    await expect(animePill).toHaveAttribute('aria-selected', 'true');
    await expect(allPill).toHaveAttribute('aria-selected', 'false');

    // Verify Anime song card is rendered (e.g. Sparkle)
    const sparkleCard = page.locator('[data-testid="song-card-sparkle-your-name"]');
    await expect(sparkleCard).toBeVisible();

    // 3. Switch to K-Pop pill
    const kpopPill = page.locator('[data-testid="genre-pill-k-pop"]');
    await expect(kpopPill).toBeVisible();
    await kpopPill.click();
    await expect(kpopPill).toHaveAttribute('aria-selected', 'true');

    // Verify K-Pop song card is rendered (e.g. Spring Day)
    const springDayCard = page.locator('[data-testid="song-card-spring-day-bts"]');
    await expect(springDayCard).toBeVisible();

    // 4. Switch to Modern & Pop pill
    const popPill = page.locator('[data-testid="genre-pill-modern---pop"]');
    await expect(popPill).toBeVisible();
    await popPill.click();
    await expect(popPill).toHaveAttribute('aria-selected', 'true');

    const yirumaCard = page.locator('[data-testid="song-card-river-flows-in-you"]');
    await expect(yirumaCard).toBeVisible();

    // 5. Switch to Cinematic & Game pill
    const cinemaPill = page.locator('[data-testid="genre-pill-cinematic---game"]');
    await expect(cinemaPill).toBeVisible();
    await cinemaPill.click();
    await expect(cinemaPill).toHaveAttribute('aria-selected', 'true');

    const interstellarCard = page.locator('[data-testid="song-card-interstellar-main-theme"]');
    await expect(interstellarCard).toBeVisible();

    // 6. Switch to Classical pill
    const classicalPill = page.locator('[data-testid="genre-pill-classical"]');
    await expect(classicalPill).toBeVisible();
    await classicalPill.click();
    await expect(classicalPill).toHaveAttribute('aria-selected', 'true');

    const furEliseCard = page.locator('[data-testid="song-card-fur-elise"]');
    await expect(furEliseCard).toBeVisible();

    // Capture screenshot of multi-genre filter strip
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_repertoire_genre_filters.png'),
    });
  });

  test('CATALOG-04: Instant Search Input Across 250 Pieces on Demo Page', async ({ page }) => {
    await page.goto('/demo');

    const searchInput = page.locator('[data-testid="repertoire-search-input"]');
    await expect(searchInput).toBeVisible();

    // 1. Search for "Ghibli" or "Sparkle"
    await searchInput.fill('Sparkle');
    const sparkleCard = page.locator('[data-testid="song-card-sparkle-your-name"]');
    await expect(sparkleCard).toBeVisible();
    await expect(page.locator('[data-testid="song-card-fur-elise"]')).not.toBeVisible();

    // 2. Select the searched piece
    await sparkleCard.click();
    await expect(page.locator('text=Radwimps').first()).toBeVisible();
    await expect(page.locator('text=124 BPM').first()).toBeVisible();

    // 3. Clear search and test another piece (e.g. Megalovania)
    const clearBtn = page.locator('[data-testid="repertoire-search-clear"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');

    await searchInput.fill('Megalovania');
    const megaCard = page.locator('[data-testid="song-card-megalovania-undertale"]');
    await expect(megaCard).toBeVisible();
    await megaCard.click();
    await expect(page.locator('text=Toby Fox').first()).toBeVisible();
    await expect(page.locator('text=120 BPM').first()).toBeVisible();

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06_repertoire_instant_search.png'),
    });
  });
});
