const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'mattis-website');

console.log('Fixing MIME type issue by renaming .mjs to .js...\n');

let renamed = 0;
const chunksDir = path.join(OUTPUT_DIR, '_next', 'static', 'chunks');

if (fs.existsSync(chunksDir)) {
  const files = fs.readdirSync(chunksDir);
  
  files.forEach(file => {
    if (file.endsWith('.mjs')) {
      const oldPath = path.join(chunksDir, file);
      const newFilename = file.replace(/\.mjs$/, '.js');
      const newPath = path.join(chunksDir, newFilename);
      
      fs.renameSync(oldPath, newPath);
      console.log('Renamed: ' + file + ' -> ' + newFilename);
      renamed++;
    }
  });
}

console.log('\nRenamed ' + renamed + ' files');
console.log('Now update HTML references...');

// Update HTML to use .js instead of .mjs
const htmlFile = path.join(OUTPUT_DIR, 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

// Replace .mjs with .js in src attributes
html = html.replace(/\.mjs"/g, '.js"');
html = html.replace(/\.mjs'/g, '.js\'');
html = html.replace(/\.mjs\?/g, '.js?');

fs.writeFileSync(htmlFile, html, 'utf8');

console.log('HTML updated!');
console.log('\nRestart the server and refresh the page.');
console.log('The effects should now work!');