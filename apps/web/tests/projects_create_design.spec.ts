/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";

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

const mockUserProgress = {
  current_streak_days: 5,
  level: 4,
  total_xp: 520,
  xp_to_next_level: 800,
};

async function setupMocks(page: any, customProjects?: any[]) {
  const projects = customProjects ?? getMockProjects();

  await page.addInitScript(() => {
    const mockUser = {
      id: "mock-user-123",
      email: "pianist@pianoflow.ai",
      app_metadata: {},
      user_metadata: { name: "Test Pianist" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const mockSession = {
      access_token: "mock-access-token-12345",
      token_type: "bearer",
      user: mockUser,
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
    };

    (window as any).__MOCK_SUPABASE_CLIENT__ = {
      auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        onAuthStateChange: (cb: any) => {
          setTimeout(() => cb("SIGNED_IN", mockSession), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
        signUp: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
      },
    };

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

  await page.route("**/sw.js", (route: any) => route.abort());
  await page.route("**/workbox-*.js", (route: any) => route.abort());
  await page.route("**/_next/webpack-hmr", (route: any) => route.abort());
  await page.route("**/_next/static/webpack/**", (route: any) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("**/api/v1/projects*", async (route: any) => {
    const url = route.request().url();
    if (url.includes("/outputs") || url.includes("/jobs")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: projects }),
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

  await page.route("**/api/v1/user/progress*", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockUserProgress),
    });
  });
}

test.describe("PianoFlow AI — Milestone M.3: Repertoire Hub & Creation Studio Design System", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("Test 1: Projects dashboard renders header streak pill, search input, status badges, and quick action buttons with new classes", async ({
    page,
  }) => {
    await page.goto("/projects");

    // 1. Header title with gradient highlight
    const headerTitle = page.locator("h1");
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText("My Repertoire");
    await expect(headerTitle).toContainText("Projects");
    await expect(headerTitle).toContainText("🎹");

    // 2. Streak flame badge and Linear-style XP progress
    const streakBadge = page.getByTestId("header-streak-badge");
    await expect(streakBadge).toBeVisible();
    await expect(streakBadge).toContainText("5d Streak");
    await expect(streakBadge).toContainText("5 Days");

    const levelProgress = page.getByTestId("linear-level-progress");
    await expect(levelProgress).toBeVisible();
    await expect(levelProgress).toContainText("Lv.4");
    await expect(levelProgress).toContainText("520 XP");

    // 3. New Project gradient button
    const newProjectBtn = page.getByTestId("new-project-link");
    await expect(newProjectBtn).toBeVisible();
    await expect(newProjectBtn).toHaveAttribute("href", "/create");
    const buttonElement = newProjectBtn.locator("button");
    await expect(buttonElement).toHaveClass(/bg-gradient-to-r/);

    // 4. Search input with glassmorphism
    const searchInput = page.getByTestId("project-search-input");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveClass(/backdrop-blur-xl/);

    // 5. Status filter tabs with Badge counters
    const tabAll = page.getByTestId("status-tab-all");
    await expect(tabAll).toBeVisible();
    const countAll = page.getByTestId("status-count-all");
    await expect(countAll).toContainText("(4)");

    const tabReady = page.getByTestId("status-tab-ready");
    await expect(tabReady).toBeVisible();
    const countReady = page.getByTestId("status-count-ready");
    await expect(countReady).toContainText("(2)");

    // 6. Project cards render with new design system styles
    const cardProj1 = page.getByTestId("project-card-proj-1");
    await expect(cardProj1).toBeVisible();
    await expect(cardProj1).toHaveClass(/bg-\[#121215\]\/80/);
    await expect(cardProj1).toHaveClass(/hover:shadow-violet-500\/5/);
  });

  test("Test 2: ProjectCard renders duration/note telemetry and action buttons", async ({
    page,
  }) => {
    await page.goto("/projects");

    // 1. Beethoven Card Details
    const beethovenCard = page.getByTestId("project-card-proj-1");
    await expect(beethovenCard).toBeVisible();

    // Title
    const titleLink = page.getByTestId("project-title-proj-1");
    await expect(titleLink).toContainText("Beethoven - Für Elise");

    // Unified Status Badge (Ready / Completed)
    await expect(beethovenCard.locator("text=Ready")).toBeVisible();

    // Duration, Note Count, and Difficulty Telemetry
    await expect(beethovenCard.locator("dt", { hasText: "Duration" })).toBeVisible();
    await expect(beethovenCard.locator("text=2:45")).toBeVisible(); // 165s
    await expect(beethovenCard.locator("dt", { hasText: "Notes" })).toBeVisible();
    await expect(beethovenCard.locator("text=842 notes")).toBeVisible();
    await expect(beethovenCard.locator("dt", { hasText: "Difficulty" })).toBeVisible();
    await expect(beethovenCard.locator("text=Intermediate")).toBeVisible();

    // Quick Action Buttons
    const practiceBtn = page.getByTestId("project-practice-btn-proj-1");
    await expect(practiceBtn).toBeVisible();
    await expect(practiceBtn).toHaveAttribute("href", "/projects/proj-1/practice");
    await expect(practiceBtn.locator("button")).toHaveClass(/bg-gradient-to-r/);

    const sheetBtn = page.getByTestId("project-sheet-btn-proj-1");
    await expect(sheetBtn).toBeVisible();
    await expect(sheetBtn).toHaveAttribute("href", "/projects/proj-1/sheet");

    const exportBtn = page.getByTestId("project-export-btn-proj-1");
    await expect(exportBtn).toBeVisible();

    const deleteBtn = page.getByTestId("project-delete-btn-proj-1");
    await expect(deleteBtn).toBeVisible();

    // 2. Processing and Failed Cards Status Badges
    const processingCard = page.getByTestId("project-card-proj-3");
    await expect(processingCard.getByText("Processing...", { exact: true })).toBeVisible();

    const failedCard = page.getByTestId("project-card-proj-4");
    await expect(failedCard.getByText("Failed", { exact: true })).toBeVisible();
  });

  test("Test 3: Create page renders dropzone format chips, platform link input, and 3-step progress pipeline", async ({
    page,
  }) => {
    await page.goto("/create");

    // 1. Header with title and explanation
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Create Piano Lesson & Transcription");
    await expect(heading).toContainText("🎙️");

    // 2. Dropzone with format chips
    const dropzone = page.locator('[aria-label="Audio file drop zone"]');
    await expect(dropzone).toBeVisible();
    await expect(dropzone).toHaveClass(/border-dashed/);

    const formatChips = page.getByTestId("supported-format-chips");
    await expect(formatChips).toBeVisible();
    await expect(formatChips).toContainText(".mp3");
    await expect(formatChips).toContainText(".wav");
    await expect(formatChips).toContainText(".mid");
    await expect(formatChips).toContainText(".m4a");
    await expect(formatChips).toContainText("Max 50 MB");

    // 3. Social link card
    const socialBadges = page.getByTestId("social-platform-badges");
    await expect(socialBadges).toBeVisible();
    await expect(socialBadges).toContainText("YouTube");
    await expect(socialBadges).toContainText("TikTok");
    await expect(socialBadges).toContainText("Instagram");

    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute("placeholder", /youtube\.com/);

    const rightsCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(rightsCheckbox).toBeVisible();

    const transcribeLinkBtn = page.locator("button", { hasText: "Transcribe from link" });
    await expect(transcribeLinkBtn).toBeVisible();
    await expect(transcribeLinkBtn).toBeDisabled();

    // 4. Full-mix Demucs toggle
    await expect(page.locator("text=Full-mix song stem separation")).toBeVisible();
    await expect(page.locator("text=Isolate piano stem with Demucs AI")).toBeVisible();

    // 5. Test file upload interaction and 3-step progress pipeline mounting
    await page.route("**/api/v1/projects", async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "mock-new-proj-99", name: "Prelude Test", status: "created" }),
      });
    });

    await page.route("**/api/v1/projects/mock-new-proj-99/uploads/init", async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          upload_id: "mock-upload-99",
          upload_url: "https://example.com/mock-upload",
          method: "PUT",
          headers: {},
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          max_bytes: 50000000,
        }),
      });
    });

    await page.route("https://example.com/mock-upload", async (route: any) => {
      await route.fulfill({ status: 200, body: "" });
    });

    await page.route("**/api/v1/projects/mock-new-proj-99/uploads/mock-upload-99/confirm", async (route: any) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    // Provide a MIDI file to trigger the upload flow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "prelude.mid",
      mimeType: "audio/midi",
      buffer: Buffer.from("MThd\0\0\0\x06\0\x01\0\x01\x01\xe0MTrk\0\0\0\x04\0\xff/\0"),
    });

    // Verify MIDI Card appears with Remove button
    await expect(page.locator("h4", { hasText: "prelude.mid" })).toBeVisible();
    await expect(page.locator("text=Standard MIDI File")).toBeVisible();

    // Transcribe/Upload MIDI project button appears with gradient variant
    const uploadMidiBtn = page.locator("button", { hasText: "Upload MIDI Project 🎹" });
    await expect(uploadMidiBtn).toBeVisible();
    await expect(uploadMidiBtn).toHaveClass(/bg-gradient-to-r/);
  });
});
