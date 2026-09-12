import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from './seedData';
export * from './seed';
export * from './mcq-demo-seed';

let globalPrisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }
  if (!globalPrisma) {
    globalPrisma = new PrismaClient();
  }
  return globalPrisma;
}

export const prisma = getPrismaClient();

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
