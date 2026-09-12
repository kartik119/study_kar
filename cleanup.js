const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.mcqBulkImportSession.deleteMany({});
  console.log('Deleted all logs');
}

main().catch(console.error);
