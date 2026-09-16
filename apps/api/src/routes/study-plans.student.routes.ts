import { Router, Response } from 'express';
import { PrismaClient } from '@study-karnataka/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { StudyPlannerService } from '../services/study-planner.service';
import { StudyPlanGenerationService } from '../services/study-plan-generation.service';

const router = Router();
const prisma = new PrismaClient();

// 0. GET /api/v1/student/study-plans/available-exams (Get exams with active templates)
router.get('/available-exams', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    // Find all templates that are active and include their exam cycle
    const templates = await prisma.studyPlanTemplate.findMany({
      where: { isActive: true },
      include: {
        examCycle: {
          include: {
            programme: true
          }
        }
      }
    });

    // Extract unique exam cycles
    const availableExams = Array.from(new Map(
      templates
        .filter(t => t.examCycle) // Ensure it exists
        .map(t => [t.examCycleId, t.examCycle])
    ).values());

    res.json(sendSuccess(availableExams));
  } catch (error: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', error.message));
  }
});

// 1. GET /api/v1/student/study-plans/active (Get student's active plan)
router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const plan = await prisma.studentStudyPlan.findFirst({
      where: { 
        studentId: req.user.userId,
        status: 'ACTIVE'
      },
      include: {
        examCycle: {
          include: {
            programme: true
          }
        },
        plannerRule: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!plan) {
      res.status(404).json(sendError('NOT_FOUND', 'No active study plan found'));
      return;
    }

    res.json(sendSuccess(plan));
  } catch (error: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', error.message));
  }
});

// 2. GET /api/v1/student/study-plans/active/weekly (Get current week's tasks)
router.get('/active/weekly', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const plan = await prisma.studentStudyPlan.findFirst({
      where: { 
        studentId: req.user.userId,
        status: 'ACTIVE'
      }
    });

    if (!plan) {
      res.status(404).json(sendError('NOT_FOUND', 'No active study plan found'));
      return;
    }

    // Get the days and tasks (next 7 days from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = await prisma.studyPlanDay.findMany({
      where: { 
        studyPlanId: plan.id,
        date: {
          gte: today
        }
      },
      include: {
        tasks: {
          include: {
            topic: true // Include the topic details to know what concept is being studied
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { date: 'asc' },
      take: 7
    });

    res.json(sendSuccess(days));
  } catch (error: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', error.message));
  }
});

// 3. POST /api/v1/student/study-plans (Create a new plan for the student)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const { 
      examCycleId, 
      planStartDate 
    } = req.body;

    if (!examCycleId || !planStartDate) {
      res.status(400).json(sendError('BAD_REQUEST', 'Missing required fields for plan'));
      return;
    }

    const start = new Date(planStartDate);
    
    const examCycle = await prisma.examCycle.findUnique({
      where: { id: examCycleId }
    });

    if (!examCycle || !examCycle.examDate) {
      res.status(400).json(sendError('BAD_REQUEST', 'Exam cycle not found or missing exam date'));
      return;
    }
    
    const exam = new Date(examCycle.examDate);

    // Identify Template for the Exam Cycle
    const template = await prisma.studyPlanTemplate.findFirst({
      where: { 
        examCycleId: examCycleId,
        isActive: true
      },
      include: {
        plannerRule: true
      }
    });

    if (!template) {
      res.status(400).json(sendError('BAD_REQUEST', 'Study plan configuration is not available for this exam yet. Please contact administration.'));
      return;
    }

    const rule = template.plannerRule;
    const selectedDailyMinutes = template.defaultDailyMinutes;
    const totalTopics = template.totalTopics;

    const distribution = StudyPlannerService.calculateScaledDistribution(rule, selectedDailyMinutes);
    const feasibility = StudyPlannerService.calculateFeasibility(start, exam, distribution.conceptMinutes, rule.conceptTargetMinutes, totalTopics || undefined);
    
    const adjustedConceptTargetMinutes = totalTopics && totalTopics > 0 
      ? Math.round((totalTopics / 2000) * rule.conceptTargetMinutes) 
      : rule.conceptTargetMinutes;

    // Create the plan
    const plan = await prisma.studentStudyPlan.create({
      data: {
        studentId: req.user.userId,
        examCycleId,
        plannerRuleId: rule.id,
        planStartDate: start,
        examDate: exam,
        remainingDaysAtCreation: feasibility.daysRemaining,
        selectedDailyMinutes,
        recommendedDailyMinutes: rule.recommendedDailyMinutes,
        conceptTargetMinutes: adjustedConceptTargetMinutes,
        dailyConceptMinutes: distribution.conceptMinutes,
        dailyRevisionMinutes: distribution.revisionMinutes,
        dailyMcqMinutes: distribution.mcqMinutes,
        dailyCurrentAffairsMinutes: distribution.currentAffairsMinutes,
        dailyBufferMinutes: distribution.bufferMinutes,
        estimatedConceptCompletionDays: feasibility.estimatedConceptCompletionDays,
        estimatedConceptCompletionDate: feasibility.estimatedConceptCompletionDate,
        coverageStatus: feasibility.coverageStatus,
        status: 'ACTIVE',
      }
    });

    // Auto-generate the 30-day schedule
    await StudyPlanGenerationService.generateInitial30DayPlan(plan.id, start);

    res.json(sendSuccess(plan));
  } catch (error: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', error.message));
  }
});

export default router;
