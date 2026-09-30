/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  console.log("Navigating to https://pianoflow-jet.vercel.app/login...");
  await page.goto('https://pianoflow-jet.vercel.app/login', { waitUntil: 'networkidle' });

  console.log("Filling login form...");
  await page.fill('input[type="email"]', 'supermanzero30@gmail.com');
  await page.fill('input[type="password"]', 'Nhatpro306');
  await page.click('button[type="submit"]');

  console.log("Waiting for navigation to projects page...");
  await page.waitForURL('**/projects*');
  console.log("Logged in successfully!");

  console.log("Navigating to create page...");
  await page.goto('https://pianoflow-jet.vercel.app/create', { waitUntil: 'networkidle' });

  // Make a dummy 1MB WebM file
  const dummyAudio = Buffer.alloc(1024 * 1024, '0');
  fs.writeFileSync('dummy_test.webm', dummyAudio);

  console.log("Locating file input...");
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    console.log("Could not find file input!");
    await browser.close();
    return;
  }
  
  await fileInput.setInputFiles('dummy_test.webm');
  console.log("File uploaded via setInputFiles.");

  console.log("Waiting for transcription button...");
  const transcribeBtn = await page.locator('button', { hasText: /Transcribe audio|Transcribing|Convert/i }).first();
  await transcribeBtn.click();
  console.log("Clicked button.");

  console.log("Waiting for network responses...");
  let success = false;
  let failedToFetch = false;
  
  // Listen for the network requests
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('modal.run') || url.includes('/api/transcribe')) {
      console.log(`[NETWORK] ${response.request().method()} ${url} - ${response.status()}`);
      if (response.status() === 200 || response.status() === 404) {
        success = true;
      }
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('modal.run') || request.url().includes('/api/transcribe')) {
      console.log(`[NETWORK FAILED] ${request.url()} - ${request.failure().errorText}`);
      failedToFetch = true;
    }
  });

  // Wait for up to 15 seconds for the request to fire
  await page.waitForTimeout(15000);
  
  if (success) {
    console.log("SUCCESS: Reached Modal endpoint successfully!");
  } else if (failedToFetch) {
    console.log("FAILED: Network request failed (like 'Failed to fetch').");
  } else {
    console.log("FAILED: Modal endpoint did not return 200 OK or was not hit.");
  }

  await browser.close();
  fs.unlinkSync('dummy_test.webm');
})();
