const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push('Page Error: ' + error.message);
  });
  
  console.log('Loading site and checking for errors...\n');
  
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('=== ERRORS (' + errors.length + ') ===');
  errors.slice(0, 20).forEach(err => console.log(err));
  
  if (errors.length > 20) {
    console.log('... and ' + (errors.length - 20) + ' more errors');
  }
  
  console.log('\n=== WARNINGS (' + warnings.length + ') ===');
  warnings.slice(0, 10).forEach(warn => console.log(warn));
  
  await browser.close();
})();