const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'docs', 'demo-walkthrough', 'mcq');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Context (1536 x 900)
    console.log('Launching Desktop Viewport (1536x900)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1536, height: 900 },
    });
    
    // Inject auth token into localStorage before page loads
    await desktopContext.addInitScript(() => {
      window.localStorage.setItem('admin_token', 'mock_admin_token_123');
      window.localStorage.setItem('admin_user', JSON.stringify({
        id: 'admin-1',
        name: 'System Administrator',
        email: 'admin@studykarnataka.gov.in',
        role: 'SUPER_ADMIN',
      }));
    });

    const page = await desktopContext.newPage();

    // Route intercept API calls to ensure instant mock response
    await page.route('**/api/v1/admin/mcq-library/questions/next-code', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { code: 'MCQ_000001' } }),
      });
    });

    await page.route('**/api/v1/admin/academic-taxonomy/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    console.log('Navigating directly to http://localhost:3004/mcq-library/new...');
    await page.goto('http://localhost:3004/mcq-library/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify DOM bounding rectangles for True 50/50 side-by-side rendering
    const enCol = page.locator('.mcq-column-en').first();
    const knCol = page.locator('.mcq-column-kn').first();

    const enBox = await enCol.boundingBox();
    const knBox = await knCol.boundingBox();

    console.log('--- DOM Bounding Box Verification ---');
    console.log('English Column Box:', enBox);
    console.log('Kannada Column Box:', knBox);

    if (enBox && knBox) {
      if (enBox.left < knBox.left && Math.abs(enBox.top - knBox.top) < 30) {
        console.log('SUCCESS: English and Kannada columns rendered SIDE-BY-SIDE simultaneously on desktop!');
        console.log(`English X: ${enBox.left}px, Width: ${enBox.width}px | Kannada X: ${knBox.left}px, Width: ${knBox.width}px`);
      } else {
        console.warn('WARNING: Columns positioning:', { enBox, knBox });
      }
    }

    // 40. Desktop Top View (English Question | Kannada Question side-by-side)
    console.log('Capturing 40-add-mcq-desktop-50-50-top.png...');
    await page.screenshot({ path: path.join(dir, '40-add-mcq-desktop-50-50-top.png') });

    // 41. Desktop Options View (Options A-D English | Options A-D Kannada side-by-side)
    console.log('Scrolling to Options and capturing 41-add-mcq-desktop-50-50-options.png...');
    await page.evaluate(() => window.scrollBy(0, 380));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '41-add-mcq-desktop-50-50-options.png') });

    // 42. Desktop Explanation View (English Explanation | Kannada Explanation side-by-side)
    console.log('Scrolling to Explanation and capturing 42-add-mcq-desktop-50-50-explanation.png...');
    await page.evaluate(() => window.scrollBy(0, 480));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '42-add-mcq-desktop-50-50-explanation.png') });

    // 43. Shared Fields Section
    console.log('Scrolling to Shared Fields and capturing 43-add-mcq-shared-fields.png...');
    await page.evaluate(() => window.scrollBy(0, 650));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '43-add-mcq-shared-fields.png') });

    await desktopContext.close();

    // 2. Mobile Context (375 x 812)
    console.log('Launching Mobile Viewport (375x812)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });

    await mobileContext.addInitScript(() => {
      window.localStorage.setItem('admin_token', 'mock_admin_token_123');
      window.localStorage.setItem('admin_user', JSON.stringify({
        id: 'admin-1',
        name: 'System Administrator',
        email: 'admin@studykarnataka.gov.in',
        role: 'SUPER_ADMIN',
      }));
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.route('**/api/v1/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await mobilePage.goto('http://localhost:3004/mcq-library/new', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    console.log('Capturing 44-add-mcq-mobile-language-tabs.png...');
    await mobilePage.screenshot({ path: path.join(dir, '44-add-mcq-mobile-language-tabs.png') });

    await mobileContext.close();
    console.log('ALL 5 MCQ SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Screenshot capture failed:', err);
  } finally {
    await browser.close();
  }
}

capture();
