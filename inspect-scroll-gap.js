const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
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

  await page.mouse.move(720, 450);
  await page.mouse.wheel({ deltaY: 1200 });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const wheelScrollY = await page.evaluate(() => Math.round(scrollY));

  const positions = [2400, 3100, 3800, 4500];
  const states = [];
  for (const y of positions) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await page.screenshot({
      path: path.join(__dirname, 'mousouri-interactive', `scroll-${y}.png`),
    });
    states.push(await page.evaluate(() => {
      const center = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return {
        scrollY: Math.round(scrollY),
        centerTag: center?.tagName || null,
        centerClass: center?.className || null,
        centerText: center?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) || '',
      };
    }));
  }
  console.log(JSON.stringify({ wheelScrollY, states }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
