const { chromium } = require('playwright');

async function testEditModalDelete() {
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

  await page.goto('http://localhost:6868/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token, user });

  await page.goto('http://localhost:6868/subscriptions/modules');
  await page.waitForTimeout(2000);

  // Click action button on first row
  const actionBtn = page.locator('tbody tr td button').first();
  await actionBtn.click();
  await page.waitForTimeout(400);

  // Click Edit Module
  const editOption = page.locator('text=Edit Module').first();
  await editOption.click();
  await page.waitForTimeout(600);

  // Take screenshot of Edit modal
  await page.screenshot({ path: 'scratch/module_edit_modal.png' });
  console.log('Saved scratch/module_edit_modal.png');

  const deleteBtnInModal = page.locator('button:has-text("Delete Module")').first();
  console.log('Is Delete Module button visible in Edit Modal?:', await deleteBtnInModal.isVisible());

  await browser.close();
}

testEditModalDelete().catch(console.error);
