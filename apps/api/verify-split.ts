import { PrismaClient, StudyPlanLifecycleStatus, StudyPlanTaskType } from '@study-karnataka/database';
import { startOfDay, addDays } from 'date-fns';
import { StudyPlanGenerationService } from './src/services/study-plan-generation.service';

const prisma = new PrismaClient();

async function runSplitTest() {
  console.log('=== TOPIC SPLITTING TEST ===\n');

  const user = await prisma.user.findFirst();
  const examCycle = await prisma.examCycle.findFirst();
  const rule = await prisma.studyPlannerRule.findFirst();

  if (!user || !examCycle || !rule) {
    console.log("Missing prerequisites.");
    return;
  }

  // Create an active plan with 120 daily concept minutes
  // We'll test with target = 120 (1 day) and target = 300 (3 days)
  
  const today = startOfDay(new Date());

  async function testSplit(targetMins: number, label: string) {
    console.log(`\n--- Running Test: ${label} (Topic Duration = ${targetMins} mins, Daily Allocation = 120 mins) ---`);
    const plan = await prisma.studentStudyPlan.create({
      data: {
        studentId: user.id,
        examCycleId: examCycle.id,
        plannerRuleId: rule.id,
        planStartDate: today,
        examDate: addDays(today, 10),
        remainingDaysAtCreation: 10,
        selectedDailyMinutes: 240,
        recommendedDailyMinutes: 240,
        conceptTargetMinutes: targetMins, // This is what matters
        dailyConceptMinutes: 120,
        dailyRevisionMinutes: 60,
        dailyMcqMinutes: 15,
        dailyCurrentAffairsMinutes: 45,
        estimatedConceptCompletionDays: Math.ceil(targetMins / 120),
        estimatedConceptCompletionDate: addDays(today, 10),
        coverageStatus: 'FULL_COVERAGE',
        status: StudyPlanLifecycleStatus.ACTIVE
      }
    });

    // Get the syllabus
    const syllabus = await prisma.examSyllabus.findFirst({
      where: { examCycleId: examCycle.id }
    });

    if (!syllabus) throw new Error("No syllabus");

    await prisma.examSyllabusNode.deleteMany({ where: { examSyllabusId: syllabus.id } });

    const topic = await prisma.examSyllabusNode.create({
      data: {
        examSyllabusId: syllabus.id,
        nameEn: 'The Split Topic',
        nameKn: 'The Split Topic',
        code: `SPLIT_${targetMins}`,
        nodeType: 'TOPIC',
        depth: 1,
        displayOrder: 1,
        isActive: true
      }
    });

    await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);

    const days = await prisma.studyPlanDay.findMany({
      where: { studyPlanId: plan.id },
      orderBy: { date: 'asc' },
      include: { tasks: { where: { taskType: StudyPlanTaskType.CONCEPT } } }
    });

    for (let i = 0; i < Math.min(3, days.length); i++) {
      const d = days[i];
      const t = d.tasks[0];
      if (t) {
        console.log(`Day ${i + 1}: ${t.plannedMinutes} minutes (TopicID: ${t.topicId})`);
      }
    }
  }

  await testSplit(120, '120 Minute Exact Fit');
  await testSplit(300, '300 Minute Multi-Day Split');

  console.log('\n=== END SPLIT TEST ===');
}

runSplitTest().catch(console.error).finally(() => prisma.$disconnect());
