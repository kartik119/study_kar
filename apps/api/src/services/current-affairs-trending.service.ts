import { prisma } from '@study-karnataka/database';
import { CurrentAffairsError } from './current-affairs.service';

export class CurrentAffairsTrendingTopicService {
  static async listTopics() {
    return prisma.currentAffairTrendingTopic.findMany({
      orderBy: [{ priority: 'desc' }, { displayOrder: 'asc' }],
    });
  }

  static async getById(id: string) {
    const item = await prisma.currentAffairTrendingTopic.findUnique({ where: { id } });
    if (!item) throw new CurrentAffairsError('Trending topic not found', 'NOT_FOUND', 404);
    return item;
  }

  static async create(data: any) {
    return prisma.currentAffairTrendingTopic.create({
      data,
    });
  }

  static async update(id: string, data: any) {
    return prisma.currentAffairTrendingTopic.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.currentAffairTrendingTopic.delete({ where: { id } });
  }
}
