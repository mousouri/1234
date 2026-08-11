const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'mousouri-interactive');
const HTML_FILE = path.join(OUTPUT_DIR, 'index.html');

// Create a mapping of downloaded files
function createFileMapping() {
  const mapping = new Map();
  
  // Scan all asset directories
  const assetDirs = ['css', 'js', 'images', 'fonts', 'media'];
  
  assetDirs.forEach(category => {
    const dirPath = path.join(OUTPUT_DIR, 'assets', category);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    files.forEach(filename => {
      const filepath = path.join(dirPath, filename);
      const stats = fs.statSync(filepath);
      
      if (stats.size > 100) { // Only map files with content
        mapping.set(filename, {
          localPath: 'assets/' + category + '/' + filename,
          size: stats.size
        });
      }
    });
  });
  
  return mapping;
}

// Extract URLs from HTML
function extractUrls(html) {
  const urls = new Set();
  
  // Match src and href attributes
  const attrRegex = /(src|href)=["']([^"']+)["']/g;
  let match;
  
  while ((match = attrRegex.exec(html)) !== null) {
    const url = match[2];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.add(url);
    }
  }
  
  // Match URLs in inline styles
  const styleRegex = /url\(["']?([^"')]+)["']?\)/g;
  while ((match = styleRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.add(url);
    }
  }
  
  return Array.from(urls);
}

// Replace URLs with local paths
function replaceUrls(html, fileMapping) {
  let modified = html;
  let replacements = 0;
  
  // Get all downloaded filenames
  const downloadedFiles = new Set();
  fileMapping.forEach((info, filename) => {
    downloadedFiles.add(filename);
  });
  
  // Strategy 1: Replace exact URL matches with downloaded files
  downloadedFiles.forEach(filename => {
    // Search for this filename in URLs
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('https?://[^"\\s]+' + escapedFilename, 'g');
    
    const matches = modified.match(regex);
    if (matches) {
      matches.forEach(url => {
        const localPath = fileMapping.get(filename).localPath;
        modified = modified.replace(url, localPath);
        replacements++;
        console.log('Replaced: ' + url.substring(0, 60) + '... -> ' + localPath);
      });
    }
  });
  
  // Strategy 2: Replace base64 images with references to downloaded images
  // (This is more complex and may not be perfect)
  
  console.log('\nTotal replacements: ' + replacements);
  return modified;
}

// Main
console.log('🔧 Fixing HTML to use local assets...\n');

console.log('Creating file mapping...');
const fileMapping = createFileMapping();
console.log('Found ' + fileMapping.size + ' downloaded files\n');

console.log('Reading HTML...');
let html = fs.readFileSync(HTML_FILE, 'utf8');
console.log('HTML size: ' + (html.length / 1024).toFixed(2) + ' KB\n');

console.log('Extracting URLs...');
const urls = extractUrls(html);
console.log('Found ' + urls.length + ' external URLs\n');

console.log('Replacing URLs with local paths...');
const modifiedHtml = replaceUrls(html, fileMapping);

// Save the modified HTML
fs.writeFileSync(HTML_FILE, modifiedHtml, 'utf8');
console.log('\n✅ HTML updated with local asset paths!');
console.log('📄 Saved to: ' + HTML_FILE);
console.log('\nYou can now open index.html and it should load assets locally.');