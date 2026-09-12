import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { prisma } from '@study-karnataka/database';
import { StudentPerformanceService } from '../apps/api/src/services/student-performance.service';
import { app as apiApp } from '../apps/api/src/app';

async function generateScreenshots() {
  console.log('--- Starting Performance Analytics Screenshot Generation ---');

  const outputDir = path.join(__dirname, '..', 'docs', 'demo-walkthrough', 'performance-analytics');
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Seed Demo Performance Data
  console.log('Seeding demo performance analytics data...');

  const student = await prisma.user.create({
    data: {
      mobile: `999900${Date.now().toString().slice(-4)}`,
      fullName: 'Rahul Gowda',
      accountType: 'STUDENT',
      preparationLanguage: 'en',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: `perf_admin_${Date.now()}@studykarnataka.in`,
      fullName: 'Admin Director',
      accountType: 'ADMIN',
    },
  });

  const category1 = await prisma.academicCategory.create({
    data: {
      code: `CAT_POL_${Date.now()}`,
      nameEn: 'Indian Polity & Governance',
      nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ ಮತ್ತು ಆಡಳಿತ',
      slugEn: `cat-pol-${Date.now()}`,
      slugKn: `cat-pol-kn-${Date.now()}`,
    },
  });

  const category2 = await prisma.academicCategory.create({
    data: {
      code: `CAT_GEO_${Date.now()}`,
      nameEn: 'Karnataka Geography & Climate',
      nameKn: 'ಕರ್ನಾಟಕ ಭೂಗೋಳ ಮತ್ತು ವಾಯುಗುಣ',
      slugEn: `cat-geo-${Date.now()}`,
      slugKn: `cat-geo-kn-${Date.now()}`,
    },
  });

  const sub1 = await prisma.academicSubcategory.create({
    data: {
      categoryId: category1.id,
      code: `SUB_CONST_${Date.now()}`,
      nameEn: 'Constitutional Framework & Rights',
      nameKn: 'ಸಂವಿಧಾನಾತ್ಮಕ ಚೌಕಟ್ಟು ಮತ್ತು ಹಕ್ಕುಗಳು',
      slugEn: `sub-const-${Date.now()}`,
      slugKn: `sub-const-kn-${Date.now()}`,
    },
  });

  const sub2 = await prisma.academicSubcategory.create({
    data: {
      categoryId: category2.id,
      code: `SUB_RIVER_${Date.now()}`,
      nameEn: 'River Basins & Irrigation',
      nameKn: 'ನದಿ ಕಣಿವೆಗಳು ಮತ್ತು ನೀರಾವರಿ',
      slugEn: `sub-river-${Date.now()}`,
      slugKn: `sub-river-kn-${Date.now()}`,
    },
  });

  // Questions
  const q1 = await prisma.mcqQuestion.create({
    data: {
      code: `Q_DEMO_1_${Date.now()}`,
      questionTextEn: 'Which Article guarantees Equality before Law?',
      questionTextKn: 'ಯಾವ ವಿಧಿಯು ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ?',
      optionA_En: 'Article 12', optionA_Kn: 'ವಿಧಿ 12',
      optionB_En: 'Article 14', optionB_Kn: 'ವಿಧಿ 14',
      optionC_En: 'Article 19', optionC_Kn: 'ವಿಧಿ 19',
      optionD_En: 'Article 21', optionD_Kn: 'ವಿಧಿ 21',
      correctOption: 'B',
      explanationEn: 'Article 14 ensures equality before law.',
      explanationKn: 'ವಿಧಿ 14 ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತ್ರಿಗೊಳಿಸುತ್ತದೆ.',
      difficulty: 'EASY', status: 'APPROVED',
      categoryId: category1.id, subcategoryId: sub1.id,
    },
  });

  const q2 = await prisma.mcqQuestion.create({
    data: {
      code: `Q_DEMO_2_${Date.now()}`,
      questionTextEn: 'Krishna river originates in which mountain range?',
      questionTextKn: 'ಕೃಷ್ಣಾ ನದಿಯು ಯಾವ ಪರ್ವತ ಶ್ರೇಣಿಯಲ್ಲಿ ಉದ್ಭವಿಸುತ್ತದೆ?',
      optionA_En: 'Western Ghats (Mahabaleshwar)', optionA_Kn: 'ಪಶ್ಚಿಮ ಘಟ್ಟಗಳು (ಮಹಾಬಲೇಶ್ವರ)',
      optionB_En: 'Eastern Ghats', optionB_Kn: 'ಪೂರ್ವ ಘಟ್ಟಗಳು',
      optionC_En: 'Vindhya Range', optionC_Kn: 'ವಿಂಧ್ಯ ಶ್ರೇಣಿ',
      optionD_En: 'Satpura Range', optionD_Kn: 'ಸತ್ಪುರ ಶ್ರೇಣಿ',
      correctOption: 'A',
      explanationEn: 'Krishna River originates at Mahabaleshwar in Western Ghats.',
      explanationKn: 'ಕೃಷ್ಣಾ ನದಿಯು ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಮಹಾಬಲೇಶ್ವರದಲ್ಲಿ ಉದ್ಭವಿಸುತ್ತದೆ.',
      difficulty: 'MEDIUM', status: 'APPROVED',
      categoryId: category2.id, subcategoryId: sub2.id,
    },
  });

  // Practice session
  const practiceSession = await prisma.practiceSession.create({
    data: {
      studentId: student.id,
      categoryId: category1.id,
      subcategoryId: sub1.id,
      selectionMode: 'MIXED',
      requestedQuestionCount: 2,
      actualQuestionCount: 2,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await prisma.practiceSessionQuestion.create({
    data: { sessionId: practiceSession.id, questionId: q1.id, selectedOption: 'B', isCorrect: true, displayOrder: 1 },
  });
  await prisma.practiceSessionQuestion.create({
    data: { sessionId: practiceSession.id, questionId: q2.id, selectedOption: 'B', isCorrect: false, displayOrder: 2 },
  });

  await StudentPerformanceService.recordPracticeSessionPerformance(practiceSession.id);

  // Ranked Mock Test & Attempt (Results Awaited)
  const mockTest1 = await prisma.mockTest.create({
    data: {
      code: `MOCK_DEMO_1_${Date.now()}`,
      titleEn: 'KAS Prelims Ranked Test 04',
      titleKn: 'ಕೆಎಎಸ್ ಪ್ರಿಲಿಮ್ಸ್ ರ‍್ಯಾಂಕ್ ಟೆಸ್ಟ್ 04',
      totalQuestions: 100,
      totalMarks: 200,
      status: 'PUBLISHED',
    },
  });

  const rankedTest1 = await prisma.rankedTest.create({
    data: {
      code: `RANKED_DEMO_1_${Date.now()}`,
      mockTestId: mockTest1.id,
      status: 'CLOSED',
      mode: 'SCHEDULED_LIVE',
      scheduledStartAt: new Date(Date.now() - 7200000),
      availableFrom: new Date(Date.now() - 7200000),
      scheduledEndAt: new Date(Date.now() - 3600000),
      resultsPublishedAt: new Date(Date.now() + 86400000), // Results Awaited!
    },
  });

  await prisma.rankedAttempt.create({
    data: {
      rankedTestId: rankedTest1.id,
      studentId: student.id,
      status: 'SUBMITTED',
      startedAt: new Date(Date.now() - 7000000),
      expiresAt: new Date(Date.now() - 3600000),
      submittedAt: new Date(Date.now() - 3800000),
      totalQuestions: 100,
      attemptedCount: 88,
      correctCount: 68,
      wrongCount: 20,
      unansweredCount: 12,
      rawScore: 116.0,
      maximumMarks: 200.0,
    },
  });

  // Published Ranked Test
  const mockTest2 = await prisma.mockTest.create({
    data: {
      code: `MOCK_DEMO_2_${Date.now()}`,
      titleEn: 'PSI General Studies Mock Test 02',
      titleKn: 'ಪಿಎಸ್‌ಐ ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಟೆಸ್ಟ್ 02',
      totalQuestions: 50,
      totalMarks: 100,
      status: 'PUBLISHED',
    },
  });

  const rankedTest2 = await prisma.rankedTest.create({
    data: {
      code: `RANKED_DEMO_2_${Date.now()}`,
      mockTestId: mockTest2.id,
      status: 'CLOSED',
      mode: 'SCHEDULED_LIVE',
      scheduledStartAt: new Date(Date.now() - 172800000),
      availableFrom: new Date(Date.now() - 172800000),
      scheduledEndAt: new Date(Date.now() - 169200000),
      resultsPublishedAt: new Date(Date.now() - 86400000), // Published!
    },
  });

  const attempt2 = await prisma.rankedAttempt.create({
    data: {
      rankedTestId: rankedTest2.id,
      studentId: student.id,
      status: 'SUBMITTED',
      startedAt: new Date(Date.now() - 172000000),
      expiresAt: new Date(Date.now() - 169200000),
      submittedAt: new Date(Date.now() - 170000000),
      totalQuestions: 50,
      attemptedCount: 45,
      correctCount: 35,
      wrongCount: 10,
      unansweredCount: 5,
      rawScore: 65.0,
      maximumMarks: 100.0,
    },
  });

  await prisma.rankedResult.create({
    data: {
      rankedTestId: rankedTest2.id,
      attemptId: attempt2.id,
      studentId: student.id,
      rank: 42,
      totalParticipants: 1850,
      rawScore: 65.0,
      correctCount: 35,
      wrongCount: 10,
      unansweredCount: 5,
      timeTakenSeconds: 3200,
      publishedAt: new Date(Date.now() - 86400000),
    },
  });

  await StudentPerformanceService.recordRankedAttemptPerformance(attempt2.id);

  // Frequently Wrong History
  await prisma.studentMcqPracticeHistory.create({
    data: {
      studentId: student.id,
      mcqQuestionId: q2.id,
      timesSeen: 4,
      timesCorrect: 1,
      timesWrong: 3,
      isCurrentlyWeak: true,
      lastAttemptedAt: new Date(),
    },
  });

  console.log('Starting API & Web Servers...');

  const apiServer = http.createServer(apiApp);
  await new Promise<void>((resolve) => apiServer.listen(4099, resolve));

  // Static Student Web
  const studentDist = path.join(__dirname, '..', 'apps', 'student-web', 'dist');
  const studentApp = express();
  studentApp.use('/api', (req, res) => {
    const proxyReq = http.request(`http://localhost:4099/api${req.url}`, {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:4099' },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
  });
  studentApp.use(express.static(studentDist));
  studentApp.get('*', (_req, res) => res.sendFile(path.join(studentDist, 'index.html')));
  const studentServer = http.createServer(studentApp);
  await new Promise<void>((resolve) => studentServer.listen(3099, resolve));

  // Static Admin Web
  const adminDist = path.join(__dirname, '..', 'apps', 'admin-web', 'dist');
  const adminApp = express();
  adminApp.use('/api', (req, res) => {
    const proxyReq = http.request(`http://localhost:4099/api${req.url}`, {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:4099' },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
  });
  adminApp.use(express.static(adminDist));
  adminApp.get('*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  const adminServer = http.createServer(adminApp);
  await new Promise<void>((resolve) => adminServer.listen(3098, resolve));

  console.log('Capturing Playwright screenshots...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 850 });

  // 1. Authenticate Student
  await page.goto('http://localhost:3099/login');
  await page.evaluate(({ studentId }) => {
    localStorage.setItem('student_token', 'mock_demo_student_token');
    localStorage.setItem('student_user', JSON.stringify({ id: studentId, fullName: 'Rahul Gowda', preparationLanguage: 'en' }));
  }, { studentId: student.id });

  // Authenticate API proxy via jwt or bypass
  const authStudentRes = await fetch('http://localhost:4099/api/v1/auth/student/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: student.mobile, purpose: 'STUDENT_REGISTRATION' }),
  }).then((r) => r.json());

  const verifyStudentRes = await fetch('http://localhost:4099/api/v1/auth/student/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: student.mobile, otp: authStudentRes.data.devOtp, purpose: 'STUDENT_REGISTRATION' }),
  }).then((r) => r.json());

  const studentToken = verifyStudentRes.data.accessToken;
  await page.evaluate((tok) => localStorage.setItem('student_token', tok), studentToken);

  // Screen 1: Unified Results Overview (`01-results-overview.png`)
  await page.goto('http://localhost:3099/results');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '01-results-overview.png') });
  console.log('Captured 01-results-overview.png');

  // Screen 2: Performance Overview (`02-performance-overview.png`)
  await page.goto('http://localhost:3099/performance');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '02-performance-overview.png') });
  console.log('Captured 02-performance-overview.png');

  // Screen 3: Category Performance Cards (`03-performance-category-cards.png`)
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, '03-performance-category-cards.png') });
  console.log('Captured 03-performance-category-cards.png');

  // Screen 4: Accuracy Trend (`04-accuracy-trend.png`)
  await page.goto('http://localhost:3099/performance?timeframe=90D');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '04-accuracy-trend.png') });
  console.log('Captured 04-accuracy-trend.png');

  // Screen 5: Category Detail (`05-category-detail.png`)
  await page.goto(`http://localhost:3099/performance/category/${category1.id}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '05-category-detail.png') });
  console.log('Captured 05-category-detail.png');

  // Screen 6: Subcategory Performance (`06-subcategory-performance.png`)
  await page.goto(`http://localhost:3099/performance/category/${category2.id}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '06-subcategory-performance.png') });
  console.log('Captured 06-subcategory-performance.png');

  // Screen 7: Weak Areas (`07-weak-areas.png`)
  await page.goto('http://localhost:3099/performance/weak-areas');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '07-weak-areas.png') });
  console.log('Captured 07-weak-areas.png');

  // Screen 8: Weak Area Detail (`08-weak-area-detail.png`)
  await page.screenshot({ path: path.join(outputDir, '08-weak-area-detail.png') });
  console.log('Captured 08-weak-area-detail.png');

  // Screen 9: Strong Areas (`09-strong-areas.png`)
  await page.goto('http://localhost:3099/performance');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '09-strong-areas.png') });
  console.log('Captured 09-strong-areas.png');

  // Screen 10: Frequently Wrong (`10-frequently-wrong.png`)
  await page.goto('http://localhost:3099/performance/questions/frequently-wrong');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '10-frequently-wrong.png') });
  console.log('Captured 10-frequently-wrong.png');

  // Screen 11: Practice Recommendation (`11-practice-recommendation.png`)
  await page.goto('http://localhost:3099/performance');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '11-practice-recommendation.png') });
  console.log('Captured 11-practice-recommendation.png');

  // Screen 12: Ranked vs Practice Breakdown (`12-ranked-vs-practice.png`)
  await page.goto('http://localhost:3099/results?sourceType=RANKED_TEST');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '12-ranked-vs-practice.png') });
  console.log('Captured 12-ranked-vs-practice.png');

  // Screen 13: Results Awaited Ranked (`13-results-awaited-ranked.png`)
  await page.goto('http://localhost:3099/results');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '13-results-awaited-ranked.png') });
  console.log('Captured 13-results-awaited-ranked.png');

  // Admin Screens: 14 & 15
  await page.goto('http://localhost:3098/login');
  const { signAccessToken } = await import('../apps/api/src/utils/jwt');
  const adminToken = signAccessToken({
    userId: admin.id,
    accountType: 'ADMIN',
    permissions: ['student_performance.view', 'performance_analytics.view', 'performance_analytics.rebuild'],
    sessionId: 'sess-admin-demo',
  });
  await page.evaluate((tok) => localStorage.setItem('admin_token', tok), adminToken);

  // Screen 14: Admin Performance Overview (`14-admin-performance-overview.png`)
  await page.goto('http://localhost:3098/students/performance');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '14-admin-performance-overview.png') });
  console.log('Captured 14-admin-performance-overview.png');

  // Screen 15: Admin Student Performance Reconciliation (`15-admin-student-performance.png`)
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, '15-admin-student-performance.png') });
  console.log('Captured 15-admin-student-performance.png');

  // Screen 16: Mobile Performance View (`16-mobile-performance.png`)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3099/performance');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '16-mobile-performance.png') });
  console.log('Captured 16-mobile-performance.png');

  await browser.close();
  apiServer.close();
  studentServer.close();
  adminServer.close();

  console.log('--- All 16 Performance Walkthrough Screenshots Captured Successfully ---');
  process.exit(0);
}

generateScreenshots().catch((err) => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
