import { prisma } from './index';

export async function seedVisualDemoSyllabus() {
  const syllabusId = '0d46a9b5-0b60-4027-a1d4-d452dc044609';

  const syllabus = await prisma.examSyllabus.findUnique({
    where: { id: syllabusId },
    include: { examPattern: true },
  });

  if (!syllabus) {
    throw new Error(`Syllabus Revision 4 (${syllabusId}) not found!`);
  }

  // Ensure pattern stage and paper exist on pattern 0df291b9-b71f-459e-9acf-c2d829310d1f for scope demonstration
  const patternId = syllabus.examPatternId;

  let prelimsStage = await prisma.examStage.findFirst({
    where: { examPatternId: patternId, code: 'VISUAL_DEMO_STAGE_PRE' },
  });
  if (!prelimsStage) {
    prelimsStage = await prisma.examStage.create({
      data: {
        examPatternId: patternId,
        code: 'VISUAL_DEMO_STAGE_PRE',
        stageType: 'PRELIMINARY',
        nameEn: 'Preliminary Examination',
        nameKn: 'ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆ',
        displayOrder: 1,
        isQualifying: true,
        contributesToFinalMerit: false,
      },
    });
  }

  let gsPaper1 = await prisma.examPaper.findFirst({
    where: { examStageId: prelimsStage.id, code: 'VISUAL_DEMO_PAPER_GS1' },
  });
  if (!gsPaper1) {
    gsPaper1 = await prisma.examPaper.create({
      data: {
        examStageId: prelimsStage.id,
        code: 'VISUAL_DEMO_PAPER_GS1',
        assessmentMode: 'OBJECTIVE',
        nameEn: 'General Studies Paper I',
        nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I',
        displayOrder: 1,
        durationMinutes: 120,
        totalQuestions: 100,
        questionsToAnswer: 100,
        totalMarks: 200,
      },
    });
  }

  // Clean existing VISUAL_DEMO_ nodes for idempotency
  await prisma.examSyllabusNode.deleteMany({
    where: {
      examSyllabusId: syllabusId,
      code: { startsWith: 'VISUAL_DEMO_' },
    },
  });

  const nodeTreeData = [
    {
      code: 'VISUAL_DEMO_PRELIMS',
      nodeType: 'SUBJECT' as const,
      scopeType: 'GLOBAL' as const,
      nameEn: 'PRELIMINARY EXAMINATION',
      nameKn: 'ಪ್ರಾಥಮಿಕ ಪರೀಕ್ಷೆ',
      descriptionEn: 'First stage qualifying competitive exam comprising objective papers.',
      descriptionKn: 'ವಸ್ತುನಿಷ್ಠ ಪತ್ರಿಕೆಗಳನ್ನು ಒಳಗೊಂಡಿರುವ ಮೊದಲ ಹಂತದ ಅರ್ಹತಾ ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆ.',
      displayOrder: 1,
      depth: 1,
      children: [
        {
          code: 'VISUAL_DEMO_GS',
          nodeType: 'SECTION' as const,
          scopeType: 'STAGE' as const,
          examStageId: prelimsStage.id,
          nameEn: 'GENERAL STUDIES',
          nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ',
          descriptionEn: 'Broad core curriculum covering History, Polity, Geography, Economy, Science, and Current Events.',
          descriptionKn: 'ಇತಿಹಾಸ, ರಾಜ್ಯವ್ಯವಸ್ಥೆ, ಭೂಗೋಳ, ಅರ್ಥವ್ಯವಸ್ಥೆ, ವಿಜ್ಞಾನ ಮತ್ತು ಪ್ರಚಲಿತ ಘಟನೆಗಳನ್ನು ಒಳಗೊಂಡ ಪಠ್ಯಕ್ರಮ.',
          displayOrder: 1,
          depth: 2,
          children: [
            // HISTORY
            {
              code: 'VISUAL_DEMO_HIST',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'HISTORY',
              nameKn: 'ಇತಿಹಾಸ',
              descriptionEn: 'Comprehensive study of Indian and Karnataka history across ancient, medieval, and modern eras.',
              descriptionKn: 'ಪ್ರಾಚೀನ, ಮಧ್ಯಕಾಲೀನ ಮತ್ತು ಆಧುನಿಕ ಯುಗಗಳ ಭಾರತೀಯ ಹಾಗೂ ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಸಮಗ್ರ ಅಧ್ಯಯನ.',
              displayOrder: 1,
              depth: 3,
              children: [
                {
                  code: 'VISUAL_DEMO_KAR_HIST',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'KARNATAKA HISTORY',
                  nameKn: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
                  descriptionEn: 'Historical developments in Karnataka from early rulers to modern state unification.',
                  descriptionKn: 'ಆರಂಭಿಕ ಆಳರಸರಿಂದ ಆಧುನಿಕ ರಾಜ್ಯ ಏಕೀಕರಣದವರೆಗಿನ ಕರ್ನಾಟಕದ ಐತಿಹಾಸಿಕ ಬೆಳವಣಿಗೆಗಳು.',
                  displayOrder: 1,
                  depth: 4,
                  children: [
                    {
                      code: 'VISUAL_DEMO_ANC_KAR',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Ancient Karnataka',
                      nameKn: 'ಪ್ರಾಚೀನ ಕರ್ನಾಟಕ',
                      displayOrder: 1,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_MED_KAR',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Medieval Karnataka',
                      nameKn: 'ಮಧ್ಯಕಾಲೀನ ಕರ್ನಾಟಕ',
                      displayOrder: 2,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_MOD_KAR',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Modern Karnataka',
                      nameKn: 'ಆಧುನಿಕ ಕರ್ನಾಟಕ',
                      displayOrder: 3,
                      depth: 5,
                      children: [
                        {
                          code: 'VISUAL_DEMO_MYSORE_KINGDOM',
                          nodeType: 'SUBTOPIC' as const,
                          scopeType: 'GLOBAL' as const,
                          nameEn: 'Mysore Kingdom',
                          nameKn: 'ಮೈಸೂರು ಸಂಸ್ಥಾನ',
                          displayOrder: 1,
                          depth: 6,
                        },
                        {
                          code: 'VISUAL_DEMO_ANGLO_MYSORE',
                          nodeType: 'SUBTOPIC' as const,
                          scopeType: 'PAPER' as const,
                          examPaperId: gsPaper1.id,
                          nameEn: 'Anglo-Mysore Wars',
                          nameKn: 'ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧಗಳು',
                          descriptionEn: 'Four military conflicts between Mysore rulers Hyder Ali, Tipu Sultan and East India Company.',
                          descriptionKn: 'ಹೈದರಾಲಿ, ಟಿಪ್ಪು ಸುಲ್ತಾನ್ ಮತ್ತು ಈಸ್ಟ್ ಇಂಡಿಯಾ ಕಂಪನಿಯ ನಡುವಿನ ನಾಲ್ಕು ಸಮರಗಳು.',
                          displayOrder: 2,
                          depth: 6,
                          children: [
                            {
                              code: 'VISUAL_DEMO_FIRST_ANGLO_MYSORE',
                              nodeType: 'KNOWLEDGE_AREA' as const,
                              scopeType: 'GLOBAL' as const,
                              nameEn: 'First Anglo-Mysore War',
                              nameKn: 'ಮೊದಲ ಆಂಗ್ಲೋ-ಮೈಸೂರು ಯುದ್ಧ',
                              displayOrder: 1,
                              depth: 7,
                            },
                          ],
                        },
                        {
                          code: 'VISUAL_DEMO_FREEDOM_KAR',
                          nodeType: 'SUBTOPIC' as const,
                          scopeType: 'GLOBAL' as const,
                          nameEn: 'Freedom Movement in Karnataka',
                          nameKn: 'ಕರ್ನಾಟಕದ ಸ್ವಾತಂತ್ರ್ಯ ಚಳವಳಿ',
                          displayOrder: 3,
                          depth: 6,
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // INDIAN POLITY
            {
              code: 'VISUAL_DEMO_POLITY',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'INDIAN POLITY',
              nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
              descriptionEn: 'Constitutional structure, fundamental rights, duties, and state governance mechanisms.',
              descriptionKn: 'ಸಂವಿಧಾನಾತ್ಮಕ ಚೌಕಟ್ಟು, ಮೂಲಭೂತ ಹಕ್ಕುಗಳು, ಕರ್ತವ್ಯಗಳು ಮತ್ತು ರಾಜ್ಯ ಆಡಳಿತ ವ್ಯವಸ್ಥೆಗಳು.',
              displayOrder: 2,
              depth: 3,
              children: [
                {
                  code: 'VISUAL_DEMO_CONST',
                  nodeType: 'SECTION' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'Constitution',
                  nameKn: 'ಸಂವಿಧಾನ',
                  displayOrder: 1,
                  depth: 4,
                  children: [
                    {
                      code: 'VISUAL_DEMO_FR',
                      nodeType: 'UNIT' as const,
                      scopeType: 'PAPER' as const,
                      examPaperId: gsPaper1.id,
                      nameEn: 'Fundamental Rights',
                      nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
                      descriptionEn: 'Articles 12 to 35 of Part III providing fundamental guarantees and remedies.',
                      descriptionKn: 'ಸಂವಿಧಾನದ ಭಾಗ III ರ ವಿಧಿಗಳು ೧೨ ರಿಂದ ೩೫ ರ ಅಡಿಯಲ್ಲಿ ನೀಡಲಾದ ಹಕ್ಕುಗಳು.',
                      displayOrder: 1,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_DPSP',
                      nodeType: 'UNIT' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Directive Principles',
                      nameKn: 'ರಾಜ್ಯ ನಿರ್ದೇಶಕ ತತ್ವಗಳು',
                      displayOrder: 2,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_FD',
                      nodeType: 'UNIT' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Fundamental Duties',
                      nameKn: 'ಮೂಲಭೂತ ಕರ್ತವ್ಯಗಳು',
                      displayOrder: 3,
                      depth: 5,
                    },
                  ],
                },
              ],
            },

            // GEOGRAPHY
            {
              code: 'VISUAL_DEMO_GEOG',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'GEOGRAPHY',
              nameKn: 'ಭೂಗೋಳಶಾಸ್ತ್ರ',
              displayOrder: 3,
              depth: 3,
              children: [
                {
                  code: 'VISUAL_DEMO_KAR_GEOG',
                  nodeType: 'UNIT' as const,
                  scopeType: 'STAGE' as const,
                  examStageId: prelimsStage.id,
                  nameEn: 'Karnataka Geography',
                  nameKn: 'ಕರ್ನಾಟಕ ಭೂಗೋಳಶಾಸ್ತ್ರ',
                  displayOrder: 1,
                  depth: 4,
                  children: [
                    {
                      code: 'VISUAL_DEMO_PHYSIOGRAPHY',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Physiography',
                      nameKn: 'ಭೌತಿಕ ಸ್ವರೂಪ',
                      displayOrder: 1,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_RIVERS',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Rivers',
                      nameKn: 'ನದಿಗಳು',
                      displayOrder: 2,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_CLIMATE',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Climate',
                      nameKn: 'ಹವಾಮಾನ',
                      displayOrder: 3,
                      depth: 5,
                    },
                    {
                      code: 'VISUAL_DEMO_SOILS',
                      nodeType: 'TOPIC' as const,
                      scopeType: 'GLOBAL' as const,
                      nameEn: 'Soils',
                      nameKn: 'ಮಣ್ಣುಗಳು',
                      displayOrder: 4,
                      depth: 5,
                    },
                  ],
                },
              ],
            },

            // ECONOMY
            {
              code: 'VISUAL_DEMO_ECONOMY',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'ECONOMY',
              nameKn: 'ಅರ್ಥವ್ಯವಸ್ಥೆ',
              displayOrder: 4,
              depth: 3,
              children: [
                {
                  code: 'VISUAL_DEMO_IND_ECON',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'Indian Economy',
                  nameKn: 'ಭಾರತೀಯ ಅರ್ಥವ್ಯವಸ್ಥೆ',
                  displayOrder: 1,
                  depth: 4,
                },
                {
                  code: 'VISUAL_DEMO_KAR_ECON',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'Karnataka Economy',
                  nameKn: 'ಕರ್ನಾಟಕದ ಅರ್ಥವ್ಯವಸ್ಥೆ',
                  displayOrder: 2,
                  depth: 4,
                },
              ],
            },

            // SCIENCE & TECHNOLOGY
            {
              code: 'VISUAL_DEMO_SCI_TECH',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'SCIENCE & TECHNOLOGY',
              nameKn: 'ವಿಜ್ಞಾನ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ',
              displayOrder: 5,
              depth: 3,
            },

            // ENVIRONMENT
            {
              code: 'VISUAL_DEMO_ENV',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'ENVIRONMENT',
              nameKn: 'ಪರಿಸರ',
              displayOrder: 6,
              depth: 3,
            },

            // CURRENT AFFAIRS
            {
              code: 'VISUAL_DEMO_CA',
              nodeType: 'SUBJECT' as const,
              scopeType: 'GLOBAL' as const,
              nameEn: 'CURRENT AFFAIRS',
              nameKn: 'ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
              displayOrder: 7,
              depth: 3,
              children: [
                {
                  code: 'VISUAL_DEMO_KAR_CA',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'Karnataka Current Affairs',
                  nameKn: 'ಕರ್ನಾಟಕ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
                  displayOrder: 1,
                  depth: 4,
                },
                {
                  code: 'VISUAL_DEMO_NAT_CA',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'National Current Affairs',
                  nameKn: 'ರಾಷ್ಟ್ರೀಯ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
                  displayOrder: 2,
                  depth: 4,
                },
                {
                  code: 'VISUAL_DEMO_INT_CA',
                  nodeType: 'UNIT' as const,
                  scopeType: 'GLOBAL' as const,
                  nameEn: 'International Current Affairs',
                  nameKn: 'ಅಂತರರಾಷ್ಟ್ರೀಯ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು',
                  displayOrder: 3,
                  depth: 4,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  async function createNodesRecursively(nodes: any[], parentId: string | null = null) {
    for (const node of nodes) {
      const createdNode = await prisma.examSyllabusNode.create({
        data: {
          examSyllabusId: syllabusId,
          parentId,
          code: node.code,
          nodeType: node.nodeType,
          scopeType: node.scopeType || 'GLOBAL',
          examStageId: node.examStageId || null,
          examPaperId: node.examPaperId || null,
          nameEn: node.nameEn,
          nameKn: node.nameKn,
          descriptionEn: node.descriptionEn || null,
          descriptionKn: node.descriptionKn || null,
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

  await createNodesRecursively(nodeTreeData);

  const totalCreated = await prisma.examSyllabusNode.count({
    where: { examSyllabusId: syllabusId },
  });

  console.log(`
=====================================================
KAS Exam Syllabus Revision 4 Populated Successfully!
=====================================================
Syllabus Revision 4 ID: ${syllabusId}
Total Syllabus Nodes: ${totalCreated}
=====================================================
  `);
}
