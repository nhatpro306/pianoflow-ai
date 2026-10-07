import { test, expect } from "@playwright/test";

test.describe("PianoFlow AI — Milestone M.1: Design Tokens & Core UI Component Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-ui");
  });

  test("UI-01: Verify all Button variants, sizes, tactile physics, and loading state", async ({
    page,
  }) => {
    const gradientBtn = page.getByTestId("btn-gradient");
    await expect(gradientBtn).toBeVisible();
    await expect(gradientBtn).toHaveClass(/btn-tactile/);
    await expect(gradientBtn).toHaveClass(/bg-gradient-to-r/);

    const primaryBtn = page.getByTestId("btn-primary");
    await expect(primaryBtn).toBeVisible();
    await expect(primaryBtn).toHaveClass(/btn-tactile/);
    await expect(primaryBtn).toHaveClass(/bg-\[#7c3aed\]/);

    const secondaryBtn = page.getByTestId("btn-secondary");
    await expect(secondaryBtn).toBeVisible();
    await expect(secondaryBtn).toHaveClass(/bg-\[#18181b\]/);

    const outlineBtn = page.getByTestId("btn-outline");
    await expect(outlineBtn).toBeVisible();
    await expect(outlineBtn).toHaveClass(/border-white\/10/);

    const ghostBtn = page.getByTestId("btn-ghost");
    await expect(ghostBtn).toBeVisible();
    await expect(ghostBtn).toHaveClass(/text-zinc-400/);

    const dangerBtn = page.getByTestId("btn-danger");
    await expect(dangerBtn).toBeVisible();
    await expect(dangerBtn).toHaveClass(/text-rose-400/);

    // 2. Check loading state
    const loadingBtn = page.getByTestId("btn-loading");
    await expect(loadingBtn).toBeVisible();
    await expect(loadingBtn).toBeDisabled();
    await expect(loadingBtn.locator("svg[role='status']")).toBeVisible();

    // 3. Check disabled state
    const disabledBtn = page.getByTestId("btn-disabled");
    await expect(disabledBtn).toBeDisabled();
  });

  test("UI-02: Verify Badge variants and dot indicator", async ({ page }) => {
    const defaultBadge = page.getByTestId("badge-default");
    await expect(defaultBadge).toBeVisible();
    await expect(defaultBadge).toHaveText("Default Badge");

    const successBadge = page.getByTestId("badge-success");
    await expect(successBadge).toBeVisible();
    await expect(successBadge).toHaveClass(/text-emerald-400/);

    const warningBadge = page.getByTestId("badge-warning");
    await expect(warningBadge).toBeVisible();
    await expect(warningBadge).toHaveClass(/text-amber-400/);

    const dangerBadge = page.getByTestId("badge-danger");
    await expect(dangerBadge).toBeVisible();
    await expect(dangerBadge).toHaveClass(/text-rose-400/);

    const rhBadge = page.getByTestId("badge-hand-rh");
    await expect(rhBadge).toBeVisible();
    await expect(rhBadge).toHaveClass(/text-violet-300/);

    const lhBadge = page.getByTestId("badge-hand-lh");
    await expect(lhBadge).toBeVisible();
    await expect(lhBadge).toHaveClass(/text-cyan-300/);

    const accentBadge = page.getByTestId("badge-accent");
    await expect(accentBadge).toBeVisible();
    await expect(accentBadge).toHaveClass(/text-cyan-300/);

    const streakBadge = page.getByTestId("badge-streak");
    await expect(streakBadge).toBeVisible();
    await expect(streakBadge).toHaveClass(/text-amber-300/);

    // Verify dot indicator with animation
    const dotBadge = page.getByTestId("badge-with-dot");
    await expect(dotBadge).toBeVisible();
    const dotSpan = dotBadge.locator("span[aria-hidden='true']");
    await expect(dotSpan).toBeVisible();
    await expect(dotSpan).toHaveClass(/animate-pulse/);
  });

  test("UI-03: Verify SegmentedControl state switching, ARIA roles, and keyboard navigation", async ({
    page,
  }) => {
    const tablist = page.getByRole("tablist", { name: "Test Mode Switcher" });
    await expect(tablist).toBeVisible();

    const tabs = tablist.getByRole("tab");
    await expect(tabs).toHaveCount(4);

    // Wait for hydration by checking that tab-1 is ready
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId("segmented-current-value")).toHaveText("Selected: tab-1");

    // Click Tab 2
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId("segmented-current-value")).toHaveText("Selected: tab-2");

    // Disabled tab should be disabled and not switchable
    await expect(tabs.nth(3)).toBeDisabled();

    // Keyboard navigation (ArrowRight from Tab 2 -> Tab 3)
    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("segmented-current-value")).toHaveText("Selected: tab-3");

    // ArrowLeft from Tab 3 -> Tab 2
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("segmented-current-value")).toHaveText("Selected: tab-2");
  });

  test("UI-04: Verify Progress bar value updates and shimmer indeterminate state", async ({
    page,
  }) => {
    const determinateContainer = page.getByTestId("progress-bar-determinate");
    const progressBar = determinateContainer.getByRole("progressbar");
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute("aria-valuenow", "25");
    await expect(determinateContainer.getByText("25%")).toBeVisible();

    // Click update button to change progress to 75%
    await page.getByTestId("btn-update-progress").click();
    await expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    await expect(determinateContainer.getByText("75%")).toBeVisible();

    // Verify indeterminate progress bar with shimmer animation
    const indeterminateBar = page.getByTestId("progress-bar-indeterminate");
    await expect(indeterminateBar).toBeVisible();
    const shimmerElement = indeterminateBar.locator(".animate-shimmer");
    await expect(shimmerElement).toBeVisible();
  });

  test("UI-05: Verify Dialog focus trapping, backdrop, and Escape dismiss", async ({
    page,
  }) => {
    // Open Dialog
    await page.getByTestId("btn-open-dialog").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByText("Modal Test Dialog")).toBeVisible();

    // Verify backdrop blur element is rendered
    const backdrop = page.locator(".fixed.inset-0.bg-black\\/80");
    await expect(backdrop).toBeVisible();

    // Verify focus trap: elements inside can be tabbed through
    const firstInput = page.getByTestId("dialog-first-input");
    const secondInput = page.getByTestId("dialog-second-input");
    const cancelBtn = page.getByTestId("btn-dialog-cancel");
    const confirmBtn = page.getByTestId("btn-dialog-confirm");
    const closeBtn = page.getByRole("button", { name: "Close dialog" });

    // Focus first input
    await firstInput.focus();
    await expect(firstInput).toBeFocused();

    // Tab to second input
    await page.keyboard.press("Tab");
    await expect(secondInput).toBeFocused();

    // Tab to cancel button
    await page.keyboard.press("Tab");
    await expect(cancelBtn).toBeFocused();

    // Tab to confirm button
    await page.keyboard.press("Tab");
    await expect(confirmBtn).toBeFocused();

    // Tab wraps back to close button or first input
    await page.keyboard.press("Tab");
    const isCloseOrFirst =
      (await closeBtn.evaluate((el) => el === document.activeElement)) ||
      (await firstInput.evaluate((el) => el === document.activeElement));
    expect(isCloseOrFirst).toBe(true);

    // Escape dismiss
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
