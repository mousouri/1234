/*
 * FPS bench - scrolls the page and samples requestAnimationFrame timing
 * to estimate the animation frame rate and detect dropped frames / long tasks.
 * Usage:  node bench-fps.js [targetDir targetDir...]
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const targets = process.argv.slice(2);
if (!targets.length) targets.push('../mousouri-interactive');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.gif': 'image/gif',
};

function startServer(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const fp = path.resolve(root, rel);
      if (!fp.startsWith(path.resolve(root))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(fp, (err, data) => {
        if (err && !path.extname(pathname)) {
          fs.readFile(path.join(root, 'index.html'), (e2, html) => {
            if (e2) { res.writeHead(404); res.end('Not found'); }
            else { res.setHeader('Content-Type', 'text/html'); res.writeHead(200); res.end(html); }
          });
          return;
        }
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
        res.writeHead(200);
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
async function measure(page, label, options = {}) {
  const { duration = 6000 } = options;

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));

  // Structural snapshot at rest (deterministic GPU-load indicators).
  const atRest = await page.evaluate(() => {
    const layers = (() => {
      let n = 0;
      for (const el of document.querySelectorAll('*')) {
        const wc = getComputedStyle(el).willChange;
        if (wc && wc !== 'auto') n++;
      }
      return n;
    })();
    const inViewport = (() => {
      let n = 0;
      for (const el of document.querySelectorAll('*')) {
        const wc = getComputedStyle(el).willChange;
        if (wc && wc !== 'auto') {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0) n++;
        }
      }
      return n;
    })();
    const grain = document.querySelector('[data-framer-name="Grain"] [style*="background: url"]');
    return {
      layersAtRest: layers,
      layersAtRestInViewport: inViewport,
      grainPixels: grain ? Math.round(grain.getBoundingClientRect().width * grain.getBoundingClientRect().height) : 0,
      backdropFilters: [...document.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.backdropFilter && cs.backdropFilter !== 'none';
      }).length,
    };
  });

  const metrics = await page.evaluate(
    async ({ durationMs }) => {
      function percentile(arr, p) {
        if (!arr.length) return 0;
        const s = [...arr].sort((a, b) => a - b);
        return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2);
      }

      const intervals = [];
      const longTasks = [];
      let prev = performance.now();
      let running = true;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({ duration: entry.duration });
        }
      });
      try { observer.observe({ type: 'longtask', buffered: true }); } catch (e) {}

      const totalHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const startPos = window.scrollY;
      const endPos = totalHeight;
      const startTime = performance.now();

      const tick = (now) => {
        if (now - startTime >= durationMs) {
          running = false;
          try { observer.disconnect(); } catch (e) {}
          return;
        }
        const delta = now - prev;
        intervals.push(delta);
        prev = now;
        const progress = (now - startTime) / durationMs;
        const pos = startPos + (endPos - startPos) * (0.5 - 0.5 * Math.cos(progress * Math.PI * 2));
        window.scrollTo(0, pos);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      await new Promise((resolve) => {
        const done = setInterval(() => {
          if (!running) { clearInterval(done); resolve(); }
        }, 100);
      });

      const longTaskCount = longTasks.length;
      const longTaskTotal = longTasks.reduce((s, t) => s + t.duration, 0);
      const longTaskMax = longTasks.length ? Math.max(...longTasks.map((t) => t.duration)) : 0;

      const expected = 1000 / 60;
      let frameCount = 0, min = Infinity, max = 0, sum = 0;
      let over16 = 0, over33 = 0, over50 = 0;
      for (const d of intervals) {
        frameCount++;
        if (d < min) min = d;
        if (d > max) max = d;
        sum += d;
        if (d > expected) over16++;
        if (d > expected * 2) over33++;
        if (d > expected * 3) over50++;
      }

      let jsHeap = 0;
      try { jsHeap = performance.memory ? performance.memory.usedJSHeapSize : 0; } catch (e) {}
      const layers = document.querySelectorAll('[style*="will-change"]').length;
      const playingVideos = [...document.querySelectorAll('video')].filter(
        (v) => !v.paused && !v.ended
      ).length;
      let activeAnimations = 0;
      try { activeAnimations = document.getAnimations().length; } catch (e) {}

      return {
        frameCount,
        avgFps: +(frameCount / (durationMs / 1000)).toFixed(2),
        minMs: +min.toFixed(2),
        maxMs: +max.toFixed(2),
        avgMs: +(sum / Math.max(1, frameCount)).toFixed(2),
        p95Ms: percentile(intervals, 0.95),
        p99Ms: percentile(intervals, 0.99),
        over16pct: +(over16 / frameCount).toFixed(3),
        over33pct: +(over33 / frameCount).toFixed(3),
        over50pct: +(over50 / frameCount).toFixed(3),
        longTaskCount,
        longTaskTotalMs: +longTaskTotal.toFixed(0),
        longTaskMaxMs: +longTaskMax.toFixed(1),
        jsHeapMB: +(jsHeap / 1048576).toFixed(1),
        willChangeLayers: layers,
        playingVideos,
        activeAnimations,
      };
    },
    { durationMs: duration }
  );
  return { ...atRest, ...metrics };
}
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--allow-file-access-from-files', '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-features=IsolateOrigins,site-per-process',
      '--enable-unsafe-swiftshader',
    ],
  });

  for (const target of targets) {
    const dir = path.join(__dirname, target);
    const server = await startServer(dir);
    const baseUrl = `http://127.0.0.1:${server.address().port}/`;
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 300)));

    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Warm up lazy content / hydration.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.9;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 20));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1500));

    const runs = [];
    for (let pass = 0; pass < 3; pass++) {
      const result = await measure(page, target, { duration: 6000 });
      runs.push(result);
      await new Promise((r) => setTimeout(r, 500));
    }
    const med = (key) => {
      const values = runs.map((r) => r[key]).sort((a, b) => a - b);
      return values[1]; // median of 3
    };
    const summary = {
      site: target,
      structural: {
        layersAtRest: runs[2].layersAtRest,
        layersAtRestInViewport: runs[2].layersAtRestInViewport,
        grainPixels: runs[2].grainPixels,
        backdropFilters: runs[2].backdropFilters,
        playingVideos: runs[2].playingVideos,
      },
      median: {
        avgFps: med('avgFps'),
        p95Ms: med('p95Ms'),
        p99Ms: med('p99Ms'),
        over16pct: med('over16pct'),
        over33pct: med('over33pct'),
        longTaskTotalMs: med('longTaskTotalMs'),
        jsHeapMB: med('jsHeapMB'),
      },
      runs: runs.map((r) => ({
        avgFps: r.avgFps,
        p95Ms: r.p95Ms,
        p99Ms: r.p99Ms,
        over16pct: r.over16pct,
        longTaskMaxMs: r.longTaskMaxMs,
      })),
    };
    console.log(`\n=== ${target} ===`);
    console.log(JSON.stringify(summary, null, 2));
    console.log('consoleErrors:', consoleErrors.slice(0, 12));

    await page.close();
    server.close();
  }

  await browser.close();
})().catch((err) => {
  console.error('BENCH FAILED', err);
  process.exit(1);
});