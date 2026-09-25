import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing roles
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  console.log('Cleared existing roles and permissions');

  const permissions = [
    { code: 'students.view', name: 'View Students' },
    { code: 'students.progress.view', name: 'View Progress' },
    { code: 'students.mentor_notes.create', name: 'Create Mentor Notes' },
    { code: 'students.checkins.manage', name: 'Manage Check-ins' },
    { code: 'study_plans.view', name: 'View Study Plans' },
    { code: 'study_plans.progress.view', name: 'View Progress' },
    { code: 'tests.performance.view', name: 'View MCQ/Test Performance' },
    { code: 'quick_revision.view', name: 'View Quick Revision' },
    { code: 'reports.mentorship.view', name: 'View Mentorship Reports' },
    { code: 'team.view', name: 'View Team Members' },
    { code: 'team.manage', name: 'Manage Roles' }
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p
    });
  }

  console.log('Created permissions');

  const roles = [
    { code: 'SUPER_ADMIN', name: 'Super Admin', desc: 'Full platform access', policy: 'ALL_EXAMS', sys: true },
    { code: 'ADMIN', name: 'Admin', desc: 'Administrative operations', policy: 'ALL_EXAMS', sys: true },
    { code: 'CONTENT_MANAGER', name: 'Content Manager', desc: 'Create and manage study content', policy: 'ASSIGNED_EXAMS_ONLY', sys: true },
    { code: 'CONTENT_REVIEWER', name: 'Content Reviewer', desc: 'Review and approve content', policy: 'ASSIGNED_EXAMS_ONLY', sys: true },
    { code: 'MENTOR', name: 'Mentor', desc: 'Guide assigned students and monitor preparation', policy: 'ASSIGNED_EXAMS_ONLY', sys: true },
    { code: 'SUPPORT_EXECUTIVE', name: 'Support Executive', desc: 'Handle student support operations', policy: 'ALL_EXAMS', sys: true }
  ];

  for (const r of roles) {
    await prisma.role.create({
      data: {
        code: r.code,
        name: r.name,
        description: r.desc,
        isSystem: r.sys,
        isActive: true,
        scopePolicy: r.policy
      }
    });
  }

  // Connect Mentor to its permissions
  const mentorRole = await prisma.role.findUnique({ where: { code: 'MENTOR' } });
  const allPerms = await prisma.permission.findMany();
  if (mentorRole) {
    for (const p of allPerms) {
      if (!p.code.startsWith('team.')) {
        await prisma.rolePermission.create({
          data: {
            roleId: mentorRole.id,
            permissionId: p.id
          }
        });
      }
    }
  }

  console.log('Created roles and assigned permissions');
}

main().catch(console.error).finally(() => prisma.$disconnect());
