const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.adminUser.findMany({ select: { id: true, email: true, accountStatus: true } });
  console.log('Users:', users);
  
  const sessions = await prisma.userSession.findMany({ select: { id: true, userId: true } });
  console.log('Sessions:', sessions);
}

check().catch(console.error).finally(() => prisma.$disconnect());
