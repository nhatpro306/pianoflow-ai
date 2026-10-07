import { test, expect } from "@playwright/test";

test.describe("PianoFlow AI — Song Library Canonical Route & Open MIDI Importer Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept service worker and dev HMR traffic to avoid flaky timeouts
    await page.route("**/sw.js", (route) => route.abort());
    await page.route("**/workbox-*.js", (route) => route.abort());
  });

  test("SONGS-01: Canonical /songs route renders full song studio and navigation highlights", async ({
    page,
  }) => {
    // 1. Visit /songs route
    await page.goto("/songs");

    // 2. Verify Canonical Header Title
    const heading = page.locator("h1");
    await expect(heading).toContainText("PianoFlow AI Song Studio — 250 Complete Piano Songs (Song Library)");

    // 3. Verify Navbar has 'Songs' link and is marked active
    const songsNavDesktop = page.getByTestId("nav-link-songs");
    await expect(songsNavDesktop).toBeVisible();
    await expect(songsNavDesktop).toHaveText("Songs");
    await expect(songsNavDesktop).toHaveAttribute("data-active", "true");
    await expect(songsNavDesktop).toHaveAttribute("href", "/songs");

    // 4. Verify Interactive Song Modes segmented control
    const interactiveModesSection = page.locator('section[aria-label="Interactive Song Modes"]');
    await expect(interactiveModesSection).toBeVisible();

    // 5. Verify World-Class Song Catalog banner referencing Flowkey, Synthesia & Simply Piano
    await expect(
      page.getByText(/Play all 250 built-in complete songs \(Flowkey, Synthesia & Simply Piano caliber\)/i)
    ).toBeVisible();
    await expect(page.getByText(/MuseScore/i).first()).toBeVisible();
    await expect(page.getByText(/BitMidi/i).first()).toBeVisible();
    await expect(page.getByText(/Mutopia/i).first()).toBeVisible();
  });

  test("SONGS-02: Open MIDI Importer badge and info modal opens with external repository guide", async ({
    page,
  }) => {
    await page.goto("/songs");

    // 1. Click Open MIDI Importer badge
    const importerBadge = page.getByTestId("open-midi-importer-badge");
    await expect(importerBadge).toBeVisible();
    await importerBadge.click();

    // 2. Verify Modal Title & World-Class Benchmark callout
    await expect(page.getByRole("heading", { name: "🌐 Song Library & Open MIDI Importer" })).toBeVisible();
    await expect(page.getByText("World-Class Full Song Learning Benchmark")).toBeVisible();
    await expect(page.getByText("Flowkey • Synthesia • Simply Piano")).toBeVisible();

    // 3. Verify Repository Details
    await expect(page.getByText("musescore.com")).toBeVisible();
    await expect(page.getByText("bitmidi.com")).toBeVisible();
    await expect(page.getByText("mutopiaproject.org")).toBeVisible();

    // 4. Close Modal
    const closeBtn = page.getByRole("button", { name: "Bắt đầu luyện tập tác phẩm 🎹" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByRole("heading", { name: "🌐 Song Library & Open MIDI Importer" })).not.toBeVisible();
  });

  test("SONGS-03: Backwards compatibility of /demo route and navbar active state", async ({
    page,
  }) => {
    // 1. Visit legacy /demo route
    await page.goto("/demo");

    // 2. Verify it renders the Song Studio
    await expect(page.locator("h1")).toContainText("PianoFlow AI Song Studio — 250 Complete Piano Songs (Song Library)");

    // 3. Verify Navbar 'Songs' link recognizes /demo and is active
    const songsNavDesktop = page.getByTestId("nav-link-songs");
    await expect(songsNavDesktop).toHaveAttribute("data-active", "true");

    // 4. Verify genre pills work identically on /demo
    const animePill = page.getByTestId("genre-pill-anime---ghibli");
    await expect(animePill).toBeVisible();
    await animePill.click();
    await expect(page.locator('[data-testid="song-card-sparkle-your-name"]')).toBeVisible();
  });
});
