const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const TARGET_URL = 'https://mattis.framer.website/';
const OUTPUT_DIR = path.join(__dirname, '..', process.argv[2] || 'mousouri-interactive');

function createDirectories() {
  [OUTPUT_DIR, path.join(OUTPUT_DIR, 'assets/css'), path.join(OUTPUT_DIR, 'assets/js'),
   path.join(OUTPUT_DIR, 'assets/images'), path.join(OUTPUT_DIR, 'assets/fonts'),
   path.join(OUTPUT_DIR, 'assets/media')].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    protocol.get(url, (response) => {
      if (response.statusCode === 200 || response.statusCode === 301 || response.statusCode === 302) {
        if (response.statusCode > 300) {
          downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(filepath); });
      } else {
        file.close(); fs.unlink(filepath, () => {}); reject(new Error('Download failed'));
      }
    }).on('error', (err) => { file.close(); fs.unlink(filepath, () => {}); reject(err); });
  });
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_');
}

function getFileExtension(url) {
  try {
    const ext = path.extname(new URL(url).pathname);
    if (ext) return ext;
    if (url.includes('.css')) return '.css';
    if (url.includes('.js')) return '.js';
    if (url.includes('.png')) return '.png';
    if (url.includes('.jpg') || url.includes('.jpeg')) return '.jpg';
    if (url.includes('.svg')) return '.svg';
    if (url.includes('.webp')) return '.webp';
    if (url.includes('.woff')) return '.woff2';
    if (url.includes('.ttf')) return '.ttf';
    if (url.includes('.mp4')) return '.mp4';
    if (url.includes('.ico')) return '.ico';
    return '.bin';
  } catch { return '.bin'; }
}

function getAssetCategory(url) {
  if (url.includes('.css')) return 'css';
  if (url.includes('.js')) return 'js';
  if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg') || url.includes('.ico')) return 'images';
  if (url.includes('.woff') || url.includes('.ttf')) return 'fonts';
  if (url.includes('.mp4') || url.includes('.webm')) return 'media';
  return 'images';
}

(async () => {
  try {
    console.log('Starting website cloning...\n');
    createDirectories();
    
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to ' + TARGET_URL + '...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Trigger resources that the live page loads only as sections enter view.
    await page.evaluate(async () => {
      const step = Math.max(600, window.innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.scrollTo(0, 0);
    });
    
    console.log('Page loaded! Extracting assets...\n');
    
    const assets = await page.evaluate((baseUrl) => {
      const base = new URL(baseUrl);
      const assetList = [];
      
      function resolveUrl(url) {
        try { return new URL(url, base).href; } 
        catch { return null; }
      }
      
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src) { const r = resolveUrl(src); if (r) assetList.push({ url: r, type: 'image' }); }
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          srcset.split(',').forEach(s => {
            const r = resolveUrl(s.trim().split(' ')[0]);
            if (r) assetList.push({ url: r, type: 'image' });
          });
        }
      });
      
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href) { const r = resolveUrl(href); if (r) assetList.push({ url: r, type: 'css' }); }
      });

      document.querySelectorAll('link[rel*="icon"], meta[property="og:image"], meta[name="twitter:image"]').forEach(el => {
        const value = el.getAttribute('href') || el.getAttribute('content');
        if (value) { const r = resolveUrl(value); if (r) assetList.push({ url: r, type: 'image' }); }
      });
      
      document.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src) { const r = resolveUrl(src); if (r) assetList.push({ url: r, type: 'js' }); }
      });
      
      document.querySelectorAll('style').forEach(style => {
        const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
        let match;
        while ((match = urlRegex.exec(style.textContent)) !== null) {
          const r = resolveUrl(match[1]);
          if (r) assetList.push({ url: r, type: 'css-asset' });
        }
      });
      
      document.querySelectorAll('[style*="url"]').forEach(el => {
        const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
        let match;
        while ((match = urlRegex.exec(el.getAttribute('style'))) !== null) {
          const r = resolveUrl(match[1]);
          if (r) assetList.push({ url: r, type: 'image' });
        }
      });
      
      document.querySelectorAll('video, audio').forEach(media => {
        const src = media.src || media.getAttribute('data-src');
        if (src) { const r = resolveUrl(src); if (r) assetList.push({ url: r, type: 'media' }); }
        media.querySelectorAll('source').forEach(source => {
          const s = source.getAttribute('src');
          if (s) { const r = resolveUrl(s); if (r) assetList.push({ url: r, type: 'media' }); }
        });
      });
      
      const uniqueAssets = [];
      const seen = new Set();
      assetList.forEach(asset => {
        if (!seen.has(asset.url)) {
          seen.add(asset.url);
          uniqueAssets.push(asset);
        }
      });
      
      return uniqueAssets;
    }, TARGET_URL);
    
    console.log('Found ' + assets.length + ' assets\n');
    
    console.log('Downloading assets...\n');
    let downloaded = 0;
    let failed = 0;
    
    for (const asset of assets) {
      try {
        const ext = getFileExtension(asset.url);
        const category = getAssetCategory(asset.url);
        const filename = sanitizeFilename(path.basename(new URL(asset.url).pathname)) || 'asset_' + downloaded + ext;
        const filepath = path.join(OUTPUT_DIR, 'assets', category, filename);
        await downloadFile(asset.url, filepath);
        downloaded++;
      } catch (error) {
        failed++;
      }
    }
    
    console.log('Downloaded ' + downloaded + ' assets (' + failed + ' failed)\n');
    console.log('Saving HTML...');
    const html = await page.content();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
    console.log('HTML saved\n');
    
    console.log('Analyzing page...');
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      images: document.querySelectorAll('img').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
    }));
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'page-info.json'), JSON.stringify(pageInfo, null, 2));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot.png'), fullPage: true });
    await browser.close();
    
    const readme = '# Website Clone: ' + TARGET_URL + '\n\n' +
      'Created on ' + new Date().toLocaleString() + '\n\n' +
      '## Contents\n' +
      '- index.html - Main HTML file\n' +
      '- screenshot.png - Full page screenshot\n' +
      '- page-info.json - Page metadata\n' +
      '- assets/ - All downloaded assets\n\n' +
      '## Statistics\n' +
      '- Assets downloaded: ' + downloaded + '\n' +
      '- Failed downloads: ' + failed + '\n' +
      '- Page title: ' + pageInfo.title + '\n\n' +
      'Open index.html in a browser to view the site.\n';
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);
    
    console.log('\nWebsite cloning completed!');
    console.log('Output: ' + OUTPUT_DIR);
    console.log('Open index.html to view the cloned site.');
    
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
})();

function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  function calculateSize(currentPath) {
    const files = fs.readdirSync(currentPath);
    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  calculateSize(dirPath);
  return (totalSize / (1024 * 1024)).toFixed(2);
}
