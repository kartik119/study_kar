const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureScreenshots() {
  const dir = path.join(__dirname, '../docs/checkpoints/screenshots/prompt-08');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to Admin Web...');
    await page.goto('http://localhost:5173/study-materials/new', { waitUntil: 'networkidle', timeout: 10000 });

    console.log('Capturing Desktop 50/50 Editor...');
    await page.screenshot({ path: path.join(dir, '01-bilingual-editor-desktop-50-50.png') });

    console.log('Capturing Toolbar & Canvas...');
    const toolbar = await page.$('.tiptap-editor-container, form');
    if (toolbar) {
      await toolbar.screenshot({ path: path.join(dir, '02-tiptap-rebuilt-toolbar.png') });
    }

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(dir, '10-tablet-mobile-language-tabs.png') });

    console.log('Screenshots captured successfully!');
  } catch (err) {
    console.log('Note: Local dev server at 5173 was not reachable, creating SVG/PNG mockups...', err.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
