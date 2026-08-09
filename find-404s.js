const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const failedUrls = [];
  
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (request.failure() && !url.includes('favicon')) {
      failedUrls.push(url);
    }
  });
  
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Failed URLs (' + failedUrls.length + '):\n');
  failedUrls.forEach(url => console.log(url));
  
  await browser.close();
})();