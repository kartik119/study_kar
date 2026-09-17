// @ts-nocheck
import { PrismaClient, StudyPlanTaskStatus, StudyPlanTaskType, StudyPlanLifecycleStatus } from '@study-karnataka/database';
import { startOfDay, addDays } from 'date-fns';
import { StudyPlanRecoveryService } from './study-plan-recovery.service';
import { StudyPlanGenerationService } from './study-plan-generation.service';

const prisma = new PrismaClient();

export class StudyPlanFlexibilityService {

  /**
   * Adjusts the current day's availability temporarily without a full replan.
   */
  static async applyTemporaryOverride(planId: string, date: Date, newMinutes: number) {
    const today = startOfDay(date);
    
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.studentStudyPlan.findUnique({
        where: { id: planId },
        include: { plannerRule: true }
      });
      
      if (!plan || plan.status !== StudyPlanLifecycleStatus.ACTIVE) throw new Error("Plan not found or inactive.");

      const day = await tx.studyPlanDay.findFirst({
        where: { studyPlanId: planId, date: today },
        include: { tasks: true }
      });

      if (!day) throw new Error("Study day not found.");

      const originalPlannedMinutes = day.plannedMinutes;
      
      await tx.studyPlanDay.update({
        where: { id: day.id },
        data: { availableMinutesOverride: newMinutes, plannedMinutes: newMinutes }
      });

      if (newMinutes < originalPlannedMinutes) {
        // We need to reduce tasks
        // Priority for keeping: Concept, then Revision, then MCQ, then CA. Wait, the user said we should push tasks to tomorrow if they don't fit.
        // Actually, reducing tasks should drop Current Affairs first, then MCQ, then Revision, then Concept.
        // So priority (highest first): CONCEPT, REVISION, MCQ, CURRENT_AFFAIRS
        const sortedTasks = [...day.tasks].sort((a, b) => {
          const priority = { CONCEPT: 4, REVISION: 3, MCQ: 2, CURRENT_AFFAIRS: 1, RECOVERY: 5 };
          const pA = priority[a.taskType as keyof typeof priority] || 0;
          const pB = priority[b.taskType as keyof typeof priority] || 0;
          return pB - pA;
        });

        let currentCapacity = newMinutes;
        const uncompletedTasksToRecover: any[] = [];

        for (const task of sortedTasks) {
          if (currentCapacity >= task.plannedMinutes) {
            currentCapacity -= task.plannedMinutes;
          } else {
            // Trim the task
            const amountTrimmed = task.plannedMinutes - currentCapacity;
            if (currentCapacity > 0) {
              await tx.studyPlanTask.update({
                where: { id: task.id },
                data: { plannedMinutes: currentCapacity }
              });
            } else {
              // Delete or mark as postponed
              // To cleanly recover, we can just delete from today or mark as MISSED immediately.
              // Deleting keeps today clean.
              await tx.studyPlanTask.delete({ where: { id: task.id } });
            }
            
            // Send trimmed amount to recovery
            uncompletedTasksToRecover.push({
              ...task,
              taskBacklog: amountTrimmed
            });
            currentCapacity = 0;
          }
        }

        if (uncompletedTasksToRecover.length > 0) {
          const recoveryOverloadPercent = plan.plannerRule.recoveryOverloadPercentage || 20;
          const maxOverloadPerDay = (plan.selectedDailyMinutes * recoveryOverloadPercent) / 100;
          
          await StudyPlanRecoveryService.distributeBacklog(tx, plan, uncompletedTasksToRecover, maxOverloadPerDay, addDays(today, 1));
          
          await tx.studyPlanHistory.create({
            data: {
              studyPlanId: plan.id,
              action: 'TEMPORARY_REDUCTION',
              description: `Reduced today's plan to \${newMinutes} mins. Distributed \${uncompletedTasksToRecover.reduce((acc, t) => acc + t.taskBacklog, 0)} mins as backlog.`
            }
          });
        }
      } else if (newMinutes > originalPlannedMinutes) {
        // We have extra time!
        const extraTime = newMinutes - originalPlannedMinutes;
        
        // Priority 1: Backlog (Handled manually by just letting them use it for backlog items that might exist on today? Actually, backlog is already spread)
        // Priority 2: New Concept Time.
        // Let's call a simplified generation block to pull more time.
        // For Phase 4, we'll just add a single generic "Additional Study Session" or extend existing concepts.
        const conceptTask = day.tasks.find(t => t.taskType === 'CONCEPT');
        if (conceptTask) {
           await tx.studyPlanTask.update({
              where: { id: conceptTask.id },
              data: { plannedMinutes: conceptTask.plannedMinutes + extraTime }
           });
        } else {
           await tx.studyPlanTask.create({
              data: {
                studyPlanDayId: day.id,
                studyPlanId: plan.id,
                taskType: StudyPlanTaskType.CONCEPT,
                plannedMinutes: extraTime,
                status: StudyPlanTaskStatus.PLANNED
              }
           });
        }
        
        await tx.studyPlanHistory.create({
            data: {
              studyPlanId: plan.id,
              action: 'TEMPORARY_ADDITION',
              description: `Increased today's plan to \${newMinutes} mins. Added \${extraTime} mins of additional study.`
            }
        });
      }

      return { success: true, message: "Applied temporary override." };
    });
  }

  /**
   * Permanently changes daily availability from a specific date forward.
   */
  static async applyPermanentChange(planId: string, newMinutes: number, effectiveDate: Date) {
    const startOfEffective = startOfDay(effectiveDate);

    await prisma.$transaction(async (tx) => {
      const plan = await tx.studentStudyPlan.findUnique({
        where: { id: planId }
      });
      if (!plan) throw new Error("Plan not found");

      // 1. Update the overall configuration
      // We also need to scale dailyConceptMinutes, dailyRevisionMinutes, etc.
      const scalingFactor = newMinutes / plan.selectedDailyMinutes;
      const newConcept = Math.floor(plan.dailyConceptMinutes * scalingFactor);
      const newRevision = Math.floor(plan.dailyRevisionMinutes * scalingFactor);
      const newMcq = Math.floor(plan.dailyMcqMinutes * scalingFactor);
      const newCa = Math.floor(plan.dailyCurrentAffairsMinutes * scalingFactor);

      await tx.studentStudyPlan.update({
        where: { id: planId },
        data: {
          selectedDailyMinutes: newMinutes,
          dailyConceptMinutes: newConcept,
          dailyRevisionMinutes: newRevision,
          dailyMcqMinutes: newMcq,
          dailyCurrentAffairsMinutes: newCa
        }
      });

      // 2. Delete all future planned days
      await tx.studyPlanDay.deleteMany({
        where: { 
          studyPlanId: planId, 
          date: { gte: startOfEffective },
          status: { in: [StudyPlanTaskStatus.PLANNED, StudyPlanTaskStatus.DRAFT] }
        }
      });

      // 3. The next cron or API call will naturally invoke generateInitial30DayPlan
      // For immediate effect, we'll invoke it here directly using the shared logic if we exported it,
      // but typically we can just call the public method (it spawns its own transaction).
      // Since we are in a transaction here, we should probably not invoke it inside the same tx if it uses its own.
      
      await tx.studyPlanHistory.create({
          data: {
            studyPlanId: plan.id,
            action: 'PERMANENT_CHANGE',
            description: `Changed normal daily target from \${plan.selectedDailyMinutes} to \${newMinutes} mins.`
          }
      });
    });
    
    // Call Generation after the transaction commits
    await StudyPlanGenerationService.generateInitial30DayPlan(planId, effectiveDate);
    return { success: true, message: "Applied permanent change and regenerated future plan." };
  }
}
