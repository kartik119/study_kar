// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import { CurrentAffairsError } from './current-affairs.service';

export class CurrentAffairsQuizService {
  static async listQuizzes(filters: any) {
    const { page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;

    const where: any = { currentAffairId: { not: null } };

    const [total, items] = await Promise.all([
      prisma.mcqQuestion.count({ where }),
      prisma.mcqQuestion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { currentAffair: { select: { titleEn: true, publishedAt: true } } }
      }),
    ]);

    return {
      items,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async getById(id: string) {
    const item = await prisma.mcqQuestion.findUnique({ where: { id }, include: { currentAffair: true } });
    if (!item) throw new CurrentAffairsError('Quiz question not found', 'NOT_FOUND', 404);
    return item;
  }

  static async create(data: any, adminUserId: string) {
    return prisma.mcqQuestion.create({
      data: {
        ...data,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });
  }

  static async update(id: string, data: any, adminUserId: string) {
    return prisma.mcqQuestion.update({
      where: { id },
      data: {
        ...data,
        updatedByAdminId: adminUserId,
      },
    });
  }

  static async delete(id: string) {
    return prisma.mcqQuestion.delete({ where: { id } });
  }
}
