# Mousouri

Source and deploy config for the Mousouri Studio website.

## Structure

```
mousouri-interactive/   the site itself (deployed to Vercel, see vercel.json)
server.js                local static server used by `npm run serve`
tools/                   one-off scripts used while building/rebranding the site
vercel.json               deploy config (outputDirectory: mousouri-interactive)
package.json
```

## Running locally

```
npm install
npm run serve
```

Serves `mousouri-interactive/` at http://localhost:3000. A plain `file://`
open of `index.html` will not run the animations — they need an HTTP server.

## Deploying

The site deploys via Vercel using the root `vercel.json`, which points
`outputDirectory` at `mousouri-interactive/`. Push to `main` (or connect the
repo to a Vercel project) and it deploys from there — no build step.

## tools/

Scripts used to originally clone, localize, and rebrand the site (asset
downloading, link fixing, offline verification, rebrand find/replace, etc.).
Kept for reference; not part of the deployed site and not run automatically.
