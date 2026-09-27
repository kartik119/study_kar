import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';

async function main() {
  const exams = await prisma.examCycle.findMany({
    select: { id: true, titleEn: true, cycleCode: true, status: true },
  });
  console.log('Exams in DB:');
  console.log(JSON.stringify(exams, null, 2));

  const existingModules = await prisma.subscriptionModule.findMany({
    select: { id: true, name: true, code: true, moduleType: true, scopeType: true, accessType: true, status: true, exam: { select: { titleEn: true } } },
  });
  console.log('Existing Modules:');
  console.log(JSON.stringify(existingModules, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
