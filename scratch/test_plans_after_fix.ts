import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';
import { PlanService } from '../apps/api/src/services/plan.service';
import { StudentSubscriptionService } from '../apps/api/src/services/student-subscription.service';

async function main() {
  console.log('Testing PlanService.getPlans...');
  const plans = await PlanService.getPlans({ page: 1, pageSize: 10 });
  console.log('Plans fetched successfully! Count:', plans.total, 'Items:', plans.items.length);
  if (plans.items.length > 0) {
    console.log('First plan subscribers count:', plans.items[0].subscribers);
  }

  console.log('Testing PlanService.getPlanMetrics...');
  const metrics = await PlanService.getPlanMetrics();
  console.log('Plan metrics:', metrics);

  console.log('Testing StudentSubscriptionService.getSubscriptions...');
  const subs = await StudentSubscriptionService.getSubscriptions({ page: 1, pageSize: 10 });
  console.log('Student subscriptions count:', subs.total, 'Items:', subs.items.length);

  console.log('All tests passed successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
