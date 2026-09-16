import { PrismaClient, StudentStudyPlan, StudyPlanDay, StudyPlanLifecycleStatus, StudyPlanTaskStatus, StudyPlannerRule, StudyPlanTaskType } from '@study-karnataka/database';
import { StudyPlanGenerationService } from './study-plan-generation.service';
import { addDays, differenceInDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

export class StudyPlanRecoveryService {
  
  /**
   * Evaluates the progress and applies Light Recovery or triggers Full Replan.
   */
  static async evaluateAndRecover(studyPlanId: string) {
    const plan = await prisma.studentStudyPlan.findUnique({
      where: { id: studyPlanId },
      include: { plannerRule: true }
    });

    if (!plan) throw new Error("Plan not found");
    if (plan.status !== StudyPlanLifecycleStatus.ACTIVE) return { action: 'NONE', message: 'Plan is not active.' };

    return await prisma.$transaction(async (tx) => {
      const today = startOfDay(new Date());

      const missedDays = await tx.studyPlanDay.findMany({
        where: {
          studyPlanId: plan.id,
          date: { lt: today },
          status: { in: [StudyPlanTaskStatus.PLANNED, StudyPlanTaskStatus.DRAFT] }
        },
        include: { tasks: true }
      });

      if (missedDays.length === 0) {
        return { action: 'NONE', message: 'No missed days detected.' };
      }

      let totalBacklogMinutes = 0;
      let significantDaysMissed = 0;
      
      const uncompletedTasksToRecover = [];

      for (const day of missedDays) {
        let dayBacklog = day.plannedMinutes - day.completedMinutes;
        
        if (dayBacklog > 0) {
          totalBacklogMinutes += dayBacklog;
          if (dayBacklog > day.plannedMinutes * 0.5) { 
            significantDaysMissed++;
          }
        }

        await tx.studyPlanDay.update({
          where: { id: day.id },
          data: {
            status: day.completedMinutes > 0 ? StudyPlanTaskStatus.PARTIAL : StudyPlanTaskStatus.MISSED,
            backlogMinutes: dayBacklog
          }
        });
        
        for (const task of day.tasks) {
          if (task.completedMinutes < task.plannedMinutes) {
            const taskBacklog = task.plannedMinutes - task.completedMinutes;
            await tx.studyPlanTask.update({
              where: { id: task.id },
              data: { status: task.completedMinutes > 0 ? StudyPlanTaskStatus.PARTIAL : StudyPlanTaskStatus.MISSED }
            });
            uncompletedTasksToRecover.push({ ...task, taskBacklog });
          } else {
             // For safety, ensure it's marked completed if math matched but status didn't
             await tx.studyPlanTask.update({
               where: { id: task.id },
               data: { status: StudyPlanTaskStatus.COMPLETED }
             });
          }
        }
      }

      // 1. Check if we need a FULL_REPLAN
      const recoveryOverloadPercent = plan.plannerRule.recoveryOverloadPercentage || 20;
      const maxOverloadPerDay = (plan.selectedDailyMinutes * recoveryOverloadPercent) / 100;
      
      const maxRecoverableBacklog = maxOverloadPerDay * 3; // spread over 3 days max safely

      if (significantDaysMissed > 3 || totalBacklogMinutes > maxRecoverableBacklog) {
        return await this.triggerFullReplan(tx, plan, totalBacklogMinutes);
      }

      // 2. Light Recovery 
      await this.distributeBacklog(tx, plan, uncompletedTasksToRecover, maxOverloadPerDay, today);

      await tx.studyPlanHistory.create({
        data: {
          studyPlanId: plan.id,
          action: 'LIGHT_RECOVERY',
          description: `Distributed backlog across upcoming days preserving original task metadata.`
        }
      });

      return { action: 'LIGHT_RECOVERY', message: 'Applied light recovery.' };
    });
  }

  
  static async distributeBacklog(tx: any, plan: any, uncompletedTasksToRecover: any[], maxOverloadPerDay: number, today: Date) {
      const upcomingDays = await tx.studyPlanDay.findMany({
        where: { studyPlanId: plan.id, date: { gte: today }, status: StudyPlanTaskStatus.PLANNED },
        orderBy: { date: 'asc' },
        take: 3
      });

      let taskIndex = 0;
      let remainingTaskBacklog = uncompletedTasksToRecover.length > 0 ? uncompletedTasksToRecover[0].taskBacklog : 0;

      for (const upcomingDay of upcomingDays) {
        let spaceAvailable = maxOverloadPerDay; 
        
        while (spaceAvailable > 0 && taskIndex < uncompletedTasksToRecover.length) {
          const originalTask = uncompletedTasksToRecover[taskIndex];
          const amountToOverload = Math.min(spaceAvailable, remainingTaskBacklog);
          
          if (amountToOverload > 0) {
            await tx.studyPlanDay.update({
              where: { id: upcomingDay.id },
              data: { plannedMinutes: upcomingDay.plannedMinutes + amountToOverload }
            });

            await tx.studyPlanTask.create({
              data: {
                studyPlanDayId: upcomingDay.id,
                studyPlanId: plan.id,
                taskType: originalTask.taskType, // Keep original task type for conceptual tracking
                topicId: originalTask.topicId,
                parentSubjectId: originalTask.parentSubjectId,
                mcqTestId: originalTask.mcqTestId,
                originalConceptTaskId: originalTask.id, // Linking back
                plannedMinutes: amountToOverload,
                status: StudyPlanTaskStatus.PLANNED,
                isRecovery: true
              }
            });

            spaceAvailable -= amountToOverload;
            remainingTaskBacklog -= amountToOverload;
          }
          
          if (remainingTaskBacklog <= 0) {
            taskIndex++;
            if (taskIndex < uncompletedTasksToRecover.length) {
              remainingTaskBacklog = uncompletedTasksToRecover[taskIndex].taskBacklog;
            }
          }
        }
      }
  }

  private static async triggerFullReplan(tx: any, plan: any, totalBacklogMinutes: number) {
    const today = startOfDay(new Date());

    const completedTasks = await tx.studyPlanTask.aggregate({
      where: { studyPlanId: plan.id, taskType: StudyPlanTaskType.CONCEPT, status: StudyPlanTaskStatus.COMPLETED },
      _sum: { completedMinutes: true }
    });

    const completedConceptMinutes = completedTasks._sum.completedMinutes || 0;
    const remainingConceptMinutes = Math.max(0, plan.conceptTargetMinutes - completedConceptMinutes);

    const remainingConceptDays = Math.ceil(remainingConceptMinutes / plan.dailyConceptMinutes);
    const examDate = startOfDay(new Date(plan.examDate));
    const remainingDaysToExam = differenceInDays(examDate, today);

    let newCoverageStatus = 'TIGHT_COVERAGE';
    const SAFETY_MARGIN = 15;
    
    if (remainingConceptDays > remainingDaysToExam) {
      newCoverageStatus = 'COMPRESSED_COVERAGE';
    } else if (remainingConceptDays <= remainingDaysToExam - SAFETY_MARGIN) {
      newCoverageStatus = 'FULL_COVERAGE';
    }

    const newEstimatedDate = addDays(today, remainingConceptDays);

    await tx.studentStudyPlan.update({
      where: { id: plan.id },
      data: {
        coverageStatus: newCoverageStatus,
        estimatedConceptCompletionDays: remainingConceptDays,
        estimatedConceptCompletionDate: newEstimatedDate,
        status: StudyPlanLifecycleStatus.ACTIVE
      }
    });

    // Instead of deleting future days, mark them REPLANNED to preserve history
    await tx.studyPlanDay.updateMany({
      where: { studyPlanId: plan.id, date: { gte: today }, status: { in: [StudyPlanTaskStatus.PLANNED, StudyPlanTaskStatus.DRAFT] } },
      data: { status: StudyPlanTaskStatus.REPLANNED }
    });
    
    await tx.studyPlanTask.updateMany({
      where: { studyPlanId: plan.id, studyPlanDay: { date: { gte: today } }, status: { in: [StudyPlanTaskStatus.PLANNED, StudyPlanTaskStatus.DRAFT] } },
      data: { status: StudyPlanTaskStatus.REPLANNED }
    });

    await tx.studyPlanHistory.create({
      data: {
        studyPlanId: plan.id,
        action: 'FULL_REPLAN',
        description: `Triggered full replan due to significant backlog or missed days.`
      }
    });
    
    return { action: 'FULL_REPLAN', message: 'Full replan triggered and future schedule marked superseded.' };
  }
}
