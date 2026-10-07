import { test, expect } from '@playwright/test';

test.describe('PianoFlow AI — Quick Start Guide Modal Verification', () => {
  test('GUIDE-01: Quick Start Guide Button opens modal with all 5 sections and closes properly', async ({ page }) => {
    await page.goto('/demo');

    // 1. Verify header title
    await expect(page.locator('h1', { hasText: 'PianoFlow AI Studio — Thư viện 250 Bản Piano Hoàn chỉnh (Full Repertoire)' })).toBeVisible();

    // 2. Click "📖 Hướng dẫn sử dụng" button
    const guideBtn = page.locator('button', { hasText: '📖 Hướng dẫn sử dụng' });
    await expect(guideBtn).toBeVisible();
    await guideBtn.click();

    // 3. Verify modal title
    const modalTitle = page.locator('h2', { hasText: '📖 Hướng dẫn sử dụng PianoFlow AI (Quick Start Guide)' });
    await expect(modalTitle).toBeVisible();

    // 4. Verify all 5 cards/sections
    await expect(page.locator('text=1. Cách chơi & Kết nối')).toBeVisible();
    await expect(page.locator('text=2. Chế độ Chờ nốt (Wait Mode)')).toBeVisible();
    await expect(page.locator('text=3. Tập riêng từng tay & Đệm tự động')).toBeVisible();
    await expect(page.locator('text=4. Đồng hồ nhịp Micro-Timing')).toBeVisible();
    await expect(page.locator('text=5. Phím tắt nhanh trên bàn phím (Quick Shortcuts)')).toBeVisible();

    // 5. Verify Close Action
    const closeBtn = page.locator('button', { hasText: 'Đã hiểu & Bắt đầu luyện tập 🚀' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // 6. Verify modal is closed
    await expect(modalTitle).not.toBeVisible();
  });
});
