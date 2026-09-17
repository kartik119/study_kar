// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { McqLibraryService, McqLibraryServiceError } from '../services/mcq-library.service';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router: Router = Router();

router.use(authenticateToken);

function p(val: any): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val !== undefined && val !== null ? String(val) : undefined;
}

/**
 * GET /api/v1/admin/mcq-library/questions/next-code
 */
router.get(
  '/questions/next-code',
  requirePermission('mcq_tests.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const nextInfo = await McqLibraryService.previewNextSequentialCode();
      res.json({
        success: true,
        data: nextInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/questions
 */
router.get(
  '/questions',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        search,
        difficulty,
        categoryId,
        subcategoryId,
        topicId,
        knowledgeAreaId,
        readiness,
        status,
        isPyq,
        page,
        limit,
        pageSize,
      } = req.query;

      const result = await McqLibraryService.getQuestions({
        search: p(search),
        difficulty: p(difficulty),
        categoryId: p(categoryId),
        subcategoryId: p(subcategoryId),
        topicId: p(topicId),
        knowledgeAreaId: p(knowledgeAreaId),
        readiness: p(readiness),
        status: p(status),
        isPyq: isPyq !== undefined ? isPyq === 'true' : undefined,
        page: page ? parseInt(p(page) || '1', 10) : 1,
        limit: limit || pageSize ? parseInt(p(limit || pageSize) || '25', 10) : 25,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions
 */
router.post(
  '/questions',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const question = await McqLibraryService.createQuestion(req.body, adminUserId);
      res.status(201).json({
        success: true,
        data: question,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/questions/:id
 */
router.get(
  '/questions/:id',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const question = await McqLibraryService.getQuestionById(targetId);
      res.json({
        success: true,
        data: question,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'NOT_FOUND', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/mcq-library/questions/:id
 */
router.patch(
  '/questions/:id',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const updated = await McqLibraryService.updateQuestion(targetId, req.body, adminUserId);
      res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/:id/submit-review
 */
router.post(
  '/questions/:id/submit-review',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqLibraryService.submitForReview(targetId, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/:id/request-changes
 */
router.post(
  '/questions/:id/request-changes',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqLibraryService.requestChanges(targetId, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/:id/approve
 */
router.post(
  '/questions/:id/approve',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqLibraryService.approveQuestion(targetId, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/:id/archive
 */
router.post(
  '/questions/:id/archive',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqLibraryService.archiveQuestion(targetId, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/mcq-library/questions/:id
 */
router.delete(
  '/questions/:id',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id as string;
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqLibraryService.deleteQuestion(targetId, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/bulk-delete
 */
router.post(
  '/questions/bulk-delete',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const { ids } = req.body;
      const result = await McqLibraryService.deleteQuestionsBulk(ids, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/questions/bulk-status
 */
router.post(
  '/questions/bulk-status',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const { ids, action } = req.body;
      const result = await McqLibraryService.updateQuestionsStatusBulk(ids, action, adminUserId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqLibraryServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);



// ============================================================================
// MCQ BULK IMPORT ENGINE ENDPOINTS (PROMPT 11)
// ============================================================================
import multer from 'multer';
import { McqBulkImportService, McqBulkImportServiceError } from '../services/mcq-bulk-import.service';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Max
});

/**
 * GET /api/v1/admin/mcq-library/bulk-import/template/excel
 */
router.get(
  '/bulk-import/template/excel',
  requirePermission('mcq_tests.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const buffer = await McqBulkImportService.generateExcelTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="study-karnataka-mcq-import-template.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/bulk-import/template/csv
 */
router.get(
  '/bulk-import/template/csv',
  requirePermission('mcq_tests.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const csvData = await McqBulkImportService.generateCsvTemplate();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="study-karnataka-mcq-import-template.csv"');
      res.send(csvData);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/bulk-import/analyze
 */
router.post(
  '/bulk-import/analyze',
  requirePermission('mcq_tests.view'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE_UPLOADED', message: 'Spreadsheet file (.xlsx or .csv) is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await McqBulkImportService.analyzeFile(
        req.file.originalname,
        req.file.buffer,
        adminUserId
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqBulkImportServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/bulk-import/validate
 */
router.post(
  '/bulk-import/validate',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, importMode, columnMappings, selectedWorksheet, taxonomyOverrides } = req.body;
      const result = await McqBulkImportService.validateSession(
        sessionId,
        importMode || 'ADD_NEW',
        columnMappings || {},
        selectedWorksheet,
        taxonomyOverrides
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqBulkImportServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/bulk-import/execute
 */
router.post(
  '/bulk-import/execute',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = (req as any).user?.userId || (req as any).user?.id;
      const { sessionId, importMode, columnMappings, selectedWorksheet, taxonomyOverrides } = req.body;
      const result = await McqBulkImportService.executeImport(
        sessionId,
        importMode || 'ADD_NEW',
        columnMappings || {},
        selectedWorksheet,
        taxonomyOverrides,
        adminUserId
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqBulkImportServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/bulk-import/sessions/:id/error-report
 */
router.get(
  '/bulk-import/sessions/:id/error-report',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id as string;
      const csvReport = await McqBulkImportService.generateValidationErrorReport(sessionId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Validation_Errors_${sessionId}.csv"`);
      res.send(csvReport);
    } catch (err) {
      if (err instanceof McqBulkImportServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/bulk-import/taxonomy/create
 * Explicitly creates missing Category, Subcategory, or Topic with proper unique canonical code.
 */
router.post(
  '/bulk-import/taxonomy/create',
  requirePermission('mcq_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, nameEn, nameKn, parentId, customCode } = req.body;
      const created = await McqBulkImportService.createTaxonomyMaster({
        type,
        nameEn,
        nameKn,
        parentId,
        customCode,
      });

      res.status(201).json({
        success: true,
        data: created,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof McqBulkImportServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: err.code || 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/bulk-import/history
 */
router.get(
  '/bulk-import/history',
  requirePermission('mcq_tests.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await McqBulkImportService.getImportHistory();
      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/mcq-library/bulk-import/sessions/:id
 */
router.delete(
  '/bulk-import/sessions/:id',
  requirePermission('mcq_tests.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await McqBulkImportService.deleteSession(req.params.id);
      res.json({
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

