/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://pianoflow-jet.vercel.app');

  page.on('response', resp => {
    console.log('RESPONSE:', resp.url(), resp.status(), resp.headers());
  });

  await page.setContent(`
    <script>
      fetch('https://rcusueycsj.execute-api.ap-southeast-1.amazonaws.com/api/v1/uploads/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake_token'
        },
        body: JSON.stringify({ filename: 'test.webm', size_bytes: 123, content_type: 'audio/webm' })
      }).then(r => console.log('FETCH SUCCESS', r.status)).catch(e => console.log('FETCH ERROR', e.message));
    </script>
  `);

  await page.waitForTimeout(3000);
  await browser.close();
})();
