const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'mattis-website');

// Download helper
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('  ✓ Downloaded: ' + path.basename(filepath) + ' (' + response.headers['content-length'] + ' bytes)');
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
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
  console.log('🔍 Finding missing modules...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Collect all network requests
  const requestedUrls = new Set();
  const missingModules = [];
  
  page.on('request', (request) => {
    const url = request.url();
    requestedUrls.add(url);
    
    // Track JS modules
    if (url.includes('.mjs') || url.includes('.js') || url.includes('modulepreload')) {
      missingModules.push(url);
    }
  });
  
  page.on('response', (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    // Check if it's a JS file
    if (url.includes('.mjs') || url.includes('.js') || 
        (contentType.includes('javascript') && url.includes('framer'))) {
      console.log('📦 JS Module: ' + url.substring(0, 80));
    }
  });
  
  // Navigate to the site
  console.log('Loading site to capture network requests...\n');
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n📊 Analysis complete!');
  console.log('Total requests: ' + requestedUrls.size);
  console.log('JS modules found: ' + missingModules.length);
  
  // Filter for framerusercontent modules
  const framerModules = missingModules.filter(url => 
    url.includes('framerusercontent.com') && 
    (url.endsWith('.mjs') || url.includes('.mjs'))
  );
  
  console.log('\nFramer modules to download: ' + framerModules.length);
  
  if (framerModules.length > 0) {
    console.log('\n⬇️  Downloading missing modules...\n');
    
    const jsDir = path.join(OUTPUT_DIR, 'assets', 'js');
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    let downloaded = 0;
    for (const url of framerModules) {
      try {
        const filename = path.basename(new URL(url).pathname);
        const filepath = path.join(jsDir, filename);
        await downloadFile(url, filepath);
        downloaded++;
      } catch (error) {
        console.log('  ✗ Failed: ' + error.message);
      }
    }
    
    console.log('\n✓ Downloaded ' + downloaded + ' modules');
  }
  
  await browser.close();
  
  // Now update the HTML
  console.log('\n🔧 Updating HTML with local paths...');
  const fs = require('fs');
  const htmlPath = path.join(OUTPUT_DIR, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace framerusercontent.com URLs with local paths
  let replacements = 0;
  framerModules.forEach(url => {
    const filename = path.basename(new URL(url).pathname);
    const localPath = 'assets/js/' + filename;
    if (html.includes(url)) {
      html = html.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), localPath);
      replacements++;
    }
  });
  
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ Updated ' + replacements + ' references');
  
  console.log('\n✨ Done! Restart the server and refresh the page.');
  console.log('   The effects should now work!');
  
})();
