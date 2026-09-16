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
        plannerRule: true
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
          where: { examSyllabusId: syllabusId, nodeType: { in: ['SUBJECT', 'TOPIC'] }, isActive: true },
          include: { planningMetadata: true },
          orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }]
        });
      }

      const totalTopics = topics.length > 0 ? topics.length : 1;
      
      
      // Generate the Session Queue using Academic Allocation Service
      const sessionQueue = StudyPlanAcademicAllocationService.generateSessionQueue(plan as any, plan.plannerRule, topics as any);
      
      // Calculate how many minutes of Concept have been allocated (completed + planned)
      const conceptAgg = await tx.studyPlanTask.aggregate({
        where: { studyPlanId: plan.id, taskType: StudyPlanTaskType.CONCEPT },
        _sum: { plannedMinutes: true }
      });
      const totalConceptAllocated = conceptAgg._sum.plannedMinutes || 0;

      // Fast-forward through the queue to find our current position
      let currentSessionIndex = 0;
      let remainingMinutesForCurrentSession = 0;
      
      let consumed = 0;
      for (let i = 0; i < sessionQueue.length; i++) {
        const session = sessionQueue[i];
        if (consumed + session.plannedMinutes > totalConceptAllocated) {
          currentSessionIndex = i;
          remainingMinutesForCurrentSession = session.plannedMinutes - (totalConceptAllocated - consumed);
          break;
        }
        consumed += session.plannedMinutes;
      }
      
      const planStart = startOfDay(new Date(plan.planStartDate));
      const daysSinceStart = differenceInDays(today, planStart);
      const startingDayOffset = Math.max(0, daysSinceStart);

      // Remaining days to exam
      const remainingDaysToExam = differenceInDays(examDate, today);
      if (remainingDaysToExam < 0) {
        return { success: false, message: "Exam date has passed.", daysGenerated: 0 };
      }

      const daysToGenerate = Math.min(30, remainingDaysToExam); // Never generate past examDate

      for (let i = 0; i < daysToGenerate; i++) {
        const currentDate = addDays(today, i);
        const dayNumber = startingDayOffset + i + 1;
        
        let day = await tx.studyPlanDay.findFirst({
          where: { studyPlanId: plan.id, date: currentDate }
        });
        
        if (day) continue;

        day = await tx.studyPlanDay.create({
          data: {
            studyPlanId: plan.id,
            date: currentDate,
            dayNumber: dayNumber,
            weekNumber: Math.floor(dayNumber / 7) + 1,
            plannedMinutes: plan.selectedDailyMinutes,
            status: StudyPlanTaskStatus.PLANNED,
          }
        });

// ==========================================
        // 1. CONCEPT STUDY
        // ==========================================
        let dailyConceptToAllocate = plan.dailyConceptMinutes;
        const assignedTopicIds: string[] = [];
        
        while (dailyConceptToAllocate > 0 && currentSessionIndex < sessionQueue.length) {
          const allocateToThisSession = Math.min(dailyConceptToAllocate, remainingMinutesForCurrentSession);
          const currentSession = sessionQueue[currentSessionIndex];

          if (allocateToThisSession > 0) {
            await tx.studyPlanTask.create({
              data: {
                studyPlanDayId: day.id,
                studyPlanId: plan.id,
                taskType: StudyPlanTaskType.CONCEPT,
                plannedMinutes: allocateToThisSession,
                topicId: currentSession.topicId,
                parentSubjectId: currentSession.parentSubjectId,
                sessionNumber: currentSession.sessionNumber,
                totalSessions: currentSession.totalSessions,
                status: StudyPlanTaskStatus.PLANNED
              }
            });
            assignedTopicIds.push(currentSession.topicId);
          }

          dailyConceptToAllocate -= allocateToThisSession;
          remainingMinutesForCurrentSession -= allocateToThisSession;

          if (remainingMinutesForCurrentSession <= 0) {
            currentSessionIndex++;
            if (currentSessionIndex < sessionQueue.length) {
              remainingMinutesForCurrentSession = sessionQueue[currentSessionIndex].plannedMinutes;
            }
          }
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
    });
  }
}
