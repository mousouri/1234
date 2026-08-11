const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const localFailures = [];
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://localhost:3001/')) localFailures.push(request.url());
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('http://localhost:3001/') ||
        url.startsWith('https://framerusercontent.com/cms/') ||
        url.startsWith('https://framerusercontent.com/images/')) request.continue();
    else request.abort();
  });

  await page.goto('http://localhost:3001/contact', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 4500));
  const result = await page.evaluate(() => ({
    cityVisible: document.body.innerText.includes('Dar es Salaam, Tanzania'),
    phoneVisible: document.body.innerText.includes('0719600648'),
    phoneHref: document.querySelector('a[href^="tel:"]')?.getAttribute('href') || null,
    oldCityVisible: document.body.innerText.includes('London'),
    oldPhoneVisible: document.body.innerText.includes('+1 (555) 400 0123'),
  }));
  console.log(JSON.stringify({ ...result, localFailures: [...new Set(localFailures)] }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
