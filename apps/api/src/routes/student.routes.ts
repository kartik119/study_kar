import { Router, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { serializeStudent } from '../utils/serializer';
import { UpdatePreparationLanguageSchema } from '@study-karnataka/validation';

const router: Router = Router();

// 1. GET /api/v1/students/me (Self profile)
router.get('/students/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        studentProfile: true,
        guardianConsents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!student) {
      res.status(404).json(sendError('NOT_FOUND', 'Student profile not found'));
      return;
    }

    const serialized = serializeStudent(student, req.user.permissions || [], true);
    res.status(200).json(sendSuccess(serialized));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch student profile'));
  }
});

// 1.5 GET /api/v1/admin/students (Admin listing students)
router.get(
  '/admin/students',
  authenticateToken,
  requirePermission('students.view'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const students = await prisma.user.findMany({
        where: { accountType: 'STUDENT' },
        include: {
          studentProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      const permissions = req.user?.permissions || [];
      const serializedStudents = students.map((s: any) => serializeStudent(s, permissions, false));
      
      res.json({ data: serializedStudents });
    } catch (err: any) {
      console.error('[GET /admin/students]', err);
      res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch students'));
    }
  }
);

// 2. GET /api/v1/admin/students/:studentId (Admin viewing student profile)
router.get(
  '/admin/students/:studentId',
  authenticateToken,
  requirePermission('students.view'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawId = req.params.studentId;
      const studentId = Array.isArray(rawId) ? rawId[0] : rawId;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
      const userAgent = req.headers['user-agent'];

      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          studentProfile: true,
          guardianConsents: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!student) {
        res.status(404).json(sendError('NOT_FOUND', 'Student profile not found'));
        return;
      }

      const permissions = req.user?.permissions || [];
      const hasSensitiveAccess =
        permissions.includes('students.sensitive_dob.view') ||
        permissions.includes('students.sensitive_guardian.view');

      // Audit Log sensitive data access for Support Executive or other admin staff
      if (hasSensitiveAccess && req.user?.accountType === 'ADMIN') {
        await prisma.adminAuditLog.create({
          data: {
            adminUserId: req.user.userId,
            action: 'SENSITIVE_DATA_ACCESS',
            module: 'STUDENTS',
            reason: `Viewed sensitive profile data for student ${studentId}`,
            ipAddress,
            userAgent,
          },
        });
      }

      const serialized = serializeStudent(student, permissions, false);
      res.status(200).json(sendSuccess(serialized));
    } catch (err: any) {
      res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch student profile'));
    }
  }
);

// 3. PATCH /api/v1/students/me/preparation-language
router.patch('/students/me/preparation-language', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const parseResult = UpdatePreparationLanguageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(sendError('INVALID_LANGUAGE', 'Invalid preparation language', parseResult.error.flatten()));
      return;
    }

    const { preparationLanguage } = parseResult.data;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (studentProfile?.preparationLanguageLockedAt) {
      res.status(409).json(
        sendError(
          'PREPARATION_LANGUAGE_LOCKED',
          'Preparation language is locked because your study plan is active. Language cannot be modified.'
        )
      );
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { userId: req.user!.userId },
        data: { preparationLanguage: preparationLanguage as any },
      });

      return tx.user.update({
        where: { id: req.user!.userId },
        data: { preparationLanguage: preparationLanguage as any },
        include: { studentProfile: true, guardianConsents: true },
      });
    });

    const serialized = serializeStudent(updatedUser, req.user.permissions || [], true);

    res.status(200).json(sendSuccess(serialized, 'Preparation language updated successfully.'));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to update preparation language'));
  }
});

// 4. POST /api/v1/students/me/preparation-language/lock
router.post('/students/me/preparation-language/lock', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType !== 'STUDENT') {
      res.status(403).json(sendError('FORBIDDEN', 'Student access required'));
      return;
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!studentProfile) {
      res.status(404).json(sendError('NOT_FOUND', 'Student profile not found'));
      return;
    }

    if (studentProfile.preparationLanguageLockedAt) {
      res.status(200).json(
        sendSuccess(
          { isLanguageLocked: true, lockedAt: studentProfile.preparationLanguageLockedAt },
          'Preparation language is already locked.'
        )
      );
      return;
    }

    const lockedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.userId },
      data: { preparationLanguageLockedAt: new Date() },
    });

    res.status(200).json(
      sendSuccess(
        {
          isLanguageLocked: true,
          lockedAt: lockedProfile.preparationLanguageLockedAt,
        },
        'Preparation language has been locked for active study plan.'
      )
    );
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to lock preparation language'));
  }
});

export default router;
