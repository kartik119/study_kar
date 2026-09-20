// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@study-karnataka/database';
import { StudyPlannerService } from '../services/study-planner.service';
import { StudyPlanGenerationService } from '../services/study-plan-generation.service';
import { StudyPlanRecoveryService } from '../services/study-plan-recovery.service';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// RULES
// ==========================================

router.get('/rules', async (req, res) => {
  try {
    const rules = await prisma.studyPlannerRule.findMany({
      orderBy: { priority: 'asc' },
    });
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const rule = await prisma.studyPlannerRule.create({
      data: req.body
    });
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await prisma.studyPlannerRule.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// TEMPLATES
// ==========================================

router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.studyPlanTemplate.findMany({
      include: {
        examCycle: {
          include: {
            programme: { include: { authority: true } }
          }
        },
        plannerRule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await prisma.studyPlanTemplate.create({
      data: req.body
    });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await prisma.studyPlanTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await prisma.studyPlanTemplate.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// CREATE PLAN FLOW (PREVIEW)
// ==========================================

router.post('/calculate-preview', async (req, res) => {
  try {
    const { planStartDate, examDate, selectedDailyMinutes, totalTopics, forceRuleId } = req.body;

    if (!planStartDate || !examDate || !selectedDailyMinutes) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const start = new Date(planStartDate);
    const exam = new Date(examDate);

    // 1. Identify Rule
    let rule;
    if (forceRuleId) {
      rule = await prisma.studyPlannerRule.findUnique({ where: { id: forceRuleId } });
    } else {
      rule = await StudyPlannerService.getApplicableRule(start, exam);
    }
    
    if (!rule) {
      return res.status(400).json({ 
        success: false, 
        message: 'No study rule exists for this timeframe. Please contact administration or adjust dates.' 
      });
    }

    // 2. Scale Distribution
    const distribution = StudyPlannerService.calculateScaledDistribution(rule, selectedDailyMinutes);

    // 3. Feasibility
    const feasibility = StudyPlannerService.calculateFeasibility(
      start, 
      exam, 
      distribution.conceptMinutes, 
      rule.conceptTargetMinutes,
      totalTopics,
      selectedDailyMinutes,
      rule.recommendedDailyMinutes
    );

    res.json({
      success: true,
      data: {
        rule,
        distribution,
        feasibility
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/simulate', async (req: any, res: any) => {
  try {
    const { templateId, planStartDate, selectedDailyMinutes } = req.body;

    if (!templateId || !planStartDate || !selectedDailyMinutes) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const template = await prisma.studyPlanTemplate.findUnique({
      where: { id: templateId },
      include: { examCycle: true }
    });

    const start = new Date(planStartDate);
    const exam = new Date(req.body.examDate || template?.targetExamDate || template?.examCycle?.tentativeExamDate);
    
    if (isNaN(exam.getTime())) {
      return res.status(400).json({ success: false, message: 'Missing or invalid exam date for simulation. Please provide an exam date.' });
    }

    const rule = await prisma.studyPlannerRule.findUnique({ where: { id: template.plannerRuleId } }) 
      || await StudyPlannerService.getApplicableRule(start, exam);

    if (!rule) throw new Error("No applicable rule found");

    const distribution = StudyPlannerService.calculateScaledDistribution(rule, selectedDailyMinutes);
    const totalTopics = template.totalTopics || 0;
    const feasibility = StudyPlannerService.calculateFeasibility(start, exam, distribution.conceptMinutes, rule.conceptTargetMinutes, totalTopics, selectedDailyMinutes, rule.recommendedDailyMinutes);

    const adjustedConceptTargetMinutes = totalTopics > 0 
      ? Math.round((totalTopics / 2000) * rule.conceptTargetMinutes * (selectedDailyMinutes > rule.recommendedDailyMinutes ? selectedDailyMinutes / rule.recommendedDailyMinutes : 1)) 
      : rule.conceptTargetMinutes;

    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return res.status(400).json({ success: false, message: 'System requires at least one user to run simulation' });
    }

    // Create temporary plan
    const plan = await prisma.studentStudyPlan.create({
      data: {
        studentId: firstUser.id,
        examCycleId: template.examCycleId,
        templateId: template.id,
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
        estimatedConceptCompletionDays: feasibility.estimatedConceptCompletionDays,
        estimatedConceptCompletionDate: feasibility.estimatedConceptCompletionDate,
        coverageStatus: feasibility.coverageStatus,
        status: 'ACTIVE',
      }
    });

    // Generate 30 days
    await StudyPlanGenerationService.generateInitial30DayPlan(plan.id, start);

    // Fetch generated days & tasks
    const days = await prisma.studyPlanDay.findMany({
      where: { studyPlanId: plan.id },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { date: 'asc' },
      take: 30
    });

    const topicIds = new Set<string>();
    days.forEach(day => day.tasks.forEach(task => {
      if (task.topicId && !task.topicId.startsWith('dummy-topic-')) {
        topicIds.add(task.topicId);
      }
    }));

    const topics = await prisma.examSyllabusNode.findMany({
      where: { id: { in: Array.from(topicIds) } },
      select: { id: true, nameEn: true }
    });
    
    const topicMap = new Map(topics.map(t => [t.id, t.nameEn]));

    const enrichedDays = days.map(day => ({
      ...day,
      tasks: day.tasks.map(task => ({
        ...task,
        topic: task.topicId 
          ? { title: task.topicId.startsWith('dummy-topic-') 
              ? `Concept ${task.topicId.replace('dummy-topic-', '')}` 
              : (topicMap.get(task.topicId) || 'Unknown Topic') 
            } 
          : null
      }))
    }));

    const totalTopicsCount = template.totalTopics || 0;
    
    // Calculate how many minutes to assign per topic using the RECOMMENDED baseline.
    // This ensures that minsPerTopic is fixed, so if the user simulates fewer hours,
    // they actually cover fewer topics per day. We also exclude Sundays (~1/7th of days).
    const baselineDistribution = StudyPlannerService.calculateScaledDistribution(rule, rule.recommendedDailyMinutes);
    const studyDaysRemaining = Math.floor(feasibility.daysRemaining * (6 / 7));
    const totalBaselineConceptMins = studyDaysRemaining * baselineDistribution.conceptMinutes;
    const minsPerTopic = totalTopicsCount > 0 ? totalBaselineConceptMins / totalTopicsCount : 0;
    
    let runningMins = 0;
    let currentTopicIndex = 1;

    const finalDays = enrichedDays.map(day => ({
      ...day,
      tasks: day.tasks.map(task => {
        const t = { ...task } as any;
        if (t.taskType === 'CONCEPT' && totalTopicsCount > 0 && !t.topic) {
           let previousRunning = runningMins;
           runningMins += t.plannedMinutes;
           // Find how many concepts are covered in this session
           const targetIndex = Math.min(totalTopicsCount, Math.floor(runningMins / minsPerTopic) + 1);
           
           const topicsCovered = [];
           while (currentTopicIndex <= targetIndex && currentTopicIndex <= totalTopicsCount) {
             topicsCovered.push(`Concept ${currentTopicIndex}`);
             currentTopicIndex++;
           }
           if (topicsCovered.length > 0) {
             t.mockTopics = topicsCovered;
           }
        }
        return t;
      })
    }));

    // Clean up temporary plan
    await prisma.studentStudyPlan.delete({ where: { id: plan.id } });

    res.json({ success: true, data: { days: finalDays, feasibility } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SAVE PLAN
// ==========================================

router.post('/', async (req, res) => {
  try {
    const { 
      studentId, 
      examCycleId, 
      planStartDate, 
      examDate, 
      selectedDailyMinutes,
      templateId,
      examStageId,
      totalTopics,
      forceRuleId
    } = req.body;

    if (!studentId || !examCycleId || !planStartDate || !examDate || !selectedDailyMinutes) {
      return res.status(400).json({ success: false, message: 'Missing required fields for plan' });
    }

    const start = new Date(planStartDate);
    const exam = new Date(examDate);

    // Re-verify logic on backend before saving
    let rule;
    if (forceRuleId) {
      rule = await prisma.studyPlannerRule.findUnique({ where: { id: forceRuleId } });
    } else {
      rule = await StudyPlannerService.getApplicableRule(start, exam);
    }
    if (!rule) throw new Error("No applicable rule found for these dates or ID");

    const distribution = StudyPlannerService.calculateScaledDistribution(rule, selectedDailyMinutes);
    const feasibility = StudyPlannerService.calculateFeasibility(start, exam, distribution.conceptMinutes, rule.conceptTargetMinutes, totalTopics, selectedDailyMinutes, rule.recommendedDailyMinutes);
    
    const adjustedConceptTargetMinutes = totalTopics && totalTopics > 0 
      ? Math.round((totalTopics / 2000) * rule.conceptTargetMinutes * (selectedDailyMinutes > rule.recommendedDailyMinutes ? selectedDailyMinutes / rule.recommendedDailyMinutes : 1)) 
      : rule.conceptTargetMinutes;

    const plan = await prisma.studentStudyPlan.create({
      data: {
        studentId,
        examCycleId,
        examStageId,
        templateId,
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

    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ASSIGNED PLANS LIST
// ==========================================

router.get('/assigned', async (req, res) => {
  try {
    const plans = await prisma.studentStudyPlan.findMany({
      include: {
        student: true,
        examCycle: {
          include: {
            programme: { include: { authority: true } }
          }
        },
        plannerRule: true,
        template: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Just limiting for admin view initially
    });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/assigned/:id/schedule', async (req, res) => {
  try {
    const days = await prisma.studyPlanDay.findMany({
      where: { 
        studyPlanId: req.params.id,
      },
      include: {
        tasks: {
          include: {
            topic: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { date: 'asc' },
      take: 7
    });
    res.json({ success: true, data: days });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/assigned/:id', async (req, res) => {
  try {
    const { 
      status, 
      planStartDate, 
      examDate, 
      selectedDailyMinutes,
      coverageStatus,
      dailyConceptMinutes,
      dailyRevisionMinutes,
      dailyMcqMinutes,
      dailyCurrentAffairsMinutes
    } = req.body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (planStartDate) dataToUpdate.planStartDate = new Date(planStartDate);
    if (examDate) dataToUpdate.examDate = new Date(examDate);
    if (selectedDailyMinutes !== undefined) dataToUpdate.selectedDailyMinutes = Number(selectedDailyMinutes);
    if (coverageStatus) dataToUpdate.coverageStatus = coverageStatus;
    if (dailyConceptMinutes !== undefined) dataToUpdate.dailyConceptMinutes = Number(dailyConceptMinutes);
    if (dailyRevisionMinutes !== undefined) dataToUpdate.dailyRevisionMinutes = Number(dailyRevisionMinutes);
    if (dailyMcqMinutes !== undefined) dataToUpdate.dailyMcqMinutes = Number(dailyMcqMinutes);
    if (dailyCurrentAffairsMinutes !== undefined) dataToUpdate.dailyCurrentAffairsMinutes = Number(dailyCurrentAffairsMinutes);

    const plan = await prisma.studentStudyPlan.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/assigned/:id', async (req, res) => {
  try {
    await prisma.studentStudyPlan.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GENERATION & RECOVERY
// ==========================================

router.post('/:id/generate', async (req, res) => {
  try {
    const result = await StudyPlanGenerationService.generateInitial30DayPlan(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/evaluate-progress', async (req, res) => {
  try {
    const result = await StudyPlanRecoveryService.evaluateAndRecover(req.params.id);
    // If FULL_REPLAN was returned, we could trigger generation here automatically
    if (result?.action === 'FULL_REPLAN') {
       await StudyPlanGenerationService.generateInitial30DayPlan(req.params.id);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
