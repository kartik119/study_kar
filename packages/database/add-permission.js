const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perm = await prisma.permission.upsert({
    where: { code: 'team.activity_logs.view' },
    update: {},
    create: {
      code: 'team.activity_logs.view',
      name: 'View Team Activity Logs',
      description: 'View Team Activity Logs'
    }
  });

  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'SUPER_ADMIN' }
  });

  if (superAdminRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id
      }
    });
  }

  console.log('Permission added');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
