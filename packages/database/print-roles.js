const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const roles = await prisma.role.findMany({ select: { name: true, code: true, isSystem: true } });
  console.log(roles);
}

run().catch(console.error).finally(() => prisma.$disconnect());
