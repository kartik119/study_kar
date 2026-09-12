import { prisma } from '@study-karnataka/database';
import { CurrentAffairStatus } from '@prisma/client';

export class CurrentAffairsError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'CurrentAffairsError';
  }
}

export class CurrentAffairsService {
  static async listCurrentAffairs(filters: any) {
    const { search, categoryId, sourceId, status, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { titleEn: { contains: search, mode: 'insensitive' } },
        { titleKn: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (sourceId) where.sourceId = sourceId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.currentAffair.count({ where }),
      prisma.currentAffair.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          source: true,
          exams: { include: { examCycle: true } },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async getById(id: string) {
    const item = await prisma.currentAffair.findUnique({
      where: { id },
      include: {
        category: true,
        source: true,
        exams: true,
        stages: true,
        categoriesMapped: true,
        topicsMapped: true,
        tags: true,
      },
    });
    if (!item || item.deletedAt) throw new CurrentAffairsError('Current affair not found', 'NOT_FOUND', 404);
    return item;
  }

  static async create(data: any, adminUserId: string) {
    const { exams, stages, subjects, topics, tags, ...rest } = data;
    
    // Ensure slug is unique, simple slug logic for draft if not provided
    const slug = rest.slug || rest.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    return prisma.currentAffair.create({
      data: {
        ...rest,
        slug,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
        exams: exams ? { create: exams.map((examId: string) => ({ examCycleId: examId })) } : undefined,
        stages: stages ? { create: stages.map((stageId: string) => ({ examStageId: stageId })) } : undefined,
        categoriesMapped: subjects ? { create: subjects.map((catId: string) => ({ categoryId: catId })) } : undefined,
        topicsMapped: topics ? { create: topics.map((topId: string) => ({ topicId: topId })) } : undefined,
      },
    });
  }

  static async update(id: string, data: any, adminUserId: string) {
    const { exams, stages, subjects, topics, tags, ...rest } = data;
    const existing = await this.getById(id);

    return prisma.$transaction(async (tx) => {
      if (exams) await tx.currentAffairExam.deleteMany({ where: { currentAffairId: id } });
      if (stages) await tx.currentAffairStage.deleteMany({ where: { currentAffairId: id } });
      if (subjects) await tx.currentAffairAcademicCategory.deleteMany({ where: { currentAffairId: id } });
      if (topics) await tx.currentAffairAcademicTopic.deleteMany({ where: { currentAffairId: id } });

      return tx.currentAffair.update({
        where: { id },
        data: {
          ...rest,
          updatedByAdminId: adminUserId,
          exams: exams ? { create: exams.map((eid: string) => ({ examCycleId: eid })) } : undefined,
          stages: stages ? { create: stages.map((sid: string) => ({ examStageId: sid })) } : undefined,
          categoriesMapped: subjects ? { create: subjects.map((cid: string) => ({ categoryId: cid })) } : undefined,
          topicsMapped: topics ? { create: topics.map((tid: string) => ({ topicId: tid })) } : undefined,
        },
      });
    });
  }

  static async softDelete(id: string, adminUserId: string) {
    return prisma.currentAffair.update({
      where: { id },
      data: { status: 'TRASH', deletedAt: new Date(), updatedByAdminId: adminUserId },
    });
  }

  static async publish(id: string, adminUserId: string) {
    return prisma.currentAffair.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), updatedByAdminId: adminUserId },
    });
  }

  static async duplicate(id: string, adminUserId: string) {
    const existing = await this.getById(id);
    const newSlug = existing.slug + '-copy-' + Date.now();

    const { id: _, slug, status, publishedAt, deletedAt, createdByAdminId, updatedByAdminId, createdAt, updatedAt, exams, stages, categoriesMapped, topicsMapped, tags, category, source, ...copyData } = existing as any;

    return prisma.currentAffair.create({
      data: {
        ...copyData,
        slug: newSlug,
        status: 'DRAFT',
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
        titleEn: existing.titleEn + ' (Copy)',
      }
    });
  }

  static async getCategories() {
    return prisma.currentAffairCategory.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  }

  static async createCategory(data: any) {
    return prisma.currentAffairCategory.create({
      data: {
        nameEn: data.nameEn,
        nameKn: data.nameKn || data.nameEn,
        slug: data.slug || data.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        isActive: true,
      }
    });
  }

  static async deleteCategory(id: string) {
    return prisma.currentAffairCategory.delete({ where: { id } });
  }

  static async getSources() {
    return prisma.currentAffairSource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  static async createSource(data: any) {
    return prisma.currentAffairSource.create({
      data: {
        name: data.name,
        isActive: true,
      }
    });
  }

  static async deleteSource(id: string) {
    return prisma.currentAffairSource.delete({ where: { id } });
  }

  static async getTags() {
    return prisma.currentAffairTag.findMany({ orderBy: { name: 'asc' } });
  }

  static async getCalendar(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await prisma.currentAffair.findMany({
      where: {
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PUBLISHED', 'DRAFT', 'SCHEDULED', 'TRASH']
        },
        deletedAt: null
      },
      select: {
        id: true,
        publishedAt: true,
        status: true,
      }
    });

    const countsByDate: Record<string, any> = {};

    records.forEach(record => {
      if (!record.publishedAt) return;
      const dateKey = record.publishedAt.toISOString().split('T')[0];
      if (!countsByDate[dateKey]) {
        countsByDate[dateKey] = { date: dateKey, total: 0, publishedCount: 0, draftCount: 0, scheduledCount: 0, trashCount: 0 };
      }
      
      countsByDate[dateKey].total += 1;
      if (record.status === 'PUBLISHED') countsByDate[dateKey].publishedCount += 1;
      else if (record.status === 'DRAFT') countsByDate[dateKey].draftCount += 1;
      else if (record.status === 'SCHEDULED') countsByDate[dateKey].scheduledCount += 1;
      else if (record.status === 'TRASH') countsByDate[dateKey].trashCount += 1;
    });

    return Object.values(countsByDate);
  }
}
