import { PrismaClient } from '@study-karnataka/database';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Study Planner Rules...');

  const rules = [
    {
      name: '1 Year Plan',
      description: 'Standard 1 year preparation plan',
      minRemainingDays: 270, // ~9+ months
      maxRemainingDays: 450, // ~15 months
      recommendedDailyMinutes: 240, // 4 hours
      conceptMinutes: 120,
      revisionMinutes: 60,
      mcqMinutes: 15,
      currentAffairsMinutes: 45,
      priority: 1,
    },
    {
      name: '8 Month Plan',
      description: 'Moderate 8 month preparation plan',
      minRemainingDays: 195, // ~6.5 to 9 months
      maxRemainingDays: 269,
      recommendedDailyMinutes: 300, // 5 hours
      conceptMinutes: 150,
      revisionMinutes: 75,
      mcqMinutes: 30,
      currentAffairsMinutes: 45,
      priority: 2,
    },
    {
      name: '6 Month Plan',
      description: 'Intensive 6 month preparation plan',
      minRemainingDays: 135, // ~4.5 to 6.5 months
      maxRemainingDays: 194,
      recommendedDailyMinutes: 420, // 7 hours
      conceptMinutes: 210,
      revisionMinutes: 90,
      mcqMinutes: 65,
      currentAffairsMinutes: 45,
      bufferMinutes: 10,
      priority: 3,
    },
    {
      name: '3.5 - 4 Month Plan',
      description: 'Highly compressed 4 month plan',
      minRemainingDays: 90, // ~3 to 4.5 months
      maxRemainingDays: 134,
      recommendedDailyMinutes: 480, // 8 hours
      conceptMinutes: 240,
      revisionMinutes: 120,
      mcqMinutes: 75,
      currentAffairsMinutes: 45,
      priority: 4,
    },
  ];

  for (const rule of rules) {
    await prisma.studyPlannerRule.create({
      data: rule,
    });
    console.log(`Created rule: ${rule.name}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
