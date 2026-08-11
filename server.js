const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[3]) || 3000;
const ROOT = path.join(__dirname, process.argv[2] || 'mousouri-interactive');

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const isVersionedAsset = pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/assets/');

  if (isVersionedAsset) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(path.resolve(ROOT) + path.sep) && filePath !== path.resolve(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err && !path.extname(pathname)) {
      filePath = path.join(ROOT, 'index.html');
      data = fs.readFileSync(filePath);
      err = null;
    }
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    // Set correct MIME types
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
  console.log('Serving from: ' + ROOT);
  console.log('Cache: HTML disabled; versioned assets immutable');
});
