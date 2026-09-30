/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium, expect } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let failedToFetchSeen = false;

  page.on('console', msg => {
    const text = msg.text();
    console.log('BROWSER CONSOLE:', text);
    if (text.includes('Failed to fetch')) failedToFetchSeen = true;
  });
  page.on('pageerror', err => {
    console.log('BROWSER ERROR:', err.toString());
    if (err.toString().includes('Failed to fetch')) failedToFetchSeen = true;
  });

  console.log("Navigating to https://pianoflow-jet.vercel.app/login...");
  await page.goto('https://pianoflow-jet.vercel.app/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'supermanzero30@gmail.com');
  await page.fill('input[type="password"]', 'Nhatpro306');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/projects*');

  console.log("Navigating to create page...");
  await page.goto('https://pianoflow-jet.vercel.app/create', { waitUntil: 'networkidle' });

  // Wait for React to mount
  await page.waitForTimeout(2000);

  console.log("Testing URL Ingestion...");
  const urlInput = await page.locator('input[type="url"]');
  await urlInput.fill('https://www.tiktok.com/@u40vapiano/video/7681665512392199432?q=piano&t=1790773607040');
  
  // Need to check the rights checkbox
  const checkbox = await page.getByRole('checkbox', { name: /I own this content/i });
  await checkbox.check();

  console.log("Clicking transcribe link button...");
  const transcribeLinkBtn = await page.locator('button', { hasText: /Transcribe from link/i }).first();
  await transcribeLinkBtn.click();

  let networkResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('modal.run') || url.includes('/api/transcribe')) {
      networkResponses.push(`${response.request().method()} ${url} - ${response.status()}`);
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('modal.run') || request.url().includes('/api/transcribe')) {
      console.log(`[NETWORK FAILED] ${request.url()} - ${request.failure().errorText}`);
    }
  });

  await page.waitForTimeout(10000);
  
  try {
    const errorMsg = page.locator('text=Submit failed').or(page.locator('text=Failed to fetch')).or(page.locator('text=Error'));
    await expect(errorMsg).toBeVisible({ timeout: 15000 });
    console.log("Found error on page: ", await errorMsg.textContent());
  } catch (e) {
    console.log("No error message on page.");
  }
  
  await browser.close();
})();
