import { prisma } from './index';

export async function cleanupDemoDatabase() {
  console.log('This removes Study Karnataka DEMO_ records only.');

  // 1. Find Demo Study Materials
  const demoMaterials = await prisma.studyMaterial.findMany({
    where: { code: { startsWith: 'DEMO_' } },
    select: { id: true },
  });
  const demoMaterialIds = demoMaterials.map((m: any) => m.id);

  // Find Demo Locales
  const demoLocales = await prisma.studyMaterialLocale.findMany({
    where: { studyMaterialId: { in: demoMaterialIds } },
    select: { id: true },
  });
  const demoLocaleIds = demoLocales.map((l: any) => l.id);

  // Find Demo Revisions
  const demoRevisions = await prisma.studyMaterialLocaleRevision.findMany({
    where: { studyMaterialLocaleId: { in: demoLocaleIds } },
    select: { id: true },
  });
  const demoRevisionIds = demoRevisions.map((r: any) => r.id);

  // Deletions for Study Materials
  const resReviewEvents = await prisma.studyMaterialReviewEvent.deleteMany({
    where: { localeRevisionId: { in: demoRevisionIds } },
  });

  const resPreviewConfigs = await prisma.studyMaterialLocalePreviewConfig.deleteMany({
    where: { localeRevisionId: { in: demoRevisionIds } },
  });

  const resAccessPolicies = await prisma.studyMaterialAccessPolicy.deleteMany({
    where: { studyMaterialId: { in: demoMaterialIds } },
  });

  const resTaxonomyMappings = await prisma.studyMaterialTaxonomyMapping.deleteMany({
    where: { studyMaterialId: { in: demoMaterialIds } },
  });

  const resRevisions = await prisma.studyMaterialLocaleRevision.deleteMany({
    where: { studyMaterialLocaleId: { in: demoLocaleIds } },
  });

  const resLocales = await prisma.studyMaterialLocale.deleteMany({
    where: { studyMaterialId: { in: demoMaterialIds } },
  });

  const resMaterials = await prisma.studyMaterial.deleteMany({
    where: { id: { in: demoMaterialIds } },
  });

  // Deletions for Academic Taxonomy
  const resKnowledgeAreas = await prisma.academicKnowledgeArea.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });
  const resTopics = await prisma.academicTopic.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });
  const resSubcategories = await prisma.academicSubcategory.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });
  const resCategories = await prisma.academicCategory.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });

  // Deletions for Exams
  const demoCycles = await prisma.examCycle.findMany({
    where: { cycleCode: { startsWith: 'DEMO_' } },
    select: { id: true },
  });
  const demoCycleIds = demoCycles.map((c: any) => c.id);

  const resSyllabusNodes = await prisma.examSyllabusNode.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });
  const resSyllabi = await prisma.examSyllabus.deleteMany({
    where: { examCycleId: { in: demoCycleIds } },
  });

  const demoPatterns = await prisma.examPattern.findMany({
    where: { examCycleId: { in: demoCycleIds } },
    select: { id: true },
  });
  const demoPatternIds = demoPatterns.map((p: any) => p.id);

  const demoStages = await prisma.examStage.findMany({
    where: { examPatternId: { in: demoPatternIds } },
    select: { id: true },
  });
  const demoStageIds = demoStages.map((s: any) => s.id);

  const demoPapers = await prisma.examPaper.findMany({
    where: { examStageId: { in: demoStageIds } },
    select: { id: true },
  });
  const demoPaperIds = demoPapers.map((p: any) => p.id);

  const resPaperSections = await prisma.examPaperSection.deleteMany({
    where: { examPaperId: { in: demoPaperIds } },
  });

  const resPapers = await prisma.examPaper.deleteMany({
    where: { id: { in: demoPaperIds } },
  });

  const resStages = await prisma.examStage.deleteMany({
    where: { id: { in: demoStageIds } },
  });

  const resPatterns = await prisma.examPattern.deleteMany({
    where: { id: { in: demoPatternIds } },
  });

  const resSEO = await prisma.examSEO.deleteMany({
    where: { examCycleId: { in: demoCycleIds } },
  });

  const resImportantDates = await prisma.examImportantDate.deleteMany({
    where: { examCycleId: { in: demoCycleIds } },
  });

  const resOfficialResources = await prisma.examOfficialResource.deleteMany({
    where: { examCycleId: { in: demoCycleIds } },
  });

  const resEligibility = await prisma.examEligibility.deleteMany({
    where: { examCycleId: { in: demoCycleIds } },
  });

  const resCycles = await prisma.examCycle.deleteMany({
    where: { id: { in: demoCycleIds } },
  });

  const resProgrammes = await prisma.examProgramme.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });

  const resAuthorities = await prisma.examAuthority.deleteMany({
    where: { code: { startsWith: 'DEMO_' } },
  });

  console.log(`
=====================================================
Study Karnataka Demo Cleanup Complete!
=====================================================
Exact Deleted Record Counts:
- Exam Authorities: ${resAuthorities.count}
- Exam Programmes: ${resProgrammes.count}
- Exam Cycles: ${resCycles.count}
- Exam Patterns: ${resPatterns.count}
- Exam Stages: ${resStages.count}
- Exam Papers: ${resPapers.count}
- Exam Paper Sections: ${resPaperSections.count}
- Exam Syllabi: ${resSyllabi.count}
- Exam Syllabus Nodes: ${resSyllabusNodes.count}
- Exam SEO / Dates / Resources / Eligibility: ${resSEO.count + resImportantDates.count + resOfficialResources.count + resEligibility.count}
- Academic Categories: ${resCategories.count}
- Academic Subcategories: ${resSubcategories.count}
- Academic Topics: ${resTopics.count}
- Academic Knowledge Areas: ${resKnowledgeAreas.count}
- Study Materials: ${resMaterials.count}
- Study Material Locales: ${resLocales.count}
- Study Material Revisions: ${resRevisions.count}
- Study Material Access Policies: ${resAccessPolicies.count}
- Study Material Preview Configs: ${resPreviewConfigs.count}
- Study Material Review Events: ${resReviewEvents.count}
- Study Material Taxonomy Mappings: ${resTaxonomyMappings.count}
=====================================================
  `);
}
