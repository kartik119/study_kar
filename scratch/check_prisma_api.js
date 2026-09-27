const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT 1').then(() => {
  console.log('PostgreSQL connected successfully via Prisma!');
  process.exit(0);
}).catch((e) => {
  console.error('Failed to connect:', e);
  process.exit(1);
});
