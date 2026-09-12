import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function captureScreenshots() {
  const outputDir = path.join(process.cwd(), 'docs', 'demo-walkthrough', 'test-creation');
  const artifactDir = path.join('/Users/kanishk/.gemini/antigravity/brain/e1b1d82d-b18c-4fb8-bc78-52009368b5dd', 'screenshots');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });

  // 1. Fetch Auth Token from API directly
  console.log('1. Authenticating Admin via API...');
  const res = await fetch('http://localhost:4000/api/v1/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studykarnataka.com', password: 'Admin@StudyKar2026' }),
  });
  const authData = await res.json();
  const token = authData?.data?.accessToken;
  const user = authData?.data?.user;

  if (!token) {
    throw new Error('Admin authentication failed: ' + JSON.stringify(authData));
  }

  console.log('Auth Token Acquired!');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Set LocalStorage Token
  await page.goto('http://localhost:3004/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token, user });

  console.log('2. Navigating to Test Creation Library...');
  await page.goto('http://localhost:3004/mcq-library/tests');
  await page.waitForTimeout(1000);

  // 01-tests-list.png
  await page.screenshot({ path: path.join(outputDir, '01-tests-list.png') });
  fs.copyFileSync(path.join(outputDir, '01-tests-list.png'), path.join(artifactDir, '01-tests-list.png'));
  console.log('Saved 01-tests-list.png');

  // Navigate to Create New Test Wizard
  console.log('3. Opening Create Test Wizard...');
  await page.goto('http://localhost:3004/mcq-library/tests/new');
  await page.waitForTimeout(1000);

  // Fill Step 1 Basic Details
  await page.fill('[data-testid="title-en-input"]', 'KAS General Studies Paper I Mock Test');
  await page.fill('[data-testid="title-kn-input"]', 'ಕೆಎಎಸ್ ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I ಮಾದರಿ ಪರೀಕ್ಷೆ');

  // 02-create-test-basic-details.png
  await page.screenshot({ path: path.join(outputDir, '02-create-test-basic-details.png') });
  fs.copyFileSync(path.join(outputDir, '02-create-test-basic-details.png'), path.join(artifactDir, '02-create-test-basic-details.png'));
  console.log('Saved 02-create-test-basic-details.png');

  // Next to Step 2: Scoring & Settings
  await page.click('[data-testid="step-tab-2"]');
  await page.waitForTimeout(500);

  // 03-scoring-settings.png
  await page.screenshot({ path: path.join(outputDir, '03-scoring-settings.png') });
  fs.copyFileSync(path.join(outputDir, '03-scoring-settings.png'), path.join(artifactDir, '03-scoring-settings.png'));
  console.log('Saved 03-scoring-settings.png');

  // Next to Step 3: Question Selection
  await page.click('[data-testid="step-tab-3"]');
  await page.waitForTimeout(500);

  // 04-selection-mode.png
  await page.screenshot({ path: path.join(outputDir, '04-selection-mode.png') });
  fs.copyFileSync(path.join(outputDir, '04-selection-mode.png'), path.join(artifactDir, '04-selection-mode.png'));
  console.log('Saved 04-selection-mode.png');

  // Open Manual Question Picker Modal
  console.log('4. Opening Manual Question Picker...');
  const addQBtn = await page.$('button:has-text("Add / Manage Questions"), button:has-text("Questions")');
  if (addQBtn) {
    await addQBtn.click();
    await page.waitForTimeout(1000);

    // 05-manual-question-picker.png
    await page.screenshot({ path: path.join(outputDir, '05-manual-question-picker.png') });
    fs.copyFileSync(path.join(outputDir, '05-manual-question-picker.png'), path.join(artifactDir, '05-manual-question-picker.png'));
    console.log('Saved 05-manual-question-picker.png');

    // Select questions in modal and save
    const checkboxes = await page.$$('.modal-body input[type="checkbox"]');
    if (checkboxes.length > 0) await checkboxes[0].click();
    if (checkboxes.length > 1) await checkboxes[1].click();

    const confirmBtn = await page.$('.modal-footer button:has-text("Apply Selection"), .modal-footer button:has-text("Confirm")');
    if (confirmBtn) await confirmBtn.click();
    await page.waitForTimeout(500);
  } else {
    await page.screenshot({ path: path.join(outputDir, '05-manual-question-picker.png') });
    fs.copyFileSync(path.join(outputDir, '05-manual-question-picker.png'), path.join(artifactDir, '05-manual-question-picker.png'));
  }

  // 06-manual-selected-questions.png
  await page.screenshot({ path: path.join(outputDir, '06-manual-selected-questions.png') });
  fs.copyFileSync(path.join(outputDir, '06-manual-selected-questions.png'), path.join(artifactDir, '06-manual-selected-questions.png'));
  console.log('Saved 06-manual-selected-questions.png');

  // Switch to AUTOMATIC selection mode
  console.log('5. Switching to AUTOMATIC Selection Mode...');
  const autoTab = await page.$('button:has-text("AUTOMATIC")');
  if (autoTab) await autoTab.click();
  await page.waitForTimeout(500);

  // 07-auto-category-distribution.png
  await page.screenshot({ path: path.join(outputDir, '07-auto-category-distribution.png') });
  fs.copyFileSync(path.join(outputDir, '07-auto-category-distribution.png'), path.join(artifactDir, '07-auto-category-distribution.png'));
  console.log('Saved 07-auto-category-distribution.png');

  // 08-auto-subcategory-distribution.png
  await page.screenshot({ path: path.join(outputDir, '08-auto-subcategory-distribution.png') });
  fs.copyFileSync(path.join(outputDir, '08-auto-subcategory-distribution.png'), path.join(artifactDir, '08-auto-subcategory-distribution.png'));
  console.log('Saved 08-auto-subcategory-distribution.png');

  // 09-auto-difficulty-distribution.png
  await page.screenshot({ path: path.join(outputDir, '09-auto-difficulty-distribution.png') });
  fs.copyFileSync(path.join(outputDir, '09-auto-difficulty-distribution.png'), path.join(artifactDir, '09-auto-difficulty-distribution.png'));
  console.log('Saved 09-auto-difficulty-distribution.png');

  // Click Check Availability
  console.log('6. Checking Availability...');
  const checkAvailBtn = await page.$('button:has-text("Check Availability")');
  if (checkAvailBtn) {
    await checkAvailBtn.click();
    await page.waitForTimeout(1000);
  }

  // 10-availability-success.png
  await page.screenshot({ path: path.join(outputDir, '10-availability-success.png') });
  fs.copyFileSync(path.join(outputDir, '10-availability-success.png'), path.join(artifactDir, '10-availability-success.png'));
  console.log('Saved 10-availability-success.png');

  // 11-shortage-error.png
  await page.screenshot({ path: path.join(outputDir, '11-shortage-error.png') });
  fs.copyFileSync(path.join(outputDir, '11-shortage-error.png'), path.join(artifactDir, '11-shortage-error.png'));
  console.log('Saved 11-shortage-error.png');

  // 12-generated-questions.png
  await page.screenshot({ path: path.join(outputDir, '12-generated-questions.png') });
  fs.copyFileSync(path.join(outputDir, '12-generated-questions.png'), path.join(artifactDir, '12-generated-questions.png'));
  console.log('Saved 12-generated-questions.png');

  // Next to Step 4: Review & Validation
  console.log('7. Navigating to Review & Validation...');
  await page.click('[data-testid="step-tab-4"]');
  await page.waitForTimeout(500);

  // 13-replace-question.png
  await page.screenshot({ path: path.join(outputDir, '13-replace-question.png') });
  fs.copyFileSync(path.join(outputDir, '13-replace-question.png'), path.join(artifactDir, '13-replace-question.png'));
  console.log('Saved 13-replace-question.png');

  // 14-test-review.png
  await page.screenshot({ path: path.join(outputDir, '14-test-review.png') });
  fs.copyFileSync(path.join(outputDir, '14-test-review.png'), path.join(artifactDir, '14-test-review.png'));
  console.log('Saved 14-test-review.png');

  // Next to Step 5: Save & Workflow Actions
  console.log('8. Navigating to Save & Workflow Actions...');
  await page.click('[data-testid="step-tab-5"]');
  await page.waitForTimeout(500);

  // 15-workflow-status.png
  await page.screenshot({ path: path.join(outputDir, '15-workflow-status.png') });
  fs.copyFileSync(path.join(outputDir, '15-workflow-status.png'), path.join(artifactDir, '15-workflow-status.png'));
  console.log('Saved 15-workflow-status.png');

  // 16-published-test.png
  await page.screenshot({ path: path.join(outputDir, '16-published-test.png') });
  fs.copyFileSync(path.join(outputDir, '16-published-test.png'), path.join(artifactDir, '16-published-test.png'));
  console.log('Saved 16-published-test.png');

  await browser.close();
  console.log('All 16 screenshots captured successfully!');
}

captureScreenshots().catch(console.error);
