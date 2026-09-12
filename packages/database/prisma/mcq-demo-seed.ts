import { seedMcqDemo } from '../src/mcq-demo-seed';
import { prisma } from '../src/index';

if (require.main === module) {
  seedMcqDemo()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
