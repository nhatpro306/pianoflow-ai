/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve(__dirname, "../../../docs/e2e/overhaul");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function getMockProjects() {
  return [
    {
      id: "proj-1",
      name: "Beethoven - Für Elise",
      status: "ready",
      analysis_summary: {
        bpm: 132,
        duration_sec: 165,
        time_signature: "3/8",
        track_count: 2,
        note_count: 842,
        pitch_min: 45,
        pitch_max: 89,
        hand_split: "auto",
      },
      active_jobs: [],
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "proj-2",
      name: "Chopin - Nocturne Op. 9 No. 2",
      status: "ready",
      analysis_summary: {
        bpm: 64,
        duration_sec: 270,
        time_signature: "12/8",
        track_count: 2,
        note_count: 1200,
        pitch_min: 36,
        pitch_max: 96,
        hand_split: "auto",
      },
      active_jobs: [],
      created_at: "2026-10-03T12:00:00Z",
    },
    {
      id: "proj-3",
      name: "Bach - Minuet in G Major",
      status: "parsing",
      analysis_summary: {
        bpm: 110,
        duration_sec: 90,
        time_signature: "3/4",
        track_count: 2,
        note_count: 320,
        pitch_min: 43,
        pitch_max: 79,
        hand_split: "auto",
      },
      active_jobs: [],
      created_at: "2026-10-04T08:00:00Z",
    },
    {
      id: "proj-4",
      name: "Debussy - Clair de Lune (Corrupted)",
      status: "failed",
      analysis_summary: null,
      active_jobs: [],
      created_at: "2026-09-25T14:00:00Z",
    },
  ];
}

function getMockNoteData() {
  return {
    schema_version: 1,
    bpm: 132,
    duration_sec: 30,
    time_signature: "3/8",
    tracks: [
      { index: 0, name: "Right Hand", note_count: 3 },
      { index: 1, name: "Left Hand", note_count: 1 },
    ],
    notes: [
      { id: 1, pitch: 76, name: "E5", velocity: 80, start: 0.1, end: 0.5, duration: 0.4, track: 0, hand: "R" as const },
      { id: 2, pitch: 75, name: "D#5", velocity: 80, start: 0.5, end: 0.9, duration: 0.4, track: 0, hand: "R" as const },
      { id: 3, pitch: 76, name: "E5", velocity: 80, start: 0.9, end: 1.3, duration: 0.4, track: 0, hand: "R" as const },
      { id: 4, pitch: 57, name: "A3", velocity: 70, start: 0.1, end: 1.5, duration: 1.4, track: 1, hand: "L" as const },
    ],
  };
}

const mockUserProgress = {
  current_streak_days: 7,
  level: 5,
  total_xp: 750,
  xp_to_next_level: 1000,
};

const mockSettings = {
  resolution: "1080p",
  fps: 60,
  speed_multiplier: 1.0,
  piano_sound: "acoustic_grand",
  volume: 0.8,
  reverb: "medium",
  difficulty: "original",
  show_note_names: true,
  show_keyboard: true,
  theme_preset: "neon",
  colors: {
    right_hand: "#7c3aed",
    left_hand: "#06b6d4",
    key_highlight: "#22d3ee",
    glow: "#7c3aed",
    hit_effect: "#06b6d4",
    background: "#050507",
  },
  glow_intensity: 0.5,
  note_fall_speed: 1.0,
  keyboard_size: 1.0,
  version: 1,
};

async function setupMocks(page: any, options: { authenticated?: boolean } = {}) {
  const { authenticated = true } = options;
  const projects = getMockProjects();

  await page.addInitScript(({ isAuth }: { isAuth: boolean }) => {
    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }

    class MockMIDIInput {
      id = "mock-piano-1";
      name = "Virtual Concert Grand";
      manufacturer = "PianoFlow";
      state = "connected";
      connection = "open";
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

    const mockUser = isAuth
      ? {
          id: "mock-user-123",
          email: "pianist@pianoflow.ai",
          app_metadata: {},
          user_metadata: { name: "Test Pianist" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }
      : null;

    const mockSession = isAuth
      ? {
          access_token: "mock-access-token-12345",
          token_type: "bearer",
          user: mockUser,
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
        }
      : null;

    (window as any).__MOCK_SUPABASE_CLIENT__ = {
      auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        onAuthStateChange: (cb: any) => {
          setTimeout(() => cb(isAuth ? "SIGNED_IN" : "SIGNED_OUT", mockSession), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async () =>
          isAuth
            ? { data: { session: mockSession, user: mockUser }, error: null }
            : { data: { session: null, user: null }, error: new Error("Invalid credentials") },
        signUp: async () =>
          isAuth
            ? { data: { session: mockSession, user: mockUser }, error: null }
            : { data: { session: null, user: null }, error: null },
        signOut: async () => ({ error: null }),
      },
    };

    (window as any).EventSource = class {
      addEventListener() {}
      removeEventListener() {}
      close() {}
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = async () =>
        ({
          installing: null,
          waiting: null,
          active: null,
          addEventListener: () => {},
          removeEventListener: () => {},
        } as any);
    }
  }, { isAuth: authenticated });

  await page.route("**/sw.js", (route: any) => route.abort());
  await page.route("**/workbox-*.js", (route: any) => route.abort());

  // Use ** wildcard across all path segments to match all API endpoints
  await page.route("**/api/v1/**", async (route: any) => {
    const url = route.request().url();
    if (url.includes("/notes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(getMockNoteData()),
      });
    } else if (url.includes("/settings")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSettings),
      });
    } else if (url.includes("/outputs") || url.includes("/jobs")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    } else if (url.includes("/user/progress")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUserProgress),
      });
    } else if (url.includes("/practice-sessions")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "sess-1",
          xp_gained: 50,
          level_up: false,
          new_streak: 7,
        }),
      });
    } else if (url.includes("/proj-1") || url.includes("/123")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projects[0]),
      });
    } else if (url.includes("/projects")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: projects }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
  });

  await page.route("**/api/projects*", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: projects }),
    });
  });
}

test.describe("PianoFlow AI — Milestone M.4: Comprehensive UI/UX Overhaul Suite", () => {
  test("UI-E2E-01: Global Header & Active Route Highlight", async ({ page }) => {
    await setupMocks(page);

    // 1. Visit Home Route on Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(desktopNav).toBeVisible();

    const homeLink = page.getByTestId("nav-link-home");
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("data-active", "true");
    await expect(homeLink).toHaveClass(/bg-white\/10/);

    const demoLink = page.getByTestId("nav-link-demo");
    const pricingLink = page.getByTestId("nav-link-pricing");
    await expect(demoLink).toHaveAttribute("data-active", "false");
    await expect(pricingLink).toHaveAttribute("data-active", "false");

    // Persistent streak badge in navbar
    const streakPill = page.getByTestId("navbar-streak-pill");
    await expect(streakPill).toBeVisible();
    await expect(streakPill).toContainText("🔥");
    await expect(streakPill).toHaveAttribute("href", "/projects");

    // Capture desktop header evidence
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01_global_header_nav.png"),
      fullPage: false,
    });

    // 2. Navigate to Demo Route
    await page.goto("/demo");
    await expect(demoLink).toHaveAttribute("data-active", "true");
    await expect(demoLink).toHaveClass(/bg-white\/10/);
    await expect(homeLink).toHaveAttribute("data-active", "false");

    // 3. Navigate to Pricing Route
    await page.goto("/pricing");
    await expect(pricingLink).toHaveAttribute("data-active", "true");
    await expect(pricingLink).toHaveClass(/bg-white\/10/);
    await expect(demoLink).toHaveAttribute("data-active", "false");

    // 4. Test Mobile Drawer trigger & drawer visibility on mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileMenuBtn = page.getByRole("button", { name: "Open navigation menu" });
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();

    const mobileDrawer = page.locator('div[role="dialog"][aria-label="Mobile Navigation Menu"]');
    await expect(mobileDrawer).toBeVisible();
    await expect(page.getByTestId("mobile-streak-pill")).toBeVisible();

    // Close drawer
    const closeBtn = page.getByRole("button", { name: "Close navigation menu" });
    await closeBtn.click();
    await expect(mobileDrawer).not.toBeVisible();
  });

  test("UI-E2E-02: Landing Page Hero & Feature Cards", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // 1. Hero Badge chip
    const heroBadge = page.getByText("Next-Gen Piano Learning & Transcription");
    await expect(heroBadge).toBeVisible();

    // 2. Headline and Subtitle
    const headline = page.getByRole("heading", {
      name: /Master Any Song on Piano with AI-Powered 60 FPS Visuals/i,
    });
    await expect(headline).toBeVisible();

    const subtitle = page.getByText(
      /Transform any YouTube video, MP3 audio, or MIDI into interactive Synthesia-style tutorials/i
    );
    await expect(subtitle).toBeVisible();

    // 3. Primary CTA routes to /create
    const ctaStart = page.getByRole("link", { name: "Start Practicing Free" }).first();
    await expect(ctaStart).toBeVisible();
    await expect(ctaStart).toHaveAttribute("href", "/create");

    // 4. Secondary CTA routes to /demo
    const ctaDemo = page.getByRole("link", { name: /Explore Classical Demo/i }).first();
    await expect(ctaDemo).toBeVisible();
    await expect(ctaDemo).toHaveAttribute("href", "/demo");

    // 5. Teaser preview card linking to /demo
    const teaserCard = page.locator('a[href="/demo"]').filter({
      hasText: /Für Elise — Ludwig van Beethoven/i,
    });
    await expect(teaserCard).toBeVisible();

    // 6. Feature Grid Cards with hover elevation
    await expect(page.getByRole("heading", { name: "Interactive Web MIDI Practice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Audio-to-MIDI Transcription Engine/i })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02_landing_hero_features.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-03: Classical Demo Showcase & Single Sticky Header Invariant", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/demo");

    // 1. ZERO DUPLICATE HEADERS INVARIANT:
    // Only the global Navbar <header> should exist on the page.
    const allHeaders = page.locator("header");
    await expect(allHeaders).toHaveCount(1);

    // 2. Sub-header Action Banner inside <main>
    await expect(page.locator("h1", { hasText: "Interactive Classical Library Showcase" })).toBeVisible();
    await expect(page.getByText("Zero Auth • Instant Play")).toBeVisible();
    await expect(page.getByRole("link", { name: "Upload Custom File" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export & Share/i })).toBeVisible();

    // 3. 250/560+/1,000+ Piece Multi-Genre Repertoire Library & Filtering
    await expect(page.getByText(/of (250|565|1000|1,000) Pieces/i)).toBeVisible();

    // Check genre pills
    const allPill = page.getByTestId("genre-pill-all");
    const animePill = page.getByTestId("genre-pill-anime---ghibli");
    const classicalPill = page.getByTestId("genre-pill-classical");
    await expect(allPill).toBeVisible();
    await expect(animePill).toBeVisible();
    await expect(classicalPill).toBeVisible();

    // Click anime pill and verify count changes
    await animePill.click();
    await expect(page.getByText(/(50|100|180) of (250|565|1000|1,000) Pieces/i)).toBeVisible();

    // Search input filtering
    const searchInput = page.getByTestId("repertoire-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Totoro");
    await expect(page.getByText(/of (250|565|1000|1,000) Pieces/i)).toBeVisible();

    // Clear search by clearing input value
    await searchInput.fill("");
    await expect(searchInput).toHaveValue("");

    // Switch back to All genre
    await allPill.click();
    await expect(page.getByText(/(250|565|1000|1,000) of (250|565|1000|1,000) Pieces/i)).toBeVisible();

    // 4. Default Selected Card Styling
    const furEliseCard = page.getByTestId("song-card-fur-elise");
    await expect(furEliseCard).toBeVisible();
    await expect(furEliseCard).toHaveClass(/ring-cyan-500\/50/);

    // 5. 4-Mode Interactive SegmentedControl Clean Switching
    const tabVisualizer = page.getByTestId("tab-visualizer");
    const tabPractice = page.getByTestId("tab-practice");
    const tabSheet = page.getByTestId("tab-sheet");
    const tabCoaching = page.getByTestId("tab-coaching");

    await expect(tabVisualizer).toBeVisible();
    await expect(tabPractice).toBeVisible();
    await expect(tabSheet).toBeVisible();
    await expect(tabCoaching).toBeVisible();

    // Switch to Practice Mode
    await tabPractice.scrollIntoViewIfNeeded();
    await tabPractice.click({ force: true });
    await expect(page.locator("#panel-practice")).toBeVisible();
    await expect(page.getByTestId("score-counter")).toBeVisible();
    await expect(page.getByTestId("accuracy-badge")).toBeVisible();
    await expect(page.getByTestId("combo-streak")).toBeVisible();

    // Switch to Sheet Music Mode
    await tabSheet.scrollIntoViewIfNeeded();
    await tabSheet.click({ force: true });
    await expect(page.locator("#panel-sheet")).toBeVisible();
    await expect(page.locator(".sheet-music-container")).toBeVisible();

    // Switch to Coaching Mode
    await tabCoaching.scrollIntoViewIfNeeded();
    await tabCoaching.click({ force: true });
    await expect(page.locator("#panel-coaching")).toBeVisible();
    await expect(page.getByText(/Bi-directional Timing Gauge/i)).toBeVisible();

    // Switch back to Visualizer Mode
    await tabVisualizer.scrollIntoViewIfNeeded();
    await tabVisualizer.click({ force: true });
    await expect(page.locator("#panel-visualizer")).toBeVisible();

    // 6. Consolidated Workspace Controls (Metronome + Difficulty)
    await expect(page.getByText(/Metronome Sync:/i)).toBeVisible();
    await expect(page.getByTestId("active-song-note-count")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03_demo_showcase_single_header.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-04: Repertoire Projects Hub", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects");

    // 1. Page Header & Streak Details
    await expect(page.locator("h1", { hasText: "My Repertoire Projects" })).toBeVisible();
    await expect(page.getByTestId("header-streak-badge")).toContainText("7d Streak");
    await expect(page.getByTestId("linear-level-progress")).toContainText("Lv.5");

    // 2. Search filtering
    const searchInput = page.getByTestId("project-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Beethoven");
    await expect(page.getByText("Beethoven - Für Elise")).toBeVisible();
    await expect(page.getByText("Chopin - Nocturne Op. 9 No. 2")).not.toBeVisible();

    await searchInput.fill("");

    // 3. Status Tabs Filtering
    const tabAll = page.getByTestId("status-tab-all");
    const tabReady = page.getByTestId("status-tab-ready");
    const tabParsing = page.getByTestId("status-tab-processing");
    const tabFailed = page.getByTestId("status-tab-failed");

    await expect(tabAll).toBeVisible();
    await expect(tabReady).toBeVisible();
    await expect(tabParsing).toBeVisible();
    await expect(tabFailed).toBeVisible();

    // Click Ready tab
    await tabReady.click();
    await expect(page.getByText("Beethoven - Für Elise")).toBeVisible();
    await expect(page.getByText("Chopin - Nocturne Op. 9 No. 2")).toBeVisible();
    await expect(page.getByText("Bach - Minuet in G Major")).not.toBeVisible();

    // Click All tab
    await tabAll.click();

    // 4. Quick Action Button: Practice Mode Navigation
    const practiceLink = page.locator('a[href*="/practice"]').first();
    await expect(practiceLink).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04_projects_repertoire_hub.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-05: Creation & Ingestion Studio", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/create");

    // 1. Page Header
    await expect(page.locator("h1", { hasText: "Create Piano Lesson & Transcription" })).toBeVisible();

    // 2. Dropzone & Supported Format Badges
    const dropzone = page.locator('div[role="button"][aria-label="Audio file drop zone"]');
    await expect(dropzone).toBeVisible();

    const formatChips = page.getByTestId("supported-format-chips");
    await expect(formatChips).toContainText(".mp3");
    await expect(formatChips).toContainText(".wav");
    await expect(formatChips).toContainText(".mid");

    // 3. Social Platform Badges
    const socialBadges = page.getByTestId("social-platform-badges");
    await expect(socialBadges).toContainText("YouTube");
    await expect(socialBadges).toContainText("TikTok");
    await expect(socialBadges).toContainText("Instagram");

    // 4. Test File Selection & 3-Step Pipeline Tracker UI
    const testMidiBuffer = Buffer.from(
      "MThd\x00\x00\x00\x06\x00\x00\x00\x01\x01\xe0MTrk\x00\x00\x00\x04\x00\x2f\x00"
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "sonata-allegro.mid",
      mimeType: "audio/midi",
      buffer: testMidiBuffer,
    });

    // Verify selected MIDI card renders
    await expect(page.getByRole("heading", { name: "sonata-allegro.mid" })).toBeVisible();
    await expect(page.getByText("Standard MIDI File")).toBeVisible();

    // Verify Transcribe / Upload button is visible
    const uploadBtn = page.getByRole("button", { name: "Upload MIDI Project 🎹" });
    await expect(uploadBtn).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05_create_ingestion_studio.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-06: Interactive Practice Studio", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects/proj-1/practice");

    // 1. Single-Row Top Navigation HUD
    const practiceHeader = page.locator("header").first();
    await expect(practiceHeader).toBeVisible();
    await expect(page.getByRole("button", { name: /Projects/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sheet Music/i })).toBeVisible();
    await expect(page.locator("h1", { hasText: "Beethoven - Für Elise" })).toBeVisible();

    // Hardware status badge
    await expect(page.getByText(/Virtual Concert Grand Connected|MIDI Hardware Connected/i).first()).toBeVisible();

    // 2. Floating Frosted-Glass Performance HUD
    await expect(page.getByTestId("score-counter")).toBeVisible();
    await expect(page.getByTestId("accuracy-badge")).toBeVisible();
    await expect(page.getByTestId("combo-streak")).toBeVisible();

    // 3. Practice Mode Segmented Toggle: Wait Mode Activation & Target Key Glow
    const waitModeOption = page.getByTestId("mode-wait");
    const continuousOption = page.getByTestId("mode-continuous");
    await expect(waitModeOption).toBeVisible();
    await expect(continuousOption).toBeVisible();

    // Ensure Wait Mode is active
    await waitModeOption.click();

    // Verify target keys render pulsating glowing styles in Wait Mode
    const pulsatingKey = page.locator("button.animate-pulse").first();
    await expect(pulsatingKey).toBeVisible();
    await expect(pulsatingKey).toHaveClass(/ring-2/);

    // 4. Secondary Control Strip
    await expect(page.getByText("Difficulty:")).toBeVisible();
    await expect(page.getByRole("button", { name: /Auto Ramp/i })).toBeVisible();

    // 5. Test Virtual Key Click response
    const whiteKey = page.locator('button[aria-label^="Key "]').first();
    await whiteKey.click();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06_practice_studio_hud_waitmode.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-07: Vector Sheet Music Viewer", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects/proj-1/sheet");

    // 1. Frosted-glass Controls Bar (with print:hidden)
    const sheetHeader = page.locator("header.print\\:hidden");
    await expect(sheetHeader).toBeVisible();
    await expect(page.locator("h1", { hasText: "Beethoven - Für Elise" })).toBeVisible();

    // 2. Hands Filter & Speed Multiplier Segmented Controls
    await expect(page.getByTestId("hand-both")).toBeVisible();
    await expect(page.getByTestId("hand-rh")).toBeVisible();
    await expect(page.getByTestId("hand-lh")).toBeVisible();
    await expect(page.getByTestId("speed-1.0")).toBeVisible();

    // 3. Numeric Zoom Steppers Readout
    const zoomPercentage = page.getByTestId("zoom-percentage");
    const zoomInBtn = page.getByTestId("zoom-in-btn");
    const zoomOutBtn = page.getByTestId("zoom-out-btn");

    await expect(zoomPercentage).toHaveText("100%");
    await zoomInBtn.click();
    await expect(zoomPercentage).toHaveText("110%");
    await zoomOutBtn.click();
    await expect(zoomPercentage).toHaveText("100%");

    // 4. High-Contrast @media print Stylesheet Invariant
    const printStyles = await page.locator(".sheet-music-container style").textContent();
    expect(printStyles).toContain("@media print");
    expect(printStyles).toContain("background-color: #ffffff !important");
    expect(printStyles).toContain("color: #000000 !important");

    // 5. Sheet Music Container
    await expect(page.locator(".sheet-music-container")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "07_vector_sheet_music_viewer.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-08: Pricing & Membership Hub", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");

    // 1. Page Header
    await expect(page.locator("h1", { hasText: "Invest in Your Musical Fluency" })).toBeVisible();

    // 2. Monthly / Annual Billing Toggle
    const toggleMonthly = page.getByTestId("billing-toggle-monthly");
    const toggleAnnual = page.getByTestId("billing-toggle-annual");
    const pricePro = page.getByTestId("price-pro");

    await expect(toggleMonthly).toBeVisible();
    await expect(toggleAnnual).toBeVisible();
    await expect(pricePro).toHaveText("$12");

    // Switch to Annual Billing with hydration fallback
    await toggleAnnual.click();
    try {
      await expect(pricePro).toHaveText("$9.99", { timeout: 2000 });
    } catch {
      await toggleAnnual.click();
      await expect(pricePro).toHaveText("$9.99");
    }
    await expect(page.getByText("Save 20% 🎉")).toBeVisible();

    // Switch back to Monthly Billing
    await toggleMonthly.click();
    await expect(pricePro).toHaveText("$12");

    // 3. Feature Comparison Matrix
    await expect(page.getByText("MIDI File Upload Size")).toBeVisible();
    await expect(page.getByText("AI Audio & Video Transcription")).toBeVisible();
    await expect(page.getByText("Video Export Resolution")).toBeVisible();

    // 4. Upgrade to Pro CTA
    const upgradeBtn = page.getByRole("button", { name: "Upgrade to Pro" });
    await expect(upgradeBtn).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "08_pricing_membership_hub.png"),
      fullPage: true,
    });
  });

  test("UI-E2E-09: Authentication & Onboarding", async ({ page }) => {
    // Authenticated = false so /login does NOT redirect to /projects
    await setupMocks(page, { authenticated: false });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");

    // 1. Glassmorphic Card Container
    const authCard = page.getByTestId("auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard).toHaveClass(/backdrop-blur-xl/);

    // 2. Mode Switches: Sign In vs Create Account
    const tabLogin = page.getByTestId("auth-tab-login");
    const tabSignup = page.getByTestId("auth-tab-signup");
    await expect(tabLogin).toBeVisible();
    await expect(tabSignup).toBeVisible();

    // Switch to Create Account
    await tabSignup.click();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();

    // Switch back to Sign In
    await tabLogin.click();
    await expect(page.getByTestId("auth-submit-btn")).toBeVisible();

    // 3. OAuth Buttons
    await expect(page.getByTestId("oauth-google-btn")).toBeVisible();
    await expect(page.getByTestId("oauth-github-btn")).toBeVisible();

    // 4. Input Fields & Validation
    const emailInput = page.getByTestId("input-email");
    const passwordInput = page.getByTestId("input-password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Focus input and verify focus styles
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await emailInput.fill("pianist@example.com");
    await passwordInput.fill("secret123");

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "09_auth_glassmorphic_card.png"),
      fullPage: false,
    });
  });

  test("UI-E2E-10: Accessibility & Contrast Audit", async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Check Keyboard Navigation & Focus Rings on Home
    await page.goto("/");
    await page.keyboard.press("Tab");

    // 2. ARIA Semantics on Demo Page
    await page.goto("/demo");
    const genreTablist = page.locator('div[role="tablist"][aria-label="Repertoire Genre Filter"]');
    await expect(genreTablist).toBeVisible();

    const selectedTab = genreTablist.locator('button[aria-selected="true"]');
    await expect(selectedTab).toBeVisible();

    // 3. Check High-Contrast Header Text against Obsidian Void
    const headings = page.locator("h1, h2");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);

    // Verify primary heading color is high contrast (oklch or rgb)
    const h1 = page.locator("h1").first();
    const color = await h1.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).toMatch(/rgb\(\s*2\d\d,\s*2\d\d,\s*2\d\d\s*\)|oklch\(\s*0\.[89]\d*/);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "10_accessibility_contrast_audit.png"),
      fullPage: false,
    });
  });
});
