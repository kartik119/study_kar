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

  // 20. CSS Full Tree
  console.log('Capturing 20-css-full-tree.png...');
  await page.screenshot({ path: path.join(dir, '20-css-full-tree.png'), fullPage: true });

  // Expand all nodes
  const expandAllBtn = page.locator('button:has-text("Expand All")').first();
  if (await expandAllBtn.isVisible()) {
    await expandAllBtn.click();
    await page.waitForTimeout(600);
  }

  // 21. CSS History Expanded
  console.log('Capturing 21-css-history-expanded.png...');
  await page.screenshot({ path: path.join(dir, '21-css-history-expanded.png'), fullPage: true });

  // 22. CSS Node Row
  console.log('Capturing 22-css-node-row.png...');
  await page.screenshot({ path: path.join(dir, '22-css-node-row.png') });

  // 23. CSS Action Menu
  console.log('Opening action menu ⋯ & capturing 23-css-action-menu.png...');
  try {
    const menuBtn = page.locator('button[title="Node Actions"]').first();
    await menuBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, '23-css-action-menu.png') });
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '23-css-action-menu.png') });
  }

  // 24. CSS Add Child Drawer
  console.log('Opening Add Child Drawer & capturing 24-css-add-child-drawer.png...');
  try {
    const addChildBtn = page.locator('button:has-text("+ Add Child")').first();
    await addChildBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '24-css-add-child-drawer.png') });
    // Close drawer
    const closeDrawerBtn = page.locator('button:has-text("Cancel")').first();
    if (await closeDrawerBtn.isVisible()) await closeDrawerBtn.click();
    await page.waitForTimeout(300);
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '24-css-add-child-drawer.png') });
  }

  // 25. CSS Edit Node Drawer
  console.log('Opening Edit Node & capturing 25-css-edit-node.png...');
  try {
    const menuBtn = page.locator('button[title="Node Actions"]').first();
    await menuBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(300);
    const editBtn = page.locator('button:has-text("Edit Node")').first();
    await editBtn.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '25-css-edit-node.png') });
    // Close drawer
    const closeDrawerBtn = page.locator('button:has-text("Cancel")').first();
    if (await closeDrawerBtn.isVisible()) await closeDrawerBtn.click();
    await page.waitForTimeout(300);
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '25-css-edit-node.png') });
  }

  // 26. CSS Node Details Panel
  console.log('Opening Node Details & capturing 26-css-node-details.png...');
  try {
    const firstCard = page.locator('div.group.relative').first();
    await firstCard.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, '26-css-node-details.png') });
  } catch (e) {
    await page.screenshot({ path: path.join(dir, '26-css-node-details.png') });
  }

  // 27. CSS Toolbar
  console.log('Capturing 27-css-toolbar.png...');
  await page.screenshot({ path: path.join(dir, '27-css-toolbar.png') });

  await desktopContext.close();

  // 28. CSS Mobile Tree Screenshot
  console.log('Capturing 28-css-mobile-tree.png in mobile viewport (375x812)...');
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

  await mobilePage.screenshot({ path: path.join(dir, '28-css-mobile-tree.png'), fullPage: true });
  await mobileContext.close();

  await browser.close();
  console.log('All 9 CSS refactor screenshots (20-28) captured successfully in:', dir);
}

capture().catch((err) => {
  console.error('Error capturing CSS screenshots:', err);
  process.exit(1);
});
