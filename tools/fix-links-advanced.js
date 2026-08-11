const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const OUTPUT_DIR = path.join(__dirname, '..', 'mousouri-interactive');
const HTML_FILE = path.join(OUTPUT_DIR, 'index.html');

// Build a map: basename -> local path
function buildLocalMap() {
  const map = new Map();
  const cats = ['css','js','images','fonts','media'];
  for (const cat of cats) {
    const dir = path.join(OUTPUT_DIR, 'assets', cat);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      const fp = path.join(dir, file);
      const st = fs.statSync(fp);
      if (st.size > 50) {
        map.set(file, 'assets/' + cat + '/' + file);
      }
    }
  }
  return map;
}

// Build reverse map: original URL -> local path
// We'll match downloaded files to their original URLs by scanning HTML for URLs ending with the filename
function buildUrlToLocalMap(html, localMap) {
  const urlToLocal = new Map();
  
  // Find all URLs in HTML
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const urls = html.match(urlRegex) || [];
  
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const basename = path.basename(urlObj.pathname);
      
      if (localMap.has(basename)) {
        urlToLocal.set(url, localMap.get(basename));
      }
    } catch (e) {
      // Skip invalid URLs
    }
  }
  
  return urlToLocal;
}

function fixHtml(html, urlToLocal) {
  let count = 0;
  let modified = html;
  
  // Sort by URL length (longest first) to avoid partial replacements
  const sortedUrls = Array.from(urlToLocal.keys()).sort((a, b) => b.length - a.length);
  
  for (const url of sortedUrls) {
    const localPath = urlToLocal.get(url);
    const regex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = modified.match(regex);
    
    if (matches) {
      modified = modified.replace(regex, localPath);
      count += matches.length;
      if (count <= 20 || matches.length === 1) {
        console.log('  ' + url.substring(0, 70) + ' -> ' + localPath);
      }
    }
  }
  
  if (count > 20) {
    console.log('  ... and ' + (count - 20) + ' more replacements');
  }
  
  return { html: modified, count };
}

console.log('🔧 Advanced HTML linking...\n');

console.log('Building local file map...');
const localMap = buildLocalMap();
console.log('Found ' + localMap.size + ' local files\n');

console.log('Reading HTML...');
let html = fs.readFileSync(HTML_FILE, 'utf8');
console.log('HTML size: ' + (html.length / 1024).toFixed(2) + ' KB\n');

console.log('Building URL mapping...');
const urlToLocal = buildUrlToLocalMap(html, localMap);
console.log('Found ' + urlToLocal.size + ' URL mappings\n');

console.log('Replacing URLs...');
const result = fixHtml(html, urlToLocal);

fs.writeFileSync(HTML_FILE, result.html, 'utf8');
console.log('\n✅ Replaced ' + result.count + ' URLs!');
console.log('📄 Saved to: ' + HTML_FILE);

// Verify
const newHtml = fs.readFileSync(HTML_FILE, 'utf8');
const localCount = (newHtml.match(/assets\//g) || []).length;
console.log('✓ Local asset references in HTML: ' + localCount);
console.log('\n🎉 Done! Open index.html to test locally.');