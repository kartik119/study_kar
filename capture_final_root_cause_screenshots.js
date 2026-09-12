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

  // 30. Final CSS Tree
  console.log('Capturing 30-final-css-tree.png...');
  await page.screenshot({ path: path.join(dir, '30-final-css-tree.png'), fullPage: true });

  // Expand all nodes
  const expandAllBtn = page.locator('button:has-text("Expand All")').first();
  if (await expandAllBtn.isVisible()) {
    await expandAllBtn.click();
    await page.waitForTimeout(600);
  }

  // 31. Final Node Row
  console.log('Capturing 31-final-node-row.png...');
  await page.screenshot({ path: path.join(dir, '31-final-node-row.png') });

  // 32. Final Action Menu
  console.log('Opening action menu ⋯ & capturing 32-final-action-menu.png...');
  try {
    const menuBtn = page.locator('button.tree-action-menu-btn').first();
    await menuBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '32-final-action-menu.png') });
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '32-final-action-menu.png') });
  }

  // 33. Final Add Child Drawer
  console.log('Opening Add Child Drawer & capturing 33-final-add-child-drawer.png...');
  try {
    const addChildBtn = page.locator('button.quick-add-child-btn').first();
    await addChildBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '33-final-add-child-drawer.png') });
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '33-final-add-child-drawer.png') });
  }

  await desktopContext.close();
  await browser.close();
  console.log('All 4 root-cause final screenshots (30-33) captured successfully in:', dir);
}

capture().catch((err) => {
  console.error('Error capturing final screenshots:', err);
  process.exit(1);
});
