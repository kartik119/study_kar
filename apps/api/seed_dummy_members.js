const { PrismaClient } = require('@study-karnataka/database');
const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: 'Admin', code: 'ADMIN' },
    { name: 'Content Manager', code: 'CONTENT_MANAGER' },
    { name: 'Content Reviewer', code: 'CONTENT_REVIEWER' },
    { name: 'Mentor', code: 'MENTOR' },
    { name: 'Support Executive', code: 'SUPPORT_EXECUTIVE' }
  ];
  
  for (const r of roles) {
    let role = await prisma.role.findFirst({ where: { name: r.name }});
    if (!role) { role = await prisma.role.create({ data: { name: r.name }}); }
    
    // check if user exists
    const exists = await prisma.adminUser.findFirst({ where: { email: r.code.toLowerCase() + '@studykarnataka.in' } });
    if (!exists) {
      await prisma.adminUser.create({
        data: {
          email: r.code.toLowerCase() + '@studykarnataka.in',
          fullName: 'Dummy ' + r.name,
          passwordHash: 'dummy',
          accountStatus: 'ACTIVE',
          isActive: true,
          adminRoles: { create: { roleId: role.id } },
          adminProfile: { create: { phone: '9876543210', employeeId: 'EMP-' + Math.floor(Math.random()*1000) } },
          moduleAccess: { create: [{ moduleCode: 'Exams' }, { moduleCode: 'Students' }] }
        }
      });
    }
  }
  console.log('Dummy users created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
