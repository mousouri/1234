const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failures = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://localhost:3001/')) {
      failures.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`);
    }
  });

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http://localhost:3001/') ||
        url.startsWith('https://framerusercontent.com/cms/') ||
        url.startsWith('https://framerusercontent.com/images/')) request.continue();
    else request.abort();
  });

  await page.goto('http://localhost:3001/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const state = await page.evaluate(() => ({
    title: document.title,
    pageHeight: document.documentElement.scrollHeight,
    bodyTextLength: document.body.innerText.length,
    headings: [...document.querySelectorAll('h1, h2')].map((heading) => heading.innerText),
    links: document.links.length,
    mainChildren: document.querySelector('#main')?.childElementCount || 0,
    hydrationBundleLoaded: performance.getEntriesByType('resource')
      .some((entry) => entry.name.includes('script_main.7a6W0ppD.mjs')),
    video: (() => {
      const video = document.querySelector('video');
      return video && {
        source: video.currentSrc,
        paused: video.paused,
        currentTime: video.currentTime,
        readyState: video.readyState,
        error: video.error?.message || null,
      };
    })(),
  }));

  console.log(JSON.stringify({
    state,
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)],
    failures: [...new Set(failures)].slice(0, 30),
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
