const { chromium } = require('playwright');

async function testDeleteTempModule() {
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

  page.on('dialog', async dialog => {
    console.log('Dialog popped up:', dialog.message());
    await dialog.accept();
    console.log('Dialog accepted!');
  });

  await page.goto('http://localhost:6868/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token, user });

  console.log('Opening Modules page...');
  await page.goto('http://localhost:6868/subscriptions/modules');
  await page.waitForTimeout(2000);

  // Take screenshot before delete
  await page.screenshot({ path: 'scratch/before_delete.png' });

  // Locate the row for Temp Module To Delete
  const row = page.locator('tbody tr:has-text("Temp Module To Delete")');
  console.log('Is Temp Module visible before delete?:', await row.isVisible());

  // Click its actions button
  const actionBtn = row.locator('button').first();
  await actionBtn.click();
  await page.waitForTimeout(400);

  // Click Delete Module
  const deleteBtn = page.locator('button:has-text("Delete Module")').first();
  console.log('Clicking Delete Module button...');
  await deleteBtn.click();

  // Wait for network response and table reload
  await page.waitForTimeout(2500);

  // Take screenshot after delete
  await page.screenshot({ path: 'scratch/after_delete.png' });

  const isStillVisible = await page.locator('tbody tr:has-text("Temp Module To Delete")').isVisible();
  console.log('Is Temp Module visible after delete?:', isStillVisible);

  await browser.close();
}

testDeleteTempModule().catch(console.error);
