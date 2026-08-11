/*
 * probe-runtime.js - inspects what the Framer runtime actually animates.
 * Usage: node probe-runtime.js [targetDir]
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
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('PAGE ERR:', String(e).slice(0, 200)));
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 4000));

  const result = await page.evaluate(async () => {
    const out = {};
    out.willChangeAtRest = document.querySelectorAll('[style*="will-change"]').length;
    out.willChangeInViewport = [...document.querySelectorAll('[style*="will-change"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0;
      }).length;
    // Computed will-change across ALL elements (includes stylesheet-driven ones).
    let computedWC = 0;
    let computedWCInViewport = 0;
    for (const el of document.querySelectorAll('*')) {
      const wc = getComputedStyle(el).willChange;
      if (wc && wc !== 'auto') {
        computedWC++;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0) computedWCInViewport++;
      }
    }
    out.computedWillChange = computedWC;
    out.computedWillChangeInViewport = computedWCInViewport;

    // Grain overlay box after the CSS pin.
    const grainLayer = document.querySelector('[data-framer-name="Grain"] [style*="background: url"]');
    out.grain = grainLayer ? {
      w: Math.round(grainLayer.getBoundingClientRect().width),
      h: Math.round(grainLayer.getBoundingClientRect().height),
      willChange: getComputedStyle(grainLayer).willChange,
      transform: getComputedStyle(grainLayer).transform,
      opacity: getComputedStyle(grainLayer).opacity,
      computedInset: (() => { const s = getComputedStyle(grainLayer); return `${s.top},${s.right},${s.bottom},${s.left}`; })(),
    } : null;
    out.heroVideo = (() => {
      const v = document.querySelector('video');
      return v ? { preload: v.preload, paused: v.paused, w: v.videoWidth, h: v.videoHeight } : null;
    })();

    // How many backdrop-filter / filter / shadow elements?
    out.backdropFilters = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.backdropFilter && cs.backdropFilter !== 'none';
    }).length;
    out.filters = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.filter && cs.filter !== 'none';
    }).length;
    out.stickyElements = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.position === 'sticky' || cs.position === 'fixed';
    }).length;

    // The 2 active animations - what are they?
    let anims = 0;
    try { anims = document.getAnimations().length; } catch (e) {}
    out.activeAnimations = anims;

    // Detail the expensive rendering elements.
    out.backdropDetail = [...document.querySelectorAll('*')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return cs.backdropFilter && cs.backdropFilter !== 'none';
      }).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute('data-framer-name') || '',
        cls: (el.className || '').toString().slice(0, 50),
        bf: getComputedStyle(el).backdropFilter.slice(0, 60),
        rect: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; })(),
      }));
    out.filterDetail = [...document.querySelectorAll('*')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return cs.filter && cs.filter !== 'none';
      }).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute('data-framer-name') || '',
        filter: getComputedStyle(el).filter.slice(0, 60),
        rect: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; })(),
      }));
    out.fixedSticky = [...document.querySelectorAll('*')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return cs.position === 'sticky' || cs.position === 'fixed';
      }).map((el) => ({
        tag: el.tagName,
        pos: getComputedStyle(el).position,
        name: el.getAttribute('data-framer-name') || '',
        rect: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      }));

    // EXPERIMENT: strip all inline will-change, then scroll and wait; see if runtime re-applies it.
    let stripped = 0;
    for (const el of document.querySelectorAll('[style*="will-change"]')) {
      el.style.willChange = 'auto';
      stripped++;
    }
    out.stripped = stripped;

    // Scroll around to give the runtime a chance to re-add.
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= total; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1500));
    out.reApplied = [...document.querySelectorAll('[style*="will-change"]')]
      .filter((el) => el.style.willChange !== 'auto').length;

    return { out };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });