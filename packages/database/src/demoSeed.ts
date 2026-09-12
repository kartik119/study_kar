import { prisma } from './index';

export async function seedDemoDatabase() {
  console.log('DEMO DATA ONLY — NOT FOR PRODUCTION');

  // Fetch bootstrap admin for audit trail references
  const admin = await prisma.adminUser.findFirst({
    where: { email: 'admin@studykarnataka.com' },
  });
  const adminUserId = admin?.id || null;

  // ---------------------------------------------------------------------------
  // 1. DEMO EXAM AUTHORITY
  // ---------------------------------------------------------------------------
  const authority = await prisma.examAuthority.upsert({
    where: { code: 'DEMO_KPSC' },
    update: {
      nameEn: 'Karnataka Public Service Commission — Demo',
      nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ — ಡೆಮೋ',
      shortNameEn: 'KPSC Demo',
      shortNameKn: 'ಕೆಪಿಎಸ್ಸಿ ಡೆಮೋ',
      officialWebsiteUrl: 'https://example.com',
      isActive: true,
      updatedByAdminId: adminUserId,
    },
    create: {
      code: 'DEMO_KPSC',
      nameEn: 'Karnataka Public Service Commission — Demo',
      nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ — ಡೆಮೋ',
      shortNameEn: 'KPSC Demo',
      shortNameKn: 'ಕೆಪಿಎಸ್ಸಿ ಡೆಮೋ',
      descriptionEn: 'Demo Exam Authority record for Study Karnataka interface verification.',
      descriptionKn: 'ಸ್ಟಡಿ ಕರ್ನಾಟಕ ಇಂಟರ್ಫೇಸ್ ಪರಿಶೀಲನೆಗಾಗಿ ಡೆಮೋ ಪರೀಕ್ಷಾ ಪ್ರಾಧಿಕಾರ.',
      officialWebsiteUrl: 'https://example.com',
      isActive: true,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  // ---------------------------------------------------------------------------
  // 2. DEMO EXAM PROGRAMME
  // ---------------------------------------------------------------------------
  const programme = await prisma.examProgramme.upsert({
    where: { code: 'DEMO_KAS' },
    update: {
      nameEn: 'Karnataka Administrative Service — Demo Programme',
      nameKn: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ — ಡೆಮೋ ಕಾರ್ಯಕ್ರಮ',
      overviewEn: 'Demo data for Study Karnataka interface verification.',
      overviewKn: 'ಸ್ಟಡಿ ಕರ್ನಾಟಕ ಇಂಟರ್ಫೇಸ್ ಪರಿಶೀಲನೆಗಾಗಿ ಡೆಮೋ ಡೇಟಾ.',
      eligibilitySummaryEn: 'Degree from recognized university (Demo).',
      eligibilitySummaryKn: 'ಮಾನ್ಯತೆ ಪಡೆದ ವಿಶ್ವವಿದ್ಯಾಲಯದಿಂದ ಪದವಿ (ಡೆಮೋ).',
      isActive: true,
      updatedByAdminId: adminUserId,
    },
    create: {
      authorityId: authority.id,
      code: 'DEMO_KAS',
      nameEn: 'Karnataka Administrative Service — Demo Programme',
      nameKn: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ — ಡೆಮೋ ಕಾರ್ಯಕ್ರಮ',
      shortNameEn: 'KAS Demo',
      shortNameKn: 'ಕೆಎಎಸ್ ಡೆಮೋ',
      descriptionEn: 'Demo Administrative Service Exam Programme.',
      descriptionKn: 'ಡೆಮೋ ಆಡಳಿತ ಸೇವಾ ಪರೀಕ್ಷಾ ಕಾರ್ಯಕ್ರಮ.',
      overviewEn: 'Demo data for Study Karnataka interface verification.',
      overviewKn: 'ಸ್ಟಡಿ ಕರ್ನಾಟಕ ಇಂಟರ್ಫೇಸ್ ಪರಿಶೀಲನೆಗಾಗಿ ಡೆಮೋ ಡೇಟಾ.',
      eligibilitySummaryEn: 'Degree from recognized university (Demo).',
      eligibilitySummaryKn: 'ಮಾನ್ಯತೆ ಪಡೆದ ವಿಶ್ವವಿದ್ಯಾಲಯದಿಂದ ಪದವಿ (ಡೆಮೋ).',
      officialProgrammeUrl: 'https://example.com/programme',
      isActive: true,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  // ---------------------------------------------------------------------------
  // 3. DEMO EXAM CYCLE
  // ---------------------------------------------------------------------------
  const cycle = await prisma.examCycle.upsert({
    where: {
      programmeId_cycleCode: {
        programmeId: programme.id,
        cycleCode: 'DEMO_KAS_2026',
      },
    },
    update: {
      titleEn: 'Demo KAS Gazetted Probationers Exam 2026',
      titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಪರೀಕ್ಷೆ 2026',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      updatedByAdminId: adminUserId,
    },
    create: {
      programmeId: programme.id,
      cycleCode: 'DEMO_KAS_2026',
      cycleYear: 2026,
      titleEn: 'Demo KAS Gazetted Probationers Exam 2026',
      titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಪರೀಕ್ಷೆ 2026',
      descriptionEn: 'Demo KAS Gazetted Probationers Examination Cycle 2026 for walkthrough.',
      descriptionKn: 'ವಾಕ್‌ಥ್ರೂಗಾಗಿ ಡೆಮೋ ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಪರೀಕ್ಷಾ ಚಕ್ರ ೨೦೨೬.',
      notificationNumber: 'DEMO/KPSC/GP/2026/01',
      notificationDate: new Date('2026-08-01T00:00:00.000Z'),
      applicationStartDate: new Date('2026-08-05T00:00:00.000Z'),
      applicationEndDate: new Date('2026-09-05T00:00:00.000Z'),
      tentativeExamDate: new Date('2026-11-15T00:00:00.000Z'),
      officialNotificationUrl: 'https://example.com/demo-notification.pdf',
      applicationUrl: 'https://example.com/apply-demo',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      publishedByAdminId: adminUserId,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  // Eligibility
  await prisma.examEligibility.upsert({
    where: { examCycleId: cycle.id },
    update: {},
    create: {
      examCycleId: cycle.id,
      minimumAge: 21,
      maximumAge: 38,
      minimumEducationEn: 'Bachelor Degree from a recognized University (Demo)',
      minimumEducationKn: 'ಮಾನ್ಯತೆ ಪಡೆದ ವಿಶ್ವವಿದ್ಯಾಲಯದಿಂದ ಪದವಿ (ಡೆಮೋ)',
      nationalityRequirementEn: 'Citizen of India (Demo)',
      nationalityRequirementKn: 'ಭಾರತದ ಪ್ರಜೆ (ಡೆಮೋ)',
      domicileRequirementEn: 'Karnataka Domicile Preferred (Demo)',
      domicileRequirementKn: 'ಕರ್ನಾಟಕ ನಿವಾಸ ಅರ್ಹತೆ (ಡೆಮೋ)',
    },
  });

  // Important Dates
  await prisma.examImportantDate.deleteMany({ where: { examCycleId: cycle.id } });
  await prisma.examImportantDate.createMany({
    data: [
      {
        examCycleId: cycle.id,
        type: 'NOTIFICATION',
        labelEn: 'Official Notification Date',
        labelKn: 'ಅಧಿಕೃತ ಅಧಿಸೂಚನೆ ದಿನಾಂಕ',
        startAt: new Date('2026-08-01T00:00:00.000Z'),
        isTentative: false,
        displayOrder: 1,
      },
      {
        examCycleId: cycle.id,
        type: 'APPLICATION_START',
        labelEn: 'Online Application Start Date',
        labelKn: 'ಆನ್‌ಲೈನ್ ಅರ್ಜಿ ಪ್ರಾರಂಭ ದಿನಾಂಕ',
        startAt: new Date('2026-08-05T00:00:00.000Z'),
        isTentative: false,
        displayOrder: 2,
      },
      {
        examCycleId: cycle.id,
        type: 'EXAM',
        labelEn: 'Tentative Preliminary Exam Date',
        labelKn: 'ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆಯ ದಿನಾಂಕ',
        startAt: new Date('2026-11-15T00:00:00.000Z'),
        isTentative: true,
        displayOrder: 3,
      },
    ],
  });

  // Official Resources
  await prisma.examOfficialResource.deleteMany({ where: { examCycleId: cycle.id } });
  await prisma.examOfficialResource.createMany({
    data: [
      {
        examCycleId: cycle.id,
        resourceType: 'OFFICIAL_NOTIFICATION',
        labelEn: 'Official Notification PDF (Demo)',
        labelKn: 'ಅಧಿಕೃತ ಅಧಿಸೂಚನೆ ಪಿಡಿಎಫ್ (ಡೆಮೋ)',
        url: 'https://example.com/demo-notification.pdf',
        displayOrder: 1,
      },
      {
        examCycleId: cycle.id,
        resourceType: 'INSTRUCTIONS',
        labelEn: 'Official Syllabus PDF (Demo)',
        labelKn: 'ಅಧಿಕೃತ ಪಠ್ಯಕ್ರಮ ಪಿಡಿಎಫ್ (ಡೆಮೋ)',
        url: 'https://example.com/demo-syllabus.pdf',
        displayOrder: 2,
      },
    ],
  });

  // SEO
  await prisma.examSEO.upsert({
    where: { examCycleId: cycle.id },
    update: {},
    create: {
      examCycleId: cycle.id,
      slugEn: 'demo-kas-2026-exam',
      slugKn: 'demo-kas-2026-parikshe',
      metaTitleEn: 'Demo KAS Exam 2026 — Study Karnataka',
      metaTitleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬ — ಸ್ಟಡಿ ಕರ್ನಾಟಕ',
      metaDescriptionEn: 'Demo examination details for KAS Gazetted Probationers 2026.',
      metaDescriptionKn: 'ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ೨೦೨೬ ರ ಡೆಮೋ ಪರೀಕ್ಷಾ ವಿವರಗಳು.',
      canonicalUrlEn: 'https://example.com/exams/demo-kas-2026',
      canonicalUrlKn: 'https://example.com/kn/exams/demo-kas-2026',
    },
  });

  // ---------------------------------------------------------------------------
  // 4. DEMO EXAM PATTERN (REV 1 - PUBLISHED & REV 2 - DRAFT)
  // ---------------------------------------------------------------------------
  const patternRev1 = await prisma.examPattern.upsert({
    where: {
      examCycleId_revisionNumber: {
        examCycleId: cycle.id,
        revisionNumber: 1,
      },
    },
    update: {
      status: 'PUBLISHED',
      isCurrent: true,
    },
    create: {
      examCycleId: cycle.id,
      revisionNumber: 1,
      titleEn: 'Demo KAS Examination Pattern',
      titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪರೀಕ್ಷಾ ಮಾದರಿ',
      descriptionEn: 'Official examination pattern and stage breakdown (Demo Rev 1).',
      descriptionKn: 'ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ಮಾದರಿ ಮತ್ತು ಹಂತಗಳ ವಿವರ (ಡೆಮೋ ಆವೃತ್ತಿ ೧).',
      status: 'PUBLISHED',
      isCurrent: true,
      publishedAt: new Date('2026-08-01T11:00:00.000Z'),
      publishedByAdminId: adminUserId,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  const patternRev2 = await prisma.examPattern.upsert({
    where: {
      examCycleId_revisionNumber: {
        examCycleId: cycle.id,
        revisionNumber: 2,
      },
    },
    update: {
      status: 'DRAFT',
      isCurrent: false,
    },
    create: {
      examCycleId: cycle.id,
      revisionNumber: 2,
      sourcePatternId: patternRev1.id,
      titleEn: 'Demo KAS Examination Pattern (Draft Rev 2)',
      titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪರೀಕ್ಷಾ ಮಾದರಿ (ಕರಡು ಆವೃತ್ತಿ ೨)',
      descriptionEn: 'Proposed pattern revision for upcoming cycle updates.',
      descriptionKn: 'ಮುಂದಿನ ಪರೀಕ್ಷಾ ಚಕ್ರದ ನವೀಕರಣಕ್ಕಾಗಿ ಉದ್ದೇಶಿತ ಪರೀಕ್ಷಾ ಮಾದರಿ.',
      status: 'DRAFT',
      isCurrent: false,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  // Stages for Pattern Rev 1
  // 1. Prelims Stage
  const prelimsStage = await prisma.examStage.upsert({
    where: {
      examPatternId_code: {
        examPatternId: patternRev1.id,
        code: 'DEMO_STAGE_PRE',
      },
    },
    update: {},
    create: {
      examPatternId: patternRev1.id,
      code: 'DEMO_STAGE_PRE',
      stageType: 'PRELIMINARY',
      nameEn: 'Preliminary Examination',
      nameKn: 'ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆ',
      shortNameEn: 'Prelims',
      shortNameKn: 'ಪೂರ್ವಭಾವಿ',
      displayOrder: 1,
      isQualifying: true,
      contributesToFinalMerit: false,
    },
  });

  // 2. Mains Stage
  const mainsStage = await prisma.examStage.upsert({
    where: {
      examPatternId_code: {
        examPatternId: patternRev1.id,
        code: 'DEMO_STAGE_MAIN',
      },
    },
    update: {},
    create: {
      examPatternId: patternRev1.id,
      code: 'DEMO_STAGE_MAIN',
      stageType: 'MAIN',
      nameEn: 'Main Examination',
      nameKn: 'ಮುಖ್ಯ ಪರೀಕ್ಷೆ',
      shortNameEn: 'Mains',
      shortNameKn: 'ಮುಖ್ಯ',
      displayOrder: 2,
      isQualifying: false,
      contributesToFinalMerit: true,
    },
  });

  // 3. Interview Stage
  const interviewStage = await prisma.examStage.upsert({
    where: {
      examPatternId_code: {
        examPatternId: patternRev1.id,
        code: 'DEMO_STAGE_INTERVIEW',
      },
    },
    update: {},
    create: {
      examPatternId: patternRev1.id,
      code: 'DEMO_STAGE_INTERVIEW',
      stageType: 'INTERVIEW',
      nameEn: 'Interview',
      nameKn: 'ಸಂದರ್ಶನ',
      shortNameEn: 'Interview',
      shortNameKn: 'ಸಂದರ್ಶನ',
      displayOrder: 3,
      isQualifying: false,
      contributesToFinalMerit: true,
    },
  });

  // Papers & Sections for Prelims Stage
  const paperPreGS1 = await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: prelimsStage.id,
        code: 'DEMO_PRE_GS1',
      },
    },
    update: {},
    create: {
      examStageId: prelimsStage.id,
      code: 'DEMO_PRE_GS1',
      assessmentMode: 'OBJECTIVE',
      nameEn: 'General Studies Paper I',
      nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I',
      shortNameEn: 'GS Paper I',
      shortNameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ I',
      displayOrder: 1,
      durationMinutes: 120,
      totalQuestions: 100,
      questionsToAnswer: 100,
      totalMarks: 200,
      defaultNegativeMarkingType: 'FRACTION_OF_QUESTION_MARKS',
      defaultNegativeFractionNumerator: 1,
      defaultNegativeFractionDenominator: 3,
    },
  });

  await prisma.examPaperSection.upsert({
    where: {
      examPaperId_code: {
        examPaperId: paperPreGS1.id,
        code: 'DEMO_SEC_GS',
      },
    },
    update: {},
    create: {
      examPaperId: paperPreGS1.id,
      code: 'DEMO_SEC_GS',
      questionFormat: 'MCQ_SINGLE_CORRECT',
      nameEn: 'General Studies',
      nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ',
      displayOrder: 1,
      totalQuestions: 60,
      questionsToAnswer: 60,
      marksPerQuestion: 2,
      calculatedTotalMarks: 120,
    },
  });

  await prisma.examPaperSection.upsert({
    where: {
      examPaperId_code: {
        examPaperId: paperPreGS1.id,
        code: 'DEMO_SEC_CA',
      },
    },
    update: {},
    create: {
      examPaperId: paperPreGS1.id,
      code: 'DEMO_SEC_CA',
      questionFormat: 'MCQ_SINGLE_CORRECT',
      nameEn: 'Current Affairs',
      nameKn: 'ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
      displayOrder: 2,
      totalQuestions: 40,
      questionsToAnswer: 40,
      marksPerQuestion: 2,
      calculatedTotalMarks: 80,
    },
  });

  const paperPreGS2 = await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: prelimsStage.id,
        code: 'DEMO_PRE_GS2',
      },
    },
    update: {},
    create: {
      examStageId: prelimsStage.id,
      code: 'DEMO_PRE_GS2',
      assessmentMode: 'OBJECTIVE',
      nameEn: 'General Studies Paper II',
      nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ II',
      shortNameEn: 'GS Paper II',
      shortNameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ II',
      displayOrder: 2,
      durationMinutes: 120,
      totalQuestions: 100,
      questionsToAnswer: 100,
      totalMarks: 200,
      defaultNegativeMarkingType: 'FRACTION_OF_QUESTION_MARKS',
      defaultNegativeFractionNumerator: 1,
      defaultNegativeFractionDenominator: 3,
    },
  });

  // Papers for Mains Stage
  const paperMainEssay = await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: mainsStage.id,
        code: 'DEMO_MAIN_ESSAY',
      },
    },
    update: {},
    create: {
      examStageId: mainsStage.id,
      code: 'DEMO_MAIN_ESSAY',
      assessmentMode: 'DESCRIPTIVE',
      nameEn: 'Essay',
      nameKn: 'ಪ್ರಬಂಧ',
      shortNameEn: 'Essay',
      shortNameKn: 'ಪ್ರಬಂಧ',
      displayOrder: 1,
      durationMinutes: 180,
      totalMarks: 250,
    },
  });

  const paperMainGS1 = await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: mainsStage.id,
        code: 'DEMO_MAIN_GS1',
      },
    },
    update: {},
    create: {
      examStageId: mainsStage.id,
      code: 'DEMO_MAIN_GS1',
      assessmentMode: 'DESCRIPTIVE',
      nameEn: 'General Studies I',
      nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ I',
      shortNameEn: 'Mains GS I',
      shortNameKn: 'ಮುಖ್ಯ ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ I',
      displayOrder: 2,
      durationMinutes: 180,
      totalMarks: 250,
    },
  });

  await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: mainsStage.id,
        code: 'DEMO_MAIN_GS2',
      },
    },
    update: {},
    create: {
      examStageId: mainsStage.id,
      code: 'DEMO_MAIN_GS2',
      assessmentMode: 'DESCRIPTIVE',
      nameEn: 'General Studies II',
      nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ II',
      shortNameEn: 'Mains GS II',
      shortNameKn: 'ಮುಖ್ಯ ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ II',
      displayOrder: 3,
      durationMinutes: 180,
      totalMarks: 250,
    },
  });

  // Paper for Interview Stage
  await prisma.examPaper.upsert({
    where: {
      examStageId_code: {
        examStageId: interviewStage.id,
        code: 'DEMO_INTERVIEW',
      },
    },
    update: {},
    create: {
      examStageId: interviewStage.id,
      code: 'DEMO_INTERVIEW',
      assessmentMode: 'INTERVIEW',
      nameEn: 'Personality Test / Interview',
      nameKn: 'ವ್ಯಕ್ತಿತ್ವ ಪರೀಕ್ಷೆ / ಸಂದರ್ಶನ',
      shortNameEn: 'Interview',
      shortNameKn: 'ಸಂದರ್ಶನ',
      displayOrder: 1,
      totalMarks: 50,
    },
  });

  // ---------------------------------------------------------------------------
  // 5. DEMO EXAM SYLLABUS (REV 1 - PUBLISHED & REV 2 - DRAFT)
  // ---------------------------------------------------------------------------
  const syllabusRev1 = await prisma.examSyllabus.upsert({
    where: {
      examCycleId_revisionNumber: {
        examCycleId: cycle.id,
        revisionNumber: 1,
      },
    },
    update: {
      status: 'PUBLISHED',
      isCurrent: true,
    },
    create: {
      examCycleId: cycle.id,
      examPatternId: patternRev1.id,
      revisionNumber: 1,
      titleEn: 'Demo KAS Syllabus 2026',
      titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪಠ್ಯಕ್ರಮ ೨೦೨೬',
      descriptionEn: 'Official bilingual syllabus revision 1 for Demo KAS Exam 2026.',
      descriptionKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬ ರ ಅಧಿಕೃತ ದ್ವಿಭಾಷಾ ಪಠ್ಯಕ್ರಮ ಆವೃತ್ತಿ ೧.',
      status: 'PUBLISHED',
      isCurrent: true,
      publishedAt: new Date('2026-08-01T12:00:00.000Z'),
      publishedByAdminId: adminUserId,
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  // Syllabus Nodes for Rev 1 (15-20 Nodes with GLOBAL, STAGE, and PAPER scopes)
  const nodeData = [
    // 1. History Branch
    {
      code: 'DEMO_SYLL_HIST',
      nodeType: 'SUBJECT' as const,
      scopeType: 'GLOBAL' as const,
      nameEn: 'History',
      nameKn: 'ಇತಿಹಾಸ',
      displayOrder: 1,
      depth: 1,
      children: [
        {
          code: 'DEMO_SYLL_KAR_HIST',
          nodeType: 'SECTION' as const,
          scopeType: 'STAGE' as const,
          examStageId: prelimsStage.id,
          nameEn: 'Karnataka History',
          nameKn: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
          displayOrder: 1,
          depth: 2,
          children: [
            {
              code: 'DEMO_SYLL_EARLY_KAR',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Early Karnataka',
              nameKn: 'ಪ್ರಾಚೀನ ಕರ್ನಾಟಕ',
              displayOrder: 1,
              depth: 3,
            },
            {
              code: 'DEMO_SYLL_MED_KAR',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Medieval Karnataka',
              nameKn: 'ಮಧ್ಯಕಾಲೀನ ಕರ್ನಾಟಕ',
              displayOrder: 2,
              depth: 3,
            },
            {
              code: 'DEMO_SYLL_MOD_KAR',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Modern Karnataka',
              nameKn: 'ಆಧುನಿಕ ಕರ್ನಾಟಕ',
              displayOrder: 3,
              depth: 3,
              children: [
                {
                  code: 'DEMO_SYLL_ANGLO_MYSORE',
                  nodeType: 'TOPIC' as const,
                  scopeType: 'PAPER' as const,
                  examPaperId: paperPreGS1.id,
                  nameEn: 'Anglo-Mysore Relations',
                  nameKn: 'ಆಂಗ್ಲೋ-ಮೈಸೂರು ಸಂಬಂಧಗಳು',
                  displayOrder: 1,
                  depth: 4,
                },
              ],
            },
          ],
        },
      ],
    },

    // 2. Indian Polity Branch
    {
      code: 'DEMO_SYLL_POLITY',
      nodeType: 'SUBJECT' as const,
      scopeType: 'GLOBAL' as const,
      nameEn: 'Indian Polity',
      nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
      displayOrder: 2,
      depth: 1,
      children: [
        {
          code: 'DEMO_SYLL_CONST',
          nodeType: 'SECTION' as const,
          scopeType: 'GLOBAL' as const,
          nameEn: 'Constitution',
          nameKn: 'ಸಂವಿಧಾನ',
          displayOrder: 1,
          depth: 2,
          children: [
            {
              code: 'DEMO_SYLL_FR',
              nodeType: 'UNIT' as const,
              scopeType: 'PAPER' as const,
              examPaperId: paperMainGS1.id,
              nameEn: 'Fundamental Rights',
              nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
              displayOrder: 1,
              depth: 3,
            },
            {
              code: 'DEMO_SYLL_DPSP',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Directive Principles',
              nameKn: 'ರಾಜ್ಯ ನಿರ್ದೇಶಕ ತತ್ವಗಳು',
              displayOrder: 2,
              depth: 3,
            },
          ],
        },
      ],
    },

    // 3. Geography Branch
    {
      code: 'DEMO_SYLL_GEOG',
      nodeType: 'SUBJECT' as const,
      scopeType: 'GLOBAL' as const,
      nameEn: 'Geography',
      nameKn: 'ಭೂಗೋಳಶಾಸ್ತ್ರ',
      displayOrder: 3,
      depth: 1,
      children: [
        {
          code: 'DEMO_SYLL_KAR_GEOG',
          nodeType: 'SECTION' as const,
          scopeType: 'STAGE' as const,
          examStageId: prelimsStage.id,
          nameEn: 'Karnataka Geography',
          nameKn: 'ಕರ್ನಾಟಕ ಭೂಗೋಳಶಾಸ್ತ್ರ',
          displayOrder: 1,
          depth: 2,
          children: [
            {
              code: 'DEMO_SYLL_RIVERS',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Rivers',
              nameKn: 'ನದಿಗಳು',
              displayOrder: 1,
              depth: 3,
            },
            {
              code: 'DEMO_SYLL_CLIMATE',
              nodeType: 'UNIT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'Climate',
              nameKn: 'ಹವಾಮಾನ',
              displayOrder: 2,
              depth: 3,
            },
          ],
        },
      ],
    },

    // 4. Current Affairs Branch
    {
      code: 'DEMO_SYLL_CA',
      nodeType: 'SUBJECT' as const,
      scopeType: 'GLOBAL' as const,
      nameEn: 'Current Affairs',
      nameKn: 'ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
      displayOrder: 4,
      depth: 1,
    },
  ];

  async function createNodesRecursively(nodes: any[], parentId: string | null = null) {
    for (const node of nodes) {
      const createdNode = await prisma.examSyllabusNode.upsert({
        where: {
          examSyllabusId_code: {
            examSyllabusId: syllabusRev1.id,
            code: node.code,
          },
        },
        update: {
          parentId,
          examStageId: node.examStageId || null,
          examPaperId: node.examPaperId || null,
        },
        create: {
          examSyllabusId: syllabusRev1.id,
          parentId,
          code: node.code,
          nodeType: node.nodeType,
          scopeType: node.scopeType || 'GLOBAL',
          examStageId: node.examStageId || null,
          examPaperId: node.examPaperId || null,
          nameEn: node.nameEn,
          nameKn: node.nameKn,
          displayOrder: node.displayOrder,
          depth: node.depth,
          isActive: true,
        },
      });

      if (node.children && node.children.length > 0) {
        await createNodesRecursively(node.children, createdNode.id);
      }
    }
  }

  await createNodesRecursively(nodeData);

  // Clean up any old Revision 2 for DEMO_KAS_2026 before cloning
  const oldRev2 = await prisma.examSyllabus.findFirst({
    where: { examCycleId: cycle.id, revisionNumber: 2 },
  });
  if (oldRev2) {
    await prisma.examSyllabusNode.deleteMany({ where: { examSyllabusId: oldRev2.id } });
    await prisma.examSyllabus.delete({ where: { id: oldRev2.id } });
  }

  // Clone Revision 1 into Revision 2 using domain clone service pattern
  const sourceNodes = await prisma.examSyllabusNode.findMany({
    where: { examSyllabusId: syllabusRev1.id },
    orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
  });

  const syllabusRev2 = await prisma.$transaction(async (tx: any) => {
    const newSyllabus = await tx.examSyllabus.create({
      data: {
        examCycleId: cycle.id,
        examPatternId: patternRev1.id,
        revisionNumber: 2,
        sourceSyllabusId: syllabusRev1.id,
        titleEn: 'Demo KAS Syllabus 2026 (Draft Rev 2)',
        titleKn: 'ಡೆಮೋ ಕೆಎಎಸ್ ಪಠ್ಯಕ್ರಮ ೨೦೨೬ (ಕರಡು ಆವೃತ್ತಿ ೨)',
        descriptionEn: 'Draft syllabus revision for upcoming curriculum updates.',
        descriptionKn: 'ಉದ್ದೇಶಿತ ಹೊಸ ಪಠ್ಯಕ್ರಮದ ಕರಡು ಆವೃತ್ತಿ.',
        status: 'DRAFT',
        isCurrent: false,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    const nodeIdMap = new Map<string, string>();
    for (const oldNode of sourceNodes) {
      const parentId = oldNode.parentId ? nodeIdMap.get(oldNode.parentId) || null : null;
      const clonedNode = await tx.examSyllabusNode.create({
        data: {
          examSyllabusId: newSyllabus.id,
          parentId,
          code: oldNode.code,
          nodeType: oldNode.nodeType,
          scopeType: oldNode.scopeType,
          examStageId: oldNode.examStageId,
          examPaperId: oldNode.examPaperId,
          nameEn: oldNode.nameEn,
          nameKn: oldNode.nameKn,
          shortNameEn: oldNode.shortNameEn,
          shortNameKn: oldNode.shortNameKn,
          descriptionEn: oldNode.descriptionEn,
          descriptionKn: oldNode.descriptionKn,
          officialTextEn: oldNode.officialTextEn,
          officialTextKn: oldNode.officialTextKn,
          sourceReference: oldNode.sourceReference,
          displayOrder: oldNode.displayOrder,
          depth: oldNode.depth,
          isActive: oldNode.isActive,
        },
      });
      nodeIdMap.set(oldNode.id, clonedNode.id);
    }
    return newSyllabus;
  });

  // ---------------------------------------------------------------------------
  // 6. SHARED ACADEMIC TAXONOMY (DEMO)
  // ---------------------------------------------------------------------------
  const catHistory = await prisma.academicCategory.upsert({
    where: { moduleType_code: { moduleType: 'GENERAL', code: 'DEMO_HISTORY' } },
    update: {},
    create: {
      code: 'DEMO_HISTORY',
      nameEn: 'History',
      nameKn: 'ಇತಿಹಾಸ',
      slugEn: 'demo-history',
      slugKn: 'demo-itihaasa',
      descriptionEn: 'Demo Category for History',
      descriptionKn: 'ಇತಿಹಾಸಕ್ಕಾಗಿ ಡೆಮೋ ವರ್ಗ',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  const subHistory = await prisma.academicSubcategory.upsert({
    where: { categoryId_code: { categoryId: catHistory.id, code: 'DEMO_KARNATAKA_HISTORY' } },
    update: {},
    create: {
      categoryId: catHistory.id,
      code: 'DEMO_KARNATAKA_HISTORY',
      nameEn: 'Karnataka History',
      nameKn: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
      slugEn: 'demo-karnataka-history',
      slugKn: 'demo-karnataka-itihaasa',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  const topicAngloMysore = await prisma.academicTopic.upsert({
    where: { subcategoryId_code: { subcategoryId: subHistory.id, code: 'DEMO_ANGLO_MYSORE' } },
    update: {},
    create: {
      subcategoryId: subHistory.id,
      code: 'DEMO_ANGLO_MYSORE',
      nameEn: 'Anglo-Mysore Relations',
      nameKn: 'ಆಂಗ್ಲೋ-ಮೈಸೂರು ಸಂಬಂಧಗಳು',
      slugEn: 'demo-anglo-mysore',
      slugKn: 'demo-anglo-mysore-topic',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  const kaFirstWar = await prisma.academicKnowledgeArea.upsert({
    where: { topicId_code: { topicId: topicAngloMysore.id, code: 'DEMO_FIRST_ANGLO_MYSORE' } },
    update: {},
    create: {
      topicId: topicAngloMysore.id,
      code: 'DEMO_FIRST_ANGLO_MYSORE',
      nameEn: 'First Anglo-Mysore War',
      nameKn: 'ಮೊದಲ ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧ',
      slugEn: 'demo-first-anglo-mysore',
      slugKn: 'demo-modala-anglo-mysore',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  // Second branch: Polity
  const catPolity = await prisma.academicCategory.upsert({
    where: { moduleType_code: { moduleType: 'GENERAL', code: 'DEMO_POLITY' } },
    update: {},
    create: {
      code: 'DEMO_POLITY',
      nameEn: 'Indian Polity',
      nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
      slugEn: 'demo-polity',
      slugKn: 'demo-rajyavyavasthe',
      displayOrder: 2,
      createdByAdminId: adminUserId,
    },
  });

  const subConst = await prisma.academicSubcategory.upsert({
    where: { categoryId_code: { categoryId: catPolity.id, code: 'DEMO_CONSTITUTION' } },
    update: {},
    create: {
      categoryId: catPolity.id,
      code: 'DEMO_CONSTITUTION',
      nameEn: 'Constitution',
      nameKn: 'ಸಂವಿಧಾನ',
      slugEn: 'demo-constitution',
      slugKn: 'demo-samvidhana',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  await prisma.academicTopic.upsert({
    where: { subcategoryId_code: { subcategoryId: subConst.id, code: 'DEMO_FUNDAMENTAL_RIGHTS' } },
    update: {},
    create: {
      subcategoryId: subConst.id,
      code: 'DEMO_FUNDAMENTAL_RIGHTS',
      nameEn: 'Fundamental Rights',
      nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
      slugEn: 'demo-fundamental-rights',
      slugKn: 'demo-moolabhuta-hakkugalu',
      displayOrder: 1,
      createdByAdminId: adminUserId,
    },
  });

  // ---------------------------------------------------------------------------
  // 7. STUDY MATERIALS (4 DEMO RECORDS)
  // ---------------------------------------------------------------------------

  // DEMO_SM_001 — FREE + MAPPED TO TAXONOMY
  const sm1 = await prisma.studyMaterial.upsert({
    where: { code: 'DEMO_SM_001' },
    update: {},
    create: {
      code: 'DEMO_SM_001',
      contentType: 'ARTICLE',
      recordStatus: 'ACTIVE',
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialAccessPolicy.upsert({
    where: { studyMaterialId: sm1.id },
    update: {},
    create: {
      studyMaterialId: sm1.id,
      accessType: 'FREE',
      entitlementKey: 'DEMO_ENT_SM_001',
      teaserMode: 'SUMMARY_ONLY',
      isActive: true,
      createdByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialTaxonomyMapping.upsert({
    where: {
      studyMaterialId_categoryId_subcategoryId_topicId_knowledgeAreaId: {
        studyMaterialId: sm1.id,
        categoryId: catHistory.id,
        subcategoryId: subHistory.id,
        topicId: topicAngloMysore.id,
        knowledgeAreaId: kaFirstWar.id,
      },
    },
    update: {},
    create: {
      studyMaterialId: sm1.id,
      categoryId: catHistory.id,
      subcategoryId: subHistory.id,
      topicId: topicAngloMysore.id,
      knowledgeAreaId: kaFirstWar.id,
      isPrimary: true,
      createdByAdminId: adminUserId,
    },
  });

  const sm1LocEn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm1.id, language: 'en' } },
    update: {},
    create: {
      studyMaterialId: sm1.id,
      language: 'en',
      title: 'Introduction to Karnataka History',
      slug: 'demo-introduction-to-karnataka-history',
      summary: 'A foundational overview of Karnataka history from ancient to modern times.',
      createdByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm1LocEn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm1LocEn.id,
      revisionNumber: 1,
      title: 'Introduction to Karnataka History',
      slug: 'demo-introduction-to-karnataka-history',
      summary: 'A foundational overview of Karnataka history from ancient to modern times.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview of Karnataka History' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Karnataka has a rich cultural heritage spanning over two millennia.' }] },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kadambas of Banavasi' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chalukyas of Badami' }] }] }] },
        ],
      },
      plainTextContent: 'Overview of Karnataka History. Karnataka has a rich cultural heritage spanning over two millennia.',
      metaTitle: 'Introduction to Karnataka History — Demo',
      metaDescription: 'Read the foundational overview of Karnataka history for competitive exams.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-01T14:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  const sm1LocKn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm1.id, language: 'kn' } },
    update: {},
    create: {
      studyMaterialId: sm1.id,
      language: 'kn',
      title: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಪರಿಚಯ',
      slug: 'demo-karnataka-itihaasada-parichaya',
      summary: 'ಪ್ರಾಚೀನ ಕಾಲದಿಂದ ಆಧುನಿಕ ಕಾಲದವರೆಗಿನ ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಮೂಲಭೂತ ಅವಲೋಕನ.',
      createdByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm1LocKn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm1LocKn.id,
      revisionNumber: 1,
      title: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಪರಿಚಯ',
      slug: 'demo-karnataka-itihaasada-parichaya',
      summary: 'ಪ್ರಾಚೀನ ಕಾಲದಿಂದ ಆಧುನಿಕ ಕಾಲದವರೆಗಿನ ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಮೂಲಭೂತ ಅವಲೋಕನ.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಅವಲೋಕನ' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಕರ್ನಾಟಕವು ಎರಡು ಸಹಸ್ರಮಾನಗಳಿಗಿಂತಲೂ ಸುದೀರ್ಘವಾದ ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆಯನ್ನು ಹೊಂದಿದೆ.' }] },
        ],
      },
      plainTextContent: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಅವಲೋಕನ. ಕರ್ನಾಟಕವು ಎರಡು ಸಹಸ್ರಮಾನಗಳಿಗಿಂತಲೂ ಸುದೀರ್ಘವಾದ ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆಯನ್ನು ಹೊಂದಿದೆ.',
      metaTitle: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಪರಿಚಯ — ಡೆಮೋ',
      metaDescription: 'ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆಗಳಿಗಾಗಿ ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಮುಖ್ಯ ವಿವರಗಳನ್ನು ಓದಿ.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-01T14:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  // DEMO_SM_002 — PAID
  const sm2 = await prisma.studyMaterial.upsert({
    where: { code: 'DEMO_SM_002' },
    update: {},
    create: {
      code: 'DEMO_SM_002',
      contentType: 'STUDY_NOTE',
      recordStatus: 'ACTIVE',
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialAccessPolicy.upsert({
    where: { studyMaterialId: sm2.id },
    update: {},
    create: {
      studyMaterialId: sm2.id,
      accessType: 'PAID',
      entitlementKey: 'DEMO_ENT_SM_002',
      teaserMode: 'SUMMARY_ONLY',
      isActive: true,
      createdByAdminId: adminUserId,
    },
  });

  const sm2LocEn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm2.id, language: 'en' } },
    update: {},
    create: {
      studyMaterialId: sm2.id,
      language: 'en',
      title: 'Anglo-Mysore Relations — Detailed Notes',
      slug: 'demo-anglo-mysore-relations-detailed-notes',
      summary: 'Comprehensive examination notes on the four Anglo-Mysore Wars and treaties.',
      createdByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm2LocEn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm2LocEn.id,
      revisionNumber: 1,
      title: 'Anglo-Mysore Relations — Detailed Notes',
      slug: 'demo-anglo-mysore-relations-detailed-notes',
      summary: 'Comprehensive examination notes on the four Anglo-Mysore Wars and treaties.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'First Anglo-Mysore War (1767–1769)' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Fought between Hyder Ali and the British East India Company. Concluded with the Treaty of Madras.' }] },
        ],
      },
      plainTextContent: 'First Anglo-Mysore War (1767–1769). Fought between Hyder Ali and the British East India Company.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-02T10:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  const sm2LocKn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm2.id, language: 'kn' } },
    update: {},
    create: {
      studyMaterialId: sm2.id,
      language: 'kn',
      title: 'ಆಂಗ್ಲೋ-ಮೈಸೂರು ಸಂಬಂಧಗಳು — ವಿವರವಾದ ಟಿಪ್ಪಣಿಗಳು',
      slug: 'demo-anglo-mysore-sambandhagalu-vivaravada-tippanigalu',
      summary: 'ನಾಲ್ಕು ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧಗಳು ಮತ್ತು ಒಪ್ಪಂದಗಳ ಸಮಗ್ರ ಟಿಪ್ಪಣಿಗಳು.',
      createdByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm2LocKn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm2LocKn.id,
      revisionNumber: 1,
      title: 'ಆಂಗ್ಲೋ-ಮೈಸೂರು ಸಂಬಂಧಗಳು — ವಿವರವಾದ ಟಿಪ್ಪಣಿಗಳು',
      slug: 'demo-anglo-mysore-sambandhagalu-vivaravada-tippanigalu',
      summary: 'ನಾಲ್ಕು ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧಗಳು ಮತ್ತು ಒಪ್ಪಂದಗಳ ಸಮಗ್ರ ಟಿಪ್ಪಣಿಗಳು.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'ಮೊದಲ ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧ (೧೭೬೭–೧೭೬೯)' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಹೈದರಾಲಿ ಮತ್ತು ಬ್ರಿಟಿಷ್ ಈಸ್ಟ್ ಇಂಡಿಯಾ ಕಂಪನಿಯ ನಡುವೆ ನಡೆದ ಯುದ್ಧ. ಮದ್ರಾಸ್ ಒಪ್ಪಂದದೊಂದಿಗೆ ಕೊನೆಗೊಂಡಿತು.' }] },
        ],
      },
      plainTextContent: 'ಮೊದಲ ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧ (೧೭೬೭–೧೭೬೯). ಹೈದರಾಲಿ ಮತ್ತು ಬ್ರಿಟಿಷ್ ಈಸ್ಟ್ ಇಂಡಿಯಾ ಕಂಪನಿಯ ನಡುವೆ ನಡೆದ ಯುದ್ಧ.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-02T10:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  // DEMO_SM_003 — FREEMIUM WITH PREVIEW BOUNDARY
  const sm3 = await prisma.studyMaterial.upsert({
    where: { code: 'DEMO_SM_003' },
    update: {},
    create: {
      code: 'DEMO_SM_003',
      contentType: 'STUDY_NOTE',
      recordStatus: 'ACTIVE',
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  const sm3Policy = await prisma.studyMaterialAccessPolicy.upsert({
    where: { studyMaterialId: sm3.id },
    update: {},
    create: {
      studyMaterialId: sm3.id,
      accessType: 'FREEMIUM',
      entitlementKey: 'DEMO_ENT_SM_003',
      teaserMode: 'CONTENT_BOUNDARY',
      isActive: true,
      createdByAdminId: adminUserId,
    },
  });

  const sm3LocEn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm3.id, language: 'en' } },
    update: {},
    create: {
      studyMaterialId: sm3.id,
      language: 'en',
      title: 'Fundamental Rights — Study Notes',
      slug: 'demo-fundamental-rights-study-notes',
      summary: 'Articles 12 to 35 of Part III of the Indian Constitution explained.',
      createdByAdminId: adminUserId,
    },
  });

  const sm3RevEn = await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm3LocEn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm3LocEn.id,
      revisionNumber: 1,
      title: 'Fundamental Rights — Study Notes',
      slug: 'demo-fundamental-rights-study-notes',
      summary: 'Articles 12 to 35 of Part III of the Indian Constitution explained.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Introduction' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Fundamental Rights are guaranteed to all citizens under Part III of the Constitution.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Constitutional Basis' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Borrowed from the US Bill of Rights, Part III is described as the Magna Carta of India.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Major Rights' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Includes Right to Equality (Art 14-18), Right to Freedom (Art 19-22), and Constitutional Remedies (Art 32).' }] },
        ],
      },
      plainTextContent: '1. Introduction. Fundamental Rights are guaranteed to all citizens under Part III of the Constitution. 2. Constitutional Basis. Borrowed from the US Bill of Rights.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-03T09:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  const sm3LocKn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm3.id, language: 'kn' } },
    update: {},
    create: {
      studyMaterialId: sm3.id,
      language: 'kn',
      title: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು — ಅಧ್ಯಯನ ಟಿಪ್ಪಣಿಗಳು',
      slug: 'demo-moolabhuta-hakkugalu-adyayana-tippanigalu',
      summary: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಭಾಗ III ರ ವಿಧಿಗಳು ೧೨ ರಿಂದ ೩೫ ರ ವಿವರಣೆ.',
      createdByAdminId: adminUserId,
    },
  });

  const sm3RevKn = await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm3LocKn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm3LocKn.id,
      revisionNumber: 1,
      title: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು — ಅಧ್ಯಯನ ಟಿಪ್ಪಣಿಗಳು',
      slug: 'demo-moolabhuta-hakkugalu-adyayana-tippanigalu',
      summary: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಭಾಗ III ರ ವಿಧಿಗಳು ೧೨ ರಿಂದ ೩೫ ರ ವಿವರಣೆ.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '೧. ಪರಿಚಯ' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಸಂವಿಧಾನದ ಭಾಗ III ರ ಅಡಿಯಲ್ಲಿ ಮೂಲಭೂತ ಹಕ್ಕುಗಳನ್ನು ಪ್ರತಿಯೊಬ್ಬ ನಾಗರಿಕನಿಗೂ ಖಾತರಿಪಡಿಸಲಾಗಿದೆ.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '೨. ಸಂವಿಧಾನಾತ್ಮಕ ಹಿನ್ನೆಲೆ' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಅಮೆರಿಕದ ಹಕ್ಕುಗಳ ಪತ್ರದಿಂದ ಈ ಹಕ್ಕುಗಳನ್ನು ಪಡೆದುಕೊಳ್ಳಲಾಗಿದೆ.' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '೩. ಪ್ರಮುಖ ಹಕ್ಕುಗಳು' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಸಮಾನತೆಯ ಹಕ್ಕು (ವಿಧಿ ೧೪-೧೮) ಮತ್ತು ಸ್ವಾತಂತ್ರ್ಯದ ಹಕ್ಕು (ವಿಧಿ ೧೯-೨೨) ಸೇರಿವೆ.' }] },
        ],
      },
      plainTextContent: '೧. ಪರಿಚಯ. ಸಂವಿಧಾನದ ಭಾಗ III ರ ಅಡಿಯಲ್ಲಿ ಮೂಲಭೂತ ಹಕ್ಕುಗಳನ್ನು ಪ್ರತಿಯೊಬ್ಬ ನಾಗರಿಕನಿಗೂ ಖಾತರಿಪಡಿಸಲಾಗಿದೆ. ೨. ಸಂವಿಧಾನಾತ್ಮಕ ಹಿನ್ನೆಲೆ.',
      status: 'PUBLISHED',
      isCurrentDraft: true,
      isCurrentPublished: true,
      publishedAt: new Date('2026-08-03T09:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  // Preview Configs
  await prisma.studyMaterialLocalePreviewConfig.upsert({
    where: { accessPolicyId_localeRevisionId: { accessPolicyId: sm3Policy.id, localeRevisionId: sm3RevEn.id } },
    update: {},
    create: {
      accessPolicyId: sm3Policy.id,
      localeRevisionId: sm3RevEn.id,
      language: 'en',
      previewMode: 'CONTENT_BOUNDARY',
      previewEndNodeId: 'node-constitutional-basis',
      paywallTitle: 'Unlock Full Fundamental Rights Study Note',
      paywallMessage: 'Subscribe to access remaining provisions and constitutional remedies.',
    },
  });

  await prisma.studyMaterialLocalePreviewConfig.upsert({
    where: { accessPolicyId_localeRevisionId: { accessPolicyId: sm3Policy.id, localeRevisionId: sm3RevKn.id } },
    update: {},
    create: {
      accessPolicyId: sm3Policy.id,
      localeRevisionId: sm3RevKn.id,
      language: 'kn',
      previewMode: 'CONTENT_BOUNDARY',
      previewEndNodeId: 'node-constitutional-basis-kn',
      paywallTitle: 'ಸಂಪೂರ್ಣ ಮೂಲಭೂತ ಹಕ್ಕುಗಳ ಟಿಪ್ಪಣಿಯನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಿ',
      paywallMessage: 'ಎಲ್ಲಾ ಹಕ್ಕುಗಳು ಮತ್ತು ಪರಿಹಾರಗಳ ವಿವರಗಳನ್ನು ಪಡೆಯಲು ಚಂದಾದಾರರಾಗಿ.',
    },
  });

  // DEMO_SM_004 — REVIEW QUEUE DEMO + ZERO TAXONOMY MAPPINGS
  const sm4 = await prisma.studyMaterial.upsert({
    where: { code: 'DEMO_SM_004' },
    update: {},
    create: {
      code: 'DEMO_SM_004',
      contentType: 'ARTICLE',
      recordStatus: 'ACTIVE',
      createdByAdminId: adminUserId,
      updatedByAdminId: adminUserId,
    },
  });

  await prisma.studyMaterialAccessPolicy.upsert({
    where: { studyMaterialId: sm4.id },
    update: {},
    create: {
      studyMaterialId: sm4.id,
      accessType: 'FREE',
      entitlementKey: 'DEMO_ENT_SM_004',
      teaserMode: 'SUMMARY_ONLY',
      isActive: true,
      createdByAdminId: adminUserId,
    },
  });

  const sm4LocEn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm4.id, language: 'en' } },
    update: {},
    create: {
      studyMaterialId: sm4.id,
      language: 'en',
      title: 'Karnataka Geography — Rivers',
      slug: 'demo-karnataka-geography-rivers',
      summary: 'Major river systems of Karnataka including Cauvery, Krishna and Sharavathi.',
      createdByAdminId: adminUserId,
    },
  });

  const sm4RevEn = await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm4LocEn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm4LocEn.id,
      revisionNumber: 1,
      title: 'Karnataka Geography — Rivers',
      slug: 'demo-karnataka-geography-rivers',
      summary: 'Major river systems of Karnataka including Cauvery, Krishna and Sharavathi.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'River Systems of Karnataka' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Karnataka is drained by seven river systems.' }] },
        ],
      },
      plainTextContent: 'River Systems of Karnataka. Karnataka is drained by seven river systems.',
      status: 'REVIEW_PENDING',
      isCurrentDraft: true,
      isCurrentPublished: false,
      reviewSubmittedAt: new Date('2026-08-04T11:00:00.000Z'),
      createdByAdminId: adminUserId,
    },
  });

  const sm4LocKn = await prisma.studyMaterialLocale.upsert({
    where: { studyMaterialId_language: { studyMaterialId: sm4.id, language: 'kn' } },
    update: {},
    create: {
      studyMaterialId: sm4.id,
      language: 'kn',
      title: 'ಕರ್ನಾಟಕ ಭೂಗೋಳಶಾಸ್ತ್ರ — ನದಿಗಳು',
      slug: 'demo-karnataka-bhoogolashaastra-nadigalu',
      summary: 'ಕಾವೇರಿ, ಕೃಷ್ಣ ಮತ್ತು ಶರಾವತಿ ಸೇರಿದಂತೆ ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ನದಿ ವ್ಯವಸ್ಥೆಗಳು.',
      createdByAdminId: adminUserId,
    },
  });

  const sm4RevKn = await prisma.studyMaterialLocaleRevision.upsert({
    where: { studyMaterialLocaleId_revisionNumber: { studyMaterialLocaleId: sm4LocKn.id, revisionNumber: 1 } },
    update: {},
    create: {
      studyMaterialLocaleId: sm4LocKn.id,
      revisionNumber: 1,
      title: 'ಕರ್ನಾಟಕ ಭೂಗೋಳಶಾಸ್ತ್ರ — ನದಿಗಳು',
      slug: 'demo-karnataka-bhoogolashaastra-nadigalu',
      summary: 'ಕಾವೇರಿ, ಕೃಷ್ಣ ಮತ್ತು ಶರಾವತಿ ಸೇರಿದಂತೆ ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ನದಿ ವ್ಯವಸ್ಥೆಗಳು.',
      contentJson: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'ಕರ್ನಾಟಕದ ನದಿ ವ್ಯವಸ್ಥೆಗಳು' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'ಕರ್ನಾಟಕವು ಏಳು ಪ್ರಮುಖ ನದಿ ಕೊಳ್ಳಗಳಿಂದ ನೀರಾವರಿ ಪಡೆಯುತ್ತದೆ.' }] },
        ],
      },
      plainTextContent: 'ಕರ್ನಾಟಕದ ನದಿ ವ್ಯವಸ್ಥೆಗಳು. ಕರ್ನಾಟಕವು ಏಳು ಪ್ರಮುಖ ನದಿ ಕೊಳ್ಳಗಳಿಂದ ನೀರಾವರಿ ಪಡೆಯುತ್ತದೆ.',
      status: 'CHANGES_REQUESTED',
      isCurrentDraft: true,
      isCurrentPublished: false,
      reviewedAt: new Date('2026-08-04T12:00:00.000Z'),
      reviewedByAdminId: adminUserId,
      createdByAdminId: adminUserId,
    },
  });

  // Review Event for sm4RevKn
  if (adminUserId) {
    await prisma.studyMaterialReviewEvent.create({
      data: {
        localeRevisionId: sm4RevKn.id,
        action: 'CHANGES_REQUESTED',
        comment: 'Demo reviewer feedback for workflow preview.',
        adminUserId: adminUserId,
      },
    });
  }

  // PRINT SUMMARY
  console.log(`
=====================================================
Study Karnataka Demo Dataset Successfully Seeded!
=====================================================
- Exam Authorities: 1 (DEMO_KPSC)
- Exam Programmes: 1 (DEMO_KAS)
- Exam Cycles: 1 (DEMO_KAS_2026)
- Patterns: 2 (Rev 1 Published, Rev 2 Draft)
- Stages: 3 (Prelims, Mains, Interview)
- Papers: 6 (Prelims GS1 & GS2, Mains Essay/GS1/GS2, Interview)
- Syllabus Revisions: 2 (Rev 1 Published, Rev 2 Draft)
- Syllabus Nodes: 15 bilingual hierarchical nodes
- Academic Categories: 2 (DEMO_HISTORY, DEMO_POLITY)
- Study Materials: 4 (DEMO_SM_001 to DEMO_SM_004)
  * Access: 1 Free, 1 Paid, 1 Freemium, 1 Workflow Demo
  * Independent Content: 1 (DEMO_SM_004 with 0 taxonomy mappings)

All demo codes begin with DEMO_.
=====================================================
  `);
}
