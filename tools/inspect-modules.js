const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const jsUrls = [];
  
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('.mjs') || url.includes('.js')) {
      jsUrls.push(url);
    }
  });
  
  await page.goto('https://mattis.framer.website/', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('JS modules found: ' + jsUrls.length + '\n');
  jsUrls.forEach(url => console.log(url));
  
  await browser.close();
})();