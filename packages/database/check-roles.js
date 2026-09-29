const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  const user = await prisma.adminUser.findFirst({
    where: { email: 'admin@studykarnataka.in' },
    include: {
      adminRoles: {
        include: { role: true }
      }
    }
  });
  console.log(JSON.stringify(user.adminRoles, null, 2));
}

checkAdminUser().catch(console.error).finally(() => prisma.$disconnect());
