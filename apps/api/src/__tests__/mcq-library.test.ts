import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';

describe('MCQ Library & Mock Tests API Integration Tests', () => {
  let adminToken: string;
  let createdQuestionId: string;
  let createdMockTestId: string;

  beforeAll(async () => {
    const adminUser = await prisma.adminUser.upsert({
      where: { email: 'superadmin.mcq@studykarnataka.com' },
      update: {},
      create: {
        email: 'superadmin.mcq@studykarnataka.com',
        fullName: 'Super Admin MCQ',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    adminToken = signAccessToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['mcq_tests.view'],
      sessionId: 'test-mcq-session-id',
    });
  });

  it('1. should create a bilingual MCQ Question via POST /api/v1/admin/mcq-library/questions', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextEn: 'Which Article of the Indian Constitution pertains to Equality before Law?',
        questionTextKn: 'ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಗೆ ಸಂಬಂಧಿಸಿದ ಭಾರತೀಯ ಸಂವಿಧಾನದ ವಿಧಿ ಯಾವುದು?',
        optionA_En: 'Article 14',
        optionA_Kn: 'ವಿಧಿ 14',
        optionB_En: 'Article 19',
        optionB_Kn: 'ವಿಧಿ 19',
        optionC_En: 'Article 21',
        optionC_Kn: 'ವಿಧಿ 21',
        optionD_En: 'Article 32',
        optionD_Kn: 'ವಿಧಿ 32',
        correctOption: 'A',
        explanationEn: 'Article 14 ensures equality before law and equal protection of laws.',
        explanationKn: 'ವಿಧಿ 14 ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ.',
        difficulty: 'MEDIUM',
        positiveMarks: 1.0,
        negativeMarks: 0.25,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questionTextEn).toContain('Article of the Indian Constitution');
    expect(res.body.data.questionTextKn).toContain('ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆ');
    expect(res.body.data.correctOption).toBe('A');

    createdQuestionId = res.body.data.id;
  });

  it('2. should list MCQ questions with search filter via GET /api/v1/admin/mcq-library/questions', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mcq-library/questions?search=Equality')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(createdQuestionId);
  });

  it('3. should create a Mock Test via POST /api/v1/admin/mcq-library/tests', async () => {
    // Approve created question for test eligibility
    await prisma.mcqQuestion.update({
      where: { id: createdQuestionId },
      data: { status: 'APPROVED' },
    });

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titleEn: 'KAS Prelims Model Mock Test 1',
        titleKn: 'ಕೆಎಎಸ್ ಪ್ರಿಲಿಮ್ಸ್ ಮಾದರಿ ಪರೀಕ್ಷೆ 1',
        descriptionEn: 'Full syllabus prelims practice mock test with 100 marks.',
        descriptionKn: 'ಸಂಪೂರ್ಣ ಪಠ್ಯಕ್ರಮದ ಮಾದರಿ ಪರೀಕ್ಷೆ.',
        durationMinutes: 120,
        totalQuestions: 1,
        passingPercentage: 40,
        selectionMode: 'MANUAL',
        questionIds: [createdQuestionId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.titleEn).toBe('KAS Prelims Model Mock Test 1');

    createdMockTestId = res.body.data.id;
  });

  it('4. should attach questions to Mock Test via POST /api/v1/admin/mcq-library/tests/:id/questions', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${createdMockTestId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionIds: [createdQuestionId],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
  });
});
