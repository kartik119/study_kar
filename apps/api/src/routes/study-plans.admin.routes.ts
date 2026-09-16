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
      totalTopics
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
    const feasibility = StudyPlannerService.calculateFeasibility(start, exam, distribution.conceptMinutes, rule.conceptTargetMinutes, totalTopics);
    
    const adjustedConceptTargetMinutes = totalTopics && totalTopics > 0 
      ? Math.round((totalTopics / 2000) * rule.conceptTargetMinutes) 
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
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Just limiting for admin view initially
    });
    res.json({ success: true, data: plans });
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
