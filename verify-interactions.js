const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });
  const page = await browser.newPage();
  const localFailures = [];
  const fatalErrors = [];

  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://localhost:3001/')) localFailures.push(request.url());
  });
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('framer.com/edit/init.mjs')) fatalErrors.push(text);
  });

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http://localhost:3001/') ||
        url.startsWith('https://framerusercontent.com/cms/') ||
        url.startsWith('https://framerusercontent.com/images/')) request.continue();
    else request.abort();
  });

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 4500));

  const faqBefore = await page.evaluate(() => {
    const text = [...document.querySelectorAll('p')]
      .find((element) => element.textContent.includes('Can I see the design before you build it?'));
    const clickable = text?.closest('[data-highlight="true"]');
    return { found: Boolean(clickable), name: clickable?.getAttribute('data-framer-name') || null };
  });

  const paragraphs = await page.$$('p');
  for (const paragraph of paragraphs) {
    const text = await paragraph.evaluate((element) => element.textContent);
    if (text.includes('Can I see the design before you build it?')) {
      await paragraph.click();
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 900));

  const faqAfter = await page.evaluate(() => {
    const text = [...document.querySelectorAll('p')]
      .find((element) => element.textContent.includes('Can I see the design before you build it?'));
    const clickable = text?.closest('[data-highlight="true"]');
    return { found: Boolean(clickable), name: clickable?.getAttribute('data-framer-name') || null };
  });

  await page.evaluate(() => document.querySelector('a[href="./about"]')?.click());
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const route = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: document.body.innerText.slice(0, 300),
  }));

  console.log(JSON.stringify({
    faqBefore,
    faqAfter,
    faqChanged: faqBefore.name !== faqAfter.name,
    route,
    localFailures: [...new Set(localFailures)],
    fatalErrors: [...new Set(fatalErrors)],
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
