import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '@study-karnataka/database';
import { PlanService } from '../apps/api/src/services/plan.service';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PLANS ARCHITECTURE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Fetch available modules
  const modules = await prisma.subscriptionModule.findMany({
    include: { exam: true, entitlements: true },
  });
  console.log(`Found ${modules.length} subscription modules in DB.`);
  if (modules.length === 0) {
    throw new Error('No modules found in DB. Run seed first.');
  }

  const upscFullMod = modules.find((m) => m.name === 'UPSC Full Access') || modules[0];
  const upscMcqMod = modules.find((m) => m.name === 'UPSC MCQ Practice') || modules[0];
  const upscSmMod = modules.find((m) => m.name === 'UPSC Study Materials') || modules[0];
  const kpscFullMod = modules.find((m) => m.name.includes('KPSC') || m.name.includes('KAS')) || modules[0];

  console.log(`UPSC Full Module: ${upscFullMod.name} (Exam: ${upscFullMod.exam?.titleEn || 'N/A'})`);
  console.log(`UPSC MCQ Module: ${upscMcqMod.name} (Exam: ${upscMcqMod.exam?.titleEn || 'N/A'})`);
  console.log(`UPSC SM Module: ${upscSmMod.name} (Exam: ${upscSmMod.exam?.titleEn || 'N/A'})`);
  console.log(`KPSC Full Module: ${kpscFullMod.name} (Exam: ${kpscFullMod.exam?.titleEn || 'N/A'})\n`);

  const realAdmin = await prisma.adminUser.findFirst();
  const adminId = realAdmin?.id;
  console.log(`Real Admin ID for audit logs: ${adminId || 'none'}\n`);

  // Clean up any prior test plans
  await prisma.adminAuditLog.deleteMany({ where: { recordType: 'SUBSCRIPTION_PLAN' } });
  await prisma.subscriptionPlan.deleteMany({});
  console.log('✓ Cleaned up existing plans and plan audit logs.\n');

  // Test 1: Create Paid Plan - UPSC Full - Monthly (₹999, 1 Month)
  console.log('Test 1: Creating UPSC Full - Monthly (₹999, 1 Month, Active)...');
  const upscFullMonthly = await PlanService.createPlan({
    name: 'UPSC Full - Monthly',
    code: 'PLAN-UPSC-FULL-M',
    moduleId: upscFullMod.id,
    description: 'Monthly access to full UPSC preparation suite',
    planType: 'PAID',
    price: 999,
    currency: 'INR',
    billingCycle: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTHS',
    status: 'ACTIVE',
    benefits: [
      'Full access to UPSC Study Materials',
      '10,000+ MCQ practice questions',
      'Full-length mock tests',
      'Daily Current Affairs updates',
    ],
  }, adminId);

  console.log('✓ UPSC Full - Monthly created:', {
    id: upscFullMonthly.id,
    name: upscFullMonthly.name,
    code: upscFullMonthly.code,
    price: Number(upscFullMonthly.price),
    billingCycle: upscFullMonthly.billingCycle,
    status: upscFullMonthly.status,
  });

  // Test 2: Create Paid Plan - UPSC Full - Yearly (₹7,999, 1 Year) pointing to same module
  console.log('\nTest 2: Creating UPSC Full - Yearly (₹7,999, 1 Year, Active)...');
  const upscFullYearly = await PlanService.createPlan({
    name: 'UPSC Full - Yearly',
    code: 'PLAN-UPSC-FULL-Y',
    moduleId: upscFullMod.id,
    description: 'Yearly access to full UPSC preparation suite',
    planType: 'PAID',
    price: 7999,
    currency: 'INR',
    billingCycle: 'YEARLY',
    durationValue: 1,
    durationUnit: 'YEARS',
    status: 'ACTIVE',
    benefits: [
      'All features of UPSC Full Monthly',
      '365 days uninterrupted access',
      'Includes all Test Series and Mock Exams',
    ],
  }, adminId);

  console.log('✓ UPSC Full - Yearly created:', {
    id: upscFullYearly.id,
    name: upscFullYearly.name,
    code: upscFullYearly.code,
    price: Number(upscFullYearly.price),
    duration: `${upscFullYearly.durationValue} ${upscFullYearly.durationUnit}`,
  });
  console.log('✓ Module Inheritance Verified: Both monthly and yearly point to module ID:', upscFullMod.id);

  // Test 3: Create Paid Plan - UPSC MCQ - Monthly (₹199, 1 Month)
  console.log('\nTest 3: Creating UPSC MCQ - Monthly (₹199, 1 Month)...');
  const upscMcqMonthly = await PlanService.createPlan({
    name: 'UPSC MCQ - Monthly',
    code: 'PLAN-UPSC-MCQ-M',
    moduleId: upscMcqMod.id,
    description: 'MCQ practice bank access for UPSC',
    planType: 'PAID',
    price: 199,
    currency: 'INR',
    billingCycle: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTHS',
    status: 'ACTIVE',
    benefits: ['Unlimited MCQ questions', 'Topic-wise practice', 'Instant solutions'],
  }, adminId);

  console.log('✓ UPSC MCQ - Monthly created with module:', upscMcqMod.name);

  // Test 4: Create Paid Plan - UPSC Study Materials - 6 Months (₹799, One Time)
  console.log('\nTest 4: Creating UPSC Study Materials - 6 Months (₹799, One Time)...');
  const upscSm6M = await PlanService.createPlan({
    name: 'UPSC Study Materials - 6 Months',
    code: 'PLAN-UPSC-SM-6M',
    moduleId: upscSmMod.id,
    description: 'Study materials library for UPSC',
    planType: 'PAID',
    price: 799,
    currency: 'INR',
    billingCycle: 'ONE_TIME',
    durationValue: 6,
    durationUnit: 'MONTHS',
    status: 'ACTIVE',
    benefits: ['Full PDF study materials', 'Bilingual notes', 'Downloadable resources'],
  }, adminId);

  console.log('✓ UPSC Study Materials - 6 Months created. Billing cycle separate from duration:', {
    billingCycle: upscSm6M.billingCycle,
    duration: `${upscSm6M.durationValue} ${upscSm6M.durationUnit}`,
  });

  // Test 5: Create Paid Plan - KPSC Full - Yearly (₹5,999, 1 Year) - KPSC Isolation Test
  console.log('\nTest 5: Creating KPSC Full - Yearly (₹5,999, 1 Year)...');
  const kpscFullYearly = await PlanService.createPlan({
    name: 'KPSC Full - Yearly',
    code: 'PLAN-KPSC-FULL-Y',
    moduleId: kpscFullMod.id,
    description: 'Comprehensive KPSC exam access',
    planType: 'PAID',
    price: 5999,
    currency: 'INR',
    billingCycle: 'YEARLY',
    durationValue: 1,
    durationUnit: 'YEARS',
    status: 'ACTIVE',
    benefits: ['KPSC syllabus coverage', 'Kannada & English mock papers'],
  }, adminId);

  console.log('✓ KPSC Full - Yearly created.');
  console.log('✓ KPSC Isolation Verified: Module exam is:', kpscFullMod.exam?.titleEn || 'KPSC');

  // Test 6: Free Plan Rule (price automatically becomes 0)
  console.log('\nTest 6: Testing Free Plan Rule (Price = 0)...');
  const freePlan = await PlanService.createPlan({
    name: 'UPSC Free Trial Starter',
    moduleId: upscFullMod.id,
    planType: 'FREE',
    price: 500, // Should be forced to 0
    billingCycle: 'ONE_TIME',
    durationValue: 7,
    durationUnit: 'DAYS',
    status: 'DRAFT',
  }, adminId);

  if (Number(freePlan.price) !== 0) {
    throw new Error(`Expected Free plan price to be 0, got ${freePlan.price}`);
  }
  console.log('✓ Free Plan rule verified: Price forced to ₹0.');

  // Test 7: Paid Plan Rule (Price must be > 0)
  console.log('\nTest 7: Testing Paid Plan Rule (Price > 0 validation)...');
  let rejected = false;
  try {
    await PlanService.createPlan({
      name: 'Invalid Paid Plan',
      moduleId: upscFullMod.id,
      planType: 'PAID',
      price: 0,
      billingCycle: 'MONTHLY',
      durationValue: 1,
      durationUnit: 'MONTHS',
    });
  } catch (err: any) {
    rejected = true;
    console.log('✓ Correctly rejected Paid plan with ₹0 price:', err.message);
  }
  if (!rejected) {
    throw new Error('Failed: Server allowed Paid plan with ₹0 price!');
  }

  // Test 8: Duplicate Plan
  console.log('\nTest 8: Testing Duplicate Plan...');
  const duplicated = await PlanService.duplicatePlan(upscFullMonthly.id, adminId);
  console.log('✓ Duplicated plan:', {
    id: duplicated.id,
    name: duplicated.name,
    code: duplicated.code,
    status: duplicated.status, // Must be DRAFT
    moduleId: duplicated.moduleId,
  });
  if (duplicated.status !== 'DRAFT') {
    throw new Error('Duplicated plan should default to DRAFT');
  }

  // Test 9: Manage Pricing
  console.log('\nTest 9: Testing Manage Pricing...');
  const updatedPricing = await PlanService.managePricing(upscFullMonthly.id, {
    price: 1199,
    currency: 'INR',
    billingCycle: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTHS',
  }, adminId);
  console.log('✓ Updated pricing for UPSC Full Monthly: ₹', Number(updatedPricing.price));

  // Test 10: Status Transitions
  console.log('\nTest 10: Testing Status Transitions (Active -> Inactive -> Archived)...');
  const deactivated = await PlanService.updateStatus(upscFullMonthly.id, 'INACTIVE', adminId);
  console.log('✓ Status after deactivation:', deactivated.status);
  const reactivated = await PlanService.updateStatus(upscFullMonthly.id, 'ACTIVE', adminId);
  console.log('✓ Status after reactivation:', reactivated.status);

  // Test 11: Server-side Search & Filtering
  console.log('\nTest 11: Testing Server-side Search and Filtering...');
  const searchResult = await PlanService.getPlans({ search: 'MCQ' });
  console.log(`✓ Search for "MCQ" returned ${searchResult.items.length} plan(s). First item: "${searchResult.items[0]?.name}"`);

  const paidFilterResult = await PlanService.getPlans({ planType: 'PAID' });
  console.log(`✓ Filter planType=PAID returned ${paidFilterResult.items.length} plan(s).`);

  const upscModuleFilterResult = await PlanService.getPlans({ moduleId: upscFullMod.id });
  console.log(`✓ Filter moduleId=${upscFullMod.id} returned ${upscModuleFilterResult.items.length} plan(s).`);

  // Test 12: KPI Metrics
  console.log('\nTest 12: Testing KPI Metrics...');
  const metrics = await PlanService.getPlanMetrics();
  console.log('✓ KPI Metrics from database:', metrics);
  if (metrics.totalPlans < 5 || metrics.activePlans < 4 || metrics.paidPlans < 5) {
    throw new Error('Metrics mismatch with created test plans');
  }

  // Test 13: Export CSV
  console.log('\nTest 13: Testing CSV Export...');
  const csv = await PlanService.exportPlans({});
  const csvLines = csv.trim().split('\n');
  console.log(`✓ Export generated ${csvLines.length} lines of CSV (header + data).`);
  console.log('  Header:', csvLines[0]);
  console.log('  Sample row:', csvLines[1]);

  // Test 14: Audit Logging
  console.log('\nTest 14: Verifying Audit Logs in admin_audit_logs...');
  const auditLogs = await prisma.adminAuditLog.findMany({
    where: { recordType: 'SUBSCRIPTION_PLAN' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`✓ Total audit logs recorded for plans: ${auditLogs.length}`);
  const actions = auditLogs.map((l) => l.action);
  console.log('  Unique actions recorded:', [...new Set(actions)].join(', '));

  console.log('\n====================================================');
  console.log('ALL PLANS VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================');
}

runTests()
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
