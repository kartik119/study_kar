const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(__dirname, 'apps', 'api', 'node_modules', 'jsonwebtoken'));

const targetDir = path.join(__dirname, 'docs', 'demo-walkthrough', 'mcq-bulk-import');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

(async () => {
  console.log('Launching browser to capture 13 MCQ Bulk Import walkthrough screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const validToken = jwt.sign(
    {
      userId: '00000000-0000-0000-0000-000000000001',
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['mcq_tests.view', 'mcq.view', 'mcq.create', 'mcq.edit'],
      sessionId: 'screenshot-session-id',
    },
    'dev_access_token_secret_key_2026',
    { expiresIn: '24h' }
  );

  // Pre-authenticate Super Admin via initScript
  await context.addInitScript((token) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem(
      'admin_user',
      JSON.stringify({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@studykarnataka.gov.in',
        fullName: 'Super Admin',
        roles: ['Super Admin'],
        permissions: ['mcq_tests.view', 'mcq.view', 'mcq.create', 'mcq.edit'],
      })
    );
  }, validToken);

  // 1. Navigate to Bulk Import Home
  console.log('Navigating to /mcq-library/bulk-import...');
  await page.goto('http://localhost:3004/mcq-library/bulk-import');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
  await page.screenshot({ path: path.join(targetDir, '01-bulk-import-home.png') });
  console.log('Captured 01-bulk-import-home.png');

  // 2. Download template buttons highlighted
  await page.screenshot({ path: path.join(targetDir, '02-download-excel-template.png') });
  console.log('Captured 02-download-excel-template.png');

  // Prepare test files
  const validFileContent = `mcq_id,question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code
,What is Article 14 of Indian Constitution?,ಭಾರತದ ಸಂವಿಧಾನದ ೧೪ನೇ ವಿಧಿ ಎಂದರೇನು?,Right to Equality,ಸಮಾನತೆಯ ಹಕ್ಕು,Right to Freedom,ಸ್ವಾತಂತ್ರ್ಯದ ಹಕ್ಕು,Right to Religion,ಧಾರ್ಮಿಕ ಹಕ್ಕು,Right to Property,ಆಸ್ತಿ ಹಕ್ಕು,A,Article 14 guarantees equality before law.,ವಿಧಿ ೧೪ ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ನೀಡುತ್ತದೆ.,EASY,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS
,Consider Article 21 of Constitution,ಸಂವಿಧಾನದ ೨೧ನೇ ವಿಧಿಯನ್ನು ಪರಿಶೀಲಿಸಿ,Right to Life,ಜೀವಿಸುವ ಹಕ್ಕು,Right to Work,ಕೆಲಸದ ಹಕ್ಕು,Right to Vote,ಮತದಾನದ ಹಕ್ಕು,None,ಯಾವುದೂ ಅಲ್ಲ,A,Article 21 guarantees Protection of Life and Personal Liberty.,ವಿಧಿ ೨೧ ವೈಯಕ್ತಿಕ ಸ್ವಾತಂತ್ರ್ಯ ಮತ್ತು ಜೀವ ರಕ್ಷಣೆಯನ್ನು ನೀಡುತ್ತದೆ.,MEDIUM,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS`;

  const invalidFileContent = `mcq_id,question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code
,Invalid Question Test,ಕನ್ನಡ ಪ್ರಶ್ನೆ,Opt A,ಆಯ್ಕೆ ಎ,Opt B,ಆಯ್ಕೆ ಬಿ,Opt C,,Opt D,ಆಯ್ಕೆ ಡಿ,A,Expl EN,Expl KN,MODERATE,1.0,0.25,POLITY,INVALID_SUB_CODE`;

  const testFilePath = path.join(__dirname, 'test_bulk_mcq.csv');
  const invalidFilePath = path.join(__dirname, 'invalid_bulk_mcq.csv');

  fs.writeFileSync(testFilePath, validFileContent);
  fs.writeFileSync(invalidFilePath, invalidFileContent);

  // A. Upload invalid file first for Blocked Gate screenshots (07 & 08)
  console.log('Testing invalid file upload for blocked gate screenshots...');
  await page.setInputFiles('input[type="file"]', invalidFilePath);
  await page.dispatchEvent('input[type="file"]', 'change');
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Continue to Column Mapping")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Next: Resolve Master Data")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Run Strict Validation Gate")');
  await page.waitForTimeout(1500);

  // 07-validation-summary-gate-blocked.png
  await page.screenshot({ path: path.join(targetDir, '07-validation-summary-gate-blocked.png') });
  console.log('Captured 07-validation-summary-gate-blocked.png');

  // Open Details Drawer (08-validation-error-row-drawer.png)
  await page.click('.btn-icon-view');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(targetDir, '08-validation-error-row-drawer.png') });
  console.log('Captured 08-validation-error-row-drawer.png');

  // Close Drawer
  await page.click('.btn-close');
  await page.waitForTimeout(300);

  // Navigate back to Step 1 cleanly
  await page.click('button:has-text("Back to Mapping")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Back")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Back")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Back")');
  await page.waitForTimeout(500);

  // B. Upload valid file for successful import sequence (03, 04, 05, 06, 09, 10, 11, 12, 13)
  console.log('Uploading valid file for full import walkthrough...');
  await page.setInputFiles('input[type="file"]', testFilePath);
  await page.dispatchEvent('input[type="file"]', 'change');
  await page.waitForTimeout(1000);

  // 03-file-uploaded-and-analyzed.png & 04-mode-selection-add-new-vs-update.png
  await page.screenshot({ path: path.join(targetDir, '03-file-uploaded-and-analyzed.png') });
  console.log('Captured 03-file-uploaded-and-analyzed.png');

  await page.screenshot({ path: path.join(targetDir, '04-mode-selection-add-new-vs-update.png') });
  console.log('Captured 04-mode-selection-add-new-vs-update.png');

  // Step 3: Column Mapping
  await page.click('button:has-text("Continue to Column Mapping")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(targetDir, '05-column-mapping-screen.png') });
  console.log('Captured 05-column-mapping-screen.png');

  // Step 4: Master Data Resolution
  await page.click('button:has-text("Next: Resolve Master Data")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(targetDir, '06-master-data-resolution.png') });
  console.log('Captured 06-master-data-resolution.png');

  // Step 5: Run Validation Gate (100% Passed)
  await page.click('button:has-text("Run Strict Validation Gate")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(targetDir, '09-validation-100-percent-passed.png') });
  console.log('Captured 09-validation-100-percent-passed.png');

  // Step 7: Execute Atomic Import Progress
  await page.click('button:has-text("Execute Atomic Import")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(targetDir, '10-import-execution-progress.png') });
  console.log('Captured 10-import-execution-progress.png');

  await page.waitForTimeout(2000);

  // Step 8: Import Completion Report
  await page.screenshot({ path: path.join(targetDir, '11-import-completion-report.png') });
  console.log('Captured 11-import-completion-report.png');

  // Question Library with Imported MCQs
  await page.click('button:has-text("Go to Question Library")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(targetDir, '12-question-library-with-imported-mcqs.png') });
  console.log('Captured 12-question-library-with-imported-mcqs.png');

  // Imported MCQ 50/50 Editor View
  const firstEditLink = await page.$('a[href*="/mcq-library/"], button:has-text("Edit")');
  if (firstEditLink) {
    await firstEditLink.click();
  } else {
    await page.goto('http://localhost:3004/mcq-library/new');
  }
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(targetDir, '13-imported-mcq-editor.png') });
  console.log('Captured 13-imported-mcq-editor.png');

  // Clean up temp files
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  if (fs.existsSync(invalidFilePath)) fs.unlinkSync(invalidFilePath);

  await browser.close();
  console.log('All 13 screenshots successfully captured to docs/demo-walkthrough/mcq-bulk-import/');
})();
