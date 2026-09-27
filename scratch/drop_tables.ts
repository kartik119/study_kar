import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS revision_subcategories_view CASCADE;`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS revision_categories CASCADE;`);
  console.log('Tables dropped successfully');
}
main().catch(console.error).finally(() => prisma.$disconnect());
