// @ts-nocheck
import { PrismaClient, StudentStudyPlan, StudyPlanTaskType, StudyPlanTaskStatus, StudyPlanLifecycleStatus, ExamSyllabusNodeType } from '@study-karnataka/database';
import { addDays, differenceInDays, startOfDay } from 'date-fns';
import { StudyPlanAcademicAllocationService } from './study-plan-academic-allocation.service';

const prisma = new PrismaClient();

export class StudyPlanGenerationService {
  /**
   * Generates the 30-day master plan for an active Study Plan.
   */
  static async generateInitial30DayPlan(studyPlanId: string, startDateOverride?: Date) {
    const plan = await prisma.studentStudyPlan.findUnique({
      where: { id: studyPlanId },
      include: {
        examCycle: {
          include: {
            syllabi: {
              where: { isCurrent: true, status: 'PUBLISHED' },
            }
          }
        },
        plannerRule: true,
        template: true
      }
    });

    if (!plan) throw new Error("Study plan not found");
    if (plan.status !== StudyPlanLifecycleStatus.ACTIVE) throw new Error("Plan must be ACTIVE to generate tasks");

    return await prisma.$transaction(async (tx) => {
      const today = startOfDay(startDateOverride || new Date());
      const examDate = startOfDay(new Date(plan.examDate));

      // 1. Guard removed to allow seamless regeneration

      // 2. Syllabus Topics (with fallback for duration)
      let syllabusId = plan.examCycle.syllabi?.[0]?.id;
      let topics: any[] = [];
      
      if (syllabusId) {
        topics = await tx.examSyllabusNode.findMany({
          where: { examSyllabusId: syllabusId, isActive: true },
          include: { planningMetadata: true },
          orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }]
        });
      }

      const totalTopics = topics.length > 0 ? topics.length : 1;
      
      
      // Calculate how many topics have ACTUALLY been completed
      const conceptCount = await tx.studyPlanTask.count({
        where: { studyPlanId: plan.id, taskType: StudyPlanTaskType.CONCEPT, status: StudyPlanTaskStatus.COMPLETED }
      });
      
      // Delete any UNCOMPLETED concept tasks from the PAST so they can be pushed to the backlog
      await tx.studyPlanTask.deleteMany({
        where: {
          studyPlanId: plan.id,
          taskType: StudyPlanTaskType.CONCEPT,
          status: { in: [StudyPlanTaskStatus.PLANNED, StudyPlanTaskStatus.MISSED] },
          studyPlanDay: { date: { lt: startOfDay(today) } }
        }
      });
      
      // Delete all concept tasks from TODAY onwards so we can completely regenerate cleanly
      await tx.studyPlanTask.deleteMany({
        where: {
          studyPlanId: plan.id,
          taskType: StudyPlanTaskType.CONCEPT,
          studyPlanDay: { date: { gte: startOfDay(today) } }
        }
      });
      
      // The starting point for today is exactly what we have successfully completed so far
      let currentSessionIndex = conceptCount;
      // Generate the Session Queue using Academic Allocation Service
      const sessionQueue = StudyPlanAcademicAllocationService.generateSessionQueue(plan as any, plan.plannerRule, topics as any);
      
      const planStart = startOfDay(new Date(plan.planStartDate));
      const daysSinceStart = differenceInDays(today, planStart);
      
      let studyDayCounter = 0;
      if (daysSinceStart > 0) {
        for (let d = planStart; d < today; d = addDays(d, 1)) {
          if (d.getDay() !== 0) studyDayCounter++;
        }
      }

      // Remaining days to exam
      const remainingDaysToExam = differenceInDays(examDate, today);
      if (remainingDaysToExam < 0) {
        return { success: false, message: "Exam date has passed.", daysGenerated: 0 };
      }

      const daysToGenerate = remainingDaysToExam; // Generate all days until exam

      for (let i = 0; i < daysToGenerate; i++) {
        const currentDate = addDays(today, i);
        
        // Skip Sundays
        if (currentDate.getDay() === 0) {
          continue;
        }

        studyDayCounter++;
        const dayNumber = studyDayCounter;
        
        let day = await tx.studyPlanDay.findFirst({
          where: { studyPlanId: plan.id, date: currentDate }
        });
        
        if (day) continue;

        day = await tx.studyPlanDay.create({
          data: {
            studyPlanId: plan.id,
            date: currentDate,
            dayNumber: dayNumber,
            weekNumber: Math.floor((dayNumber - 1) / 6) + 1,
            plannedMinutes: plan.selectedDailyMinutes,
            status: StudyPlanTaskStatus.PLANNED,
          }
        });

// ==========================================
        // 1. CONCEPT STUDY (Day-based pacing algorithm)
        // ==========================================
        const totalTopicsCount = topics.length > 0 ? topics.length : 1;
        const totalDaysRemaining = differenceInDays(new Date(plan.examDate), new Date(plan.planStartDate));
        const studyDaysRemaining = Math.max(1, Math.floor(totalDaysRemaining * (6 / 7)));
        const revisionDays = Math.floor(studyDaysRemaining * 0.30);
        const conceptDays = Math.max(1, studyDaysRemaining - revisionDays);
        let dailyConceptToAllocate = plan.dailyConceptMinutes;
        const assignedTopicIds: string[] = [];
        
        let baseTopicsThisDay = 0;
        let expectedTotalByToday = 0;
        
        if (totalTopicsCount <= conceptDays) {
            baseTopicsThisDay = dayNumber <= totalTopicsCount ? 1 : 0;
            expectedTotalByToday = Math.min(dayNumber, totalTopicsCount);
        } else {
            const fixedTopicsPerDay = Math.floor(totalTopicsCount / conceptDays);
            const remainder = totalTopicsCount % conceptDays;
            const daysAtFixedPace = conceptDays - remainder;

            if (dayNumber <= daysAtFixedPace) {
                baseTopicsThisDay = fixedTopicsPerDay;
                expectedTotalByToday = dayNumber * fixedTopicsPerDay;
            } else {
                baseTopicsThisDay = fixedTopicsPerDay + 1;
                expectedTotalByToday = (daysAtFixedPace * fixedTopicsPerDay) + ((dayNumber - daysAtFixedPace) * (fixedTopicsPerDay + 1));
            }
        }
        
        // The backlog is how far behind reality is from the mathematical ideal
        const backlog = expectedTotalByToday - currentSessionIndex - baseTopicsThisDay;
        
        let topicsThisDay = baseTopicsThisDay;
        if (backlog > 0) {
            // Smart Cramming: Allow up to 1 extra topic from backlog per day to catch up
            const catchupTopics = Math.min(1, backlog);
            topicsThisDay += catchupTopics;
        }
        
        const actualTopicsThisDay = Math.min(topicsThisDay, sessionQueue.length - currentSessionIndex);
        if (actualTopicsThisDay === 0) {
            dailyConceptToAllocate = 0;
        }
        const minsPerTopic = actualTopicsThisDay > 0 ? Math.floor(dailyConceptToAllocate / actualTopicsThisDay) : dailyConceptToAllocate;
        
        let topicsAllocatedToday = 0;
        
        while (topicsAllocatedToday < topicsThisDay && currentSessionIndex < sessionQueue.length) {
          const currentSession = sessionQueue[currentSessionIndex];

          await tx.studyPlanTask.create({
            data: {
              studyPlanDayId: day.id,
              studyPlanId: plan.id,
              taskType: StudyPlanTaskType.CONCEPT,
              plannedMinutes: minsPerTopic,
              topicId: currentSession.topicId,
              parentSubjectId: currentSession.parentSubjectId,
              sessionNumber: currentSession.sessionNumber,
              totalSessions: currentSession.totalSessions,
              status: StudyPlanTaskStatus.PLANNED
            }
          });
          
          assignedTopicIds.push(currentSession.topicId);
          dailyConceptToAllocate -= minsPerTopic;
          
          currentSessionIndex++;
          topicsAllocatedToday++;
        }
        
        // Generic block if concept time remains
        if (dailyConceptToAllocate > 0) {
          await tx.studyPlanTask.create({
            data: {
              studyPlanDayId: day.id,
              studyPlanId: plan.id,
              taskType: StudyPlanTaskType.CONCEPT,
              plannedMinutes: dailyConceptToAllocate,
              status: StudyPlanTaskStatus.PLANNED
            }
          });
        }
        
        // ==========================================
        // 2. REVISION (Session-Based)
        // ==========================================
        if (plan.dailyRevisionMinutes > 0) {
          // Find previously COMPLETED concept tasks to revise
          // Use interval targeting (e.g., sessions completed 1 day ago)
          
          let targetDate = addDays(currentDate, -(plan.plannerRule?.revisionInterval1 || 1));
          
          let completedConcepts = await tx.studyPlanTask.findMany({
            where: { 
              studyPlanId: plan.id, 
              taskType: StudyPlanTaskType.CONCEPT, 
              status: StudyPlanTaskStatus.COMPLETED, 
              topicId: { not: null },
              actualCompletionDate: {
                 gte: startOfDay(targetDate),
                 lte: startOfDay(addDays(targetDate, 1))
              }
            },
            take: 5
          });
          
          // Fallback if no exact match for that interval
          if (completedConcepts.length === 0) {
             completedConcepts = await tx.studyPlanTask.findMany({
                where: { 
                  studyPlanId: plan.id, 
                  taskType: StudyPlanTaskType.CONCEPT, 
                  status: StudyPlanTaskStatus.COMPLETED, 
                  topicId: { not: null }
                },
                orderBy: { updatedAt: 'desc' },
                take: 5
              });
          }

          const revisionTaskData = completedConcepts.length > 0 
            ? completedConcepts[Math.floor(Math.random() * completedConcepts.length)]
            : null;

          await tx.studyPlanTask.create({
            data: {
              studyPlanDayId: day.id,
              studyPlanId: plan.id,
              taskType: StudyPlanTaskType.REVISION,
              plannedMinutes: plan.dailyRevisionMinutes,
              topicId: revisionTaskData?.topicId || (assignedTopicIds.length > 0 ? assignedTopicIds[0] : null), // Fallback to same-day topic
              originalConceptTaskId: revisionTaskData?.id,
              status: StudyPlanTaskStatus.PLANNED,
            }
          });
        }

        // ==========================================
        // 3. MCQ (Session-Based Eligibility)
        // ==========================================
        if (plan.dailyMcqMinutes > 0) {
          // Can target the most recently completed session's topic
          let recentTopicId = assignedTopicIds.length > 0 ? assignedTopicIds[assignedTopicIds.length - 1] : null;
          
          if (!recentTopicId) {
             const lastCompleted = await tx.studyPlanTask.findFirst({
                where: { studyPlanId: plan.id, taskType: StudyPlanTaskType.CONCEPT, status: StudyPlanTaskStatus.COMPLETED, topicId: { not: null } },
                orderBy: { updatedAt: 'desc' }
             });
             recentTopicId = lastCompleted?.topicId || null;
          }
          
          let mcqTestId = null;

          if (recentTopicId) {
             const mcqNode = await tx.examSyllabusNode.findFirst({
               where: { id: recentTopicId },
               include: { mcqQuestions: { take: 1 } }
             });
             if (mcqNode?.mcqQuestions?.length) {
                mcqTestId = mcqNode.mcqQuestions[0].id; 
             }
          }

          await tx.studyPlanTask.create({
            data: {
              studyPlanDayId: day.id,
              studyPlanId: plan.id,
              taskType: StudyPlanTaskType.MCQ,
              plannedMinutes: plan.dailyMcqMinutes,
              topicId: recentTopicId,
              mcqTestId: mcqTestId, 
              status: StudyPlanTaskStatus.PLANNED
            }
          });
        }
        
        // ==========================================
        // 4. CURRENT AFFAIRS
        // ==========================================
        if (plan.dailyCurrentAffairsMinutes > 0) {
          await tx.studyPlanTask.create({
            data: {
              studyPlanDayId: day.id,
              studyPlanId: plan.id,
              taskType: StudyPlanTaskType.CURRENT_AFFAIRS,
              plannedMinutes: plan.dailyCurrentAffairsMinutes,
              status: StudyPlanTaskStatus.PLANNED
            }
          });
        }
      }

      return { success: true, daysGenerated: daysToGenerate };
    }, { timeout: 30000 });
  }
}
