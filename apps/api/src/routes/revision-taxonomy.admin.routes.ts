import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PrismaClient } from '@study-karnataka/database';

const prisma = new PrismaClient();
const router: Router = Router();

router.use(authenticateToken);

// --- CATEGORIES ---

// Get all categories with subcategories
router.get('/categories', requirePermission('quick_revision.view' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.revisionCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          orderBy: { displayOrder: 'asc' }
        },
        _count: {
          select: { cards: true }
        }
      }
    });
    return res.json({ success: true, data: categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Create category
router.post('/categories', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, nameEn, nameKn, descriptionEn, descriptionKn } = req.body;
    
    // Auto-calculate displayOrder
    const lastCat = await prisma.revisionCategory.findFirst({ orderBy: { displayOrder: 'desc' } });
    const nextOrder = lastCat ? lastCat.displayOrder + 1 : 1;
    
    const category = await prisma.revisionCategory.create({
      data: {
        code, nameEn, nameKn, descriptionEn, descriptionKn,
        displayOrder: nextOrder,
        createdByAdminId: req.user!.userId
      }
    });
    return res.json({ success: true, data: category });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: { message: 'Code already exists' } });
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Update category
router.patch('/categories/:id', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, nameEn, nameKn, descriptionEn, descriptionKn, isActive } = req.body;
    const category = await prisma.revisionCategory.update({
      where: { id: (req.params.id as string) },
      data: { code, nameEn, nameKn, descriptionEn, descriptionKn, isActive, updatedByAdminId: req.user!.userId }
    });
    return res.json({ success: true, data: category });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: { message: 'Code already exists' } });
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Delete category
router.delete('/categories/:id', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if it has cards
    const cardCount = await prisma.revisionCard.count({ where: { categoryId: (req.params.id as string) } });
    if (cardCount > 0) return res.status(400).json({ success: false, error: { message: 'Cannot delete category with associated revision cards' } });

    await prisma.revisionCategory.delete({ where: { id: (req.params.id as string) } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Reorder categories
router.post('/categories/reorder', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: { message: 'Invalid items array' } });

    const updates = items.map((item: any) => 
      prisma.revisionCategory.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder }
      })
    );
    await prisma.$transaction(updates);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// --- SUBCATEGORIES ---

// Create subcategory
router.post('/subcategories', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, code, nameEn, nameKn, descriptionEn, descriptionKn } = req.body;
    
    // Auto-calculate displayOrder
    const lastSub = await prisma.revisionSubcategory.findFirst({ 
      where: { categoryId },
      orderBy: { displayOrder: 'desc' } 
    });
    const nextOrder = lastSub ? lastSub.displayOrder + 1 : 1;
    
    const subcategory = await prisma.revisionSubcategory.create({
      data: {
        categoryId, code, nameEn, nameKn, descriptionEn, descriptionKn,
        displayOrder: nextOrder,
        createdByAdminId: req.user!.userId
      }
    });
    return res.json({ success: true, data: subcategory });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: { message: 'Code already exists' } });
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Update subcategory
router.patch('/subcategories/:id', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, nameEn, nameKn, descriptionEn, descriptionKn, isActive } = req.body;
    const subcategory = await prisma.revisionSubcategory.update({
      where: { id: (req.params.id as string) },
      data: { code, nameEn, nameKn, descriptionEn, descriptionKn, isActive, updatedByAdminId: req.user!.userId }
    });
    return res.json({ success: true, data: subcategory });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: { message: 'Code already exists' } });
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Delete subcategory
router.delete('/subcategories/:id', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if it has cards
    const cardCount = await prisma.revisionCard.count({ where: { subcategoryId: (req.params.id as string) } });
    if (cardCount > 0) return res.status(400).json({ success: false, error: { message: 'Cannot delete subcategory with associated revision cards' } });

    await prisma.revisionSubcategory.delete({ where: { id: (req.params.id as string) } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Reorder subcategories
router.post('/subcategories/reorder', requirePermission('quick_revision.manage' as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: { message: 'Invalid items array' } });

    const updates = items.map((item: any) => 
      prisma.revisionSubcategory.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder }
      })
    );
    await prisma.$transaction(updates);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
