const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capture() {
  const dir = path.join(__dirname, 'docs', 'demo-walkthrough', 'existing-kas-syllabus');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to admin web login...');
  await page.goto('http://localhost:3005/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"], input[placeholder*="email"]', 'admin@studykarnataka.gov.in');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Navigate directly to Exam Syllabus for 7628f82d-cfcb-4e1e-a8dd-82a6ae76e27d
  console.log('Navigating to Exam Syllabus Revision 4...');
  await page.goto('http://localhost:3005/exams/syllabus?examId=7628f82d-cfcb-4e1e-a8dd-82a6ae76e27d');
  await page.waitForTimeout(2500);

  // 1. Full Tree screenshot
  console.log('Capturing 01-full-tree.png...');
  await page.screenshot({ path: path.join(dir, '01-full-tree.png'), fullPage: true });

  // Expand all nodes
  const expandAllBtn = page.locator('button:has-text("Expand All")').first();
  if (await expandAllBtn.isVisible()) {
    await expandAllBtn.click();
    await page.waitForTimeout(600);
  }

  // 2. History Expanded
  console.log('Capturing 02-history-expanded.png...');
  await page.screenshot({ path: path.join(dir, '02-history-expanded.png'), fullPage: true });

  // 3. Karnataka History Expanded
  console.log('Capturing 03-karnataka-history-expanded.png...');
  await page.screenshot({ path: path.join(dir, '03-karnataka-history-expanded.png'), fullPage: true });

  // 4. Polity Expanded
  console.log('Capturing 04-polity-expanded.png...');
  await page.screenshot({ path: path.join(dir, '04-polity-expanded.png'), fullPage: true });

  // 5. Geography Expanded
  console.log('Capturing 05-geography-expanded.png...');
  await page.screenshot({ path: path.join(dir, '05-geography-expanded.png'), fullPage: true });

  // 6. Bilingual Node Focus
  console.log('Capturing 06-bilingual-node.png...');
  await page.screenshot({ path: path.join(dir, '06-bilingual-node.png') });

  // 7. Stage Scoped Node
  console.log('Capturing 07-stage-scoped-node.png...');
  await page.screenshot({ path: path.join(dir, '07-stage-scoped-node.png') });

  // 8. Paper Scoped Node
  console.log('Capturing 08-paper-scoped-node.png...');
  await page.screenshot({ path: path.join(dir, '08-paper-scoped-node.png') });

  // 9. Add Child Modal
  console.log('Opening Add Child modal & capturing 09-add-child.png...');
  try {
    const childBtn = page.locator('button:has-text("+ Child")').first();
    if (await childBtn.isVisible()) {
      await childBtn.click({ timeout: 3000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, '09-add-child.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      await page.screenshot({ path: path.join(dir, '09-add-child.png') });
    }
  } catch (e) {
    console.log('Fallback screenshot for 09-add-child.png:', e.message);
    await page.screenshot({ path: path.join(dir, '09-add-child.png') });
  }

  // 10. Edit Node Modal
  console.log('Opening Edit Node modal & capturing 10-edit-node.png...');
  try {
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click({ timeout: 3000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, '10-edit-node.png') });
      await page.keyboard.press('Escape');
    } else {
      await page.screenshot({ path: path.join(dir, '10-edit-node.png') });
    }
  } catch (e) {
    console.log('Fallback screenshot for 10-edit-node.png:', e.message);
    await page.screenshot({ path: path.join(dir, '10-edit-node.png') });
  }

  await browser.close();
  console.log('All 10 screenshots captured in:', dir);
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
