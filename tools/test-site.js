const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Loading site...');
  
  await page.goto('http://localhost:3000', { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Taking screenshot...');
  await page.screenshot({ 
    path: 'c:\\Users\\Mousouri\\Desktop\\123\\mousouri-interactive\\test-screenshot.png',
    fullPage: true 
  });
  
  // Get page info
  const info = await page.evaluate(() => ({
    title: document.title,
    bodyLength: document.body.innerHTML.length,
    scripts: document.querySelectorAll('script').length,
    images: document.querySelectorAll('img').length,
    loaded: document.readyState
  }));
  
  console.log('\nPage Info:');
  console.log('Title: ' + info.title);
  console.log('Loaded: ' + info.loaded);
  console.log('Body HTML size: ' + (info.bodyLength / 1024).toFixed(2) + ' KB');
  console.log('Scripts: ' + info.scripts);
  console.log('Images: ' + info.images);
  
  // Check if effects are working by looking for Framer elements
  const hasFramer = await page.evaluate(() => {
    return {
      hasFramerClass: document.querySelector('[class*="framer-"]') !== null,
      bodyChildren: document.body.children.length
    };
  });
  
  console.log('\nFramer Elements:');
  console.log('Has Framer classes: ' + hasFramer.hasFramerClass);
  console.log('Body children: ' + hasFramer.bodyChildren);
  
  await browser.close();
  
  console.log('\nScreenshot saved to test-screenshot.png');
})();