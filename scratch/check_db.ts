import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to connect to PostgreSQL database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to the database!');
    
    // Perform a simple query to verify
    const examCount = await prisma.examCycle.count();
    console.log(`Database is active. Found ${examCount} exam cycles.`);
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
