const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testMobile() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 15000 });
    
    const outDir = path.join(__dirname, 'screenshots', 'mobile_sandbox');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const header = await page.$('.sandbox-header-bar');
    if (header) {
      await page.evaluate(el => el.scrollIntoView({ block: 'center' }), header);
      await new Promise(r => setTimeout(r, 400));
      await header.screenshot({ path: path.join(outDir, '04_mobile_sandbox_header_tabs.png') });
      console.log('Saved 04_mobile_sandbox_header_tabs.png');
    }

    const footer = await page.$('.sandbox-footer-cta');
    if (footer) {
      await page.evaluate(el => el.scrollIntoView({ block: 'center' }), footer);
      await new Promise(r => setTimeout(r, 400));
      await footer.screenshot({ path: path.join(outDir, '05_mobile_sandbox_footer_cta.png') });
      console.log('Saved 05_mobile_sandbox_footer_cta.png');
    }
  } catch (e) {
    console.error('Error in testMobile:', e);
  } finally {
    await browser.close();
  }
}

testMobile();
