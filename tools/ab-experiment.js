/*
 * ab-experiment.js - attributes remaining frame-time cost across page features.
 * Usage: node ab-experiment.js [targetDir]
 */
const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const dir = path.join(__dirname, '..', process.argv[2] || 'mousouri-interactive');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fp = path.resolve(dir, rel);
  if (!fp.startsWith(path.resolve(dir))) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err && !path.extname(pathname)) {
      fs.readFile(path.join(dir, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end(); return; }
        res.setHeader('Content-Type', 'text/html'); res.writeHead(200); res.end(html);
      });
      return;
    }
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    res.writeHead(200); res.end(data);
  });
});

function sampleFps(page, ms, scroll) {
  return page.evaluate(async ({ ms, scroll }) => {
    const intervals = [];
    let prev = performance.now();
    let running = true;
    const start = performance.now();
    const totalHeight = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const tick = (now) => {
      if (now - start >= ms) { running = false; return; }
      const d = now - prev;
      intervals.push(d);
      prev = now;
      if (scroll) {
        const p = (now - start) / ms;
        window.scrollTo(0, totalHeight * (0.5 - 0.5 * Math.cos(p * Math.PI * 2)));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await new Promise((resolve) => {
      const done = setInterval(() => { if (!running) { clearInterval(done); resolve(); } }, 80);
    });
    const s = [...intervals].sort((a, b) => a - b);
    const perc = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    const over16 = intervals.filter((d) => d > 16.7).length / intervals.length;
    return {
      frames: intervals.length,
      fps: +(intervals.length / (ms / 1000)).toFixed(1),
      p95: +perc(0.95).toFixed(1),
      p99: +perc(0.99).toFixed(1),
      over16pct: +over16.toFixed(3),
    };
  }, { ms, scroll });
}

const toggles = [
  { key: 'baseline', apply: '/* none */' },
  { key: 'noBackdrop', apply: '* { backdrop-filter: none !important; }' },
  { key: 'noFilter', apply: '* { filter: none !important; }' },
  { key: 'noGrainBg', apply: '[data-framer-name="Grain"] [style*="background: url"] { content-visibility: hidden !important; visibility: hidden !important; }' },
  { key: 'videoPaused', apply: '' }, // handled specially
  { key: 'noWideImage', apply: '' }, // handled specially
];

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 2500));

  const results = [];
  for (const t of toggles) {
    if (t.key === 'videoPaused') {
      await page.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
    } else if (t.key === 'noWideImage') {
      await page.evaluate(() => {
        document.querySelectorAll('img, [style*="background: url"]').forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
        });
      });
    } else {
      await page.addStyleTag({ content: t.apply });
    }
    if (t.key !== 'baseline') await new Promise((r) => setTimeout(r, 700));
    const idle = await sampleFps(page, 1500, false);
    const scroll = await sampleFps(page, 4000, true);
    results.push({ ...t, idle, scroll });
    console.log(JSON.stringify(results[results.length - 1], null, 1));
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });