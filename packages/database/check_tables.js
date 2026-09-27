const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Kanishk~1122@localhost:5432/study_karnataka?schema=public"
    }
  }
});

async function checkTables() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log("Tables in database:");
    result.forEach(row => console.log(row.tablename));
    
    const hasStudentSubs = result.some(r => r.tablename === 'student_subscriptions');
    const hasTransactions = result.some(r => r.tablename === 'payment_transactions');
    
    console.log("\nHas student_subscriptions:", hasStudentSubs);
    console.log("Has payment_transactions:", hasTransactions);
    
  } catch (error) {
    console.error("Error checking tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
