const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanRoles() {
  // 1. Get the admin role
  const adminRole = await prisma.role.findFirst({
    where: { code: 'ADMIN' }
  });
  
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });

  const rolesToKeep = [adminRole.id, superAdminRole.id].filter(Boolean);

  // 2. Delete all other roles (dummy roles)
  const result = await prisma.role.deleteMany({
    where: {
      id: { notIn: rolesToKeep }
    }
  });

  console.log(`Deleted ${result.count} dummy roles.`);

  // 3. Ensure the active admin user is assigned to the ADMIN role
  const adminUser = await prisma.adminUser.findFirst({
    where: { email: 'admin@studykarnataka.in' }
  });

  if (adminUser && adminRole) {
    // Check if mapping already exists
    const existingMap = await prisma.adminRole.findFirst({
      where: {
        adminUserId: adminUser.id,
        roleId: adminRole.id
      }
    });

    if (!existingMap) {
      await prisma.adminRole.create({
        data: {
          adminUserId: adminUser.id,
          roleId: adminRole.id
        }
      });
      console.log('Assigned ADMIN role to Platform Administrator');
    }
  }
}

cleanRoles().catch(console.error).finally(() => prisma.$disconnect());
