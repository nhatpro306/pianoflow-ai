/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('@playwright/test');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  console.log("Navigating to http://localhost:3000/login...");
  let response;
  try {
    response = await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 5000 });
  } catch(e) {
    console.log("Localhost not running.");
    await browser.close();
    return;
  }
  
  if (response.status() !== 200) {
    console.log("Localhost returned", response.status());
  }

  await page.fill('input[type="email"]', 'supermanzero30@gmail.com');
  await page.fill('input[type="password"]', 'Nhatpro306');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/projects*');

  console.log("Navigating to create page...");
  await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log("Testing URL Ingestion...");
  const urlInput = await page.locator('input[type="url"]');
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  
  const checkbox = await page.getByRole('checkbox', { name: /I own this content/i });
  await checkbox.check();

  const transcribeLinkBtn = await page.locator('button', { hasText: /Transcribe from link/i }).first();
  await transcribeLinkBtn.click();

  let success = false;
  let failedToFetch = false;
  
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('modal.run') || url.includes('/api/transcribe')) {
      console.log(`[NETWORK] ${res.request().method()} ${url} - ${res.status()}`);
      if (res.status() === 200 || res.status() === 404) success = true;
    }
  });

  page.on('requestfailed', req => {
    if (req.url().includes('modal.run') || req.url().includes('/api/transcribe')) {
      console.log(`[NETWORK FAILED] ${req.url()} - ${req.failure().errorText}`);
      failedToFetch = true;
    }
  });

  await page.waitForTimeout(10000);
  
  if (success) {
    console.log("SUCCESS!");
  } else if (failedToFetch) {
    console.log("FAILED TO FETCH DETECTED!");
  } else {
    console.log("NO RESPONSE");
  }

  await browser.close();
})();
