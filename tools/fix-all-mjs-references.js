const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, '..', 'mousouri-interactive', 'index.html');

console.log('Fixing all .mjs references in HTML...\n');

let html = fs.readFileSync(HTML_FILE, 'utf8');

// Count .mjs references
const mjsCount = (html.match(/\.mjs/g) || []).length;
console.log('Found ' + mjsCount + ' .mjs references\n');

// Replace all .mjs with .js (but not in comments)
html = html.replace(/\.mjs("|'|?|\s)/g, '.js$1');

const newCount = (html.match(/\.mjs/g) || []).length;
console.log('After fix: ' + newCount + ' .mjs references remaining\n');

fs.writeFileSync(HTML_FILE, html, 'utf8');

console.log('✅ HTML updated!');
console.log('Restart the server and refresh the page.');