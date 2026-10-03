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

  page.on('response', async (response) => {
    const url = response.url();
    if (response.status() === 404) {
      console.log(`[404 NOT FOUND] ${response.request().method()} ${url}`);
    } else if (url.includes('/api')) {
      console.log(`[NETWORK RESPONSE] ${response.request().method()} ${url} - ${response.status()}`);
    }
  });

  page.on('requestfailed', request => {
    console.log(`[NETWORK FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  await page.waitForTimeout(10000);
  
  try {
    console.log("Waiting for navigation to project page...");
    await page.waitForURL('**/projects/**', { timeout: 240000 });
    console.log("Navigated to:", page.url());
    console.log("Project successfully created and loaded!");
  } catch (e) {
    console.error("Failed to navigate to project page or timeout.", e);
    process.exitCode = 1;
  }
  
  await browser.close();
})();
