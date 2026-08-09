# Website Clone: https://mattis.framer.website/

Created on 8/9/2026, 2:53:48 AM

## Contents
- index.html - Main HTML file
- screenshot.png - Full page screenshot
- page-info.json - Page metadata
- assets/ - All downloaded assets

## Statistics
- Assets downloaded: 91
- Failed downloads: 2
- Page title: Mattis® Studio — Conversion-First Design & Development Agency

## Open the clone

Open `index.html` directly in Chrome or Edge. The homepage is self-contained and
does not require a web server or an internet connection.

From the parent folder, the helper commands are:

```bash
npm run repair
npm run audit
npm run serve
```

- `repair` reapplies the offline-safe URL and static-content fixes.
- `audit` uses Puppeteer at desktop and mobile sizes and writes
  `audit-desktop.png` and `audit-mobile.png`.
- `serve` is optional and serves the same files at `http://localhost:3000`.

The clone keeps the rendered homepage content and responsive layout. Framer's
network-only CMS, analytics, editor, and runtime hydration are intentionally
disabled so the page remains reliable when opened with `file://`.
