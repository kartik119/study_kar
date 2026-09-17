// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import { AcademicStage } from '@study-karnataka/shared-types';
import { createAcademicStageSchema, updateAcademicStageSchema } from '@study-karnataka/validation';

export class AcademicStageService {
  static async getAllStages(): Promise<AcademicStage[]> {
    return prisma.academicStage.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  static async getStageById(id: string): Promise<AcademicStage | null> {
    return prisma.academicStage.findUnique({
      where: { id },
    });
  }

  static async createStage(data: any): Promise<AcademicStage> {
    const validated = createAcademicStageSchema.parse(data);
    
    const existing = await prisma.academicStage.findUnique({
      where: { code: validated.code }
    });
    
    if (existing) {
      throw new Error('A stage with this code already exists.');
    }

    return prisma.academicStage.create({
      data: validated,
    });
  }

  static async updateStage(id: string, data: any): Promise<AcademicStage> {
    const validated = updateAcademicStageSchema.parse(data);
    
    if (validated.code) {
      const existing = await prisma.academicStage.findUnique({
        where: { code: validated.code }
      });
      if (existing && existing.id !== id) {
        throw new Error('A stage with this code already exists.');
      }
    }

    return prisma.academicStage.update({
      where: { id },
      data: validated,
    });
  }

  static async deleteStage(id: string): Promise<void> {
    await prisma.academicStage.delete({
      where: { id },
    });
  }
}
