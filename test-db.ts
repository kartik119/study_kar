import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.examCycle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      programme: {
        include: { authority: true }
      }
    }
  });
  
  exams.forEach(e => {
    console.log({
      id: e.id,
      code: e.cycleCode,
      logoLen: e.logoUrl ? e.logoUrl.length : 0,
      authLogoLen: e.programme?.authority?.logoUrl ? e.programme.authority.logoUrl.length : 0
    });
  });
}

main().finally(() => process.exit(0));
