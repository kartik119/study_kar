import { chromium } from 'playwright';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../apps/api/src/utils/jwt';
import { app } from '../apps/api/src/app';
import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';

async function generateScreenshots() {
  console.log('--- Starting Topic Practice Screenshot Generation ---');

  const rootDir = path.resolve(__dirname, '..');
  const outputDir = path.join(rootDir, 'docs', 'demo-walkthrough', 'topic-practice');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Seed Database for Walkthrough
  console.log('Seeding demo practice data...');

  await prisma.practiceSessionQuestion.deleteMany({ where: { session: { category: { code: 'DEMO_POLITY' } } } });
  await prisma.practiceSession.deleteMany({ where: { category: { code: 'DEMO_POLITY' } } });
  await prisma.studentMcqPracticeHistory.deleteMany({ where: { question: { category: { code: 'DEMO_POLITY' } } } });
  await prisma.studentTaxonomyPracticeStats.deleteMany({ where: { category: { code: 'DEMO_POLITY' } } });
  await prisma.mcqQuestion.deleteMany({ where: { category: { code: 'DEMO_POLITY' } } });
  
  const student = await prisma.user.upsert({
    where: { mobile: '9876500001' },
    update: { preparationLanguage: 'en' },
    create: {
      mobile: '9876500001',
      fullName: 'Demo Practice Student',
      preparationLanguage: 'en',
      accountStatus: 'ACTIVE',
    },
  });

  const studentToken = signAccessToken({
    userId: student.id,
    accountType: 'STUDENT',
    sessionId: 'session-demo-student',
  });

  const studentKn = await prisma.user.upsert({
    where: { mobile: '9876500002' },
    update: { preparationLanguage: 'kn' },
    create: {
      mobile: '9876500002',
      fullName: 'ಕನ್ನಡ ಅಭ್ಯಾಸ ವಿದ್ಯಾರ್ಥಿ',
      preparationLanguage: 'kn',
      accountStatus: 'ACTIVE',
    },
  });

  const studentKnToken = signAccessToken({
    userId: studentKn.id,
    accountType: 'STUDENT',
    sessionId: 'session-demo-student-kn',
  });

  const category = await prisma.academicCategory.upsert({
    where: { code: 'DEMO_POLITY' },
    update: {},
    create: {
      code: 'DEMO_POLITY',
      nameEn: 'Indian Polity & Constitution',
      nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ ಮತ್ತು ಸಂವಿಧಾನ',
      slugEn: 'demo-polity',
      slugKn: 'demo-polity-kn',
    },
  });

  const subcategory = await prisma.academicSubcategory.upsert({
    where: { categoryId_code: { categoryId: category.id, code: 'DEMO_FUNDAMENTAL_RIGHTS' } },
    update: {},
    create: {
      categoryId: category.id,
      code: 'DEMO_FUNDAMENTAL_RIGHTS',
      nameEn: 'Fundamental Rights & Duties',
      nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು ಮತ್ತು ಕರ್ತವ್ಯಗಳು',
      slugEn: 'demo-fundamental-rights',
      slugKn: 'demo-fundamental-rights-kn',
    },
  });

  // Seed 5 approved bilingual MCQs
  const q1 = await prisma.mcqQuestion.create({
    data: {
      code: 'MCQ_DEMO_01',
      questionTextEn: 'Which Article of the Indian Constitution guarantees Equality Before Law?',
      questionTextKn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಯಾವ ವಿಧಿಯು ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ?',
      optionA_En: 'Article 12',
      optionA_Kn: 'ವಿಧಿ 12',
      optionB_En: 'Article 14',
      optionB_Kn: 'ವಿಧಿ 14',
      optionC_En: 'Article 19',
      optionC_Kn: 'ವಿಧಿ 19',
      optionD_En: 'Article 21',
      optionD_Kn: 'ವಿಧಿ 21',
      correctOption: 'B',
      explanationEn: 'Article 14 guarantees equality before law and equal protection of the laws within the territory of India.',
      explanationKn: 'ವಿಧಿ 14 ಭಾರತದ ಭೂಪ್ರದೇಶದಲ್ಲಿ ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆ ಮತ್ತು ಕಾನೂನುಗಳ ಸಮಾನ ರಕ್ಷಣೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ.',
      difficulty: 'EASY',
      status: 'APPROVED',
      categoryId: category.id,
      subcategoryId: subcategory.id,
      isPyq: true,
      pyqExamName: 'KAS Prelims',
      pyqYear: 2021,
    },
  });

  const q2 = await prisma.mcqQuestion.create({
    data: {
      code: 'MCQ_DEMO_02',
      questionTextEn: 'Which Article abolishes Untouchability and forbids its practice in any form?',
      questionTextKn: 'ಅಸ್ಪೃಶ್ಯತೆಯನ್ನು ನಿರ್ಮೂಲನೆ ಮಾಡುವ ಮತ್ತು ಅದರ ಆಚರಣೆಯನ್ನು ನಿಷೇಧಿಸುವ ವಿಧಿ ಯಾವುದು?',
      optionA_En: 'Article 15',
      optionA_Kn: 'ವಿಧಿ 15',
      optionB_En: 'Article 16',
      optionB_Kn: 'ವಿಧಿ 16',
      optionC_En: 'Article 17',
      optionC_Kn: 'ವಿಧಿ 17',
      optionD_En: 'Article 18',
      optionD_Kn: 'ವಿಧಿ 18',
      correctOption: 'C',
      explanationEn: 'Article 17 explicitly abolishes untouchability and makes its practice an offense punishable in accordance with law.',
      explanationKn: 'ವಿಧಿ 17 ಅಸ್ಪೃಶ್ಯತೆಯನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ನಿರ್ಮೂಲನೆ ಮಾಡುತ್ತದೆ ಮತ್ತು ಅದರ ಆಚರಣೆಯನ್ನು ಶಿಕ್ಷಾರ್ಹ ಅಪರಾಧವಾಗಿಸುತ್ತದೆ.',
      difficulty: 'MEDIUM',
      status: 'APPROVED',
      categoryId: category.id,
      subcategoryId: subcategory.id,
      isPyq: false,
    },
  });

  const q3 = await prisma.mcqQuestion.create({
    data: {
      code: 'MCQ_DEMO_03',
      questionTextEn: 'Which Right is called the Heart and Soul of the Constitution by Dr. B.R. Ambedkar?',
      questionTextKn: 'ಡಾ. ಬಿ.ಆರ್. ಅಂಬೇಡ್ಕರ್ ಅವರು ಸಂವಿಧಾನದ "ಹೃದಯ ಮತ್ತು ಆತ್ಮ" ಎಂದು ಕರೆದ ಹಕ್ಕು ಯಾವುದು?',
      optionA_En: 'Right to Equality',
      optionA_Kn: 'ಸಮಾನತೆಯ ಹಕ್ಕು',
      optionB_En: 'Right to Freedom',
      optionB_Kn: 'ಸ್ವಾತಂತ್ರ್ಯದ ಹಕ್ಕು',
      optionC_En: 'Right to Constitutional Remedies',
      optionC_Kn: 'ಸಂವಿಧಾನಾತ್ಮಕ ಪರಿಹಾರಗಳ ಹಕ್ಕು',
      optionD_En: 'Right against Exploitation',
      optionD_Kn: 'ಶೋಷಣೆಯ ವಿರುದ್ಧದ ಹಕ್ಕು',
      correctOption: 'C',
      explanationEn: 'Article 32 (Right to Constitutional Remedies) allows citizens to move the Supreme Court for enforcement of fundamental rights.',
      explanationKn: 'ವಿಧಿ 32 (ಸಂವಿಧಾನಾತ್ಮಕ ಪರಿಹಾರಗಳ ಹಕ್ಕು) ಮೂಲಭೂತ ಹಕ್ಕುಗಳ ಜಾರಿಗಾಗಿ ಸುಪ್ರೀಂ ಕೋರ್ಟ್ ಮೆಟ್ಟಿಲೇರಲು ನಾಗರಿಕರಿಗೆ ಅವಕಾಶ ನೀಡುತ್ತದೆ.',
      difficulty: 'MEDIUM',
      status: 'APPROVED',
      categoryId: category.id,
      subcategoryId: subcategory.id,
      isPyq: true,
      pyqExamName: 'PSI Exam',
      pyqYear: 2022,
    },
  });

  // 2. Start HTTP Servers
  console.log('Starting local API and Static Web Server on ports 4099 and 3099...');
  const apiServer = http.createServer(app);
  await new Promise<void>((resolve) => apiServer.listen(4099, resolve));

  const distDir = path.join(rootDir, 'apps', 'student-web', 'dist');
  const staticApp = express();
  
  // Forward API calls from frontend to local API server at port 4099
  staticApp.use('/api', (req, res) => {
    const proxyReq = http.request(`http://localhost:4099/api${req.url}`, {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:4099' },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
  });

  staticApp.use(express.static(distDir));
  staticApp.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  const webServer = http.createServer(staticApp);
  await new Promise<void>((resolve) => webServer.listen(3099, resolve));

  // 3. Launch Headless Browser
  console.log('Capturing screenshots via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Helper to set student auth token
  const authenticateStudent = async (token: string, user: any) => {
    await page.goto('http://localhost:3099/login');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('student_token', token);
      localStorage.setItem('student_user', JSON.stringify(user));
    }, { token, user });
  };

  // Screen 1: Practice Home (`01-practice-home.png`)
  await authenticateStudent(studentToken, student);
  await page.goto('http://localhost:3099/practice');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '01-practice-home.png') });
  console.log('Captured 01-practice-home.png');

  // Screen 2: Category Practice Grid (`02-category-practice.png`)
  await page.screenshot({ path: path.join(outputDir, '02-category-practice.png') });
  console.log('Captured 02-category-practice.png');

  // Screen 3: Practice Configure Page (`03-practice-configure.png`)
  await page.goto(`http://localhost:3099/practice/configure?categoryId=${category.id}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '03-practice-configure.png') });
  console.log('Captured 03-practice-configure.png');

  // Screen 4: Mode Selection (`04-mode-selection.png`)
  await page.screenshot({ path: path.join(outputDir, '04-mode-selection.png') });
  console.log('Captured 04-mode-selection.png');

  // Start Practice Session via API to navigate to session page
  const startRes = await fetch('http://localhost:4099/api/v1/student/topic-practice/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      categoryId: category.id,
      subcategoryId: subcategory.id,
      selectionMode: 'MIXED',
      requestedQuestionCount: 3,
      acceptShortage: true,
    }),
  }).then((r) => r.json());

  const sessionId = startRes.data.session.id;

  // Screen 5: Active Question (`05-question-active.png`)
  await page.goto(`http://localhost:3099/practice/session/${sessionId}`);
  await page.waitForSelector('[data-testid="option-B"]', { timeout: 10000 });
  await page.screenshot({ path: path.join(outputDir, '05-question-active.png') });
  console.log('Captured 05-question-active.png');

  // Submit Correct Answer -> Screen 6: Correct Feedback (`06-correct-feedback.png`)
  await page.click('[data-testid="option-B"]');
  await page.click('[data-testid="submit-answer-btn"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '06-correct-feedback.png') });
  console.log('Captured 06-correct-feedback.png');

  // Next Question -> Submit Wrong Answer -> Screen 7: Incorrect Feedback (`07-incorrect-feedback.png`)
  await page.click('[data-testid="next-question-btn"]');
  await page.waitForSelector('[data-testid="option-A"]', { timeout: 10000 });
  await page.click('[data-testid="option-A"]');
  await page.click('[data-testid="submit-answer-btn"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '07-incorrect-feedback.png') });
  console.log('Captured 07-incorrect-feedback.png');

  // Screen 8: Mark For Revision (`08-mark-for-revision.png`)
  await page.click('text="☆ Mark for Revision"');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, '08-mark-for-revision.png') });
  console.log('Captured 08-mark-for-revision.png');

  // Complete Session -> Screen 9: Summary (`09-practice-summary.png`)
  await page.click('text="Finish Session"');
  await page.waitForSelector('text=/Topic Practice Completed/', { timeout: 10000 });
  await page.screenshot({ path: path.join(outputDir, '09-practice-summary.png') });
  console.log('Captured 09-practice-summary.png');

  // Screen 10: Retry Incorrect (`10-retry-incorrect.png`)
  await page.click('text=/Retry .* Incorrect Questions/');
  await page.waitForSelector('[data-testid="option-A"]', { timeout: 10000 });
  await page.screenshot({ path: path.join(outputDir, '10-retry-incorrect.png') });
  console.log('Captured 10-retry-incorrect.png');

  // Screen 11: Weak Areas (`11-weak-areas.png`)
  await page.goto('http://localhost:3099/practice/weak-areas');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '11-weak-areas.png') });
  console.log('Captured 11-weak-areas.png');

  // Screen 12: Practice History (`12-practice-history.png`)
  await page.goto('http://localhost:3099/practice/history');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '12-practice-history.png') });
  console.log('Captured 12-practice-history.png');

  // Screen 13: Kannada Practice (`13-kannada-practice.png`)
  await authenticateStudent(studentKnToken, studentKn);
  const knStartRes = await fetch('http://localhost:4099/api/v1/student/topic-practice/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentKnToken}`,
    },
    body: JSON.stringify({
      categoryId: category.id,
      selectionMode: 'MIXED',
      requestedQuestionCount: 2,
      acceptShortage: true,
    }),
  }).then((r) => r.json());

  const knSessionId = knStartRes.data.session.id;
  await page.goto(`http://localhost:3099/practice/session/${knSessionId}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '13-kannada-practice.png') });
  console.log('Captured 13-kannada-practice.png');

  await browser.close();
  apiServer.close();
  webServer.close();
  console.log('--- All 13 Walkthrough Screenshots Captured Successfully ---');
  process.exit(0);
}

generateScreenshots().catch((err) => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
