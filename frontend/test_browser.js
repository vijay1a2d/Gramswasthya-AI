const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/hospital-beds');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    await browser.close();
})();
