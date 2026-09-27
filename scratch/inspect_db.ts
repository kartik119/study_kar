import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';

async function main() {
  const mods: any[] = await prisma.$queryRawUnsafe('SELECT id, name, code, "scopeType", "moduleType", "accessType", status, "examId" FROM subscription_modules LIMIT 5');
  console.log('Modules count:', mods.length);
  console.log('Sample Modules:', mods);

  const plans: any[] = await prisma.$queryRawUnsafe('SELECT id, name, code, "moduleId", price, "billingCycle", "durationValue", "durationUnit", status FROM subscription_plans LIMIT 5');
  console.log('Plans count:', plans.length);
  console.log('Sample Plans:', plans);

  const subs: any[] = await prisma.$queryRawUnsafe('SELECT * FROM student_subscriptions LIMIT 5');
  console.log('Subscriptions count:', subs.length);
  console.log('Sample Subscriptions:', subs);

  const columns: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'student_subscriptions'
    ORDER BY ordinal_position
  `);
  console.log('student_subscriptions columns:', columns);
}

main().catch(console.error).finally(() => prisma.$disconnect());
