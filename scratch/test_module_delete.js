const { chromium } = require('playwright');
const fs = require('fs');

async function testDeleteOption() {
  const loginRes = await fetch('http://localhost:6565/api/v1/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studykarnataka.com', password: 'Admin@StudyKar2026' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  const user = loginData.data.user;

  const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:6868/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token, user });

  console.log('Navigating to http://localhost:6868/subscriptions/modules ...');
  await page.goto('http://localhost:6868/subscriptions/modules');
  await page.waitForTimeout(2000);

  // Take screenshot of the table
  await page.screenshot({ path: 'scratch/modules_table_full.png' });
  console.log('Saved scratch/modules_table_full.png');

  // Find the action buttons in the table
  const actionButtons = await page.locator('tbody tr td button').all();
  console.log('Found action buttons count:', actionButtons.length);

  if (actionButtons.length > 0) {
    console.log('Clicking the first action button (KAS Quick Revision)...');
    await actionButtons[0].click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'scratch/module_actions_menu.png' });
    console.log('Saved scratch/module_actions_menu.png');

    const deleteOption = page.locator('text=Delete Module').first();
    const isVisible = await deleteOption.isVisible();
    console.log('Is Delete Module visible in menu?:', isVisible);
  }

  // Also check Drawer footer: click View Details
  const viewDetailsBtn = page.locator('text=View Details').first();
  if (await viewDetailsBtn.isVisible()) {
    console.log('Clicking View Details...');
    await viewDetailsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/module_detail_drawer.png' });
    console.log('Saved scratch/module_detail_drawer.png');

    const drawerDeleteBtn = page.locator('text=Delete Module').first();
    console.log('Is Delete Module in Drawer?:', await drawerDeleteBtn.isVisible());
  }

  await browser.close();
}

testDeleteOption().catch(e => console.error('Error in test:', e));
