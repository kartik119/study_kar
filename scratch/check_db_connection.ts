import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to connect to the database...');
    // A simple query to check connectivity.
    // It's safe to query a small table or just do a $queryRaw
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Successfully connected to PostgreSQL database!');
    console.log('Query Result:', result);
  } catch (error) {
    console.error('Failed to connect to the database.');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
