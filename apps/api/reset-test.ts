import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.testSequenceCounter.upsert({
    where: { id: 'singleton' },
    update: { lastValue: 0 },
    create: { id: 'singleton', lastValue: 0 },
  });
  console.log('Reset test counter to:', r.lastValue);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
