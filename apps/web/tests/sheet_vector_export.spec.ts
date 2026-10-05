import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.resolve(__dirname, "../../../docs/e2e/sheet");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe("PianoFlow AI — Phase I: Grand Staff Vector Sheet Music & Export Flow", () => {
  test("SHEET-E2E-01: Grand Staff Notation Viewer & Vector Export Modal", async ({ page }) => {
    await page.goto("/demo");

    // 1. Verify demo loaded
    await expect(
      page.locator("h1", { hasText: "Interactive Classical Library Showcase" })
    ).toBeVisible();

    // 2. Switch to Mode 3: Grand Staff Sheet Music
    const sheetTab = page.locator("button", { hasText: "Grand Staff Sheet Music" });
    await expect(sheetTab).toBeVisible();
    await sheetTab.click();

    // 3. Verify Grand Staff Score Viewer is rendered
    await expect(page.locator("#panel-sheet")).toBeVisible();
    await expect(page.locator("#panel-sheet svg").first()).toBeVisible();

    // 4. Verify Download Vector PDF button is present in viewer
    const downloadVectorPdfBtn = page.locator("button", { hasText: "Download Vector PDF" });
    await expect(downloadVectorPdfBtn).toBeVisible();

    // 5. Click Download Vector PDF to trigger export modal in demo
    await downloadVectorPdfBtn.click();

    // 6. Verify Export Center modal opens
    await expect(page.locator("h2", { hasText: "Export Center" })).toBeVisible();

    // 7. Switch to Sheet Music tab in modal
    const modalSheetTab = page.getByRole("tab", { name: "Sheet Music 🎼", exact: true });
    await modalSheetTab.click();

    // 8. Verify Grand Staff PDF card with updated vector description
    await expect(page.locator("h4", { hasText: "Grand Staff PDF" })).toBeVisible();
    await expect(
      page.locator("text=Vector-engraved Grand Staff score formatted for standard 8.5")
    ).toBeVisible();

    // 9. Take proof screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01_vector_sheet_export_modal.png"),
      fullPage: true,
    });
  });
});
