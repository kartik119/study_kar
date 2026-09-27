import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mock Revision Data...');
  
  // Create mock categories
  const cat1 = await prisma.revisionCategory.upsert({
    where: { code: 'POLITY_QUICK_REV' },
    update: {},
    create: {
      code: 'POLITY_QUICK_REV',
      nameEn: 'Indian Polity',
      nameKn: 'ಭಾರತೀಯ ರಾಜಕೀಯ',
      descriptionEn: 'Quick revision for Indian Polity',
      displayOrder: 1,
      subcategories: {
        create: [
          {
            code: 'CONSTITUTION_BASICS',
            nameEn: 'Constitution Basics',
            nameKn: 'ಸಂವಿಧಾನದ ಮೂಲಗಳು',
            displayOrder: 1,
          }
        ]
      }
    }
  });

  const cat2 = await prisma.revisionCategory.upsert({
    where: { code: 'HISTORY_QUICK_REV' },
    update: {},
    create: {
      code: 'HISTORY_QUICK_REV',
      nameEn: 'Indian History',
      nameKn: 'ಭಾರತದ ಇತಿಹಾಸ',
      descriptionEn: 'Quick revision for History',
      displayOrder: 2,
    }
  });

  // Create a revision card in the subcategory
  const subcat = await prisma.revisionSubcategory.findUnique({ where: { code: 'CONSTITUTION_BASICS' } });
  
  if (subcat) {
    await prisma.revisionCard.upsert({
      where: { slug: 'preamble-of-india' },
      update: {},
      create: {
        slug: 'preamble-of-india',
        titleEn: 'Preamble of the Constitution',
        titleKn: 'ಸಂವಿಧಾನದ ಪ್ರಸ್ತಾವನೆ',
        categoryId: cat1.id,
        subcategoryId: subcat.id,
        status: 'PUBLISHED',
        orderIndex: 1,
      }
    });
  }
  
  console.log('Mock Revision Data Seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
