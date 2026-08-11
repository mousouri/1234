const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const siteDir = path.join(__dirname, '..', 'mousouri-interactive');
const siteUrl = pathToFileURL(path.join(siteDir, 'index.html')).href;

async function audit(viewport, screenshotName) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(viewport);

  const consoleErrors = [];
  const failedRequests = [];
  const externalRequests = new Set();

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`);
  });
  page.on('request', (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.add(request.url());
  });

  await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 60_000 });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Trigger every native lazy-loaded image before checking completeness.
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach((image) => {
      image.loading = 'eager';
    });
  });
  await page.evaluate(async () => {
    const step = Math.max(500, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.scrollTo(0, 0);
  });
  await new Promise((resolve) => setTimeout(resolve, 750));

  const pageInfo = await page.evaluate(() => ({
    title: document.title,
    headings: [...document.querySelectorAll('h1, h2')]
      .map((heading) => heading.textContent.trim())
      .filter(Boolean),
    links: document.links.length,
    images: document.images.length,
    missingImages: [...document.images]
      .filter((image) => image.getClientRects().length > 0)
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
  }));

  await page.screenshot({
    path: path.join(siteDir, screenshotName),
    fullPage: true,
  });

  await browser.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    ...pageInfo,
    horizontalOverflow: pageInfo.bodyWidth > pageInfo.viewportWidth,
    consoleErrors: [...new Set(consoleErrors)],
    failedRequests: [...new Set(failedRequests)],
    externalRequests: [...externalRequests],
  };
}

(async () => {
  const results = [
    await audit({ width: 1440, height: 1000, deviceScaleFactor: 1 }, 'audit-desktop.png'),
    await audit({ width: 390, height: 844, deviceScaleFactor: 1 }, 'audit-mobile.png'),
  ];

  console.log(JSON.stringify(results, null, 2));

  const failed = results.some((result) =>
    result.consoleErrors.length ||
    result.failedRequests.length ||
    result.missingImages.length ||
    result.horizontalOverflow
  );
  process.exitCode = failed ? 1 : 0;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
