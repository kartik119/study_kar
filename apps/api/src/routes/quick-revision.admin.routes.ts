// @ts-nocheck
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@study-karnataka/database';
import { authenticateToken } from '../middleware/auth';

const prisma = new PrismaClient();
const router: Router = Router();

router.use(authenticateToken);

/**
 * GET /api/v1/admin/quick-revision/cards
 * Fetch paginated revision cards
 */
router.get('/cards', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '10', 10);
    const status = req.query.status as string;

    let where: Prisma.RevisionCardWhereInput = {};
    if (status) {
      where.status = status as any;
    }

    const [totalItems, items] = await Promise.all([
      prisma.revisionCard.count({ where }),
      prisma.revisionCard.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              nameEn: true,
              nameKn: true,
              code: true,
              subcategories: {
                select: { id: true, nameEn: true, nameKn: true, code: true },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
          subcategory: {
            select: { id: true, nameEn: true, nameKn: true, code: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Fetch revision cards error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/admin/quick-revision/cards
 * Create a new revision card
 */
router.post('/cards', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    // Validate required fields
    if (!body.titleEn) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'titleEn is required' },
        timestamp: new Date().toISOString(),
      });
    }

    // Auto-generate slug if not provided
    let slug = body.slug || body.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if slug exists, append random suffix if collision
    const existing = await prisma.revisionCard.findUnique({ where: { slug } });
    if (existing) {
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${uniqueSuffix}`;
    }

    const card = await prisma.revisionCard.create({
      data: {
        titleEn: body.titleEn,
        titleKn: body.titleKn,
        contentEn: body.contentEn || {},
        contentKn: body.contentKn || {},
        imageEn: body.imageEn,
        imageKn: body.imageKn,
        slug: slug,
        metaTitleEn: body.metaTitleEn,
        metaDescriptionEn: body.metaDescriptionEn,
        metaTitleKn: body.metaTitleKn,
        metaDescriptionKn: body.metaDescriptionKn,
        priority: body.priority || 'Medium',
        isFreeSample: body.isFreeSample || false,
        status: body.status || 'DRAFT',
        examCycleId: body.examCycleId || null,
        subjectId: body.subjectId || null,
        categoryId: body.categoryId || null,
        subcategoryId: body.subcategoryId || null,
        publishDate: body.publishDate ? new Date(body.publishDate) : null,
      },
      include: {
        category: true,
        subcategory: true,
      },
    });

    return res.json({
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Create revision card error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/admin/quick-revision/cards/:id
 * Get single revision card
 */
router.get('/cards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const card = await prisma.revisionCard.findUnique({
      where: { id: id as string },
      include: {
        category: true,
        subcategory: true,
      },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Revision card not found' },
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Get revision card error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/v1/admin/quick-revision/cards/:id
 * Update a revision card
 */
router.patch('/cards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updateData: any = {};
    if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
    if (body.titleKn !== undefined) updateData.titleKn = body.titleKn;
    if (body.contentEn !== undefined) updateData.contentEn = body.contentEn;
    if (body.contentKn !== undefined) updateData.contentKn = body.contentKn;
    if (body.imageEn !== undefined) updateData.imageEn = body.imageEn;
    if (body.imageKn !== undefined) updateData.imageKn = body.imageKn;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.metaTitleEn !== undefined) updateData.metaTitleEn = body.metaTitleEn;
    if (body.metaDescriptionEn !== undefined) updateData.metaDescriptionEn = body.metaDescriptionEn;
    if (body.metaTitleKn !== undefined) updateData.metaTitleKn = body.metaTitleKn;
    if (body.metaDescriptionKn !== undefined) updateData.metaDescriptionKn = body.metaDescriptionKn;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.isFreeSample !== undefined) updateData.isFreeSample = body.isFreeSample;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.examCycleId !== undefined) updateData.examCycleId = body.examCycleId || null;
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId || null;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.subcategoryId !== undefined) updateData.subcategoryId = body.subcategoryId || null;
    if (body.publishDate !== undefined) updateData.publishDate = body.publishDate ? new Date(body.publishDate) : null;

    const card = await prisma.revisionCard.update({
      where: { id: id as string },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
      },
    });

    return res.json({
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Update revision card error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/admin/quick-revision/cards/:id
 * Delete a revision card
 */
router.delete('/cards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.revisionCard.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      data: { id },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Delete revision card error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});

export const quickRevisionAdminRoutes = router;
