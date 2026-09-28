const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const standardPerms = [
  { code: 'dashboard.view', name: 'View Dashboard', description: 'View dashboard and analytics' },
  { code: 'exams.manage', name: 'Manage Exams', description: 'Manage exam content and schedules' },
  { code: 'study_materials.create', name: 'Create Materials', description: 'Create and manage study materials' },
  { code: 'mcq.manage', name: 'Manage MCQs', description: 'Manage MCQ questions and tests' },
  { code: 'students.view', name: 'View Students', description: 'View student list and profiles' },
  { code: 'students.progress', name: 'View Student Progress', description: 'View progress and performance' },
  { code: 'students.study_plans', name: 'View Study Plans', description: 'View assigned study plans' },
  { code: 'students.mentor_notes', name: 'Add Mentor Notes', description: 'Add notes and feedback' },
  { code: 'students.mentor_checkins', name: 'Manage Check-ins', description: 'Conduct student check-ins' },
  { code: 'students.reports', name: 'View Reports', description: 'View mentorship reports' },
  { code: 'study_plans.manage', name: 'Manage Plans', description: 'Create and manage study plans' },
  { code: 'quick_revision.manage', name: 'Manage Revision', description: 'Manage quick revision content' }
];

async function seed() {
  for (const perm of standardPerms) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log('Seeded standard permissions!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
