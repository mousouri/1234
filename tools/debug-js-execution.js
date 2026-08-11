const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Capture ALL console messages
  const allLogs = [];
  page.on('console', (msg) => {
    allLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  // Capture page errors
  page.on('pageerror', (error) => {
    allLogs.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack
    });
  });
  
  // Intercept network requests
  const failedRequests = [];
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()
    });
  });
  
  console.log('🔍 Loading page and capturing ALL errors...\n');
  
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  // Wait for JS to execute
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('=== ALL CONSOLE MESSAGES ===\n');
  allLogs.forEach((log, i) => {
    if (log.type === 'error' || log.type === 'pageerror') {
      console.log(`[${log.type}] ${log.text}`);
      if (log.location) {
        console.log(`  at ${log.location.url}:${log.location.lineNumber}`);
      }
    }
  });
  
  console.log('\n=== FAILED REQUESTS ===\n');
  failedRequests.forEach(req => {
    console.log(`URL: ${req.url}`);
    console.log(`  Error: ${req.failure.errorText}`);
  });
  
  // Check what global variables exist
  const globals = await page.evaluate(() => {
    const vars = {};
    const importantVars = ['React', 'framer', 'motion', '__NEXT_DATA__', '__framer'];
    
    importantVars.forEach(varName => {
      try {
        vars[varName] = typeof window[varName];
      } catch(e) {
        vars[varName] = 'error';
      }
    });
    
    return vars;
  });
  
  console.log('\n=== GLOBAL VARIABLES ===');
  Object.entries(globals).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
  
  // Check if scripts actually loaded
  const scriptStatus = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.map(s => ({
      src: s.src,
      loaded: s.readyState === 'complete' || s.readyState === 'interactive'
    }));
  });
  
  console.log('\n=== SCRIPT LOAD STATUS ===');
  scriptStatus.forEach(script => {
    console.log(`${script.loaded ? '✓' : '✗'} ${script.src.substring(0, 80)}`);
  });
  
  await browser.close();
})();