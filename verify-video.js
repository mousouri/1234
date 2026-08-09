const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().startsWith('http://localhost:3001/')) request.continue();
    else request.abort();
  });
  await page.goto('http://localhost:3001/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForSelector('video');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const before = await page.$eval('video', (video) => ({
    currentTime: video.currentTime,
    paused: video.paused,
    readyState: video.readyState,
    duration: video.duration,
    source: video.currentSrc,
    error: video.error?.message || null,
  }));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const after = await page.$eval('video', (video) => ({
    currentTime: video.currentTime,
    paused: video.paused,
    readyState: video.readyState,
    error: video.error?.message || null,
  }));

  console.log(JSON.stringify({ before, after, advancedBy: after.currentTime - before.currentTime }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
