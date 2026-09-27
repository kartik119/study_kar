import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.adminUser.findMany({
    include: { adminRoles: true }
  });
  console.log('Total users:', users.length);
  console.dir(users, { depth: null });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
