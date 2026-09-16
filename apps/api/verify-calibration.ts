import { PrismaClient, StudyPlanLifecycleStatus, StudyPlanTaskStatus, StudyPlanTaskType } from '@study-karnataka/database';
import { startOfDay, addDays } from 'date-fns';
import { StudyPlanGenerationService } from './src/services/study-plan-generation.service';
import { StudyPlanRecoveryService } from './src/services/study-plan-recovery.service';

const prisma = new PrismaClient();

async function runCalibration() {
  console.log('=== REAL 7-DAY CALIBRATION REPORT ===\n');

  let user = await prisma.user.findFirst();
  let examCycle = await prisma.examCycle.findFirst();
  let rule = await prisma.studyPlannerRule.findFirst();

  if (!user || !examCycle || !rule) {
    console.log("Missing prerequisites.");
    return;
  }

  const today = startOfDay(new Date());

  // Check for real syllabus nodes
  let syllabus = await prisma.examSyllabus.findFirst({
    where: { examCycleId: examCycle.id }
  });

  if (!syllabus) {
    const examPattern = await prisma.examPattern.findFirst();
    syllabus = await prisma.examSyllabus.create({
      data: {
        examCycle: { connect: { id: examCycle.id } },
        examPattern: { connect: { id: examPattern!.id } },
        titleEn: 'KAS 2026 Prelims Syllabus',
        titleKn: 'KAS 2026 Prelims Syllabus',
        version: 1,
        revisionNumber: 1,
        status: 'PUBLISHED',
        isCurrent: true
      }
    });
  }

  const nodeCount = await prisma.examSyllabusNode.count({
    where: { examSyllabusId: syllabus.id }
  });

  if (nodeCount <= 2) {
    // Seed some realistic KAS topics if missing
    console.log("Seeding realistic KAS Syllabus...");
    await prisma.examSyllabusNode.deleteMany({ where: { examSyllabusId: syllabus.id } });
    const subjects = [
      { name: 'Indian Polity', topics: ['Constitution Fundamentals', 'Fundamental Rights', 'Directive Principles', 'Union Executive', 'Parliament'] },
      { name: 'Indian History', topics: ['Indus Valley Civilization', 'Vedic Age', 'Buddhism and Jainism', 'Mauryan Empire', 'Gupta Empire'] },
      { name: 'Geography', topics: ['Physical Geography of India', 'Climate', 'Drainage System', 'Agriculture', 'Minerals'] }
    ];

    let displayOrder = 1;
    for (const sub of subjects) {
      const subjectNode = await prisma.examSyllabusNode.create({
        data: {
          examSyllabusId: syllabus.id,
          nameEn: sub.name,
          nameKn: sub.name,
          code: `SUB_${displayOrder}`,
          nodeType: 'SUBJECT',
          depth: 1,
          displayOrder,
          isActive: true
        }
      });
      displayOrder++;
      for (const t of sub.topics) {
        await prisma.examSyllabusNode.create({
          data: {
            examSyllabusId: syllabus.id,
            parentId: subjectNode.id,
            nameEn: t,
            nameKn: t,
            code: `TOPIC_${displayOrder}`,
            nodeType: 'TOPIC',
            depth: 2,
            displayOrder,
            isActive: true
          }
        });
        displayOrder++;
      }
    }
  }

  // Create the plan
  const plan = await prisma.studentStudyPlan.create({
    data: {
      studentId: user.id,
      examCycleId: examCycle.id,
      plannerRuleId: rule.id,
      planStartDate: today,
      examDate: addDays(today, 365),
      remainingDaysAtCreation: 365,
      selectedDailyMinutes: 240,
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

  await StudyPlanGenerationService.generateInitial30DayPlan(plan.id);

  console.log('--- 7-DAY CALIBRATION PLAN ---');
  let days = await prisma.studyPlanDay.findMany({
    where: { studyPlanId: plan.id },
    orderBy: { date: 'asc' },
    include: {
      tasks: {
        orderBy: { taskType: 'asc' }
      }
    }
  });

  // Fetch topics to map names
  const allTopics = await prisma.examSyllabusNode.findMany({
    where: { examSyllabusId: syllabus.id }
  });
  const topicMap = new Map(allTopics.map(t => [t.id, t.nameEn]));
  
  let totalConcept = 0, totalRev = 0, totalMcq = 0, totalCa = 0;

  for (let i = 0; i < 7; i++) {
    const d = days[i];
    console.log(`\nDATE: ${d.date.toISOString().split('T')[0]}`);
    console.log(`TOTAL PLANNED TIME: ${d.plannedMinutes} mins`);
    console.log(`STATUS: ${d.status}`);

    for (const t of d.tasks) {
      if (t.taskType === 'CONCEPT') {
        const title = t.topicId ? topicMap.get(t.topicId) : 'Generic Syllabus';
        const sessionInfo = t.totalSessions && t.totalSessions > 1 ? ` (Session ${t.sessionNumber} of ${t.totalSessions})` : '';
        console.log(`  CONCEPT: ${title}${sessionInfo}`);
        console.log(`    Planned minutes: ${t.plannedMinutes}`);
        totalConcept += t.plannedMinutes;
      } else if (t.taskType === 'REVISION') {
        console.log(`  REVISION`);
        console.log(`    Topic being revised: ${t.topicId ? topicMap.get(t.topicId) : 'N/A'}`);
        console.log(`    Original Concept Task: ${t.originalConceptTaskId || 'N/A'}`);
        console.log(`    Planned minutes: ${t.plannedMinutes}`);
        totalRev += t.plannedMinutes;
      } else if (t.taskType === 'MCQ') {
        console.log(`  MCQ`);
        console.log(`    Topic: ${t.topicId ? topicMap.get(t.topicId) : 'N/A'}`);
        console.log(`    Planned minutes: ${t.plannedMinutes}`);
        totalMcq += t.plannedMinutes;
      } else if (t.taskType === 'CURRENT_AFFAIRS') {
        console.log(`  CURRENT AFFAIRS`);
        console.log(`    Planned minutes: ${t.plannedMinutes}`);
        totalCa += t.plannedMinutes;
      }
    }
    const sumDaily = d.tasks.reduce((acc, t) => acc + t.plannedMinutes, 0);
    console.log(`  TOTAL DAILY MINUTES: ${sumDaily}`);
  }

  console.log(`\n--- WEEKLY SUMMARY ---`);
  console.log(`Total Concept Minutes: ${totalConcept}`);
  console.log(`Total Revision Minutes: ${totalRev}`);
  console.log(`Total MCQ Minutes: ${totalMcq}`);
  console.log(`Total Current Affairs Minutes: ${totalCa}`);
  console.log(`Total Weekly Minutes: ${totalConcept + totalRev + totalMcq + totalCa}`);
  
  console.log('\n--- CALIBRATING MISS/PARTIAL BEHAVIOUR ---');
  // Day 1: Fully complete
  for (const t of days[0].tasks) {
    await prisma.studyPlanTask.update({ where: { id: t.id }, data: { completedMinutes: t.plannedMinutes, status: StudyPlanTaskStatus.COMPLETED } });
  }
  await prisma.studyPlanDay.update({ where: { id: days[0].id }, data: { completedMinutes: days[0].plannedMinutes, status: StudyPlanTaskStatus.COMPLETED } });
  
  // Day 2: Partial complete
  const d2concept = days[1].tasks.find(t => t.taskType === 'CONCEPT');
  await prisma.studyPlanTask.update({ where: { id: d2concept!.id }, data: { completedMinutes: 75, status: StudyPlanTaskStatus.IN_PROGRESS } });
  await prisma.studyPlanDay.update({ where: { id: days[1].id }, data: { completedMinutes: 75, status: StudyPlanTaskStatus.IN_PROGRESS } });
  
  // Shift Date to yesterday to trigger evaluation
  await prisma.studyPlanDay.update({ where: { id: days[0].id }, data: { date: addDays(today, -3) } });
  await prisma.studyPlanDay.update({ where: { id: days[1].id }, data: { date: addDays(today, -2) } });
  await prisma.studyPlanDay.update({ where: { id: days[2].id }, data: { date: addDays(today, -1) } }); // Day 3 fully missed
  
  await StudyPlanRecoveryService.evaluateAndRecover(plan.id);
  
  const d1Check = await prisma.studyPlanDay.findUnique({ where: { id: days[0].id } });
  const d2Check = await prisma.studyPlanDay.findUnique({ where: { id: days[1].id }, include: { tasks: true } });
  const d3Check = await prisma.studyPlanDay.findUnique({ where: { id: days[2].id } });
  
  console.log(`\nDay 1 Status (Fully Completed): ${d1Check?.status}`);
  console.log(`Day 2 Status (Partial): ${d2Check?.status}, Day Backlog: ${d2Check?.backlogMinutes}`);
  console.log(`Day 3 Status (Missed): ${d3Check?.status}, Day Backlog: ${d3Check?.backlogMinutes}`);
  
  const recoveryTasks = await prisma.studyPlanTask.findMany({
    where: { studyPlanId: plan.id, isRecovery: true }
  });
  console.log(`\nRecovery Tasks Generated: ${recoveryTasks.length}`);
  for (const r of recoveryTasks) {
    console.log(` - Planned: ${r.plannedMinutes}, Link: ${r.originalConceptTaskId}`);
  }

  const pCheck = await prisma.studentStudyPlan.findUnique({ where: { id: plan.id } });
  console.log(`Final Plan Status: ${pCheck?.status}`);

}

runCalibration().catch(console.error).finally(() => prisma.$disconnect());
