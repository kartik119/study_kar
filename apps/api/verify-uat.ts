import { PrismaClient, StudyPlanTaskStatus, StudyPlanLifecycleStatus } from '@study-karnataka/database';
import { differenceInDays, addDays, startOfDay } from 'date-fns';
import { StudyPlanGenerationService } from './src/services/study-plan-generation.service';
import { StudyPlanRecoveryService } from './src/services/study-plan-recovery.service';

const prisma = new PrismaClient();

async function runUAT() {
  console.log('=== FINAL PRODUCTION UAT ===\n');

  // Prereq: get a valid rule, user, exam cycle
  const user = await prisma.user.findFirst();
  const examCycle = await prisma.examCycle.findFirst({
    include: { syllabi: true }
  });
  const rule = await prisma.studyPlannerRule.findFirst({
    where: { name: '1 Year Plan' }
  });

  if (!user || !examCycle || !rule) {
    console.log("Missing prerequisites for UAT.");
    return;
  }

  const examPattern = await prisma.examPattern.findFirst();
  console.log('--- Seeding Real Syllabus Topics for test ---');
  const syllabus = await prisma.examSyllabus.findFirst({
    where: { examCycleId: examCycle.id }
  });

  if (!syllabus) {
    console.log("No syllabus found.");
    return;
  }

  const topicA = await prisma.examSyllabusNode.create({
    data: {
      examSyllabusId: syllabus.id,
      nameEn: 'UAT Massive Topic',
      nameKn: 'UAT Massive Topic',
      code: 'UAT_001',
      nodeType: 'TOPIC',
      depth: 1,
      displayOrder: 100,
      isActive: true
    }
  });
  
  const topicB = await prisma.examSyllabusNode.create({
    data: {
      examSyllabusId: syllabus.id,
      nameEn: 'UAT Small Topic',
      nameKn: 'UAT Small Topic',
      code: 'UAT_002',
      nodeType: 'TOPIC',
      depth: 1,
      displayOrder: 101,
      isActive: true
    }
  });

  const today = startOfDay(new Date());
  const examDate = addDays(today, 365); // 1 Year

  console.log('--- A. Creating UAT Active Plan ---');
  let plan = await prisma.studentStudyPlan.create({
    data: {
      studentId: user.id,
      examCycleId: examCycle.id,
      plannerRuleId: rule.id,
      planStartDate: today,
      examDate: examDate,
      remainingDaysAtCreation: 365,
      selectedDailyMinutes: 240, // 4 hours
      recommendedDailyMinutes: 240,
      conceptTargetMinutes: 42000,
      dailyConceptMinutes: 120,
      dailyRevisionMinutes: 60,
      dailyMcqMinutes: 15,
      dailyCurrentAffairsMinutes: 45,
      estimatedConceptCompletionDays: 350,
      estimatedConceptCompletionDate: addDays(today, 350),
      coverageStatus: 'FULL_COVERAGE',
      status: StudyPlanLifecycleStatus.ACTIVE
    }
  });
  console.log(`Plan Created: ${plan.id}, Status: ${plan.status}`);

  console.log('\n--- B. Idempotency Test (Generate Twice) ---');
  await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);
  const gen2 = await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);
  console.log('Second generation attempt result:', gen2.message);

  console.log('\n--- C. Generation Result & Topic Splitting ---');
  let days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    orderBy: { date: 'asc' },
    include: { tasks: { orderBy: { taskType: 'asc' } } }
  });

  console.log(`Generated ${days.length} days.`);
  for (let i = 0; i < Math.min(5, days.length); i++) {
    console.log(`Day ${i + 1} Tasks:`);
    days[i].tasks.forEach(t => {
      console.log(`- Type: ${t.taskType}, Mins: ${t.plannedMinutes}, Topic: ${t.topicId || 'N/A'}, MCQ Test ID: ${t.mcqTestId || 'N/A'}`);
    });
  }

  console.log('\n--- D. Simulating Day 1 Partial Completion (120 -> 75 mins) ---');
  // Day 1 Concept Task
  const conceptTaskD1 = days[0].tasks.find(t => t.taskType === 'CONCEPT');
  if (conceptTaskD1) {
    await prisma.studyPlanTask.update({
      where: { id: conceptTaskD1.id },
      data: { completedMinutes: 75, status: StudyPlanTaskStatus.IN_PROGRESS } // simulate 75/120 completed
    });
  }
  await prisma.studyPlanDay.update({
    where: { id: days[0].id },
    data: { completedMinutes: 75, status: StudyPlanTaskStatus.IN_PROGRESS } // day also partial
  });
  // Shift Date to yesterday to trigger missed logic
  await prisma.studyPlanDay.update({
    where: { id: days[0].id },
    data: { date: addDays(today, -1) }
  });

  console.log('\n--- E. Recovery Evaluation (Partial Miss) ---');
  let recResult = await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  console.log('Recovery Action:', recResult.action);

  // Check how Day 1 looks now
  const day1Check = await prisma.studyPlanDay.findUnique({
    where: { id: days[0].id },
    include: { tasks: true }
  });
  console.log(`Day 1 Status: ${day1Check?.status}, Backlog Mins: ${day1Check?.backlogMinutes}`);
  const conceptTaskCheck = day1Check?.tasks.find(t => t.taskType === 'CONCEPT');
  console.log(`Concept Task Status: ${conceptTaskCheck?.status}, Completed Mins: ${conceptTaskCheck?.completedMinutes}`);

  // Check Recovery Tasks
  const recoveryTasks = await prisma.studyPlanTask.findMany({
    where: { studyPlanId: plan.id, isRecovery: true }
  });
  console.log(`Recovery Tasks Created: ${recoveryTasks.length}`);
  recoveryTasks.forEach(rt => {
    console.log(`- Recovery Mins: ${rt.plannedMinutes}, Linked to original task: ${rt.originalConceptTaskId}`);
  });
  
  // Verify Plan is STILL ACTIVE
  const activePlanCheck = await prisma.studentStudyPlan.findUnique({ where: { id: plan.id } });
  console.log(`Overall Plan Status: ${activePlanCheck?.status}`);

  console.log('\n--- F. Simulating Full Replan Trigger (>3 Missed Days) ---');
  // Miss next 4 days completely
  for (let i = 1; i <= 4; i++) {
    await prisma.studyPlanDay.update({
      where: { id: days[i].id },
      data: { date: addDays(today, - (i + 1)) } // push them to past
    });
  }
  
  const replanResult = await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  console.log('Recovery Action:', replanResult.action);
  
  // Check future days are SUPERSEDED/REPLANNED, not deleted
  const replannedDays = await prisma.studyPlanDay.count({
    where: { studyPlanId: plan.id, status: StudyPlanTaskStatus.REPLANNED }
  });
  console.log(`Future Days Marked REPLANNED: ${replannedDays}`);
  
  const activeDays = await prisma.studyPlanDay.count({
    where: { studyPlanId: plan.id, status: StudyPlanTaskStatus.PLANNED }
  });
  console.log(`Future Days Deleted? (Should be 0 if marked REPLANNED): ${activeDays}`);

  console.log('\n--- G. Evaluate Idempotency (Evaluating progress repeatedly) ---');
  await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  const dupCheck = await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  console.log('Repeated evaluation result:', dupCheck.message);

  console.log('\n=== END UAT ===');
}

runUAT().catch(console.error).finally(() => prisma.$disconnect());
