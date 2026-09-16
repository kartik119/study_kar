import { PrismaClient } from '@study-karnataka/database';
import { differenceInDays, addDays } from 'date-fns';
import { StudyPlannerService } from './src/services/study-planner.service';

const prisma = new PrismaClient();

async function runMathVerification() {
  console.log('=== PHASE 2 MATHEMATICAL VERIFICATION ===\n');

  const rules = await prisma.studyPlannerRule.findMany({
    orderBy: { priority: 'asc' }
  });

  const hourSelections = [2, 3, 4, 5, 6, 7, 8];
  const testScenarios = [
    { remainingDays: 365, ruleName: '1 Year Plan' },
    { remainingDays: 240, ruleName: '8 Month Plan' },
    { remainingDays: 180, ruleName: '6 Month Plan' },
    { remainingDays: 120, ruleName: '3.5 - 4 Month Plan' }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n--- Testing ${scenario.ruleName} Boundary (Approx ${scenario.remainingDays} days remaining) ---`);
    const rule = rules.find(r => r.name === scenario.ruleName);
    
    if (!rule) {
      console.log(`❌ Rule ${scenario.ruleName} not found in DB!`);
      continue;
    }

    const today = new Date();
    const examDate = addDays(today, scenario.remainingDays);

    console.table(
      hourSelections.map(hours => {
        const selectedDailyMinutes = hours * 60;
        
        // Ensure getApplicableRule fallback logic actually selects this rule
        // (Just to test the math, we'll manually apply the rule scaling here)
        const scaled = StudyPlannerService.calculateScaledDistribution(rule, selectedDailyMinutes);
        
        const sum = scaled.conceptMinutes + scaled.revisionMinutes + scaled.mcqMinutes + scaled.currentAffairsMinutes;
        
        // Math Feasibility
        const feasibility = StudyPlannerService.calculateFeasibility(
          today,
          examDate,
          scaled.conceptMinutes,
          rule.conceptTargetMinutes
        );

        return {
          'Hours': hours,
          'Selected (m)': selectedDailyMinutes,
          'Concept': scaled.conceptMinutes,
          'Revision': scaled.revisionMinutes,
          'MCQ': scaled.mcqMinutes,
          'CA': scaled.currentAffairsMinutes,
          'Buffer': scaled.bufferMinutes,
          'Total Match?': sum === selectedDailyMinutes ? '✅ YES' : `❌ NO (${sum})`,
          'Exam Days': feasibility.daysRemaining,
          'Est. Concept Days': feasibility.estimatedConceptCompletionDays,
          'Coverage': feasibility.coverageStatus
        };
      })
    );
  }
}

async function runGeneratorVerification() {
  console.log('\n=== PHASE 2 GENERATOR E2E VERIFICATION ===\n');
  
  // Create a mock user, exam cycle, and plan to test generation logic without UI
  const user = await prisma.user.findFirst();
  const examCycle = await prisma.examCycle.findFirst({
    include: { syllabi: true }
  });
  
  const rule = await prisma.studyPlannerRule.findFirst({
    where: { name: '1 Year Plan' }
  });

  if (!user || !examCycle || !rule) {
    console.log("Missing prerequisites (user, examCycle, rule) for E2E test.");
    return;
  }
  
  const planStart = new Date();
  const examDate = addDays(planStart, 365);
  
  const plan = await prisma.studentStudyPlan.create({
    data: {
      studentId: user.id,
      examCycleId: examCycle.id,
      plannerRuleId: rule.id,
      planStartDate: planStart,
      examDate: examDate,
      remainingDaysAtCreation: 365,
      selectedDailyMinutes: 240,
      recommendedDailyMinutes: 240,
      conceptTargetMinutes: 42000,
      dailyConceptMinutes: 120,
      dailyRevisionMinutes: 60,
      dailyMcqMinutes: 15,
      dailyCurrentAffairsMinutes: 45,
      estimatedConceptCompletionDays: 350,
      estimatedConceptCompletionDate: addDays(planStart, 350),
      coverageStatus: 'FULL_COVERAGE',
      status: 'ACTIVE'
    }
  });

  console.log(`Created test plan ${plan.id}. Triggering generation...`);
  
  const { StudyPlanGenerationService } = await import('./src/services/study-plan-generation.service');
  const genResult = await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);
  console.log('Generation Result:', genResult);

  // Check generated days
  const days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    include: { tasks: true }
  });
  
  console.log(`Generated ${days.length} days.`);
  
  let conceptCount = 0;
  let revisionCount = 0;
  let mcqCount = 0;
  let hasRealTopicId = false;

  days.forEach(d => {
    d.tasks.forEach(t => {
      if (t.taskType === 'CONCEPT') conceptCount++;
      if (t.taskType === 'REVISION') revisionCount++;
      if (t.taskType === 'MCQ') mcqCount++;
      if (t.topicId) hasRealTopicId = true;
    });
  });

  console.log(`- Concepts generated: ${conceptCount}`);
  console.log(`- Revisions generated: ${revisionCount}`);
  console.log(`- MCQs generated: ${mcqCount}`);
  console.log(`- Links to real Syllabus Topics? ${hasRealTopicId ? '✅ YES' : '❌ NO'}`);
  
  // Simulate Day 1 Full Completion
  const day1 = days[0];
  await prisma.studyPlanTask.updateMany({
    where: { studyPlanDayId: day1.id },
    data: { completedMinutes: 120, status: 'COMPLETED' } // Assuming some math, just blindly completing to test recovery
  });
  await prisma.studyPlanDay.update({
    where: { id: day1.id },
    data: { completedMinutes: day1.plannedMinutes, status: 'COMPLETED' }
  });

  // Simulate Day 2 Missed
  // (We push day 2's date to yesterday so it triggers recovery)
  const day2 = days[1];
  await prisma.studyPlanDay.update({
    where: { id: day2.id },
    data: { date: addDays(new Date(), -1) } // Move to past
  });

  const { StudyPlanRecoveryService } = await import('./src/services/study-plan-recovery.service');
  console.log(`Triggering evaluation & recovery...`);
  const recResult = await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  console.log('Recovery Result:', recResult);

  // Check recovery tasks
  const recTasks = await prisma.studyPlanTask.findMany({
    where: { studyPlanId: plan.id, isRecovery: true }
  });
  console.log(`- Recovery tasks generated: ${recTasks.length}`);

  console.log('=== END VERIFICATION ===');
}

async function main() {
  await runMathVerification();
  await runGeneratorVerification();
}

main().catch(console.error).finally(() => prisma.$disconnect());
