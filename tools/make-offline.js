const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, '..', 'mousouri-interactive', 'index.html');

console.log('🔧 Making site work offline...\n');

let html = fs.readFileSync(HTML_FILE, 'utf8');

// 1. Remove Framer editor iframe
const iframeRegex = /<iframe[^>]*framer\.com\/edit[^>]*>[\s\S]*?<\/iframe>/gi;
const iframeMatch = html.match(iframeRegex);
if (iframeMatch) {
  html = html.replace(iframeRegex, '');
  console.log('✓ Removed Framer editor iframe');
}

// 2. Remove external search index references
html = html.replace(/<meta name="framer-search-index[^>]*>/gi, '');
html = html.replace(/<meta name="framer-search-index-fallback"[^>]*>/gi, '');
console.log('✓ Removed search index references');

// 3. Remove modulepreload links to external .mjs files that weren't downloaded
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, '');
console.log('✓ Removed modulepreload links');

// 4. Replace any remaining critical external URLs with placeholders or remove them
// External scripts that might be needed
const externalScriptRegex = /<script[^>]*src="https?:\/\/(?!framerusercontent\.com)[^"]*"[^>]*><\/script>/gi;
const externalScripts = html.match(externalScriptRegex) || [];
if (externalScripts.length > 0) {
  console.log('⚠️  Found ' + externalScripts.length + ' external scripts (may need internet)');
}

// 5. Count final state
const localAssets = (html.match(/assets\//g) || []).length;
const externalUrls = (html.match(/https?:\/\//g) || []).length;

fs.writeFileSync(HTML_FILE, html, 'utf8');

console.log('\n✅ Offline optimization complete!');
console.log('📊 Local asset references: ' + localAssets);
console.log('📊 External URLs remaining: ' + externalUrls);
console.log('\n💡 The main visual content (images, fonts) should work offline.');
console.log('💡 Some interactive features may require internet connection.');
console.log('\n🌐 Open index.html to test!');