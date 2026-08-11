const fs = require('fs');
const https = require('https');
const path = require('path');

const outputDir = path.join(__dirname, process.argv[2] || 'mousouri-interactive');
const moduleDir = path.join(outputDir, '_next', 'static', 'chunks');
const baseUrl = 'https://framerusercontent.com/sites/3g9GswFgsc7j265E0PdXzi/';

function customize(source) {
  return source
    .replaceAll('MATTIS®', 'MOUSOURI®')
    .replaceAll('Mattis®', 'Mousouri®')
    .replaceAll('MattIS®', 'Mousouri®')
    .replaceAll('MATTIS', 'MOUSOURI')
    .replaceAll('Mattis', 'Mousouri')
    .replaceAll('hello@mattistudio.com', 'hello@mousouri.com')
    .replaceAll('124 City Road, London, EC1V 2NX', 'Dar es Salaam, Tanzania')
    .replaceAll('+1 (555) 400 0123', '0719600648')
    .replaceAll('tel:555-400-0123', 'tel:0719600648')
    .replaceAll('https://framer.com/edit/init.mjs', './editor-disabled.mjs')
    .replaceAll(
      'https://framerusercontent.com/assets/YUc1UMqfu6cFqEbpKpI1dpKqoes.mp4',
      '/assets/media/hero-video.mp4'
    );
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        response.resume();
        return resolve(download(new URL(response.headers.location, url).href));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function relativeImports(source) {
  return [...source.matchAll(/\.\/([^`"' ]+\.mjs)/g)].map((match) => match[1]);
}

(async () => {
  const checked = new Set();
  let downloaded = 0;

  while (true) {
    const files = fs.readdirSync(moduleDir).filter((file) => file.endsWith('.mjs'));
    const needed = new Set();

    for (const file of files) {
      const filepath = path.join(moduleDir, file);
      const source = customize(fs.readFileSync(filepath, 'utf8'));
      fs.writeFileSync(filepath, source);
      for (const imported of relativeImports(source)) {
        if (!fs.existsSync(path.join(moduleDir, imported))) needed.add(imported);
      }
    }

    const pending = [...needed].filter((file) => !checked.has(file));
    if (!pending.length) break;

    for (const file of pending) {
      checked.add(file);
      try {
        const source = customize(await download(baseUrl + file));
        fs.writeFileSync(path.join(moduleDir, file), source);
        downloaded += 1;
        console.log(`Downloaded ${file}`);
      } catch (error) {
        console.error(`Failed ${file}: ${error.message}`);
      }
    }
  }

  console.log(`Module graph complete; ${downloaded} missing modules added.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
