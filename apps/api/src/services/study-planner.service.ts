import { PrismaClient, StudyPlannerRule } from '@study-karnataka/database';
import { differenceInDays, addDays } from 'date-fns';

const prisma = new PrismaClient();

export class StudyPlannerService {
  /**
   * Round to nearest 5 minutes
   */
  private static roundTo5(minutes: number): number {
    return Math.round(minutes / 5) * 5;
  }

  /**
   * Determines the best Planner Rule based on days between planStart and examDate
   */
  static async getApplicableRule(planStartDate: Date, examDate: Date): Promise<StudyPlannerRule | null> {
    const daysRemaining = differenceInDays(new Date(examDate), new Date(planStartDate));

    // Find rule where minRemainingDays <= daysRemaining <= maxRemainingDays
    let rule = await prisma.studyPlannerRule.findFirst({
      where: {
        isActive: true,
        minRemainingDays: { lte: daysRemaining },
        maxRemainingDays: { gte: daysRemaining },
      },
      orderBy: {
        priority: 'asc', // Priority 1 (highest) will be selected first if overlapping
      },
    });

    // Fallback if no exact match is found
    if (!rule) {
      // If daysRemaining > max of the most relaxed rule, pick the most relaxed rule (longest plan, lowest minRemainingDays or highest maxRemainingDays)
      // Usually, longest plan has the highest maxRemainingDays. Let's find the rule with the highest maxRemainingDays.
      const relaxedRule = await prisma.studyPlannerRule.findFirst({
        where: { isActive: true },
        orderBy: { maxRemainingDays: 'desc' }
      });

      const intensiveRule = await prisma.studyPlannerRule.findFirst({
        where: { isActive: true },
        orderBy: { minRemainingDays: 'asc' }
      });

      if (relaxedRule && daysRemaining > relaxedRule.maxRemainingDays) {
        rule = relaxedRule;
      } else if (intensiveRule && daysRemaining < intensiveRule.minRemainingDays) {
        rule = intensiveRule;
      }
    }

    return rule;
  }

  /**
   * Scales a rule based on student's selected daily availability (in minutes)
   */
  static calculateScaledDistribution(
    rule: StudyPlannerRule,
    selectedDailyMinutes: number
  ) {
    if (!rule.allowScaling || selectedDailyMinutes === rule.recommendedDailyMinutes) {
      return {
        conceptMinutes: rule.conceptMinutes,
        revisionMinutes: rule.revisionMinutes,
        mcqMinutes: rule.mcqMinutes,
        currentAffairsMinutes: rule.currentAffairsMinutes,
        bufferMinutes: rule.bufferMinutes,
      };
    }

    const scaleFactor = selectedDailyMinutes / rule.recommendedDailyMinutes;

    // Apply scale and round to 5 mins
    let scaledConcept = this.roundTo5(rule.conceptMinutes * scaleFactor);
    let scaledRevision = this.roundTo5(rule.revisionMinutes * scaleFactor);
    let scaledMcq = this.roundTo5(rule.mcqMinutes * scaleFactor);
    let scaledCA = this.roundTo5(rule.currentAffairsMinutes * scaleFactor);
    
    // CA might be fixed in some business rules, but user didn't specify it to be fixed.
    // However, if we need to adjust to EXACTLY match selectedDailyMinutes, we adjust the largest component (concept)
    const sum = scaledConcept + scaledRevision + scaledMcq + scaledCA;
    const diff = selectedDailyMinutes - sum;

    if (diff !== 0) {
      scaledConcept += diff; // Adjust concept to absorb rounding errors
    }

    return {
      conceptMinutes: scaledConcept,
      revisionMinutes: scaledRevision,
      mcqMinutes: scaledMcq,
      currentAffairsMinutes: scaledCA,
      bufferMinutes: rule.bufferMinutes, // Buffer usually isn't scaled in daily sum, it's just extra time
    };
  }

  /**
   * Evaluates feasibility and coverage status
   */
  static calculateFeasibility(
    planStartDate: Date,
    examDate: Date,
    scaledConceptMinutes: number,
    conceptTargetMinutes: number,
    totalTopics?: number
  ) {
    const daysRemaining = differenceInDays(new Date(examDate), new Date(planStartDate));
    
    // Dynamically adjust the concept target based on topics, assuming baseline is 2000 topics
    let adjustedConceptTargetMinutes = conceptTargetMinutes;
    if (totalTopics && totalTopics > 0) {
      adjustedConceptTargetMinutes = Math.round((totalTopics / 2000) * conceptTargetMinutes);
    }

    // How many days will it take to finish the concept syllabus?
    const estimatedConceptDays = Math.ceil(adjustedConceptTargetMinutes / scaledConceptMinutes);
    const estimatedConceptDate = addDays(new Date(planStartDate), estimatedConceptDays);

    let coverageStatus: 'FULL_COVERAGE' | 'TIGHT_COVERAGE' | 'COMPRESSED_COVERAGE' = 'TIGHT_COVERAGE';

    const SAFETY_MARGIN = 15; // Hardcoded safety margin for TIGHT vs FULL

    if (estimatedConceptDays > daysRemaining) {
      // Won't finish in time
      coverageStatus = 'COMPRESSED_COVERAGE';
    } else if (estimatedConceptDays <= daysRemaining - SAFETY_MARGIN) {
      // Finished with sufficient safety margin
      coverageStatus = 'FULL_COVERAGE';
    } else {
      // Just barely finished, margin is tight
      coverageStatus = 'TIGHT_COVERAGE';
    }

    return {
      estimatedConceptCompletionDays: estimatedConceptDays,
      estimatedConceptCompletionDate: estimatedConceptDate,
      coverageStatus,
      daysRemaining
    };
  }
}
