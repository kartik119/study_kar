import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';

async function main() {
  const count = await prisma.subscriptionPlan.count();
  console.log('SUCCESS! SubscriptionPlan count:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
