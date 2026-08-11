/*
 * localize-assets.js - rewrites framerusercontent.com image URLs to local
 * assets/ copies (when available) so the page renders without depending on
 * Framer's CDN. Speeds up paint and removes mid-scroll decode stalls.
 *
 * Usage: node tools/localize-assets.js [dir1 dir2 ...] (run from repo root)
 */
const fs = require('fs');
const path = require('path');

const dirs = process.argv.slice(2);
if (!dirs.length) dirs.push('mousouri-interactive');

const EXT = ['jpg', 'jpeg', 'png', 'svg', 'webp'];

function localize(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const root = path.dirname(filePath);

  const pattern =
    /https:\/\/framerusercontent\.com\/images\/([A-Za-z0-9_-]+)\.(jpg|jpeg|png|svg|webp)/g;

  const seen = new Map();
  let replaced = 0;

  const out = html.replace(pattern, (match, hash, ext) => {
    const key = `${hash}.${ext}`;
    if (seen.has(key)) {
      const local = seen.get(key);
      return local || match;
    }

    // Prefer assets/images/<file>; also accept assets/<file>.
    let local = null;
    for (const base of ['images', '']) {
      const candidate = base
        ? path.join(root, 'assets', base, key)
        : path.join(root, 'assets', key);
      if (fs.existsSync(candidate)) {
        local = base ? `assets/${base}/${key}` : `assets/${key}`;
        break;
      }
    }

    seen.set(key, local);
    if (local) {
      replaced++;
      return local;
    }
    return match;
  });

  if (replaced) {
    fs.writeFileSync(filePath, out, 'utf8');
    console.log(`${path.basename(filePath)}: localized ${replaced} unique asset URL(s)`);
  } else {
    console.log(`${path.basename(filePath)}: no changes`);
  }
}

for (const dir of dirs) {
  const index = path.join(process.cwd(), dir, 'index.html');
  if (!fs.existsSync(index)) {
    console.error(`missing ${index}`);
    continue;
  }
  localize(index);
}