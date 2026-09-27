const { chromium } = require('playwright');

async function run() {
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

  // 1. Go to Add Plan page & capture full page
  await page.goto('http://localhost:6868/subscriptions/plans');
  await page.waitForTimeout(1500);
  const addBtn = await page.getByRole('button', { name: /Add Plan/i }).first();
  await addBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/add_plan_full_page.png', fullPage: true });
  console.log('Add Plan full page screenshot saved.');

  // 2. Click Cancel to return to plans list
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(1000);

  // 3. Open View Details modal on first plan
  const viewBtn = await page.locator('button[title="View Details"]').first();
  await viewBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/plan_details_modal.png' });
  console.log('Plan Details modal screenshot saved.');

  // Close details modal
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(500);

  // 4. Open Manage Pricing modal via three-dot menu
  const menuBtn = await page.locator('button:has-text("⋮")').first();
  await menuBtn.click();
  await page.waitForTimeout(500);
  await page.getByText('Manage Pricing').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/plan_pricing_modal.png' });
  console.log('Plan Pricing modal screenshot saved.');

  await browser.close();
}

run().catch(e => console.error('Script Error:', e));
