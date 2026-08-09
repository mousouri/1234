const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'mattis-website');
const LIVE_URL = 'https://mattis.framer.website';

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        console.log('  ✓ ' + path.basename(filepath) + ' (' + (parseInt(response.headers['content-length']) / 1024).toFixed(1) + ' KB)');
        response.pipe(file);
        file.on('finish', () => {
          file.close();
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

// List of all modules found in network requests
const modules = [
  '_next/static/chunks/[turbopack]_browser_dev_hmr-client.js',
  '_next/static/chunks/node_modules_next_dist_compiled_react-1amofc.js',
  '_next/static/chunks/node_modules_%40swc_helpers_cjs_1r9vbq.js',
  '_next/static/chunks/node_modules_next_dist_1e8vcs8._.js',
  '_next/static/chunks/_1anvha4._.js',
  '_next/static/chunks/_219uq1s._.js',
  '_next/static/chunks/turbopack-_08bm286._.js',
  '_next/static/chunks/src_components_providers_0drj9c9._.js',
  '_next/static/chunks/node_modules_1ktv2xv._.js',
  '_next/static/chunks/node_modules_next_dist_client_0_90u2t.js',
  '_next/static/chunks/node_modules_next_dist_compiled_react-2.js',
  '_next/static/chunks/node_modules_next_dist_compiled_next-d.js',
  '_next/static/chunks/src_1rm_jvh._.js',
  '_next/static/chunks/node_modules_next_0yf51rg._.js',
  '_next/static/chunks/src_components_1nfdsah._.js',
  '_next/static/chunks/08a3_framer-motion_dist_es_1jfws7q._.js',
  '_next/static/chunks/node_modules_tailwind-merge_dist_bundl.js',
  '_next/static/chunks/node_modules_216xskn._.js',
  '_next/static/chunks/src_views_0ca5s7e._.js',
  '_next/static/chunks/08a3_motion-dom_dist_es_1ujfnd4._.js',
];

(async () => {
  console.log('🚀 Downloading Next.js modules from live site...\n');
  
  const nextDir = path.join(OUTPUT_DIR, '_next');
  
  for (const modulePath of modules) {
    try {
      const url = LIVE_URL + '/' + modulePath;
      const filepath = path.join(OUTPUT_DIR, modulePath);
      
      // Create directory if needed
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await downloadFile(url, filepath);
    } catch (error) {
      console.log('  ✗ Failed: ' + modulePath);
    }
  }
  
  console.log('\n✨ Module download complete!');
  console.log('📁 Modules saved to: ' + nextDir);
  console.log('\n🔄 Restart the server and refresh the page.');
  console.log('   Effects should now work!');
})();