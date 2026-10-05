/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/e2e/projects');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
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

async function setupDashboardMocks(page: any, customProjects?: any[]) {
  const projects = customProjects ?? getMockProjects();

  await page.addInitScript(() => {
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

  await page.route('**/sw.js', (route: any) => route.abort());
  await page.route('**/workbox-*.js', (route: any) => route.abort());
  await page.route('**/_next/webpack-hmr', (route: any) => route.abort());
  await page.route('**/_next/static/webpack/**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

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

test.describe('PianoFlow AI — Phase L: Project Dashboard Repertoire Hub', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
  });

  test('Scenario 1 (DASH-E2E-01): Dashboard loads project library, renders search bar, status tabs with counters, and sort dropdown', async ({ page }) => {
    await page.goto('/projects');

    // 1. Verify header title
    await expect(page.locator('h1', { hasText: 'Projects' })).toBeVisible();

    // 2. Verify Streak & Level progress badges
    await expect(page.locator('text=5 Days')).toBeVisible();
    await expect(page.locator('text=520 XP')).toBeVisible();

    // 3. Verify + New project button links to /create (NO dead /upload route!)
    const newProjectBtn = page.locator('a', { hasText: '+ New project' });
    await expect(newProjectBtn).toBeVisible();
    await expect(newProjectBtn).toHaveAttribute('href', '/create');

    // 4. Verify search bar is visible
    const searchInput = page.locator('[data-testid="project-search-input"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search projects by title...');

    // 5. Verify status tabs with dynamic badge counters
    await expect(page.locator('[data-testid="status-tab-all"]')).toContainText('All');
    await expect(page.locator('[data-testid="status-count-all"]')).toContainText('(4)');

    await expect(page.locator('[data-testid="status-tab-ready"]')).toContainText('Ready');
    await expect(page.locator('[data-testid="status-count-ready"]')).toContainText('(2)');

    await expect(page.locator('[data-testid="status-tab-processing"]')).toContainText('Processing');
    await expect(page.locator('[data-testid="status-count-processing"]')).toContainText('(1)');

    await expect(page.locator('[data-testid="status-tab-failed"]')).toContainText('Failed');
    await expect(page.locator('[data-testid="status-count-failed"]')).toContainText('(1)');

    // 6. Verify sort selector
    const sortSelect = page.locator('[data-testid="project-sort-select"]');
    await expect(sortSelect).toBeVisible();
    await expect(sortSelect).toHaveValue('newest');

    // 7. Verify all 4 project cards are rendered
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();

    // 8. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_projects_dashboard.png'),
      fullPage: true,
    });
  });

  test('Scenario 2 (DASH-E2E-02): Real-time search filters project list instantly and displays matched items', async ({ page }) => {
    await page.goto('/projects');

    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill('Beethoven');

    // Verify Beethoven is visible, others are hidden
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).not.toBeVisible();

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_projects_filtered_search.png'),
      fullPage: true,
    });
  });

  test('Scenario 3 (DASH-E2E-03): Search clear button (✕) resets search and restores list', async ({ page }) => {
    await page.goto('/projects');

    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill('Chopin');

    // Verify only Chopin is visible
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).not.toBeVisible();

    // Clear button appears
    const clearBtn = page.locator('[data-testid="project-search-clear-button"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Verify input cleared and all projects restored
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();
  });

  test('Scenario 4 (DASH-E2E-04): Status filter tabs (Ready, Processing, Failed) filter items correctly with badge counts', async ({ page }) => {
    await page.goto('/projects');

    // 1. Click Ready tab
    await page.locator('[data-testid="status-tab-ready"]').click();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).not.toBeVisible();

    // 2. Click Processing tab
    await page.locator('[data-testid="status-tab-processing"]').click();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).not.toBeVisible();

    // 3. Click Failed tab
    await page.locator('[data-testid="status-tab-failed"]').click();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).not.toBeVisible();

    // 4. Capture screenshot of filtered state
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_projects_status_filter.png'),
      fullPage: true,
    });

    // 5. Click All tab to restore
    await page.locator('[data-testid="status-tab-all"]').click();
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-card-proj-4"]')).toBeVisible();
  });

  test('Scenario 5 (DASH-E2E-05): Sorting works (Title A-Z orders projects alphabetically)', async ({ page }) => {
    await page.goto('/projects');

    const sortSelect = page.locator('[data-testid="project-sort-select"]');

    // 1. Sort Title (A-Z)
    await sortSelect.selectOption('title_asc');
    const titles = page.locator('[data-testid^="project-title-"]');
    await expect(titles.nth(0)).toContainText('Bach');
    await expect(titles.nth(1)).toContainText('Beethoven');
    await expect(titles.nth(2)).toContainText('Chopin');
    await expect(titles.nth(3)).toContainText('Debussy');

    // 2. Sort Duration (Longest)
    await sortSelect.selectOption('duration_desc');
    await expect(titles.nth(0)).toContainText('Chopin'); // 270s
    await expect(titles.nth(1)).toContainText('Beethoven'); // 165s
    await expect(titles.nth(2)).toContainText('Bach'); // 90s

    // 3. Sort Note Count (Most Notes)
    await sortSelect.selectOption('notes_desc');
    await expect(titles.nth(0)).toContainText('Chopin'); // 1200 notes
    await expect(titles.nth(1)).toContainText('Beethoven'); // 842 notes
    await expect(titles.nth(2)).toContainText('Bach'); // 320 notes
  });

  test('Scenario 6 (DASH-E2E-06): Quick action buttons navigate to /practice, /sheet, or open ExportCenterModal', async ({ page }) => {
    await page.goto('/projects');

    // 1. Verify Practice button link on Beethoven card
    const practiceBtn = page.locator('[data-testid="project-practice-btn-proj-1"]');
    await expect(practiceBtn).toBeVisible();
    await expect(practiceBtn).toHaveAttribute('href', '/projects/proj-1/practice');

    // 2. Verify Sheet button link
    const sheetBtn = page.locator('[data-testid="project-sheet-btn-proj-1"]');
    await expect(sheetBtn).toBeVisible();
    await expect(sheetBtn).toHaveAttribute('href', '/projects/proj-1/sheet');

    // 3. Click Export button to open ExportCenterModal
    const exportBtn = page.locator('[data-testid="project-export-btn-proj-1"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // 4. Verify ExportCenterModal is displayed with Beethoven project details
    await expect(page.locator('text=Export Center & Downloads')).toBeVisible();
    await expect(page.locator('[data-testid="export-modal-project-title"]')).toContainText('Beethoven - Für Elise');

    // 5. Verify export tabs exist and are clickable
    const sheetTab = page.locator('button[role="tab"]', { hasText: 'Sheet Music' });
    await expect(sheetTab).toBeVisible();
    await sheetTab.click();
    await expect(page.locator('text=Grand Staff PDF')).toBeVisible();

    const midiTab = page.locator('button[role="tab"]', { hasText: 'MIDI Files' });
    await expect(midiTab).toBeVisible();
    await midiTab.click();

    // 6. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_projects_export_modal.png'),
    });

    // 7. Close modal
    const closeBtn = page.locator('button[aria-label="Close export dialog"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('text=Export Center & Downloads')).not.toBeVisible();
  });

  test('Scenario 7 (DASH-E2E-07): Empty match filter state displays "Clear Filters" button and clicking it resets filters', async ({ page }) => {
    await page.goto('/projects');

    // 1. Type non-matching search string
    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill('NonExistentSong123XYZ');

    // 2. Verify zero-match empty state is shown
    await expect(page.locator('[data-testid="zero-match-empty-state"]')).toBeVisible();
    await expect(page.locator('text=No projects match your filter')).toBeVisible();

    // 3. Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_projects_empty_match.png'),
      fullPage: true,
    });

    // 4. Click 'Clear Filters' button
    const clearFiltersBtn = page.locator('[data-testid="clear-filters-btn"]');
    await expect(clearFiltersBtn).toBeVisible();
    await clearFiltersBtn.click();

    // 5. Verify search is cleared and project cards reappear
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('[data-testid="project-card-proj-1"]')).toBeVisible();

    // 6. Test completely empty library state (0 projects)
    await page.route('**/api/v1/projects*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });
    await page.reload();

    await expect(page.locator('[data-testid="empty-library-state"]')).toBeVisible();
    await expect(page.locator('text=No projects yet.')).toBeVisible();
    const emptyCta = page.locator('[data-testid="create-project-empty-cta"]');
    await expect(emptyCta).toBeVisible();
    await expect(emptyCta).toHaveAttribute('href', '/create');
  });
});
