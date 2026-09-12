import { prisma } from './index';

export async function seedMcqDemo() {
  // Environment Safety Guard
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

  if (isProduction && !allowDemoSeed) {
    throw new Error(
      '[DEMO SEED BLOCKED] Demo MCQs cannot be seeded into production environment without explicit ALLOW_DEMO_SEED=true environment variable.'
    );
  }

  console.log('Running MCQ Demo Seed (Idempotent)...');

  // Fetch or create baseline taxonomy categories & subcategories
  let polityCat = await prisma.academicCategory.findFirst({
    where: { OR: [{ code: 'POLITY' }, { slugEn: 'indian-polity' }] },
  });
  if (!polityCat) {
    polityCat = await prisma.academicCategory.create({
      data: {
        code: 'POLITY',
        nameEn: 'Indian Polity & Governance',
        nameKn: 'ಭಾರತೀಯ ರಾಜಕೀಯ ಮತ್ತು ಆಡಳಿತ',
        slugEn: 'indian-polity',
        slugKn: 'indian-polity-kn',
      },
    });
  }

  let politySub = await prisma.academicSubcategory.findFirst({
    where: { categoryId: polityCat.id, code: 'FUNDAMENTAL_RIGHTS' },
  });
  if (!politySub) {
    politySub = await prisma.academicSubcategory.create({
      data: {
        categoryId: polityCat.id,
        code: 'FUNDAMENTAL_RIGHTS',
        nameEn: 'Fundamental Rights',
        nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
        slugEn: 'fundamental-rights',
        slugKn: 'fundamental-rights-kn',
      },
    });
  }

  let historyCat = await prisma.academicCategory.findFirst({
    where: { OR: [{ code: 'HISTORY' }, { slugEn: 'karnataka-history' }] },
  });
  if (!historyCat) {
    historyCat = await prisma.academicCategory.create({
      data: {
        code: 'HISTORY',
        nameEn: 'Karnataka History & Heritage',
        nameKn: 'ಕರ್ನಾಟಕದ ಇತಿಹಾಸ ಮತ್ತು ಪರಂಪರೆ',
        slugEn: 'karnataka-history',
        slugKn: 'karnataka-history-kn',
      },
    });
  }

  let historySub = await prisma.academicSubcategory.findFirst({
    where: { categoryId: historyCat.id, code: 'UNIFICATION' },
  });
  if (!historySub) {
    historySub = await prisma.academicSubcategory.create({
      data: {
        categoryId: historyCat.id,
        code: 'UNIFICATION',
        nameEn: 'Unification of Karnataka',
        nameKn: 'ಕರ್ನಾಟಕ ಏಕೀಕರಣ',
        slugEn: 'karnataka-unification',
        slugKn: 'karnataka-unification-kn',
      },
    });
  }

  // 10 Canonical Demo MCQs
  const demoMcqs = [
    {
      code: 'MCQ_000001',
      seqNumber: 1,
      questionTextEn: 'Which Article of the Constitution of India guarantees Equality Before Law?',
      questionTextKn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಯಾವ ವಿಧಿಯು ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ?',
      optionA_En: 'Article 12',
      optionA_Kn: 'ವಿಧಿ ೧೨',
      optionB_En: 'Article 14',
      optionB_Kn: 'ವಿಧಿ ೧೪',
      optionC_En: 'Article 19',
      optionC_Kn: 'ವಿಧಿ ೧೯',
      optionD_En: 'Article 21',
      optionD_Kn: 'ವಿಧಿ ೨೧',
      correctOption: 'B' as const,
      explanationEn: 'Article 14 states that the State shall not deny to any person equality before the law or equal protection of laws.',
      explanationKn: 'ವಿಧಿ ೧೪ ರ ಪ್ರಕಾರ ರಾಜ್ಯವು ಯಾವುದೇ ವ್ಯಕ್ತಿಗೆ ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆ ಅಥವಾ ಸಮಾನ ರಕ್ಷಣೆಯನ್ನು ನಿರಾಕರಿಸುವಂತಿಲ್ಲ.',
      difficulty: 'EASY' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: polityCat.id,
      subcategoryId: politySub.id,
      isPyq: true,
      pyqExamName: 'KAS Prelims',
      pyqYear: 2020,
    },
    {
      code: 'MCQ_000002',
      seqNumber: 2,
      questionTextEn: 'Who presided over the Belgaum Session of the Indian National Congress in 1924?',
      questionTextKn: '೧೯೨೪ ರ ಬೆಳಗಾವಿ ಭಾರತೀಯ ರಾಷ್ಟ್ರೀಯ ಕಾಂಗ್ರೆಸ್ ಅಧಿವೇಶನದ ಅಧ್ಯಕ್ಷತೆಯನ್ನು ಯಾರು ವಹಿಸಿದ್ದರು?',
      optionA_En: 'Jawaharlal Nehru',
      optionA_Kn: 'ಜವಾಹರಲಾಲ್ ನೆಹರೂ',
      optionB_En: 'Mahatma Gandhi',
      optionB_Kn: 'ಮಹಾತ್ಮ ಗಾಂಧಿ',
      optionC_En: 'Subhash Chandra Bose',
      optionC_Kn: 'ಸುಭಾಷ್ ಚಂದ್ರ ಬೋಸ್',
      optionD_En: 'Sardar Vallabhbhai Patel',
      optionD_Kn: 'ಸರ್ದಾರ್ ವಲ್ಲಭಬಾಯಿ ಪಟೇಲ್',
      correctOption: 'B' as const,
      explanationEn: 'Mahatma Gandhi presided over the 39th session of INC held at Belgaum in 1924, which was the only session he presided over.',
      explanationKn: '೧೯೨೪ ರ ಬೆಳಗಾವಿ ಅಧಿವೇಶನವು ಮಹಾತ್ಮ ಗಾಂಧಿಯವರು ಅಧ್ಯಕ್ಷತೆ ವಹಿಸಿದ ಏಕೈಕ ಕಾಂಗ್ರೇಸ್ ಅಧಿವೇಶನವಾಗಿದೆ.',
      difficulty: 'MEDIUM' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: historyCat.id,
      subcategoryId: historySub.id,
      isPyq: true,
      pyqExamName: 'KAS Prelims',
      pyqYear: 2017,
    },
    {
      code: 'MCQ_000003',
      seqNumber: 3,
      questionTextEn: 'Under Article 32 of the Indian Constitution, how many types of writs can the Supreme Court issue?',
      questionTextKn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ೩೨ ನೇ ವಿಧಿಯಡಿ ಉಚ್ಚ ನ್ಯಾಯಾಲಯ/ಸರ್ವೋಚ್ಚ ನ್ಯಾಯಾಲಯವು ಎಷ್ಟು ರೀತಿಯ ರಿಟ್‌ಗಳನ್ನು ಹೊರಡಿಸಬಹುದು?',
      optionA_En: '3',
      optionA_Kn: '೩',
      optionB_En: '4',
      optionB_Kn: '೪',
      optionC_En: '5',
      optionC_Kn: '೫',
      optionD_En: '6',
      optionD_Kn: '೬',
      correctOption: 'C' as const,
      explanationEn: 'The Supreme Court can issue 5 types of writs: Habeas Corpus, Mandamus, Prohibition, Quo-Warranto, and Certiorari.',
      explanationKn: 'ಸರ್ವೋಚ್ಚ ನ್ಯಾಯಾಲಯವು ೫ ರೀತಿಯ ರಿಟ್‌ಗಳನ್ನು ಹೊರಡಿಸಬಹುದು: ಹೆಬಿಯಸ್ ಕಾರ್ಪಸ್, ಮ್ಯಾಂಡಮಸ್, ಪ್ರೊಹಿಬಿಷನ್, ಕ್ವೋ-ವಾರಂಟೋ ಮತ್ತು ಸರ್ಟಿಯೋರರಿ.',
      difficulty: 'MEDIUM' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'REVIEW_PENDING' as const,
      categoryId: polityCat.id,
      subcategoryId: politySub.id,
    },
    {
      code: 'MCQ_000004',
      seqNumber: 4,
      questionTextEn: 'Which dynasty built the famous monolith Statue of Gommateshwara at Shravanabelagola?',
      questionTextKn: 'ಶ್ರವಣಬೆಳಗೊಳದಲ್ಲಿರುವ ಪ್ರಸಿದ್ಧ ಗೊಮ್ಮಟೇಶ್ವರ ಏಕಶಿಲಾ ವಿಗ್ರಹವನ್ನು ಯಾವ ರಾಜವಂಶವು ನಿರ್ಮಿಸಿತು?',
      optionA_En: 'Chalukyas of Badami',
      optionA_Kn: 'ಬಾದಾಮಿ ಚಾಲುಕ್ಯರು',
      optionB_En: 'Ganga Dynasty',
      optionB_Kn: 'ಗಂಗ ರಾಜವಂಶ',
      optionC_En: 'Rashtrakutas',
      optionC_Kn: 'ರಾಷ್ಟ್ರಕೂಟರು',
      optionD_En: 'Hoysalas',
      optionD_Kn: 'ಹೊಯ್ಸಳರು',
      correctOption: 'B' as const,
      explanationEn: 'Chavundaraya, a minister and commander of the Western Ganga Dynasty, erected the monolithic statue of Lord Bahubali at Shravanabelagola in 981 AD.',
      explanationKn: 'ಪಶ್ಚಿಮ ಗಂಗ ರಾಜವಂಶದ ಮಂತ್ರಿ ಮತ್ತು ದಂಡನಾಯಕ ಚಾವುಂಡರಾಯನು ೯೮೧ ರಲ್ಲಿ ಶ್ರವಣಬೆಳಗೊಳದಲ್ಲಿ ಬಾಹುಬಲಿ ವಿಗ್ರಹವನ್ನು ಕೆತ್ತಿಸಿದನು.',
      difficulty: 'HARD' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'DRAFT' as const,
      categoryId: historyCat.id,
      subcategoryId: historySub.id,
    },
    {
      code: 'MCQ_000005',
      seqNumber: 5,
      questionTextEn: 'Which Constitutional Amendment Act reduced the voting age from 21 to 18 years in India?',
      questionTextKn: 'ಭಾರತದಲ್ಲಿ ಮತದಾನದ ವಯಸ್ಸನ್ನು ೨೧ ರಿಂದ ೧೮ ವರ್ಷಕ್ಕೆ ಇಳಿಸಿದ ಸಂವಿಧಾನ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ ಯಾವುದು?',
      optionA_En: '42nd Amendment Act',
      optionA_Kn: '೪೨ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
      optionB_En: '44th Amendment Act',
      optionB_Kn: '೪೪ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
      optionC_En: '61st Amendment Act',
      optionC_Kn: '೬೧ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
      optionD_En: '73rd Amendment Act',
      optionD_Kn: '೭೩ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
      correctOption: 'C' as const,
      explanationEn: 'The 61st Constitutional Amendment Act of 1988 reduced the voting age from 21 to 18 years.',
      explanationKn: '೧೯೮೮ ರ ೬೧ ನೇ ಸಂವಿಧಾನ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆಯು ಮತದಾನದ ವಯಸ್ಸನ್ನು ೨೧ ರಿಂದ ೧೮ ಕ್ಕೆ ಇಳಿಸಿತು.',
      difficulty: 'EASY' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: polityCat.id,
      subcategoryId: politySub.id,
      isPyq: true,
      pyqExamName: 'KPSC PSI',
      pyqYear: 2021,
    },
    {
      code: 'MCQ_000006',
      seqNumber: 6,
      questionTextEn: 'Who was the founder of the Kadamba Dynasty of Banavasi?',
      questionTextKn: 'ಬನವಾಸಿಯ ಕದಂಬ ರಾಜವಂಶದ ಸಂಸ್ಥಾಪಕರು ಯಾರು?',
      optionA_En: 'Mayurasharma',
      optionA_Kn: 'ಮಯೂರಶರ್ಮ',
      optionB_En: 'Kakusthavarma',
      optionB_Kn: 'ಕಾಕುಸ್ಥವರ್ಮ',
      optionC_En: 'Ravivarma',
      optionC_Kn: 'ರವಿವರ್ಮ',
      optionD_En: 'Mrigeshavarma',
      optionD_Kn: 'ಮೃಗೇಶವರ್ಮ',
      correctOption: 'A' as const,
      explanationEn: 'Mayurasharma founded the Kadamba dynasty in 345 AD, establishing Banavasi as its capital.',
      explanationKn: 'ಮಯೂರಶರ್ಮನು ೩೪೫ ರಲ್ಲಿ ಕದಂಬ ರಾಜವಂಶವನ್ನು ಸ್ಥಾಪಿಸಿ ಬನವಾಸಿಯನ್ನು ರಾಜಧಾನಿಯಾಗಿಸಿದನು.',
      difficulty: 'MEDIUM' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: historyCat.id,
      subcategoryId: historySub.id,
      isPyq: true,
      pyqExamName: 'KAS Prelims',
      pyqYear: 2015,
    },
    {
      code: 'MCQ_000007',
      seqNumber: 7,
      questionTextEn: 'Which schedule of the Indian Constitution contains the Anti-Defection Law?',
      questionTextKn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಯಾವ ಅನುಸೂಚಿಯು ಪಕ್ಷಾಂತರ ನಿಷೇಧ ಕಾಯ್ದೆಯನ್ನು ಒಳಗೊಂಡಿದೆ?',
      optionA_En: '8th Schedule',
      optionA_Kn: '೮ ನೇ ಅನುಸೂಚಿ',
      optionB_En: '9th Schedule',
      optionB_Kn: '೯ ನೇ ಅನುಸೂಚಿ',
      optionC_En: '10th Schedule',
      optionC_Kn: '೧೦ ನೇ ಅನುಸೂಚಿ',
      optionD_En: '11th Schedule',
      optionD_Kn: '೧೧ ನೇ ಅನುಸೂಚಿ',
      correctOption: 'C' as const,
      explanationEn: 'The 10th Schedule was added by the 52nd Constitutional Amendment Act of 1985.',
      explanationKn: '೧೦ ನೇ ಅನುಸೂಚಿಯನ್ನು ೧೯೮೫ ರ ೫೨ ನೇ ಸಂವಿಧಾನ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆಯ ಮೂಲಕ ಸೇರಿಸಲಾಯಿತು.',
      difficulty: 'EASY' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'CHANGES_REQUESTED' as const,
      categoryId: polityCat.id,
      subcategoryId: politySub.id,
    },
    {
      code: 'MCQ_000008',
      seqNumber: 8,
      questionTextEn: 'In which year was the state of Mysore officially renamed as Karnataka?',
      questionTextKn: 'ಮೈಸೂರು ರಾಜ್ಯವನ್ನು ಅಧಿಕೃತವಾಗಿ ಕರ್ನಾಟಕ ಎಂದು ಮರುನಾಮಕರಣ ಮಾಡಿದ ವರ್ಷ ಯಾವುದು?',
      optionA_En: '1956',
      optionA_Kn: '೧೯೫೬',
      optionB_En: '1971',
      optionB_Kn: '೧೯೭೧',
      optionC_En: '1973',
      optionC_Kn: '೧೯೭೩',
      optionD_En: '1975',
      optionD_Kn: '೧೯೭೫',
      correctOption: 'C' as const,
      explanationEn: 'On November 1, 1973, during Chief Minister D. Devaraj Urs tenure, Mysore state was renamed Karnataka.',
      explanationKn: '೧೯೭೩ ರ ನವೆಂಬರ್ ೧ ರಂದು ಡಿ. ದೇವರಾಜ ಅರಸು ಅವರ ಮುಖ್ಯಮಂತ್ರಿ ಅವಧಿಯಲ್ಲಿ ಮೈಸೂರು ರಾಜ್ಯವನ್ನು ಕರ್ನಾಟಕ ಎಂದು ಮರುನಾಮಕರಣ ಮಾಡಲಾಯಿತು.',
      difficulty: 'EASY' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: historyCat.id,
      subcategoryId: historySub.id,
      isPyq: true,
      pyqExamName: 'KPSC FDA',
      pyqYear: 2019,
    },
    {
      code: 'MCQ_000009',
      seqNumber: 9,
      questionTextEn: 'Who appoints the Chairman and Members of the Karnataka Public Service Commission (KPSC)?',
      questionTextKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗದ (KPSC) ಅಧ್ಯಕ್ಷರು ಮತ್ತು ಸದಸ್ಯರನ್ನು ಯಾರು ನೇಮಿಸುತ್ತಾರೆ?',
      optionA_En: 'Chief Minister of Karnataka',
      optionA_Kn: 'ಕರ್ನಾಟಕದ ಮುಖ್ಯಮಂತ್ರಿ',
      optionB_En: 'Governor of Karnataka',
      optionB_Kn: 'ಕರ್ನಾಟಕದ ರಾಜ್ಯಪಾಲರು',
      optionC_En: 'President of India',
      optionC_Kn: 'ಭಾರತದ ರಾಷ್ಟ್ರಪತಿಗಳು',
      optionD_En: 'Chief Justice of Karnataka High Court',
      optionD_Kn: 'ಕರ್ನಾಟಕ ಹೈಕೋರ್ಟ್ ಮುಖ್ಯ ನ್ಯಾಯಮೂರ್ತಿ',
      correctOption: 'B' as const,
      explanationEn: 'Under Article 316, the Chairman and members of a State Public Service Commission are appointed by the Governor of the State.',
      explanationKn: 'ವಿಧಿ ೩೧೬ ರ ಪ್ರಕಾರ ರಾಜ್ಯ ಲೋಕಸೇವಾ ಆಯೋಗದ ಅಧ್ಯಕ್ಷರು ಮತ್ತು ಸದಸ್ಯರನ್ನು ರಾಜ್ಯಪಾಲರು ನೇಮಿಸುತ್ತಾರೆ.',
      difficulty: 'MEDIUM' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: polityCat.id,
      subcategoryId: politySub.id,
    },
    {
      code: 'MCQ_000010',
      seqNumber: 10,
      questionTextEn: 'Which Chalukya ruler defeated Emperor Harshavardhana on the banks of the Narmada River?',
      questionTextKn: 'ನರ್ಮದಾ ನದಿಯ ದಂಡೆಯಲ್ಲಿ ಹರ್ಷವರ್ಧನ ಚಕ್ರವರ್ತಿಯನ್ನು ಸೋಲಿಸಿದ ಚಾಲುಕ್ಯ ದೊರೆ ಯಾರು?',
      optionA_En: 'Pulakeshin I',
      optionA_Kn: 'ಮೊದಲನೇ ಪುಲಿಕೇಶಿ',
      optionB_En: 'Pulakeshin II',
      optionB_Kn: 'ಎರಡನೇ ಪುಲಿಕೇಶಿ',
      optionC_En: 'Vikramaditya VI',
      optionC_Kn: 'ಆರನೇ ವಿಕ್ರಮಾದಿತ್ಯ',
      optionD_En: 'Kirtivarman I',
      optionD_Kn: 'ಮೊದಲನೇ ಕೀರ್ತಿವರ್ಮ',
      correctOption: 'B' as const,
      explanationEn: 'Pulakeshin II defeated Harshavardhana around 618 AD on the banks of river Narmada, earning the title Parameshwara.',
      explanationKn: 'ಎರಡನೇ ಪುಲಿಕೇಶಿಯು ಸುಮಾರು ೬೧೮ ರಲ್ಲಿ ನರ್ಮದಾ ನದಿಯ ದಂಡೆಯಲ್ಲಿ ಹರ್ಷವರ್ಧನನನ್ನು ಸೋಲಿಸಿ ಪರಮೇಶ್ವರ ಬಿರುದನ್ನು ಪಡೆದನು.',
      difficulty: 'MEDIUM' as const,
      positiveMarks: 1.0,
      negativeMarks: 0.25,
      status: 'APPROVED' as const,
      categoryId: historyCat.id,
      subcategoryId: historySub.id,
      isPyq: true,
      pyqExamName: 'KAS Prelims',
      pyqYear: 2017,
    },
  ];

  for (const m of demoMcqs) {
    const normalizedStemEn = m.questionTextEn.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const normalizedStemKn = m.questionTextKn.toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF]+/g, ' ').trim();

    await prisma.mcqQuestion.upsert({
      where: { code: m.code },
      update: {
        ...m,
        normalizedStemEn,
        normalizedStemKn,
      },
      create: {
        ...m,
        normalizedStemEn,
        normalizedStemKn,
      },
    });
  }

  // Sync sequence counter to 10
  await prisma.mcqSequenceCounter.upsert({
    where: { id: 'mcq_counter' },
    update: { lastSeq: { set: 10 } },
    create: { id: 'mcq_counter', lastSeq: 10 },
  });

  console.log('MCQ Demo Seed Completed Successfully (10 Demo Questions).');
}
