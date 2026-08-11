const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http://localhost:3001/')) request.continue();
    else request.abort();
  });
  await page.goto('http://localhost:3001/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
  });

  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      title: document.title,
      hasMousouri: /Mousouri/i.test(text),
      hasMattis: /Mattis/i.test(text),
      madeInFramer: text.includes('Made in Framer'),
      templatePrice: text.includes('Template') && text.includes('$129'),
      badgeElement: Boolean(document.querySelector('#__framer-badge-container')),
      templateElement: Boolean(document.querySelector('[data-framer-name="Delete me!"]')),
      headings: [...document.querySelectorAll('h1, h2')].map((heading) => ({
        text: heading.textContent.trim(),
        visible: heading.getClientRects().length > 0 &&
          getComputedStyle(heading).visibility !== 'hidden' &&
          Number(getComputedStyle(heading).opacity) > 0,
      })),
      pageHeight: document.documentElement.scrollHeight,
    };
  });

  await page.screenshot({
    path: path.join(__dirname, '..', 'mousouri-interactive', 'mousouri-preview.png'),
    fullPage: true,
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
