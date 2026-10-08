import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

test.describe("PianoFlow AI — Comprehensive Song Selection & Playback Verification", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Intercept service worker and dev HMR traffic to avoid flaky timeouts
    await page.route("**/sw.js", (route) => route.abort());
    await page.route("**/workbox-*.js", (route) => route.abort());
  });

  test("Step 4: Comprehensive Song Selection, Active Song Indicator, Card Playback & Jazz Repertoire Verification", async ({
    page,
  }) => {
    console.log("=== STARTING COMPREHENSIVE SONG SELECTION VERIFICATION ===");

    // 1. Initial Load on /songs
    console.log("\n--- Phase 1: Verifying Initial State (Für Elise) ---");
    await page.goto("/songs");
    await page.waitForLoadState("networkidle");

    const indicatorBadge = page.getByTestId("active-song-indicator-badge");
    const activeNoteCount = page.getByTestId("active-song-note-count");
    const previewCanvas = page.locator('canvas[aria-label^="Falling-note preview"]');
    const visualizerTab = page.getByTestId("tab-visualizer");
    const practiceTab = page.getByTestId("tab-practice");
    const visualizerPanel = page.locator("#panel-visualizer");
    const practicePanel = page.locator("#panel-practice");
    const searchInput = page.getByTestId("repertoire-search-input");
    const bottomBarPlayBtn = page.getByTestId("bottom-bar-play-toggle");

    // Verify indicator badge exists and displays Für Elise
    await expect(indicatorBadge).toBeVisible();
    await expect(indicatorBadge).toContainText("Für Elise");
    await expect(indicatorBadge).toContainText("Ludwig van Beethoven");
    console.log(`[Phase 1 Passed] Active Song Indicator: "${await indicatorBadge.innerText()}"`);

    // Verify initial note count & preview canvas
    await expect(activeNoteCount).toHaveText("48 notes");
    await expect(previewCanvas).toHaveAttribute("aria-label", /48 notes/);
    console.log(`[Phase 1 Passed] Canvas Aria Label: "${await previewCanvas.getAttribute("aria-label")}"`);

    // Verify mode starts in visualizer
    await expect(visualizerTab).toHaveAttribute("aria-selected", "true");
    await expect(visualizerPanel).toBeVisible();
    await expect(practicePanel).not.toBeVisible();
    console.log("[Phase 1 Passed] Initial Mode: Visualizer active");

    // 2. Selecting Anime Song (Sparkle)
    console.log("\n--- Phase 2: Selecting Anime Song (Sparkle) ---");
    await searchInput.fill("Sparkle");
    const sparkleCard = page.getByTestId("song-card-sparkle-your-name");
    await expect(sparkleCard).toBeVisible();

    // Click card body to select song
    await sparkleCard.click();

    // Verify toast: 🎵 Loaded "Sparkle"
    const sparkleToast = page.locator("div.animate-bounce span", {
      hasText: '🎵 Loaded "Sparkle"',
    });
    await expect(sparkleToast).toBeVisible();
    console.log(`[Phase 2 Passed] Toast displayed: "${await sparkleToast.innerText()}"`);

    // Verify Studio deck indicator badge updates to Sparkle by RADWIMPS
    await expect(indicatorBadge).toContainText("Sparkle");
    await expect(indicatorBadge).toContainText(/RADWIMPS/i);
    console.log(`[Phase 2 Passed] Indicator Badge updated: "${await indicatorBadge.innerText()}"`);

    // Verify falling note canvas & active note count reflect Sparkle
    const sparkleNoteCountText = await activeNoteCount.innerText();
    const sparkleNotesNum = parseInt(sparkleNoteCountText);
    expect(sparkleNotesNum).toBeGreaterThan(0);
    await expect(previewCanvas).toHaveAttribute("aria-label", new RegExp(`${sparkleNotesNum} notes`));
    console.log(`[Phase 2 Passed] Canvas Note Count updated: "${await previewCanvas.getAttribute("aria-label")}"`);

    // 3. Clicking Play on Song Card (River Flows in You)
    console.log("\n--- Phase 3: Playing Song Card (River Flows in You) ---");
    await searchInput.fill("River Flows in You");
    const riverCard = page.getByTestId("song-card-river-flows-in-you");
    await expect(riverCard).toBeVisible();

    const riverPlayBtn = page.getByTestId("song-card-play-river-flows-in-you");
    await expect(riverPlayBtn).toBeVisible();

    // Click play button on River Flows in You card
    await riverPlayBtn.click();

    // Verify Toast shows: ▶ Now Playing "River Flows in You"
    const riverToast = page.locator("div.animate-bounce span", {
      hasText: '▶ Now Playing "River Flows in You"',
    });
    await expect(riverToast).toBeVisible();
    console.log(`[Phase 3 Passed] Toast displayed: "${await riverToast.innerText()}"`);

    // Verify active mode remains in 'visualizer' (no forced jump to practice mode)
    await expect(visualizerTab).toHaveAttribute("aria-selected", "true");
    await expect(practiceTab).toHaveAttribute("aria-selected", "false");
    await expect(visualizerPanel).toBeVisible();
    await expect(practicePanel).not.toBeVisible();
    console.log("[Phase 3 Passed] Active mode preserved: Visualizer remained active");

    // Verify bottom bar shows 'Pause' (indicating active playback)
    await expect(bottomBarPlayBtn).toBeVisible();
    await expect(bottomBarPlayBtn).toContainText("Pause");
    console.log(`[Phase 3 Passed] Bottom Bar Play Toggle: "${await bottomBarPlayBtn.innerText()}"`);

    // Verify card play button shows animated equalizer bars
    await expect(riverPlayBtn).toHaveAttribute("aria-label", /Pause River Flows in You/);
    const animatedBars = riverPlayBtn.locator("span");
    await expect(animatedBars).toHaveCount(3);
    console.log("[Phase 3 Passed] Card Play Button: Equalizer bars actively animating");

    // Verify falling note canvas reflects River Flows in You's note count
    const riverNoteCountText = await activeNoteCount.innerText();
    const riverNotesNum = parseInt(riverNoteCountText);
    expect(riverNotesNum).toBeGreaterThan(0);
    await expect(previewCanvas).toHaveAttribute("aria-label", new RegExp(`${riverNotesNum} notes`));
    console.log(`[Phase 3 Passed] Canvas Aria Label: "${await previewCanvas.getAttribute("aria-label")}"`);

    // Verify Studio deck indicator badge reflects River Flows in You
    await expect(indicatorBadge).toContainText("River Flows in You");
    await expect(indicatorBadge).toContainText("Yiruma");
    console.log(`[Phase 3 Passed] Indicator Badge updated: "${await indicatorBadge.innerText()}"`);

    // 4. Selecting a Jazz/Lo-Fi song (Autumn Leaves)
    console.log("\n--- Phase 4: Selecting Jazz/Lo-Fi Song (Autumn Leaves) ---");
    // Clear search and click Jazz & Lo-Fi genre pill
    const searchClear = page.getByTestId("repertoire-search-clear");
    if (await searchClear.isVisible()) {
      await searchClear.click();
    }
    const jazzPill = page.getByTestId("genre-pill-jazz---lo-fi");
    await jazzPill.click();

    const autumnCard = page.getByTestId("song-card-autumn-leaves");
    await expect(autumnCard).toBeVisible();

    // Click Autumn Leaves card
    await autumnCard.click();

    // Verify toast shows loaded notification
    const autumnToast = page.locator("div.animate-bounce span", {
      hasText: /Loaded "Autumn Leaves/i,
    });
    await expect(autumnToast).toBeVisible();
    console.log(`[Phase 4 Passed] Toast displayed: "${await autumnToast.innerText()}"`);

    // Verify active song updates to Autumn Leaves
    await expect(indicatorBadge).toContainText("Autumn Leaves");
    await expect(indicatorBadge).toContainText(/Bill Evans/i);
    console.log(`[Phase 4 Passed] Indicator Badge updated: "${await indicatorBadge.innerText()}"`);

    // Verify note count and canvas reflect Autumn Leaves
    const autumnNoteCountText = await activeNoteCount.innerText();
    const autumnNotesNum = parseInt(autumnNoteCountText);
    expect(autumnNotesNum).toBeGreaterThan(0);
    await expect(previewCanvas).toHaveAttribute("aria-label", new RegExp(`${autumnNotesNum} notes`));
    console.log(`[Phase 4 Passed] Autumn Leaves Note Count: ${autumnNoteCountText}`);
    console.log(`[Phase 4 Passed] Canvas Aria Label: "${await previewCanvas.getAttribute("aria-label")}"`);

    // 5. Capture verification screenshots to verified_song_selection.png
    console.log("\n--- Phase 5: Capturing Verification Screenshot ---");
    const verifiedScreenshotPath = path.join(SCREENSHOTS_DIR, "verified_song_selection.png");
    await page.screenshot({ path: verifiedScreenshotPath, fullPage: true });
    expect(fs.existsSync(verifiedScreenshotPath)).toBe(true);
    console.log(`[Phase 5 Passed] Verification Screenshot saved: ${verifiedScreenshotPath}`);

    console.log("=== COMPREHENSIVE SONG SELECTION VERIFICATION FINISHED SUCCESSFULLY ===");
  });
});
