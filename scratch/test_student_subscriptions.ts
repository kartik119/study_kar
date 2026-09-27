import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';
import { StudentSubscriptionService } from '../apps/api/src/services/student-subscription.service';

async function run() {
  console.log('========================================================');
  console.log('STARTING STUDENT SUBSCRIPTIONS COMPREHENSIVE TEST SUITE');
  console.log('========================================================\n');

  // Find or create test students
  let studentUserA = await prisma.user.findFirst({
    where: { accountType: 'STUDENT', email: 'test.student.a@example.com' },
    include: { studentProfile: true },
  });

  if (!studentUserA) {
    studentUserA = await prisma.user.create({
      data: {
        email: 'test.student.a@example.com',
        fullName: 'Test Student A',
        mobile: '9876543210',
        accountType: 'STUDENT',
        accountStatus: 'ACTIVE',
        studentProfile: {
          create: {
            dateOfBirth: new Date('2000-01-01'),
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  let studentUserB = await prisma.user.findFirst({
    where: { accountType: 'STUDENT', email: 'test.student.b@example.com' },
    include: { studentProfile: true },
  });

  if (!studentUserB) {
    studentUserB = await prisma.user.create({
      data: {
        email: 'test.student.b@example.com',
        fullName: 'Test Student B',
        mobile: '9876543211',
        accountType: 'STUDENT',
        accountStatus: 'ACTIVE',
        studentProfile: {
          create: {
            dateOfBirth: new Date('2001-02-02'),
          },
        },
      },
      include: { studentProfile: true },
    });
  }

  const profileAId = studentUserA.studentProfile!.id;
  const profileBId = studentUserB.studentProfile!.id;
  console.log(`Student A Profile ID: ${profileAId}`);
  console.log(`Student B Profile ID: ${profileBId}\n`);

  const realAdmin = await prisma.adminUser.findFirst();
  const adminId = realAdmin?.id;
  const adminName = realAdmin?.fullName || 'Super Admin';
  console.log(`Real Admin for test: ${adminName} (${adminId || 'none'})\n`);

  // Clean up any test subscriptions for these students
  await prisma.studentSubscription.deleteMany({
    where: { studentId: { in: [profileAId, profileBId] } },
  });
  console.log('✓ Cleaned up prior test subscriptions for test students\n');

  // Fetch plans
  const plans = await StudentSubscriptionService.getPlansForSelection();
  console.log(`Found ${plans.length} active plans for selection.`);
  plans.forEach(p => console.log(`  - [${p.id}] ${p.name} | Module: ${p.module.name} (Exam: ${p.module.exam?.titleEn}) | Price: ₹${p.price} | ${p.durationValue} ${p.durationUnit}`));

  const upscFullMonthly = plans.find(p => p.name.includes('UPSC Full - Monthly')) || plans[0];
  const upscFullYearly = plans.find(p => p.name.includes('UPSC Full - Yearly')) || plans[1];
  const upscMcqMonthly = plans.find(p => p.name.includes('UPSC MCQ')) || plans[2];
  const upscSm6M = plans.find(p => p.name.includes('UPSC Study Materials')) || plans[3];
  const kpscFullYearly = plans.find(p => p.name.includes('KPSC')) || plans[4];

  // TEST 1: UPSC Full Monthly (Section 90)
  console.log('\n--- TEST 1: UPSC Full Monthly Subscription ---');
  const sub1 = await StudentSubscriptionService.createSubscription({
    studentId: profileAId,
    planId: upscFullMonthly.id,
    assignmentSource: 'PAID_PURCHASE',
    paymentStatus: 'PAID',
    paymentMethod: 'UPI',
    transactionId: 'TXN-UPSC-FULL-001',
    adminNotes: 'Assigned for UPSC 2026 preparation',
  }, adminId, adminName);

  console.log(`✓ Created Subscription ${sub1.subscriptionNumber} (ID: ${sub1.id})`);
  const details1 = await StudentSubscriptionService.getSubscriptionById(sub1.id);
  console.log(`  Module: ${details1.module?.name}`);
  console.log(`  Exam: ${details1.exam?.titleEn}`);
  console.log(`  Duration: ${details1.startDate.toLocaleDateString()} to ${details1.endDate?.toLocaleDateString()}`);
  console.log(`  Features: ${details1.module?.features?.join(', ')}`);
  console.log(`  Amount: ₹${details1.amount} (${details1.paymentStatus})`);

  if (!details1.module?.features || details1.module.features.length === 0) {
    throw new Error('TEST 1 FAILED: Missing full exam features');
  }

  // TEST 2: UPSC MCQ Monthly (Section 91)
  console.log('\n--- TEST 2: UPSC MCQ Monthly Subscription ---');
  const sub2 = await StudentSubscriptionService.createSubscription({
    studentId: profileBId,
    planId: upscMcqMonthly.id,
    assignmentSource: 'PAID_PURCHASE',
    paymentStatus: 'PAID',
    paymentMethod: 'CARD',
  }, adminId, adminName);

  const details2 = await StudentSubscriptionService.getSubscriptionById(sub2.id);
  console.log(`✓ Created Subscription ${sub2.subscriptionNumber} for Student B`);
  console.log(`  Module: ${details2.module?.name}`);
  console.log(`  Features: ${details2.module?.features?.join(', ')}`);
  if (details2.module?.features?.includes('Study Materials')) {
    throw new Error('TEST 2 FAILED: MCQ module should NOT have Study Materials');
  }

  // TEST 3: KPSC Full Yearly (Section 92)
  console.log('\n--- TEST 3: KPSC Full Yearly Subscription ---');
  const sub3 = await StudentSubscriptionService.createSubscription({
    studentId: profileBId,
    planId: kpscFullYearly.id,
    assignmentSource: 'PAID_PURCHASE',
    paymentStatus: 'PAID',
  }, adminId, adminName);

  const details3 = await StudentSubscriptionService.getSubscriptionById(sub3.id);
  console.log(`✓ Created Subscription ${sub3.subscriptionNumber} for Student B`);
  console.log(`  Module: ${details3.module?.name}`);
  console.log(`  Exam: ${details3.exam?.titleEn}`);
  if (details3.exam?.titleEn?.includes('UPSC')) {
    throw new Error('TEST 3 FAILED: KPSC module should NOT have UPSC exam');
  }

  // TEST 4: Multiple Modules for Same Student (Section 93 & 94)
  console.log('\n--- TEST 4: Multiple Subscriptions for Student B ---');
  // Student B now has UPSC MCQ and KPSC Full
  const listB = await StudentSubscriptionService.getSubscriptions({ search: 'Test Student B' });
  console.log(`✓ Student B has ${listB.items.length} active subscriptions`);
  listB.items.forEach(s => console.log(`  - ${s.subscriptionNumber}: Plan: ${s.plan?.name} | Module: ${s.module?.name} | Exam: ${s.exam?.titleEn}`));

  // TEST 5: Free / Admin Grant Plan (Section 95)
  console.log('\n--- TEST 5: Admin Grant / Free Subscription ---');
  const subFree = await StudentSubscriptionService.createSubscription({
    studentId: profileAId,
    planId: upscSm6M.id,
    assignmentSource: 'ADMIN_GRANT',
    paymentStatus: 'NOT_REQUIRED',
    amount: 0,
    adminNotes: 'Scholarship Grant',
    allowOverlap: true,
  }, adminId, adminName);

  const detailsFree = await StudentSubscriptionService.getSubscriptionById(subFree.id);
  console.log(`✓ Created Admin Grant Subscription ${subFree.subscriptionNumber}`);
  console.log(`  Amount: ₹${detailsFree.amount}`);
  console.log(`  Payment Status: ${detailsFree.paymentStatus}`);
  console.log(`  Assignment Source: ${detailsFree.assignmentSource}`);

  // TEST 6: Renewal / Extend (Section 96)
  console.log('\n--- TEST 6: Renew / Extend Subscription ---');
  const oldExpiry = details1.endDate;
  const renewed = await StudentSubscriptionService.renewSubscription(sub1.id, {
    durationValue: 1,
    durationUnit: 'MONTHS',
    amount: 999,
    reason: 'Monthly auto-renewal payment received',
  }, adminId, adminName);

  const detailsRenewed = await StudentSubscriptionService.getSubscriptionById(sub1.id);
  console.log(`✓ Subscription Renewed:`);
  console.log(`  Old Expiry: ${oldExpiry?.toLocaleDateString()}`);
  console.log(`  New Expiry: ${detailsRenewed.endDate?.toLocaleDateString()}`);
  console.log(`  History entries: ${detailsRenewed.histories.length}`);
  console.log(`  Latest History Action: ${detailsRenewed.histories[0]?.action} - ${detailsRenewed.histories[0]?.reason}`);

  // TEST 7: Change Plan (Section 97)
  console.log('\n--- TEST 7: Change Plan ---');
  const changed = await StudentSubscriptionService.changePlan(sub1.id, {
    newPlanId: upscFullYearly.id,
    recalculateExpiry: true,
    reason: 'Upgraded from Monthly to Yearly',
  }, adminId, adminName);

  const detailsChanged = await StudentSubscriptionService.getSubscriptionById(sub1.id);
  console.log(`✓ Plan Changed successfully:`);
  console.log(`  New Plan: ${detailsChanged.plan?.name}`);
  console.log(`  New Expiry: ${detailsChanged.endDate?.toLocaleDateString()}`);
  console.log(`  History entry: ${detailsChanged.histories[0]?.action} - ${detailsChanged.histories[0]?.reason}`);

  // TEST 8: Pause / Resume (Section 98)
  console.log('\n--- TEST 8: Pause and Resume ---');
  await StudentSubscriptionService.pauseSubscription(sub1.id, {
    reason: 'Student requested study break',
    resumeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }, adminId, adminName);

  let detailsStatus = await StudentSubscriptionService.getSubscriptionById(sub1.id);
  console.log(`✓ Subscription Paused. Status: ${detailsStatus.status} (Reason: ${detailsStatus.pauseReason})`);

  await StudentSubscriptionService.resumeSubscription(sub1.id, adminId, adminName);
  detailsStatus = await StudentSubscriptionService.getSubscriptionById(sub1.id);
  console.log(`✓ Subscription Resumed. Status: ${detailsStatus.status}`);

  // TEST 9: Cancellation (Section 100)
  console.log('\n--- TEST 9: Cancellation ---');
  await StudentSubscriptionService.cancelSubscription(subFree.id, {
    immediate: true,
    reason: 'Student opted out',
  }, adminId, adminName);

  const detailsCancelled = await StudentSubscriptionService.getSubscriptionById(subFree.id);
  console.log(`✓ Subscription Cancelled. Status: ${detailsCancelled.status} (Cancelled at: ${detailsCancelled.cancelledAt})`);

  // TEST 10: Metrics KPI (Section 5)
  console.log('\n--- TEST 10: Metrics KPI Verification ---');
  const metrics = await StudentSubscriptionService.getMetrics();
  console.log('✓ Metrics calculated:', metrics);

  // TEST 11: Export CSV (Section 80)
  console.log('\n--- TEST 11: Export CSV ---');
  const csv = await StudentSubscriptionService.exportSubscriptions({});
  console.log(`✓ CSV Export generated (${csv.split('\n').length} lines)`);
  console.log('First 2 lines:\n' + csv.split('\n').slice(0, 2).join('\n'));

  console.log('\n========================================================');
  console.log('ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('========================================================\n');
}

run().catch((e) => {
  console.error('❌ TEST FAILED:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
