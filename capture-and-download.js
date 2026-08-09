const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, process.argv[2] || 'mattis-website');

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const size = parseInt(response.headers['content-length'] || '0');
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('  OK: ' + path.basename(filepath) + ' (' + (size / 1024).toFixed(1) + ' KB)');
          resolve(filepath);
        });
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error('HTTP ' + response.statusCode));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

(async () => {
  console.log('Capturing network requests from live site...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const jsModules = new Map();
  
  page.on('request', (request) => {
    const url = request.url();
    let parsed;
    try { parsed = new URL(url); } catch { return; }
    if (/\.(?:mjs|js)$/i.test(parsed.pathname)) {
      const filename = path.basename(parsed.pathname);
      const localPath = path.join(OUTPUT_DIR, '_next', 'static', 'chunks', filename);
      jsModules.set(url, localPath);
    }
  });
  
  console.log('Loading https://mattis.framer.website/...\n');
  await page.goto('https://mattis.framer.website/', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });

  await page.evaluate(async () => {
    const step = Math.max(600, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Found ' + jsModules.size + ' JS modules\n');
  
  console.log('Downloading modules...\n');
  
  let downloaded = 0;
  for (const [url, filepath] of jsModules) {
    try {
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await downloadFile(url, filepath);
      downloaded++;
    } catch (error) {
      console.log('  FAILED: ' + path.basename(filepath));
    }
  }
  
  await browser.close();
  
  console.log('\nDownloaded ' + downloaded + ' modules!');
  console.log('Restart the server and refresh the page.');
  
})();
