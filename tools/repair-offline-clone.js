const fs = require('fs');
const path = require('path');

const siteDir = path.join(__dirname, '..', 'mousouri-interactive');
const htmlPath = path.join(siteDir, 'index.html');
const chunkDir = path.join(siteDir, '_next', 'static', 'chunks');
const runtimeDir = path.join(siteDir, 'assets', 'images');

let html = fs.readFileSync(htmlPath, 'utf8');

// A query string is useful on Framer's image CDN, but makes a local file URL
// point at a nonexistent filename. Keep the downloaded original image instead.
html = html.replace(
  /(assets\/(?:images|media|fonts)\/[A-Za-z0-9._-]+)\?[^"'\s)]*?(?=&quot;|["'\s)])/g,
  '$1'
);

// The analytics script is not part of the visible or interactive experience and
// attempts to send data when the clone is opened, so omit it from the offline copy.
html = html.replace(
  /\s*<script async="" src="assets\/images\/script(?:\?v=2)?"[^>]*><\/script>/,
  ''
);

// Hydrating the exported Framer HTML restores CDN image URLs and starts CMS,
// analytics and editor requests. The SSR document is already complete, so the
// stable file:// build intentionally remains a static, responsive snapshot.
html = html.replace(
  /\s*<script type="module"[^>]*data-framer-bundle="main"[^>]*><\/script>/,
  ''
);

html = html
  .replace('content="width=device-width"', 'content="width=device-width, initial-scale=1"')
  .replaceAll(
    'https://framerusercontent.com/images/d4AQQL87EV2YaJY1jf32kkdOPZE.png',
    'assets/images/favicon.png'
  )
  .replace(
    'https://framerusercontent.com/images/Vur8iqzHajqGcwwSpOlF29ql3s.png',
    'assets/images/apple-touch-icon.png'
  )
  .replaceAll(
    'https://framerusercontent.com/images/YgG7xJXgpwh3lukfkRrWlY0VQ.jpg',
    'assets/images/social-preview.jpg'
  );

const staticRevealStyles = `
<style id="offline-static-reveal">
/* Show elements whose final state was previously applied by Framer on scroll. */
[style*="will-change:transform"][style*="opacity:0"]:not([style*="background: url"]),
[data-framer-component-type="RichTextContainer"][style*="opacity:0"],
h1 [style*="opacity:0"],
h2 [style*="opacity:0"] {
  opacity: 1 !important;
  transform: none !important;
}
</style>`;

if (!html.includes('id="offline-static-reveal"')) {
  html = html.replace('</head>', `${staticRevealStyles}</head>`);
}

fs.writeFileSync(htmlPath, html);

// Framer's main bundle imports sibling .mjs modules. Earlier downloader passes
// stored these modules as .js in another directory, so mirror them beside the
// bundle under the filenames the browser actually requests.
let mirrored = 0;
for (const filename of fs.readdirSync(chunkDir)) {
  if (!filename.endsWith('.js')) continue;
  const targetName = filename.replace(/\.js$/, '.mjs');
  fs.copyFileSync(
    path.join(chunkDir, filename),
    path.join(runtimeDir, targetName)
  );
  mirrored += 1;
}

console.log(`Repaired local asset URLs and mirrored ${mirrored} runtime modules.`);
