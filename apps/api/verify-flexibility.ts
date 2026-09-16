import { PrismaClient, StudyPlanTaskStatus } from '@study-karnataka/database';
import { startOfDay, addDays } from 'date-fns';
import { StudyPlanGenerationService } from './src/services/study-plan-generation.service';
import { StudyPlanFlexibilityService } from './src/services/study-plan-flexibility.service';

const prisma = new PrismaClient();

async function runFlexibilityTest() {
  console.log('=== REAL FLEXIBILITY CALIBRATION REPORT ===\n');

  let user = await prisma.user.findFirst();
  let plan = await prisma.studentStudyPlan.findFirst({
     include: { plannerRule: true }
  });

  if (!user || !plan) {
    console.log("Missing prerequisites.");
    return;
  }

  const today = startOfDay(new Date());

  // Reset plan for clean test
  await prisma.studyPlanDay.deleteMany({ where: { studyPlanId: plan.id } });
  await prisma.studyPlanTask.deleteMany({ where: { studyPlanId: plan.id } });
  await prisma.studentStudyPlan.update({
    where: { id: plan.id },
    data: {
      selectedDailyMinutes: 240,
      dailyConceptMinutes: 120,
      dailyRevisionMinutes: 60,
      dailyMcqMinutes: 15,
      dailyCurrentAffairsMinutes: 45
    }
  });

  console.log("Generating normal 4-hour plan...");
  await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);

  let days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    include: { tasks: true },
    orderBy: { date: 'asc' },
    take: 3
  });

  console.log(`\n--- BASELINE (Normal 4h) ---`);
  for (const d of days) {
     console.log(`DATE: Day ${d.dayNumber} - Planned: ${d.plannedMinutes} mins`);
  }

  console.log(`\n--- TEST 1: Temporary Reduction (Today 2h) ---`);
  await StudyPlanFlexibilityService.applyTemporaryOverride(plan.id, days[0].date, 120);
  
  days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    include: { tasks: true },
    orderBy: { date: 'asc' },
    take: 3
  });

  for (const d of days) {
     console.log(`DATE: Day ${d.dayNumber} - Planned: ${d.plannedMinutes} mins`);
     for (const t of d.tasks) {
       console.log(`  - ${t.taskType} (${t.plannedMinutes} mins)${t.isRecovery ? ' [RECOVERY]' : ''}`);
     }
  }

  console.log(`\n--- TEST 2: Permanent Change (Tomorrow onwards 6h) ---`);
  const res = await StudyPlanFlexibilityService.applyPermanentChange(plan.id, 360, addDays(today, 1));
  console.log("Permanent Change Result:", res);

  days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    include: { tasks: true },
    orderBy: { date: 'asc' },
    take: 4
  });

  for (const d of days) {
     console.log(`DATE: Day ${d.dayNumber} - Planned: ${d.plannedMinutes} mins`);
  }

}

runFlexibilityTest().catch(console.error).finally(() => prisma.$disconnect());
