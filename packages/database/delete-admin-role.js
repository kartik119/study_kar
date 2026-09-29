const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeAdminRole() {
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });
  
  const adminRole = await prisma.role.findFirst({
    where: { code: 'ADMIN' }
  });

  const adminUser = await prisma.adminUser.findFirst({
    where: { email: 'admin@studykarnataka.in' }
  });

  // Assign user to Super Admin
  if (adminUser && superAdminRole) {
    const existing = await prisma.adminRole.findFirst({
      where: { adminUserId: adminUser.id, roleId: superAdminRole.id }
    });
    if (!existing) {
      await prisma.adminRole.create({
        data: { adminUserId: adminUser.id, roleId: superAdminRole.id }
      });
      console.log('Assigned Super Admin to the user.');
    }
  }

  // Delete Admin role
  if (adminRole) {
    await prisma.role.delete({
      where: { id: adminRole.id }
    });
    console.log('Deleted Admin role.');
  }
}

removeAdminRole().catch(console.error).finally(() => prisma.$disconnect());
