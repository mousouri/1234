const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const localFailures = [];
  const errors = [];

  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://localhost:3001/')) localFailures.push(request.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('framer.com/edit/init.mjs')) {
      errors.push(message.text());
    }
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http://localhost:3001/') ||
        url.startsWith('https://framerusercontent.com/cms/') ||
        url.startsWith('https://framerusercontent.com/images/') ||
        url.startsWith('https://framerusercontent.com/assets/')) request.continue();
    else request.abort();
  });

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 4500));
  await page.screenshot({
    path: path.join(__dirname, 'mousouri-interactive', 'home-before-scroll.png'),
  });

  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 450) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const state = await page.evaluate(() => ({
    pageHeight: document.documentElement.scrollHeight,
    headings: [...document.querySelectorAll('h1, h2')].map((heading) => {
      const rect = heading.getBoundingClientRect();
      const style = getComputedStyle(heading);
      const hiddenChildren = [...heading.querySelectorAll('*')].filter((element) => {
        const childStyle = getComputedStyle(element);
        return childStyle.visibility === 'hidden' || Number(childStyle.opacity) === 0;
      }).length;
      return {
        text: heading.innerText.replace(/\s+/g, ' ').trim(),
        top: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height),
        opacity: style.opacity,
        visibility: style.visibility,
        hiddenChildren,
      };
    }),
    video: (() => {
      const video = document.querySelector('video');
      return video && { paused: video.paused, currentTime: video.currentTime, readyState: video.readyState };
    })(),
  }));

  await page.screenshot({
    path: path.join(__dirname, 'mousouri-interactive', 'home-after-scroll.png'),
    fullPage: true,
  });
  console.log(JSON.stringify({ state, localFailures: [...new Set(localFailures)], errors: [...new Set(errors)] }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
