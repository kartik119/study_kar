const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  console.log('Cleaning up dummy data...');

  // 1. Delete all team members (AdminUsers) EXCEPT admin@studykarnataka.in (or the primary super admin)
  // Let's first find the super admin
  const superAdmin = await prisma.adminUser.findFirst({
    where: { email: 'admin@studykarnataka.in' } // adjust if email is different
  });

  if (superAdmin) {
    console.log('Keeping super admin:', superAdmin.email);
    // Delete exam scopes and module accesses for others
    await prisma.adminExamScope.deleteMany({
      where: { adminUserId: { not: superAdmin.id } }
    });
    await prisma.adminModuleAccess.deleteMany({
      where: { adminUserId: { not: superAdmin.id } }
    });
    await prisma.adminRole.deleteMany({
      where: { adminUserId: { not: superAdmin.id } }
    });
    
    const deletedUsers = await prisma.adminUser.deleteMany({
      where: { id: { not: superAdmin.id } }
    });
    console.log(`Deleted ${deletedUsers.count} dummy admin users.`);
  } else {
    console.log('No super admin found with admin@studykarnataka.in, skipping admin deletion to be safe.');
  }

  // 2. Delete all roles EXCEPT SUPER_ADMIN and ADMIN (the system roles)
  const deletedRoles = await prisma.role.deleteMany({
    where: { isSystem: false }
  });
  console.log(`Deleted ${deletedRoles.count} dummy roles.`);

  // 3. Clear audit logs for a clean slate
  const deletedLogs = await prisma.adminAuditLog.deleteMany({});
  console.log(`Deleted ${deletedLogs.count} audit logs.`);

}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
