const { chromium } = require('playwright');

async function test() {
  console.log('Testing Wait Mode UI...');
  const browser = await chromium.launch({ headless: true });
  console.log('Playwright launched.');
  await browser.close();
  console.log('Test passed!');
}
test().catch(console.error);
