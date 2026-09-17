// @ts-nocheck
import { Router, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import {
  CreateExamAuthoritySchema,
  UpdateExamAuthoritySchema,
  CreateExamProgrammeSchema,
  UpdateExamProgrammeSchema,
  CreateExamCycleSchema,
  UpdateExamCycleSchema,
  ExamImportantDateInputSchema,
  ExamOfficialResourceInputSchema,
  ExamWorkflowActionSchema,
  calculateExamReadiness,
} from '@study-karnataka/validation';
import { createExamAuditLog, validateExamLifecycleTransition } from '../services/exam.service';

const router: Router = Router();

// ==========================================
// 1. EXAM AUTHORITIES
// ==========================================

router.get(
  '/admin/exam-authorities',
  authenticateToken,
  requirePermission('exams.view', 'exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authorities = await prisma.examAuthority.findMany({
        orderBy: { nameEn: 'asc' },
        include: { _count: { select: { programmes: true } } },
      });
      res.status(200).json(sendSuccess(authorities));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exam-authorities',
  authenticateToken,
  requirePermission('exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = CreateExamAuthoritySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Authority', parseResult.error.flatten()));
        return;
      }

      const existing = await prisma.examAuthority.findUnique({
        where: { code: parseResult.data.code },
      });
      if (existing) {
        res.status(409).json(sendError('EXAM_CODE_ALREADY_EXISTS', `Exam Authority code '${parseResult.data.code}' already exists`));
        return;
      }

      const adminUserId = req.user!.userId;
      const authority = await prisma.examAuthority.create({
        data: {
          ...parseResult.data,
          createdByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'CREATE_AUTHORITY',
        recordType: 'ExamAuthority',
        recordId: authority.id,
        newValue: authority,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(sendSuccess(authority));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.get(
  '/admin/exam-authorities/:id',
  authenticateToken,
  requirePermission('exams.view', 'exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const authority = await prisma.examAuthority.findUnique({
        where: { id },
        include: { programmes: true },
      });

      if (!authority) {
        res.status(404).json(sendError('EXAM_AUTHORITY_NOT_FOUND', 'Exam Authority not found'));
        return;
      }
      res.status(200).json(sendSuccess(authority));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.patch(
  '/admin/exam-authorities/:id',
  authenticateToken,
  requirePermission('exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const parseResult = UpdateExamAuthoritySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Authority update', parseResult.error.flatten()));
        return;
      }

      const existing = await prisma.examAuthority.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json(sendError('EXAM_AUTHORITY_NOT_FOUND', 'Exam Authority not found'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examAuthority.update({
        where: { id },
        data: {
          ...parseResult.data,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'UPDATE_AUTHORITY',
        recordType: 'ExamAuthority',
        recordId: id,
        previousValue: existing,
        newValue: updated,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exam-authorities/:id/activate',
  authenticateToken,
  requirePermission('exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await prisma.examAuthority.update({
        where: { id },
        data: { isActive: true, updatedByAdminId: req.user!.userId },
      });
      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exam-authorities/:id/deactivate',
  authenticateToken,
  requirePermission('exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await prisma.examAuthority.update({
        where: { id },
        data: { isActive: false, updatedByAdminId: req.user!.userId },
      });
      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.delete(
  '/admin/exam-authorities/:id',
  authenticateToken,
  requirePermission('exams.authorities.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      const existing = await prisma.examAuthority.findUnique({
        where: { id },
        include: { _count: { select: { programmes: true } } },
      });
      if (!existing) {
        res.status(404).json(sendError('EXAM_AUTHORITY_NOT_FOUND', 'Exam Authority not found'));
        return;
      }

      if (existing._count.programmes > 0) {
        res.status(400).json(sendError('AUTHORITY_HAS_PROGRAMMES', 'Cannot delete an authority that has programmes attached to it. Please delete the programmes first.'));
        return;
      }

      await prisma.examAuthority.delete({
        where: { id },
      });

      const adminUserId = req.user!.userId;
      await createExamAuditLog({
        adminUserId,
        action: 'DELETE_AUTHORITY',
        recordType: 'ExamAuthority',
        recordId: id,
        previousValue: existing,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess({ deleted: true }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

// ==========================================
// 2. EXAM PROGRAMMES
// ==========================================

router.get(
  '/admin/exam-programmes',
  authenticateToken,
  requirePermission('exams.view', 'exams.programmes.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authorityId = req.query.authorityId as string | undefined;
      const where: any = {};
      if (authorityId) where.authorityId = authorityId;

      const programmes = await prisma.examProgramme.findMany({
        where,
        orderBy: { nameEn: 'asc' },
        include: { authority: true, _count: { select: { cycles: true } } },
      });
      res.status(200).json(sendSuccess(programmes));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exam-programmes',
  authenticateToken,
  requirePermission('exams.programmes.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = CreateExamProgrammeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Programme', parseResult.error.flatten()));
        return;
      }

      const authority = await prisma.examAuthority.findUnique({
        where: { id: parseResult.data.authorityId },
      });
      if (!authority) {
        res.status(404).json(sendError('EXAM_AUTHORITY_NOT_FOUND', 'Parent Exam Authority not found'));
        return;
      }

      const existing = await prisma.examProgramme.findUnique({
        where: { code: parseResult.data.code },
      });
      if (existing) {
        res.status(409).json(sendError('EXAM_CODE_ALREADY_EXISTS', `Exam Programme code '${parseResult.data.code}' already exists`));
        return;
      }

      const adminUserId = req.user!.userId;
      const programme = await prisma.examProgramme.create({
        data: {
          ...parseResult.data,
          createdByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
        },
        include: { authority: true },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'CREATE_PROGRAMME',
        recordType: 'ExamProgramme',
        recordId: programme.id,
        newValue: programme,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(sendSuccess(programme));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.get(
  '/admin/exam-programmes/:id',
  authenticateToken,
  requirePermission('exams.view', 'exams.programmes.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const programme = await prisma.examProgramme.findUnique({
        where: { id },
        include: { authority: true, cycles: true },
      });

      if (!programme) {
        res.status(404).json(sendError('EXAM_PROGRAMME_NOT_FOUND', 'Exam Programme not found'));
        return;
      }
      res.status(200).json(sendSuccess(programme));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.patch(
  '/admin/exam-programmes/:id',
  authenticateToken,
  requirePermission('exams.programmes.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const parseResult = UpdateExamProgrammeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Programme update', parseResult.error.flatten()));
        return;
      }

      const existing = await prisma.examProgramme.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json(sendError('EXAM_PROGRAMME_NOT_FOUND', 'Exam Programme not found'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examProgramme.update({
        where: { id },
        data: {
          ...parseResult.data,
          updatedByAdminId: adminUserId,
        },
        include: { authority: true },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'UPDATE_PROGRAMME',
        recordType: 'ExamProgramme',
        recordId: id,
        previousValue: existing,
        newValue: updated,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.delete(
  '/admin/exam-programmes/:id',
  authenticateToken,
  requirePermission('exams.programmes.manage'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      
      const existing = await prisma.examProgramme.findUnique({ where: { id }, include: { _count: { select: { cycles: true } } } });
      if (!existing) {
        res.status(404).json(sendError('EXAM_PROGRAMME_NOT_FOUND', 'Exam Programme not found'));
        return;
      }
      
      if (existing._count.cycles > 0) {
        res.status(400).json(sendError('PROGRAMME_HAS_CYCLES', 'Cannot delete a programme that has exam cycles attached to it.'));
        return;
      }

      await prisma.examProgramme.delete({
        where: { id },
      });

      const adminUserId = req.user!.userId;
      await createExamAuditLog({
        adminUserId,
        action: 'DELETE_PROGRAMME',
        recordType: 'ExamProgramme',
        recordId: id,
        previousValue: existing,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess({ deleted: true }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

// ==========================================
// 3. EXAM CYCLES
// ==========================================

router.get(
  '/admin/exams',
  authenticateToken,
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { authorityId, programmeId, year, status, visibility, search } = req.query;
      const where: any = {};

      if (programmeId) where.programmeId = programmeId as string;
      if (authorityId) where.programme = { authorityId: authorityId as string };
      if (year) where.cycleYear = parseInt(year as string, 10);
      if (status) where.status = status;
      if (visibility) where.visibility = visibility;

      if (search) {
        const queryStr = search as string;
        where.OR = [
          { titleEn: { contains: queryStr, mode: 'insensitive' } },
          { titleKn: { contains: queryStr, mode: 'insensitive' } },
          { cycleCode: { contains: queryStr, mode: 'insensitive' } },
          { notificationNumber: { contains: queryStr, mode: 'insensitive' } },
        ];
      }

      const cycles = await prisma.examCycle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          programme: { include: { authority: true } },
          eligibility: true,
          importantDates: { orderBy: { displayOrder: 'asc' } },
          officialResources: { orderBy: { displayOrder: 'asc' } },
          seo: true,
          syllabi: {
            where: { isCurrent: true },
            select: {
              _count: {
                select: {
                  nodes: { where: { nodeType: { in: ['SUBJECT', 'TOPIC'] }, isActive: true } }
                }
              }
            }
          }
        },
      });

      const enriched = cycles.map((c) => {
        const topicCount = c.syllabi?.[0]?._count?.nodes || 0;
        return {
          ...c,
          topicCount,
          readiness: calculateExamReadiness(c),
        };
      });

      res.status(200).json(sendSuccess(enriched));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams',
  authenticateToken,
  requirePermission('exams.create'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = CreateExamCycleSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Cycle creation', parseResult.error.flatten()));
        return;
      }

      const data = parseResult.data;
      const programme = await prisma.examProgramme.findUnique({ where: { id: data.programmeId } });
      if (!programme) {
        res.status(404).json(sendError('EXAM_PROGRAMME_NOT_FOUND', 'Specified Exam Programme does not exist'));
        return;
      }

      const existingCycle = await prisma.examCycle.findUnique({
        where: { programmeId_cycleCode: { programmeId: data.programmeId, cycleCode: data.cycleCode } },
      });
      if (existingCycle) {
        res.status(409).json(sendError('EXAM_CYCLE_ALREADY_EXISTS', `Exam cycle code '${data.cycleCode}' already exists for this programme`));
        return;
      }

      if (data.seo) {
        const slugEnExists = await prisma.examSEO.findUnique({ where: { slugEn: data.seo.slugEn } });
        if (slugEnExists) {
          res.status(409).json(sendError('EXAM_SLUG_ALREADY_EXISTS', `English SEO slug '${data.seo.slugEn}' is already in use`));
          return;
        }
        const slugKnExists = await prisma.examSEO.findUnique({ where: { slugKn: data.seo.slugKn } });
        if (slugKnExists) {
          res.status(409).json(sendError('EXAM_SLUG_ALREADY_EXISTS', `Kannada SEO slug '${data.seo.slugKn}' is already in use`));
          return;
        }
      }

      const adminUserId = req.user!.userId;

      const createdCycle = await prisma.examCycle.create({
        data: {
          programmeId: data.programmeId,
          cycleCode: data.cycleCode,
          cycleYear: data.cycleYear,
          titleEn: data.titleEn,
          titleKn: data.titleKn,
          descriptionEn: data.descriptionEn,
          descriptionKn: data.descriptionKn,
          notificationNumber: data.notificationNumber,
          notificationDate: data.notificationDate,
          applicationStartDate: data.applicationStartDate,
          applicationEndDate: data.applicationEndDate,
          feePaymentEndDate: data.feePaymentEndDate,
          tentativeExamDate: data.tentativeExamDate,
          resultDate: data.resultDate,
          officialNotificationUrl: data.officialNotificationUrl,
          applicationUrl: data.applicationUrl,
          logoUrl: data.logoUrl,
          visibility: data.visibility,
          createdByAdminId: adminUserId,
          updatedByAdminId: adminUserId,
          eligibility: data.eligibility ? { create: data.eligibility } : undefined,
          importantDates: data.importantDates.length > 0 ? { create: data.importantDates } : undefined,
          officialResources: data.officialResources.length > 0 ? { create: data.officialResources } : undefined,
          seo: data.seo ? { create: data.seo } : undefined,
        },
        include: {
          programme: { include: { authority: true } },
          eligibility: true,
          importantDates: true,
          officialResources: true,
          seo: true,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'CREATE_EXAM_CYCLE',
        recordType: 'ExamCycle',
        recordId: createdCycle.id,
        newValue: createdCycle,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const readiness = calculateExamReadiness(createdCycle);
      res.status(201).json(sendSuccess({ ...createdCycle, readiness }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.get(
  '/admin/exams/:id',
  authenticateToken,
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({
        where: { id },
        include: {
          programme: { include: { authority: true } },
          eligibility: true,
          importantDates: { orderBy: { displayOrder: 'asc' } },
          officialResources: { orderBy: { displayOrder: 'asc' } },
          seo: true,
        },
      });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      res.status(200).json(sendSuccess({ ...cycle, readiness }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.patch(
  '/admin/exams/:id',
  authenticateToken,
  requirePermission('exams.update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const parseResult = UpdateExamCycleSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Exam Cycle update', parseResult.error.flatten()));
        return;
      }

      const existing = await prisma.examCycle.findUnique({
        where: { id },
        include: { eligibility: true, seo: true },
      });

      if (!existing) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      if (parseResult.data.version !== undefined && parseResult.data.version !== existing.version) {
        res.status(409).json(sendError('EXAM_VERSION_CONFLICT', 'Record was modified by another administrator. Please refresh and try again.'));
        return;
      }

      const data = parseResult.data;
      const adminUserId = req.user!.userId;

      // Update nested eligibility or SEO if supplied
      if (data.eligibility) {
        await prisma.examEligibility.upsert({
          where: { examCycleId: id },
          create: { examCycleId: id, ...data.eligibility },
          update: data.eligibility,
        });
      }

      if (data.seo) {
        await prisma.examSEO.upsert({
          where: { examCycleId: id },
          create: { examCycleId: id, ...data.seo },
          update: data.seo,
        });
      }

      const { eligibility, importantDates, officialResources, seo, version, ...cycleFields } = data;

      // If the exam is currently in an active workflow state, revert it to DRAFT so it must be re-approved.
      const newStatus = ['PUBLISHED', 'APPROVED', 'REVIEW_PENDING', 'CHANGES_REQUESTED'].includes(existing.status) 
        ? 'DRAFT' 
        : existing.status;

      const updatedCycle = await prisma.examCycle.update({
        where: { id },
        data: {
          ...cycleFields,
          status: newStatus,
          version: existing.version + 1,
          updatedByAdminId: adminUserId,
        },
        include: {
          programme: { include: { authority: true } },
          eligibility: true,
          importantDates: true,
          officialResources: true,
          seo: true,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'UPDATE_EXAM_CYCLE',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: existing,
        newValue: updatedCycle,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const readiness = calculateExamReadiness(updatedCycle);
      res.status(200).json(sendSuccess({ ...updatedCycle, readiness }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

// ==========================================
// 4. WORKFLOW TRANSITIONS
// ==========================================

router.post(
  '/admin/exams/:id/submit-review',
  authenticateToken,
  requirePermission('exams.submit_review'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({
        where: { id },
        include: { eligibility: true, seo: true, importantDates: true, officialResources: true },
      });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'SUBMIT_REVIEW', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'REVIEW_PENDING',
          reviewSubmittedAt: new Date(),
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'SUBMIT_FOR_REVIEW',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'REVIEW_PENDING' },
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/request-changes',
  authenticateToken,
  requirePermission('exams.review'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id }, include: { seo: true } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'REQUEST_CHANGES', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'CHANGES_REQUESTED',
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'REQUEST_CHANGES',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'CHANGES_REQUESTED' },
        reason: req.body.reason || 'Changes requested during editorial review',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/approve',
  authenticateToken,
  requirePermission('exams.approve'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id }, include: { seo: true } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'APPROVE', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId,
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'APPROVE_EXAM',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'APPROVED' },
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/publish',
  authenticateToken,
  requirePermission('exams.publish'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id }, include: { seo: true } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'PUBLISH', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const targetVisibility = req.body.visibility === 'UNLISTED' ? 'UNLISTED' : 'PUBLIC';
      const adminUserId = req.user!.userId;

      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          visibility: targetVisibility,
          publishedAt: new Date(),
          publishedByAdminId: adminUserId,
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'PUBLISH_EXAM',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status, visibility: cycle.visibility },
        newValue: { status: 'PUBLISHED', visibility: targetVisibility },
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/close',
  authenticateToken,
  requirePermission('exams.close'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'CLOSE', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'CLOSE_EXAM',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'CLOSED' },
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/archive',
  authenticateToken,
  requirePermission('exams.archive'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'ARCHIVE', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'ARCHIVE_EXAM',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'ARCHIVED' },
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/reopen',
  authenticateToken,
  requirePermission('exams.archive'), // Using same permission as archive, or we can use exams.update
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const cycle = await prisma.examCycle.findUnique({ where: { id } });

      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      const readiness = calculateExamReadiness(cycle);
      const transition = validateExamLifecycleTransition(cycle.status, 'REOPEN', readiness);

      if (!transition.allowed) {
        res.status(400).json(sendError('EXAM_INVALID_STATUS_TRANSITION', transition.reason || 'Invalid workflow transition'));
        return;
      }

      const adminUserId = req.user!.userId;
      const updated = await prisma.examCycle.update({
        where: { id },
        data: {
          status: 'DRAFT',
          version: cycle.version + 1,
          updatedByAdminId: adminUserId,
        },
      });

      await createExamAuditLog({
        adminUserId,
        action: 'REOPEN_EXAM',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: { status: cycle.status },
        newValue: { status: 'DRAFT' },
        reason: req.body.reason || 'Manually reopened to Draft',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess(updated));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

// ==========================================
// 5. IMPORTANT DATES & RESOURCES MANAGEMENT
// ==========================================

router.post(
  '/admin/exams/:id/important-dates',
  authenticateToken,
  requirePermission('exams.update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const examCycleId = Array.isArray(rawId) ? rawId[0] : rawId;
      const parseResult = ExamImportantDateInputSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Important Date', parseResult.error.flatten()));
        return;
      }

      if (parseResult.data.examStageId) {
        const stage = await prisma.examStage.findFirst({
          where: { id: parseResult.data.examStageId },
          include: { examPattern: true },
        });

        if (!stage || stage.examPattern.examCycleId !== examCycleId) {
          res.status(400).json(sendError('CROSS_CYCLE_STAGE_LINKING_REJECTED', 'Cross-cycle stage linking is rejected. A Stage-linked important date can only reference a Stage belonging to the same Exam Cycle.'));
          return;
        }
      }

      const created = await prisma.examImportantDate.create({
        data: { examCycleId, ...parseResult.data },
      });
      res.status(201).json(sendSuccess(created));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.delete(
  '/admin/exams/:id/important-dates/:dateId',
  authenticateToken,
  requirePermission('exams.update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawDateId = req.params.dateId;
      const dateId = Array.isArray(rawDateId) ? rawDateId[0] : rawDateId;
      await prisma.examImportantDate.delete({ where: { id: dateId } });
      res.status(200).json(sendSuccess({ message: 'Important date deleted' }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.post(
  '/admin/exams/:id/resources',
  authenticateToken,
  requirePermission('exams.update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const examCycleId = Array.isArray(rawId) ? rawId[0] : rawId;
      const parseResult = ExamOfficialResourceInputSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Validation failed for Official Resource', parseResult.error.flatten()));
        return;
      }

      const created = await prisma.examOfficialResource.create({
        data: { examCycleId, ...parseResult.data },
      });
      res.status(201).json(sendSuccess(created));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

router.delete(
  '/admin/exams/:id/resources/:resourceId',
  authenticateToken,
  requirePermission('exams.update'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawResourceId = req.params.resourceId;
      const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;
      await prisma.examOfficialResource.delete({ where: { id: resourceId } });
      res.status(200).json(sendSuccess({ message: 'Official resource deleted' }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

// ==========================================
// 6. DELETE EXAM CYCLE
// ==========================================

router.delete(
  '/admin/exams/:id',
  authenticateToken,
  requirePermission('exams.delete', 'exams.update'), // Allow if they have update (or we can use a new permission)
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      
      const cycle = await prisma.examCycle.findUnique({ where: { id } });
      if (!cycle) {
        res.status(404).json(sendError('EXAM_NOT_FOUND', 'Exam Cycle not found'));
        return;
      }

      await prisma.examCycle.delete({ where: { id } });

      await createExamAuditLog({
        adminUserId: req.user!.userId,
        action: 'DELETE_EXAM_CYCLE',
        recordType: 'ExamCycle',
        recordId: id,
        previousValue: cycle,
        reason: 'Hard deleted by admin',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json(sendSuccess({ message: 'Exam cycle deleted permanently' }));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message));
    }
  }
);

export default router;
