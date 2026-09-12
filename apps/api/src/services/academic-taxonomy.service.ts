import { prisma } from '@study-karnataka/database';
import {
  AcademicCategory,
  AcademicSubcategory,
  AcademicTopic,
  AcademicKnowledgeArea,
  AcademicTaxonomyTree,
} from '@study-karnataka/shared-types';
import {
  evaluateTaxonomyReadiness,
  toUpperSnakeCase,
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  createTopicSchema,
  updateTopicSchema,
  createKnowledgeAreaSchema,
  updateKnowledgeAreaSchema,
} from '@study-karnataka/validation';

// Custom Error Class
export class TaxonomyError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'TaxonomyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function createAuditLog(params: {
  adminUserId?: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (!params.adminUserId) return;
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        module: 'ACADEMIC_TAXONOMY',
        recordType: params.recordType,
        recordId: params.recordId,
        previousValue: params.previousValue ? (params.previousValue as any) : undefined,
        newValue: params.newValue ? (params.newValue as any) : undefined,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log for taxonomy action:', err);
  }
}

export class AcademicTaxonomyService {
  // ==========================================
  // TAXONOMY TREE VIEW
  // ==========================================
  static async getTaxonomyTree(filters?: {
    search?: string;
    isActive?: boolean;
    categoryId?: string;
    moduleType?: string;
  }): Promise<AcademicTaxonomyTree> {
    const whereCategory: any = {};
    if (filters?.isActive !== undefined) whereCategory.isActive = filters.isActive;
    if (filters?.categoryId) whereCategory.id = filters.categoryId;
    if (filters?.moduleType) {
      whereCategory.moduleType = { in: [filters.moduleType, 'GENERAL'] };
    }
    if (filters?.search) {
      whereCategory.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameKn: { contains: filters.search } },
      ];
    }

    const categories = await prisma.academicCategory.findMany({
      where: whereCategory,
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          orderBy: { displayOrder: 'asc' },
          include: {
            topics: {
              orderBy: { displayOrder: 'asc' },
              include: {
                knowledgeAreas: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    _count: { select: { studyMaterialMappings: true } },
                  },
                },
                _count: { select: { knowledgeAreas: true, studyMaterialMappings: true } },
              },
            },
            _count: { select: { topics: true, studyMaterialMappings: true } },
          },
        },
        _count: { select: { subcategories: true, studyMaterialMappings: true } },
      },
    });

    let totalSubcategories = 0;
    let totalTopics = 0;
    let totalKnowledgeAreas = 0;

    const formattedCategories: AcademicCategory[] = categories.map((cat) => {
      const catReadiness = evaluateTaxonomyReadiness(cat);

      const formattedSubcategories: AcademicSubcategory[] = cat.subcategories.map((sub) => {
        totalSubcategories++;
        const subReadiness = evaluateTaxonomyReadiness(sub);

        const formattedTopics: AcademicTopic[] = sub.topics.map((top) => {
          totalTopics++;
          const topReadiness = evaluateTaxonomyReadiness(top);

          const formattedKas: AcademicKnowledgeArea[] = top.knowledgeAreas.map((ka) => {
            totalKnowledgeAreas++;
            return {
              ...ka,
              topicNameEn: top.nameEn,
              topicNameKn: top.nameKn,
              studyMaterialCount: ka._count.studyMaterialMappings,
              bilingualReadiness: evaluateTaxonomyReadiness(ka),
            };
          });

          return {
            ...top,
            subcategoryNameEn: sub.nameEn,
            subcategoryNameKn: sub.nameKn,
            categoryNameEn: cat.nameEn,
            categoryNameKn: cat.nameKn,
            knowledgeAreaCount: top._count.knowledgeAreas,
            studyMaterialCount: top._count.studyMaterialMappings,
            bilingualReadiness: topReadiness,
            knowledgeAreas: formattedKas,
          };
        });

        return {
          ...sub,
          categoryNameEn: cat.nameEn,
          categoryNameKn: cat.nameKn,
          topicCount: sub._count.topics,
          studyMaterialCount: sub._count.studyMaterialMappings,
          bilingualReadiness: subReadiness,
          topics: formattedTopics,
        };
      });

      return {
        ...cat,
        subcategoryCount: cat._count.subcategories,
        studyMaterialCount: cat._count.studyMaterialMappings,
        bilingualReadiness: catReadiness,
        subcategories: formattedSubcategories,
      };
    });

    return {
      categories: formattedCategories,
      totalCategories: categories.length,
      totalSubcategories,
      totalTopics,
      totalKnowledgeAreas,
    };
  }

  // ==========================================
  // CATEGORY OPERATIONS
  // ==========================================
  static async getCategories(filters?: { search?: string; isActive?: boolean; moduleType?: string }): Promise<AcademicCategory[]> {
    const where: any = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.moduleType) {
      where.moduleType = { in: [filters.moduleType, 'GENERAL'] };
    }
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameKn: { contains: filters.search } },
      ];
    }

    const list = await prisma.academicCategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { studyMaterialMappings: true, mcqQuestions: true } },
          },
        },
        _count: { select: { subcategories: true, studyMaterialMappings: true, mcqQuestions: true } },
      },
    });

    return list.map((c) => ({
      ...c,
      subcategoryCount: c._count.subcategories,
      studyMaterialCount: c._count.studyMaterialMappings,
      mcqCount: c._count.mcqQuestions,
      bilingualReadiness: evaluateTaxonomyReadiness(c),
      subcategories: c.subcategories.map(sub => ({
        ...sub,
        studyMaterialCount: sub._count.studyMaterialMappings,
        mcqCount: sub._count.mcqQuestions,
        bilingualReadiness: evaluateTaxonomyReadiness(sub),
      }))
    }));
  }

  static async getCategoryById(id: string): Promise<AcademicCategory> {
    const cat = await prisma.academicCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { subcategories: true, studyMaterialMappings: true } },
      },
    });

    if (!cat) throw new TaxonomyError('Academic Category not found', 'ACADEMIC_CATEGORY_NOT_FOUND', 404);

    return {
      ...cat,
      subcategoryCount: cat._count.subcategories,
      studyMaterialCount: cat._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(cat),
    };
  }

  static async createCategory(payload: any, adminUserId: string): Promise<AcademicCategory> {
    const parsed = createCategorySchema.parse(payload);

    // Uniqueness Checks
    const existingCode = await prisma.academicCategory.findUnique({ where: { moduleType_code: { moduleType: parsed.moduleType, code: parsed.code } } });
    if (existingCode) throw new TaxonomyError(`Category code '${parsed.code}' already exists in this module`, 'ACADEMIC_CATEGORY_CODE_EXISTS', 409);

    const existingSlugEn = await prisma.academicCategory.findUnique({ where: { moduleType_slugEn: { moduleType: parsed.moduleType, slugEn: parsed.slugEn } } });
    if (existingSlugEn) throw new TaxonomyError(`English slug '${parsed.slugEn}' already exists in this module`, 'ACADEMIC_CATEGORY_SLUG_EXISTS', 409);

    const existingSlugKn = await prisma.academicCategory.findUnique({ where: { moduleType_slugKn: { moduleType: parsed.moduleType, slugKn: parsed.slugKn } } });
    if (existingSlugKn) throw new TaxonomyError(`Kannada slug '${parsed.slugKn}' already exists in this module`, 'ACADEMIC_CATEGORY_SLUG_EXISTS', 409);

    const created = await prisma.academicCategory.create({
      data: {
        ...parsed,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'CATEGORY_CREATED',
      recordType: 'AcademicCategory',
      recordId: created.id,
      newValue: created,
    });

    return this.getCategoryById(created.id);
  }

  static async updateCategory(id: string, payload: any, adminUserId: string): Promise<AcademicCategory> {
    const existing = await prisma.academicCategory.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Academic Category not found', 'ACADEMIC_CATEGORY_NOT_FOUND', 404);

    const parsed = updateCategorySchema.parse(payload);

    if (parsed.version !== undefined && parsed.version !== existing.version) {
      throw new TaxonomyError('Optimistic concurrency conflict. Record modified by another admin.', 'ACADEMIC_TAXONOMY_VERSION_CONFLICT', 409);
    }

    if (parsed.code && parsed.code !== existing.code) {
      const existingCode = await prisma.academicCategory.findUnique({ where: { moduleType_code: { moduleType: existing.moduleType, code: parsed.code } } });
      if (existingCode) throw new TaxonomyError(`Category code '${parsed.code}' already exists in this module`, 'ACADEMIC_CATEGORY_CODE_EXISTS', 409);
    }

    if (parsed.slugEn && parsed.slugEn !== existing.slugEn) {
      const existingSlug = await prisma.academicCategory.findUnique({ where: { moduleType_slugEn: { moduleType: existing.moduleType, slugEn: parsed.slugEn } } });
      if (existingSlug) throw new TaxonomyError(`English slug '${parsed.slugEn}' already exists in this module`, 'ACADEMIC_CATEGORY_SLUG_EXISTS', 409);
    }

    if (parsed.slugKn && parsed.slugKn !== existing.slugKn) {
      const existingSlug = await prisma.academicCategory.findUnique({ where: { moduleType_slugKn: { moduleType: existing.moduleType, slugKn: parsed.slugKn } } });
      if (existingSlug) throw new TaxonomyError(`Kannada slug '${parsed.slugKn}' already exists in this module`, 'ACADEMIC_CATEGORY_SLUG_EXISTS', 409);
    }

    const updated = await prisma.academicCategory.update({
      where: { id },
      data: {
        ...parsed,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'CATEGORY_UPDATED',
      recordType: 'AcademicCategory',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getCategoryById(id);
  }

  static async deleteCategory(id: string, adminUserId: string): Promise<{ success: boolean }> {
    const cat = await prisma.academicCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { subcategories: true, studyMaterialMappings: true } },
      },
    });

    if (!cat) throw new TaxonomyError('Academic Category not found', 'ACADEMIC_CATEGORY_NOT_FOUND', 404);

    if (cat._count.subcategories > 0 || cat._count.studyMaterialMappings > 0) {
      throw new TaxonomyError(
        `Cannot delete Category '${cat.nameEn}' because it has ${cat._count.subcategories} subcategories and ${cat._count.studyMaterialMappings} study material mappings. Please deactivate it instead.`,
        'ACADEMIC_CATEGORY_IN_USE',
        400
      );
    }

    await prisma.academicCategory.delete({ where: { id } });

    await createAuditLog({
      adminUserId,
      action: 'CATEGORY_DELETED',
      recordType: 'AcademicCategory',
      recordId: id,
      previousValue: cat,
    });

    return { success: true };
  }

  static async toggleCategoryActive(id: string, isActive: boolean, adminUserId: string): Promise<AcademicCategory> {
    const existing = await prisma.academicCategory.findUnique({
      where: { id },
      include: { _count: { select: { subcategories: true, studyMaterialMappings: true } } },
    });
    if (!existing) throw new TaxonomyError('Academic Category not found', 'ACADEMIC_CATEGORY_NOT_FOUND', 404);

    const updated = await prisma.academicCategory.update({
      where: { id },
      data: { isActive, updatedByAdminId: adminUserId, version: { increment: 1 } },
    });

    await createAuditLog({
      adminUserId,
      action: isActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
      recordType: 'AcademicCategory',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getCategoryById(id);
  }

  static async reorderCategories(items: Array<{ id: string; displayOrder: number }>, adminUserId: string): Promise<{ success: boolean }> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.academicCategory.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder, updatedByAdminId: adminUserId },
        })
      )
    );

    await createAuditLog({
      adminUserId,
      action: 'CATEGORIES_REORDERED',
      recordType: 'AcademicCategory',
      recordId: 'BULK',
      newValue: items,
    });

    return { success: true };
  }

  // ==========================================
  // SUBCATEGORY OPERATIONS
  // ==========================================
  static async getSubcategories(categoryId?: string, filters?: { search?: string; isActive?: boolean }): Promise<AcademicSubcategory[]> {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameKn: { contains: filters.search } },
      ];
    }

    const list = await prisma.academicSubcategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        category: { select: { nameEn: true, nameKn: true } },
        _count: { select: { topics: true, studyMaterialMappings: true } },
      },
    });

    return list.map((s) => ({
      ...s,
      categoryNameEn: s.category.nameEn,
      categoryNameKn: s.category.nameKn,
      topicCount: s._count.topics,
      studyMaterialCount: s._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(s),
    }));
  }

  static async getSubcategoryById(id: string): Promise<AcademicSubcategory> {
    const sub = await prisma.academicSubcategory.findUnique({
      where: { id },
      include: {
        category: { select: { nameEn: true, nameKn: true } },
        _count: { select: { topics: true, studyMaterialMappings: true } },
      },
    });

    if (!sub) throw new TaxonomyError('Academic Subcategory not found', 'ACADEMIC_SUBCATEGORY_NOT_FOUND', 404);

    return {
      ...sub,
      categoryNameEn: sub.category.nameEn,
      categoryNameKn: sub.category.nameKn,
      topicCount: sub._count.topics,
      studyMaterialCount: sub._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(sub),
    };
  }

  static async createSubcategory(payload: any, adminUserId: string): Promise<AcademicSubcategory> {
    const parsed = createSubcategorySchema.parse(payload);

    const category = await prisma.academicCategory.findUnique({ where: { id: parsed.categoryId } });
    if (!category) throw new TaxonomyError('Parent Category not found', 'ACADEMIC_SUBCATEGORY_PARENT_INVALID', 400);

    const existingCode = await prisma.academicSubcategory.findUnique({
      where: { categoryId_code: { categoryId: parsed.categoryId, code: parsed.code } },
    });
    if (existingCode) throw new TaxonomyError(`Subcategory code '${parsed.code}' already exists in this Category`, 'ACADEMIC_SUBCATEGORY_CODE_EXISTS', 409);

    const { moduleType, ...subcategoryData } = parsed as any;

    const created = await prisma.academicSubcategory.create({
      data: {
        ...subcategoryData,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'SUBCATEGORY_CREATED',
      recordType: 'AcademicSubcategory',
      recordId: created.id,
      newValue: created,
    });

    return this.getSubcategoryById(created.id);
  }

  static async updateSubcategory(id: string, payload: any, adminUserId: string): Promise<AcademicSubcategory> {
    const existing = await prisma.academicSubcategory.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Academic Subcategory not found', 'ACADEMIC_SUBCATEGORY_NOT_FOUND', 404);

    const parsed = updateSubcategorySchema.parse(payload);

    if (parsed.version !== undefined && parsed.version !== existing.version) {
      throw new TaxonomyError('Optimistic concurrency conflict.', 'ACADEMIC_TAXONOMY_VERSION_CONFLICT', 409);
    }

    const { moduleType, ...subcategoryData } = parsed as any;

    const updated = await prisma.academicSubcategory.update({
      where: { id },
      data: {
        ...subcategoryData,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'SUBCATEGORY_UPDATED',
      recordType: 'AcademicSubcategory',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getSubcategoryById(id);
  }

  static async moveSubcategory(id: string, targetCategoryId: string, reason?: string, adminUserId?: string): Promise<{ success: boolean; affectedMappings: number }> {
    const sub = await prisma.academicSubcategory.findUnique({
      where: { id },
      include: { _count: { select: { studyMaterialMappings: true } } },
    });
    if (!sub) throw new TaxonomyError('Academic Subcategory not found', 'ACADEMIC_SUBCATEGORY_NOT_FOUND', 404);

    const targetCategory = await prisma.academicCategory.findUnique({ where: { id: targetCategoryId } });
    if (!targetCategory) throw new TaxonomyError('Target parent Category not found', 'ACADEMIC_SUBCATEGORY_PARENT_INVALID', 400);

    const duplicateCode = await prisma.academicSubcategory.findUnique({
      where: { categoryId_code: { categoryId: targetCategoryId, code: sub.code } },
    });
    if (duplicateCode) throw new TaxonomyError(`Code '${sub.code}' already exists under destination Category '${targetCategory.nameEn}'`, 'ACADEMIC_SUBCATEGORY_CODE_EXISTS', 409);

    await prisma.$transaction([
      prisma.academicSubcategory.update({
        where: { id },
        data: { categoryId: targetCategoryId, updatedByAdminId: adminUserId, version: { increment: 1 } },
      }),
      // Update taxonomy mappings matching this subcategory to point to new categoryId
      prisma.studyMaterialTaxonomyMapping.updateMany({
        where: { subcategoryId: id },
        data: { categoryId: targetCategoryId },
      }),
    ]);

    await createAuditLog({
      adminUserId,
      action: 'SUBCATEGORY_MOVED',
      recordType: 'AcademicSubcategory',
      recordId: id,
      previousValue: { categoryId: sub.categoryId },
      newValue: { categoryId: targetCategoryId },
      reason,
    });

    return { success: true, affectedMappings: sub._count.studyMaterialMappings };
  }

  static async deleteSubcategory(id: string, adminUserId: string): Promise<{ success: boolean }> {
    const sub = await prisma.academicSubcategory.findUnique({
      where: { id },
      include: { _count: { select: { topics: true, studyMaterialMappings: true } } },
    });
    if (!sub) throw new TaxonomyError('Academic Subcategory not found', 'ACADEMIC_SUBCATEGORY_NOT_FOUND', 404);

    if (sub._count.studyMaterialMappings > 0) {
      throw new TaxonomyError(
        `Cannot delete Subcategory '${sub.nameEn}' because it has ${sub._count.studyMaterialMappings} study material mappings.`,
        'ACADEMIC_SUBCATEGORY_IN_USE',
        400
      );
    }

    await prisma.academicSubcategory.delete({ where: { id } });

    await createAuditLog({
      adminUserId,
      action: 'SUBCATEGORY_DELETED',
      recordType: 'AcademicSubcategory',
      recordId: id,
      previousValue: sub,
    });

    return { success: true };
  }

  static async toggleSubcategoryActive(id: string, isActive: boolean, adminUserId: string): Promise<AcademicSubcategory> {
    const existing = await prisma.academicSubcategory.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Subcategory not found', 'ACADEMIC_SUBCATEGORY_NOT_FOUND', 404);

    const updated = await prisma.academicSubcategory.update({
      where: { id },
      data: { isActive, updatedByAdminId: adminUserId, version: { increment: 1 } },
    });

    await createAuditLog({
      adminUserId,
      action: isActive ? 'SUBCATEGORY_ACTIVATED' : 'SUBCATEGORY_DEACTIVATED',
      recordType: 'AcademicSubcategory',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getSubcategoryById(id);
  }

  static async reorderSubcategories(items: Array<{ id: string; displayOrder: number }>, adminUserId: string): Promise<{ success: boolean }> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.academicSubcategory.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder, updatedByAdminId: adminUserId },
        })
      )
    );
    return { success: true };
  }

  // ==========================================
  // TOPIC OPERATIONS
  // ==========================================
  static async getTopics(subcategoryId?: string, filters?: { search?: string; isActive?: boolean }): Promise<AcademicTopic[]> {
    const where: any = {};
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameKn: { contains: filters.search } },
      ];
    }

    const list = await prisma.academicTopic.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategory: {
          select: { nameEn: true, nameKn: true, category: { select: { nameEn: true, nameKn: true } } },
        },
        _count: { select: { knowledgeAreas: true, studyMaterialMappings: true } },
      },
    });

    return list.map((t) => ({
      ...t,
      subcategoryNameEn: t.subcategory.nameEn,
      subcategoryNameKn: t.subcategory.nameKn,
      categoryNameEn: t.subcategory.category.nameEn,
      categoryNameKn: t.subcategory.category.nameKn,
      knowledgeAreaCount: t._count.knowledgeAreas,
      studyMaterialCount: t._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(t),
    }));
  }

  static async getTopicById(id: string): Promise<AcademicTopic> {
    const top = await prisma.academicTopic.findUnique({
      where: { id },
      include: {
        subcategory: {
          select: { nameEn: true, nameKn: true, category: { select: { nameEn: true, nameKn: true } } },
        },
        _count: { select: { knowledgeAreas: true, studyMaterialMappings: true } },
      },
    });

    if (!top) throw new TaxonomyError('Academic Topic not found', 'ACADEMIC_TOPIC_NOT_FOUND', 404);

    return {
      ...top,
      subcategoryNameEn: top.subcategory.nameEn,
      subcategoryNameKn: top.subcategory.nameKn,
      categoryNameEn: top.subcategory.category.nameEn,
      categoryNameKn: top.subcategory.category.nameKn,
      knowledgeAreaCount: top._count.knowledgeAreas,
      studyMaterialCount: top._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(top),
    };
  }

  static async createTopic(payload: any, adminUserId: string): Promise<AcademicTopic> {
    const parsed = createTopicSchema.parse(payload);

    const subcategory = await prisma.academicSubcategory.findUnique({ where: { id: parsed.subcategoryId } });
    if (!subcategory) throw new TaxonomyError('Parent Subcategory not found', 'ACADEMIC_TOPIC_PARENT_INVALID', 400);

    const existingCode = await prisma.academicTopic.findUnique({
      where: { subcategoryId_code: { subcategoryId: parsed.subcategoryId, code: parsed.code } },
    });
    if (existingCode) throw new TaxonomyError(`Topic code '${parsed.code}' already exists in this Subcategory`, 'ACADEMIC_TOPIC_CODE_EXISTS', 409);

    const { moduleType, ...topicData } = parsed as any;

    const created = await prisma.academicTopic.create({
      data: {
        ...topicData,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'TOPIC_CREATED',
      recordType: 'AcademicTopic',
      recordId: created.id,
      newValue: created,
    });

    return this.getTopicById(created.id);
  }

  static async updateTopic(id: string, payload: any, adminUserId: string): Promise<AcademicTopic> {
    const existing = await prisma.academicTopic.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Academic Topic not found', 'ACADEMIC_TOPIC_NOT_FOUND', 404);

    const parsed = updateTopicSchema.parse(payload);

    const { moduleType, ...topicData } = parsed as any;

    const updated = await prisma.academicTopic.update({
      where: { id },
      data: {
        ...topicData,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'TOPIC_UPDATED',
      recordType: 'AcademicTopic',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getTopicById(id);
  }

  static async moveTopic(id: string, targetSubcategoryId: string, reason?: string, adminUserId?: string): Promise<{ success: boolean; affectedMappings: number }> {
    const top = await prisma.academicTopic.findUnique({
      where: { id },
      include: { _count: { select: { studyMaterialMappings: true } } },
    });
    if (!top) throw new TaxonomyError('Academic Topic not found', 'ACADEMIC_TOPIC_NOT_FOUND', 404);

    const targetSubcategory = await prisma.academicSubcategory.findUnique({ where: { id: targetSubcategoryId } });
    if (!targetSubcategory) throw new TaxonomyError('Target parent Subcategory not found', 'ACADEMIC_TOPIC_PARENT_INVALID', 400);

    const duplicateCode = await prisma.academicTopic.findUnique({
      where: { subcategoryId_code: { subcategoryId: targetSubcategoryId, code: top.code } },
    });
    if (duplicateCode) throw new TaxonomyError(`Code '${top.code}' already exists under destination Subcategory '${targetSubcategory.nameEn}'`, 'ACADEMIC_TOPIC_CODE_EXISTS', 409);

    await prisma.$transaction([
      prisma.academicTopic.update({
        where: { id },
        data: { subcategoryId: targetSubcategoryId, updatedByAdminId: adminUserId, version: { increment: 1 } },
      }),
      prisma.studyMaterialTaxonomyMapping.updateMany({
        where: { topicId: id },
        data: { subcategoryId: targetSubcategoryId, categoryId: targetSubcategory.categoryId },
      }),
    ]);

    await createAuditLog({
      adminUserId,
      action: 'TOPIC_MOVED',
      recordType: 'AcademicTopic',
      recordId: id,
      previousValue: { subcategoryId: top.subcategoryId },
      newValue: { subcategoryId: targetSubcategoryId },
      reason,
    });

    return { success: true, affectedMappings: top._count.studyMaterialMappings };
  }

  static async deleteTopic(id: string, adminUserId: string): Promise<{ success: boolean }> {
    const top = await prisma.academicTopic.findUnique({
      where: { id },
      include: { _count: { select: { knowledgeAreas: true, studyMaterialMappings: true } } },
    });
    if (!top) throw new TaxonomyError('Academic Topic not found', 'ACADEMIC_TOPIC_NOT_FOUND', 404);

    if (top._count.studyMaterialMappings > 0) {
      throw new TaxonomyError(
        `Cannot delete Topic '${top.nameEn}' because it has ${top._count.studyMaterialMappings} study material mappings.`,
        'ACADEMIC_TOPIC_IN_USE',
        400
      );
    }

    await prisma.academicTopic.delete({ where: { id } });

    await createAuditLog({
      adminUserId,
      action: 'TOPIC_DELETED',
      recordType: 'AcademicTopic',
      recordId: id,
      previousValue: top,
    });

    return { success: true };
  }

  static async toggleTopicActive(id: string, isActive: boolean, adminUserId: string): Promise<AcademicTopic> {
    const existing = await prisma.academicTopic.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Topic not found', 'ACADEMIC_TOPIC_NOT_FOUND', 404);

    const updated = await prisma.academicTopic.update({
      where: { id },
      data: { isActive, updatedByAdminId: adminUserId, version: { increment: 1 } },
    });

    await createAuditLog({
      adminUserId,
      action: isActive ? 'TOPIC_ACTIVATED' : 'TOPIC_DEACTIVATED',
      recordType: 'AcademicTopic',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getTopicById(id);
  }

  static async reorderTopics(items: Array<{ id: string; displayOrder: number }>, adminUserId: string): Promise<{ success: boolean }> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.academicTopic.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder, updatedByAdminId: adminUserId },
        })
      )
    );
    return { success: true };
  }

  // ==========================================
  // KNOWLEDGE AREA OPERATIONS
  // ==========================================
  static async getKnowledgeAreas(topicId?: string, filters?: { search?: string; isActive?: boolean }): Promise<AcademicKnowledgeArea[]> {
    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameKn: { contains: filters.search } },
      ];
    }

    const list = await prisma.academicKnowledgeArea.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        topic: { select: { nameEn: true, nameKn: true } },
        _count: { select: { studyMaterialMappings: true } },
      },
    });

    return list.map((ka) => ({
      ...ka,
      topicNameEn: ka.topic.nameEn,
      topicNameKn: ka.topic.nameKn,
      studyMaterialCount: ka._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(ka),
    }));
  }

  static async getKnowledgeAreaById(id: string): Promise<AcademicKnowledgeArea> {
    const ka = await prisma.academicKnowledgeArea.findUnique({
      where: { id },
      include: {
        topic: { select: { nameEn: true, nameKn: true } },
        _count: { select: { studyMaterialMappings: true } },
      },
    });

    if (!ka) throw new TaxonomyError('Academic Knowledge Area not found', 'ACADEMIC_KNOWLEDGE_AREA_NOT_FOUND', 404);

    return {
      ...ka,
      topicNameEn: ka.topic.nameEn,
      topicNameKn: ka.topic.nameKn,
      studyMaterialCount: ka._count.studyMaterialMappings,
      bilingualReadiness: evaluateTaxonomyReadiness(ka),
    };
  }

  static async createKnowledgeArea(payload: any, adminUserId: string): Promise<AcademicKnowledgeArea> {
    const parsed = createKnowledgeAreaSchema.parse(payload);

    const topic = await prisma.academicTopic.findUnique({ where: { id: parsed.topicId } });
    if (!topic) throw new TaxonomyError('Parent Topic not found', 'ACADEMIC_KNOWLEDGE_AREA_PARENT_INVALID', 400);

    const existingCode = await prisma.academicKnowledgeArea.findUnique({
      where: { topicId_code: { topicId: parsed.topicId, code: parsed.code } },
    });
    if (existingCode) throw new TaxonomyError(`Knowledge Area code '${parsed.code}' already exists in this Topic`, 'ACADEMIC_KNOWLEDGE_AREA_CODE_EXISTS', 409);

    const { moduleType, ...kaData } = parsed as any;

    const created = await prisma.academicKnowledgeArea.create({
      data: {
        ...kaData,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'KNOWLEDGE_AREA_CREATED',
      recordType: 'AcademicKnowledgeArea',
      recordId: created.id,
      newValue: created,
    });

    return this.getKnowledgeAreaById(created.id);
  }

  static async updateKnowledgeArea(id: string, payload: any, adminUserId: string): Promise<AcademicKnowledgeArea> {
    const existing = await prisma.academicKnowledgeArea.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Academic Knowledge Area not found', 'ACADEMIC_KNOWLEDGE_AREA_NOT_FOUND', 404);

    const parsed = updateKnowledgeAreaSchema.parse(payload);

    const { moduleType, ...kaData } = parsed as any;

    const updated = await prisma.academicKnowledgeArea.update({
      where: { id },
      data: {
        ...kaData,
        updatedByAdminId: adminUserId,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'KNOWLEDGE_AREA_UPDATED',
      recordType: 'AcademicKnowledgeArea',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getKnowledgeAreaById(id);
  }

  static async moveKnowledgeArea(id: string, targetTopicId: string, reason?: string, adminUserId?: string): Promise<{ success: boolean; affectedMappings: number }> {
    const ka = await prisma.academicKnowledgeArea.findUnique({
      where: { id },
      include: { _count: { select: { studyMaterialMappings: true } } },
    });
    if (!ka) throw new TaxonomyError('Academic Knowledge Area not found', 'ACADEMIC_KNOWLEDGE_AREA_NOT_FOUND', 404);

    const targetTopic = await prisma.academicTopic.findUnique({
      where: { id: targetTopicId },
      include: { subcategory: true },
    });
    if (!targetTopic) throw new TaxonomyError('Target parent Topic not found', 'ACADEMIC_KNOWLEDGE_AREA_PARENT_INVALID', 400);

    const duplicateCode = await prisma.academicKnowledgeArea.findUnique({
      where: { topicId_code: { topicId: targetTopicId, code: ka.code } },
    });
    if (duplicateCode) throw new TaxonomyError(`Code '${ka.code}' already exists under destination Topic '${targetTopic.nameEn}'`, 'ACADEMIC_KNOWLEDGE_AREA_CODE_EXISTS', 409);

    await prisma.$transaction([
      prisma.academicKnowledgeArea.update({
        where: { id },
        data: { topicId: targetTopicId, updatedByAdminId: adminUserId, version: { increment: 1 } },
      }),
      prisma.studyMaterialTaxonomyMapping.updateMany({
        where: { knowledgeAreaId: id },
        data: {
          topicId: targetTopicId,
          subcategoryId: targetTopic.subcategoryId,
          categoryId: targetTopic.subcategory.categoryId,
        },
      }),
    ]);

    await createAuditLog({
      adminUserId,
      action: 'KNOWLEDGE_AREA_MOVED',
      recordType: 'AcademicKnowledgeArea',
      recordId: id,
      previousValue: { topicId: ka.topicId },
      newValue: { topicId: targetTopicId },
      reason,
    });

    return { success: true, affectedMappings: ka._count.studyMaterialMappings };
  }

  static async deleteKnowledgeArea(id: string, adminUserId: string): Promise<{ success: boolean }> {
    const ka = await prisma.academicKnowledgeArea.findUnique({
      where: { id },
      include: { _count: { select: { studyMaterialMappings: true } } },
    });
    if (!ka) throw new TaxonomyError('Academic Knowledge Area not found', 'ACADEMIC_KNOWLEDGE_AREA_NOT_FOUND', 404);

    if (ka._count.studyMaterialMappings > 0) {
      throw new TaxonomyError(
        `Cannot delete Knowledge Area '${ka.nameEn}' because it has ${ka._count.studyMaterialMappings} study material mappings.`,
        'ACADEMIC_KNOWLEDGE_AREA_IN_USE',
        400
      );
    }

    await prisma.academicKnowledgeArea.delete({ where: { id } });

    await createAuditLog({
      adminUserId,
      action: 'KNOWLEDGE_AREA_DELETED',
      recordType: 'AcademicKnowledgeArea',
      recordId: id,
      previousValue: ka,
    });

    return { success: true };
  }

  static async toggleKnowledgeAreaActive(id: string, isActive: boolean, adminUserId: string): Promise<AcademicKnowledgeArea> {
    const existing = await prisma.academicKnowledgeArea.findUnique({ where: { id } });
    if (!existing) throw new TaxonomyError('Knowledge Area not found', 'ACADEMIC_KNOWLEDGE_AREA_NOT_FOUND', 404);

    const updated = await prisma.academicKnowledgeArea.update({
      where: { id },
      data: { isActive, updatedByAdminId: adminUserId, version: { increment: 1 } },
    });

    await createAuditLog({
      adminUserId,
      action: isActive ? 'KNOWLEDGE_AREA_ACTIVATED' : 'KNOWLEDGE_AREA_DEACTIVATED',
      recordType: 'AcademicKnowledgeArea',
      recordId: id,
      previousValue: existing,
      newValue: updated,
    });

    return this.getKnowledgeAreaById(id);
  }

  static async reorderKnowledgeAreas(items: Array<{ id: string; displayOrder: number }>, adminUserId: string): Promise<{ success: boolean }> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.academicKnowledgeArea.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder, updatedByAdminId: adminUserId },
        })
      )
    );
    return { success: true };
  }
}
