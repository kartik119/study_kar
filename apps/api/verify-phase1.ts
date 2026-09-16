import { PrismaClient } from '@study-karnataka/database';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
import { StudyPlannerService } from './src/services/study-planner.service';

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=== STARTING PHASE 1 VERIFICATION ===");
  const results: any[] = [];
  const errors: any[] = [];

  try {
    // 1. Verify Rules exist
    const rules = await prisma.studyPlannerRule.findMany();
    if (rules.length < 4) {
      errors.push(`Expected at least 4 rules, found ${rules.length}`);
    } else {
      results.push(`Found ${rules.length} rules.`);
    }

    const ruleNames = rules.map(r => r.name);
    ['1 Year Plan', '8 Month Plan', '6 Month Plan', '3.5-4 Month Plan'].forEach(name => {
      if (!ruleNames.some(rn => rn.includes(name))) {
        errors.push(`Missing rule containing: ${name}`);
      }
    });

    // Verify mathematical bounds for rules
    const testCases = [
      { days: 365, hours: 2, expectedTotal: 120 },
      { days: 365, hours: 4, expectedTotal: 240 },
      { days: 365, hours: 6, expectedTotal: 360 },
      { days: 240, hours: 5, expectedTotal: 300 }, // 8 month
      { days: 180, hours: 7, expectedTotal: 420 }, // 6 month
      { days: 120, hours: 8, expectedTotal: 480 }, // 4 month
    ];

    for (const tc of testCases) {
      const planStart = new Date();
      const examDate = addDays(planStart, tc.days);
      const rule = await StudyPlannerService.getApplicableRule(planStart, examDate);
      
      if (!rule) {
        errors.push(`No rule found for ${tc.days} remaining days.`);
        continue;
      }

      const dist = StudyPlannerService.calculateScaledDistribution(rule, tc.hours * 60);
      const total = dist.conceptMinutes + dist.revisionMinutes + dist.mcqMinutes + dist.currentAffairsMinutes + (tc.hours * 60 === rule.recommendedDailyMinutes ? dist.bufferMinutes : 0); // buffer is not scaled in same way? Wait, requirements say Buffer is part of total.
      
      // Let's re-read requirements about buffer.
      // "Concept + Revision + MCQ + Current Affairs + Buffer MUST equal selectedDailyMinutes exactly."
      // Let's check what I implemented in service.
      const serviceTotal = dist.conceptMinutes + dist.revisionMinutes + dist.mcqMinutes + dist.currentAffairsMinutes + dist.bufferMinutes;
      
      if (serviceTotal !== tc.expectedTotal) {
        errors.push(`Total mismatch for ${tc.days} days, ${tc.hours} hours. Expected ${tc.expectedTotal}, got ${serviceTotal}. Dist: ${JSON.stringify(dist)}`);
      } else {
        results.push(`Total match for ${tc.days} days, ${tc.hours} hours: ${serviceTotal} minutes.`);
      }
    }

    // Concept completion test
    // 42000 / 120 = 350
    const feas = StudyPlannerService.calculateFeasibility(new Date(), addDays(new Date(), 365), 120, 42000);
    if (feas.estimatedConceptCompletionDays !== 350) {
      errors.push(`Feasibility estimated days mismatch. Expected 350, got ${feas.estimatedConceptCompletionDays}`);
    } else {
      results.push(`Feasibility estimated days correct (350). Status: ${feas.coverageStatus}`);
    }

  } catch (err: any) {
    errors.push(`Fatal Error: ${err.message}`);
  } finally {
    await prisma.$disconnect();
    console.log("Results:");
    results.forEach(r => console.log("✅", r));
    console.log("\nErrors:");
    errors.forEach(e => console.log("❌", e));
    console.log("=== END VERIFICATION ===");
  }
}

runVerification();
