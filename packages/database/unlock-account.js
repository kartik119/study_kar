const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unlock() {
  const email = 'admin@studykarnataka.in';
  
  await prisma.adminUser.update({
    where: { email },
    data: { 
      failedLoginCount: 0,
      accountStatus: 'ACTIVE'
    }
  });
  
  console.log('Account unlocked!');
}

unlock().catch(console.error).finally(() => prisma.$disconnect());
