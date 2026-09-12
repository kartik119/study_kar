import { prisma } from '@study-karnataka/database';
import { PdfType, PdfLanguage } from '@prisma/client';
import { CurrentAffairsError } from './current-affairs.service';

export class CurrentAffairsPdfService {
  static async listPdfs(filters: any) {
    const { type, language, status, page = 1, pageSize = 20 } = filters;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (language) where.language = language;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.currentAffairPdf.count({ where }),
      prisma.currentAffairPdf.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  static async getById(id: string) {
    const item = await prisma.currentAffairPdf.findUnique({ where: { id } });
    if (!item) throw new CurrentAffairsError('PDF not found', 'NOT_FOUND', 404);
    return item;
  }

  static async create(data: any, adminUserId: string) {
    return prisma.currentAffairPdf.create({
      data: {
        ...data,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId,
      },
    });
  }

  static async update(id: string, data: any, adminUserId: string) {
    return prisma.currentAffairPdf.update({
      where: { id },
      data: {
        ...data,
        updatedByAdminId: adminUserId,
      },
    });
  }

  static async delete(id: string) {
    return prisma.currentAffairPdf.delete({ where: { id } });
  }
}
