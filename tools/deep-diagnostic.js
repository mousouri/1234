const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const consoleLogs = [];
  const networkErrors = [];
  const jsErrors = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text: text });
    if (msg.type() === 'error') {
      jsErrors.push(text);
    }
  });
  
  page.on('pageerror', (error) => {
    jsErrors.push('Page Error: ' + error.message);
  });
  
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (request.failure() && request.failure().errorText !== 'net::ERR_ABORTED') {
      networkErrors.push({
        url: url,
        error: request.failure().errorText
      });
    }
  });
  
  console.log('🔍 Deep diagnostic - Loading site...\n');
  
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  // Wait for JavaScript to execute
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check for specific Framer/Motion issues
  const framerStatus = await page.evaluate(() => {
    return {
      hasReact: typeof React !== 'undefined',
      hasMotion: typeof motion !== 'undefined',
      hasFramer: typeof framer !== 'undefined',
      bodyOpacity: window.getComputedStyle(document.body).opacity,
      hasAnimations: document.querySelectorAll('[style*="animation"], [style*="transition"]').length,
      scriptTags: document.querySelectorAll('script').length,
      failedScripts: Array.from(document.querySelectorAll('script')).filter(s => {
        try {
          return s.src && !document.querySelector(`script[src="${s.src}"]`);
        } catch(e) { return true; }
      }).length
    };
  });
  
  console.log('=== FRAMER STATUS ===');
  console.log('React loaded:', framerStatus.hasReact);
  console.log('Motion loaded:', framerStatus.hasMotion);
  console.log('Framer loaded:', framerStatus.hasFramer);
  console.log('Body opacity:', framerStatus.bodyOpacity);
  console.log('CSS animations:', framerStatus.hasAnimations);
  
  console.log('\n=== JAVASCRIPT ERRORS (' + jsErrors.length + ') ===');
  jsErrors.slice(0, 15).forEach(err => console.log('  ' + err));
  
  console.log('\n=== NETWORK ERRORS (' + networkErrors.length + ') ===');
  networkErrors.slice(0, 10).forEach(err => {
    console.log('  ' + err.url.substring(0, 80) + ' - ' + err.error);
  });
  
  console.log('\n=== CONSOLE LOGS ===');
  consoleLogs.slice(-10).forEach(log => {
    console.log('  [' + log.type + '] ' + log.text.substring(0, 100));
  });
  
  // Take screenshot
  await page.screenshot({ 
    path: 'c:\\Users\\Mousouri\\Desktop\\123\\mousouri-interactive\\diagnostic.png',
    fullPage: true 
  });
  
  console.log('\n📸 Screenshot saved to diagnostic.png');
  
  await browser.close();
})();