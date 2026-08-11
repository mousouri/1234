# Mousouri Studio — Website

Static build of the Mousouri Studio marketing site.

## Contents
- `index.html` — main HTML file
- `assets/` — images, fonts, and media
- `_next/static/chunks/` — JS bundles (Framer Motion runtime + page scripts)
- `page-info.json` — page metadata
- `custom.css` / `custom-brand.css` — brand overrides
- `performance.js` — runtime performance tweaks for low-memory devices

Open `index.html` via a local server (see `server.js` in the repo root, or
`npm run serve`) to view the site — animations and interactions require an
HTTP server rather than the `file://` protocol.

## Deploy to Vercel

Either import the repository with its root directory unchanged (the root
`vercel.json` publishes this folder), or set the Vercel project's **Root
Directory** to `mousouri-interactive`.

Use these project settings:

- Framework Preset: Other
- Build Command: leave empty
- Output Directory: leave at the configured default

The included `vercel.json` keeps real asset files unchanged and rewrites
client-side routes such as `/about`, `/work`, `/blog`, and `/contact` to
`index.html`.
