const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixName() {
  await prisma.adminUser.updateMany({
    where: { email: 'admin@studykarnataka.in' },
    data: { fullName: 'Platform Administrator' }
  });
  console.log('Renamed admin user to Platform Administrator');
}

fixName().catch(console.error).finally(() => prisma.$disconnect());
