const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PREVIOUS_OPTIONS = [
  { name: 'Competitive Exams', code: 'COMPETITIVE_EXAMS', description: 'Materials for competitive exams' },
  { name: 'Current Affairs', code: 'CURRENT_AFFAIRS', description: 'Daily and monthly current affairs' },
  { name: 'Study Materials', code: 'STUDY_MATERIALS', description: 'Notes and resources' },
  { name: 'Mock Tests', code: 'MOCK_TESTS', description: 'Practice mock exams' },
  { name: 'Quick Revision', code: 'QUICK_REVISION', description: 'Short revision notes' },
  { name: 'Test Series', code: 'TEST_SERIES', description: 'Comprehensive test series' },
  { name: 'Premium Study Resources', code: 'PREMIUM_STUDY_RESOURCES', description: 'Exclusive premium resources' },
];

async function seed() {
  console.log('Starting seed...');
  for (const option of PREVIOUS_OPTIONS) {
    const existing = await prisma.productCategory.findFirst({
      where: {
        OR: [
          { name: option.name },
          { code: option.code },
        ]
      }
    });

    if (!existing) {
      await prisma.productCategory.create({
        data: {
          name: option.name,
          code: option.code,
          description: option.description,
          isActive: true
        }
      });
      console.log(`Created category: ${option.name}`);
    } else {
      console.log(`Category already exists: ${option.name}`);
    }
  }
  console.log('Seeding completed.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
