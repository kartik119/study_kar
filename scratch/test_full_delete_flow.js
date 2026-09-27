const { chromium } = require('playwright');

async function testFullDeleteFlow() {
  const loginRes = await fetch('http://localhost:6565/api/v1/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studykarnataka.com', password: 'Admin@StudyKar2026' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  const user = loginData.data.user;

  // 1. Create a temporary module to delete
  const createRes = await fetch('http://localhost:6565/api/v1/admin/subscriptions/modules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Temp Module To Delete',
      code: 'MOD-TEMP-DELETE',
      description: 'This is a temporary module to test deletion.',
      scopeType: 'SELECTED_FEATURES',
      moduleType: 'CUSTOM_BUNDLE',
      accessType: 'PAID',
      status: 'ACTIVE',
      entitlements: [{ featureKey: 'STUDY_MATERIAL_ACCESS', name: 'Study Materials' }]
    })
  });
  const createdData = await createRes.json();
  console.log('Created temp module:', createdData.data?.name, createdData.data?.id);

  // 2. Launch browser, find it in the table, click Delete Module and accept dialog
  const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Accept window.confirm automatically
  page.on('dialog', async dialog => {
    console.log('Dialog popped up with message:', dialog.message());
    await dialog.accept();
    console.log('Dialog accepted.');
  });

  await page.goto('http://localhost:6868/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token, user });

  await page.goto('http://localhost:6868/subscriptions/modules');
  await page.waitForTimeout(2000);

  // Search for Temp Module
  console.log('Searching for Temp Module To Delete...');
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill('Temp Module');
  await page.waitForTimeout(1000);

  const row = page.locator('text=Temp Module To Delete').first();
  console.log('Is Temp Module visible in table?:', await row.isVisible());

  // Click actions menu button for this row
  const actionBtn = page.locator('tbody tr:has-text("Temp Module To Delete") button').first();
  await actionBtn.click();
  await page.waitForTimeout(400);

  // Click Delete Module
  const deleteOption = page.locator('button:has-text("Delete Module")').first();
  console.log('Clicking Delete Module option...');
  await deleteOption.click();

  // Wait for deletion & notification
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/module_deleted_success.png' });
  console.log('Saved scratch/module_deleted_success.png');

  // Verify it is no longer in DB
  const checkRes = await fetch(`http://localhost:6565/api/v1/admin/subscriptions/modules/${createdData.data.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('GET deleted module status (should be 400 or 404):', checkRes.status);

  await browser.close();
}

testFullDeleteFlow().catch(console.error);
