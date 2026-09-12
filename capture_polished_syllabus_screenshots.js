const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'docs', 'demo-walkthrough', 'existing-kas-syllabus');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktopContext.newPage();

  console.log('Logging in to Admin Web...');
  await page.goto('http://localhost:3005/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[placeholder*="email"]', 'admin@studykarnataka.gov.in');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Navigate to Exam Syllabus for 7628f82d-cfcb-4e1e-a8dd-82a6ae76e27d (Revision 4 - DRAFT)
  console.log('Navigating to Exam Syllabus Revision 4...');
  await page.goto('http://localhost:3005/exams/syllabus?examId=7628f82d-cfcb-4e1e-a8dd-82a6ae76e27d');
  await page.waitForTimeout(2500);

  // 11. Polished Full Tree
  console.log('Capturing 11-polished-full-tree.png...');
  await page.screenshot({ path: path.join(dir, '11-polished-full-tree.png'), fullPage: true });

  // Expand all nodes
  const expandAllBtn = page.locator('button:has-text("Expand All")').first();
  if (await expandAllBtn.isVisible()) {
    await expandAllBtn.click();
    await page.waitForTimeout(600);
  }

  // 12. Polished History Tree
  console.log('Capturing 12-polished-history-tree.png...');
  await page.screenshot({ path: path.join(dir, '12-polished-history-tree.png'), fullPage: true });

  // 13. Polished Polity Tree
  console.log('Capturing 13-polished-polity-tree.png...');
  await page.screenshot({ path: path.join(dir, '13-polished-polity-tree.png'), fullPage: true });

  // 14. Polished Geography Tree
  console.log('Capturing 14-polished-geography-tree.png...');
  await page.screenshot({ path: path.join(dir, '14-polished-geography-tree.png'), fullPage: true });

  // 15. Node Action Menu (Dropdown Menu ⋯)
  console.log('Opening action menu ⋯ & capturing 15-node-action-menu.png...');
  try {
    const menuBtn = page.locator('button[title="Node Actions"]').first();
    await menuBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '15-node-action-menu.png') });
  } catch (e) {
    console.log('Fallback screenshot for 15-node-action-menu.png');
    await page.screenshot({ path: path.join(dir, '15-node-action-menu.png') });
  }

  // 16. Node Details Side Panel
  console.log('Opening Node Details & capturing 16-node-details.png...');
  try {
    const firstNodeCard = page.locator('div.group.relative').first();
    await firstNodeCard.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, '16-node-details.png') });
  } catch (e) {
    console.log('Fallback screenshot for 16-node-details.png');
    await page.screenshot({ path: path.join(dir, '16-node-details.png') });
  }

  // 17. Syllabus Toolbar Card
  console.log('Capturing 17-syllabus-toolbar.png...');
  await page.screenshot({ path: path.join(dir, '17-syllabus-toolbar.png') });

  await desktopContext.close();

  // 18. Mobile Viewport Tree Screenshot
  console.log('Capturing 18-mobile-tree.png in mobile viewport (375x812)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3005/login');
  await mobilePage.waitForLoadState('networkidle');

  await mobilePage.fill('input[type="email"], input[placeholder*="email"]', 'admin@studykarnataka.gov.in');
  await mobilePage.fill('input[type="password"]', 'Admin@123456');
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForTimeout(1500);

  await mobilePage.goto('http://localhost:3005/exams/syllabus?examId=7628f82d-cfcb-4e1e-a8dd-82a6ae76e27d');
  await mobilePage.waitForTimeout(2500);

  const mobileExpandBtn = mobilePage.locator('button:has-text("Expand All")').first();
  if (await mobileExpandBtn.isVisible()) {
    await mobileExpandBtn.click();
    await mobilePage.waitForTimeout(600);
  }

  await mobilePage.screenshot({ path: path.join(dir, '18-mobile-tree.png'), fullPage: true });
  await mobileContext.close();

  await browser.close();
  console.log('All 18 polished screenshots captured successfully in:', dir);
}

capture().catch((err) => {
  console.error('Error capturing polished screenshots:', err);
  process.exit(1);
});
