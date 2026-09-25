import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma, RefundStatus, RefundType } from '@study-karnataka/database';
import { RefundAdminService } from './src/services/refund.admin.service';

async function runTests() {
  console.log('--- STARTING REFUND SUITE VERIFICATION ---');

  // Find or create test admin user
  let adminUser = await prisma.user.findFirst({ where: { accountType: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'testadmin@studykarnataka.com',
        fullName: 'Test Admin',
        accountType: 'ADMIN',
      },
    });
  }

  // Find or create test student
  let studentUser = await prisma.user.findFirst({ where: { accountType: 'STUDENT' } });
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        email: 'arjun.rao@example.com',
        fullName: 'Arjun Rao',
        accountType: 'STUDENT',
        mobile: '9876543210',
      },
    });
  }

  let studentProfile = await prisma.studentProfile.findFirst({
    where: { userId: studentUser.id },
  });
  if (!studentProfile) {
    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
      },
    });
  }

  // Find or create ExamCycles for UPSC and KPSC
  let upscCycle = await prisma.examCycle.findFirst({
    where: { OR: [{ cycleCode: { contains: 'UPSC', mode: 'insensitive' } }, { titleEn: { contains: 'UPSC', mode: 'insensitive' } }] },
  });
  if (!upscCycle) {
    let prog = await prisma.examProgramme.findFirst();
    if (!prog) {
      const auth = await prisma.examAuthority.create({
        data: { code: 'UPSC-AUTH', nameEn: 'UPSC Authority', nameKn: 'ಯುಪಿಎಸ್ಸಿ ಪ್ರಾಧಿಕಾರ' },
      });
      prog = await prisma.examProgramme.create({
        data: { authorityId: auth.id, code: 'UPSC-PROG', titleEn: 'UPSC Civil Services', titleKn: 'ಯುಪಿಎಸ್ಸಿ' },
      });
    }
    upscCycle = await prisma.examCycle.create({
      data: {
        programmeId: prog.id,
        cycleCode: 'UPSC-2026',
        cycleYear: 2026,
        titleEn: 'UPSC',
        titleKn: 'ಯು.ಪಿ.ಎಸ್.ಸಿ',
      },
    });
  }

  let kpscCycle = await prisma.examCycle.findFirst({
    where: { OR: [{ cycleCode: { contains: 'KPSC', mode: 'insensitive' } }, { titleEn: { contains: 'KPSC', mode: 'insensitive' } }] },
  });
  if (!kpscCycle) {
    let prog = await prisma.examProgramme.findFirst();
    kpscCycle = await prisma.examCycle.create({
      data: {
        programmeId: prog!.id,
        cycleCode: 'KPSC-2026',
        cycleYear: 2026,
        titleEn: 'KPSC',
        titleKn: 'ಕೆ.ಪಿ.ಎಸ್.ಸಿ',
      },
    });
  }

  // UPSC MCQ Practice Module
  let upscMcqModule = await prisma.subscriptionModule.findFirst({
    where: { name: 'UPSC MCQ Practice' },
  });
  if (!upscMcqModule) {
    upscMcqModule = await prisma.subscriptionModule.create({
      data: {
        code: `MOD-UPSC-MCQ-${Date.now()}`,
        name: 'UPSC MCQ Practice',
        examId: upscCycle.id,
        status: 'ACTIVE',
      },
    });
  }

  // UPSC Full Access Module
  let upscFullModule = await prisma.subscriptionModule.findFirst({
    where: { name: 'UPSC Full Access' },
  });
  if (!upscFullModule) {
    upscFullModule = await prisma.subscriptionModule.create({
      data: {
        code: `MOD-UPSC-FULL-${Date.now()}`,
        name: 'UPSC Full Access',
        examId: upscCycle.id,
        status: 'ACTIVE',
      },
    });
  }

  // KPSC Full Access Module
  let kpscFullModule = await prisma.subscriptionModule.findFirst({
    where: { name: 'KPSC Full Access' },
  });
  if (!kpscFullModule) {
    kpscFullModule = await prisma.subscriptionModule.create({
      data: {
        code: `MOD-KPSC-FULL-${Date.now()}`,
        name: 'KPSC Full Access',
        examId: kpscCycle.id,
        status: 'ACTIVE',
      },
    });
  }

  // Plans
  let upscMcqPlan = await prisma.subscriptionPlan.findFirst({
    where: { moduleId: upscMcqModule.id, name: 'UPSC MCQ - Monthly' },
  });
  if (!upscMcqPlan) {
    upscMcqPlan = await prisma.subscriptionPlan.create({
      data: {
        code: `PLAN-UPSC-MCQ-${Date.now()}`,
        name: 'UPSC MCQ - Monthly',
        moduleId: upscMcqModule.id,
        billingCycle: 'MONTHLY',
        price: 999,
        durationValue: 1,
        durationUnit: 'MONTHS',
        status: 'ACTIVE',
      },
    });
  }

  let kpscPlan = await prisma.subscriptionPlan.findFirst({
    where: { moduleId: kpscFullModule.id, name: 'KPSC Full - Yearly' },
  });
  if (!kpscPlan) {
    kpscPlan = await prisma.subscriptionPlan.create({
      data: {
        code: `PLAN-KPSC-YEARLY-${Date.now()}`,
        name: 'KPSC Full - Yearly',
        moduleId: kpscFullModule.id,
        billingCycle: 'YEARLY',
        price: 4999,
        durationValue: 1,
        durationUnit: 'YEARS',
        status: 'ACTIVE',
      },
    });
  }

  console.log('Fixtures initialized. Running Test 1 (Full Refund - Sec 66)...');
  // ----------------------------------------------------
  // TEST 1: Full Refund (Sec 66)
  // Transaction: ₹999. Full refund: ₹999.
  // Verify: Refunded ₹999, Txn status REFUNDED, Original amount remains ₹999.
  // ----------------------------------------------------
  const sub1 = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: upscMcqPlan.id,
      subscriptionNumber: `SUB-TEST-${Date.now()}-1`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  const txn1 = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}-1`,
      studentId: studentProfile.id,
      subscriptionId: sub1.id,
      amount: 999,
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'UPI',
    },
  });

  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-TEST-${Date.now()}-1`,
      studentId: studentProfile.id,
      subscriptionId: sub1.id,
      transactionId: txn1.id,
      subtotal: 999,
      finalAmount: 999,
      status: 'PAID',
    },
  });

  const refundReq1 = await RefundAdminService.requestRefund(
    {
      transactionId: txn1.id,
      refundType: 'FULL',
      reason: 'Requested full refund for technical access difficulty',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  if (refundReq1.requestedAmount.toNumber() !== 999) {
    throw new Error(`Test 1 Failed: Requested amount should be 999, got ${refundReq1.requestedAmount}`);
  }

  // Approve
  await RefundAdminService.approveRefund(refundReq1.id, { id: adminUser.id, name: adminUser.fullName });

  // Process
  const processed1 = await RefundAdminService.processRefund(refundReq1.id, {
    id: adminUser.id,
    name: adminUser.fullName,
  });

  const checkTxn1 = await prisma.paymentTransaction.findUnique({ where: { id: txn1.id } });
  if (checkTxn1?.status !== 'REFUNDED') {
    throw new Error(`Test 1 Failed: Expected txn status REFUNDED, got ${checkTxn1?.status}`);
  }
  if (checkTxn1?.amount.toNumber() !== 999) {
    throw new Error(`Test 1 Failed: Original transaction amount must remain 999, got ${checkTxn1?.amount}`);
  }
  console.log('✅ TEST 1 (Full Refund): Passed');

  // ----------------------------------------------------
  // TEST 2: Partial Refund (Sec 67)
  // Transaction: ₹999. Refund: ₹300.
  // Verify: Transaction PARTIALLY_REFUNDED, Original: ₹999, Refunded: ₹300, Remaining: ₹699.
  // ----------------------------------------------------
  console.log('Running Test 2 (Partial Refund - Sec 67)...');
  const sub2 = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: upscMcqPlan.id,
      subscriptionNumber: `SUB-TEST-${Date.now()}-2`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  const txn2 = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}-2`,
      studentId: studentProfile.id,
      subscriptionId: sub2.id,
      amount: 999,
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'Card (Visa)',
    },
  });

  const refundReq2 = await RefundAdminService.requestRefund(
    {
      transactionId: txn2.id,
      refundType: 'PARTIAL',
      requestedAmount: 300,
      reason: 'Partial goodwill refund for scheduled maintenance',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  await RefundAdminService.approveRefund(refundReq2.id, { id: adminUser.id, name: adminUser.fullName });
  await RefundAdminService.processRefund(refundReq2.id, { id: adminUser.id, name: adminUser.fullName });

  const checkTxn2 = await prisma.paymentTransaction.findUnique({ where: { id: txn2.id } });
  if (checkTxn2?.status !== 'PARTIALLY_REFUNDED') {
    throw new Error(`Test 2 Failed: Expected txn status PARTIALLY_REFUNDED, got ${checkTxn2?.status}`);
  }
  if (checkTxn2?.amount.toNumber() !== 999) {
    throw new Error(`Test 2 Failed: Original txn amount must remain 999, got ${checkTxn2?.amount}`);
  }

  const rem2 = await RefundAdminService.calculateRemainingRefundableAmount(txn2.id);
  if (rem2.totalRefunded !== 300 || rem2.remainingRefundable !== 699) {
    throw new Error(
      `Test 2 Failed: Expected totalRefunded=300 & remaining=699, got ${rem2.totalRefunded} & ${rem2.remainingRefundable}`
    );
  }
  console.log('✅ TEST 2 (Partial Refund): Passed');

  // ----------------------------------------------------
  // TEST 3: Multiple Partial Refunds (Sec 68)
  // Transaction: ₹999.
  // Refund 1: ₹300 (Already done in Test 2).
  // Refund 2: ₹200. Total Refunded: ₹500. Remaining: ₹499.
  // System must prevent refund > ₹499.
  // ----------------------------------------------------
  console.log('Running Test 3 (Multiple Partial Refunds - Sec 68)...');
  const refundReq3 = await RefundAdminService.requestRefund(
    {
      transactionId: txn2.id,
      refundType: 'PARTIAL',
      requestedAmount: 200,
      reason: 'Second partial refund',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );
  await RefundAdminService.approveRefund(refundReq3.id, { id: adminUser.id, name: adminUser.fullName });
  await RefundAdminService.processRefund(refundReq3.id, { id: adminUser.id, name: adminUser.fullName });

  const rem3 = await RefundAdminService.calculateRemainingRefundableAmount(txn2.id);
  if (rem3.totalRefunded !== 500 || rem3.remainingRefundable !== 499) {
    throw new Error(
      `Test 3 Failed: Expected totalRefunded=500, remaining=499, got ${rem3.totalRefunded}, ${rem3.remainingRefundable}`
    );
  }

  // Attempt refund of ₹500 (which exceeds remaining ₹499) -> must fail!
  let failedAsExpected = false;
  try {
    await RefundAdminService.requestRefund(
      {
        transactionId: txn2.id,
        refundType: 'PARTIAL',
        requestedAmount: 500,
        reason: 'Excessive refund attempt',
      },
      { id: adminUser.id, name: adminUser.fullName }
    );
  } catch (err: any) {
    failedAsExpected = true;
    console.log(`Expected validation caught: "${err.message}"`);
  }
  if (!failedAsExpected) {
    throw new Error('Test 3 Failed: Requesting refund exceeding remaining refundable amount should have thrown error');
  }
  console.log('✅ TEST 3 (Multiple Partial Refunds & Ceiling): Passed');

  // ----------------------------------------------------
  // TEST 4: Coupon Payment Refund (Sec 69)
  // Plan: ₹999, Coupon: ₹200 discount. Actual Paid: ₹799.
  // Attempt full refund: maximum financial refund is ₹799, not ₹999.
  // ----------------------------------------------------
  console.log('Running Test 4 (Coupon Payment - Sec 69)...');
  const sub4 = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: upscMcqPlan.id,
      subscriptionNumber: `SUB-TEST-${Date.now()}-4`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  const txn4 = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}-4`,
      studentId: studentProfile.id,
      subscriptionId: sub4.id,
      amount: 799, // Actual collected amount after ₹200 coupon discount!
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'UPI (PhonePe)',
    },
  });

  const rem4 = await RefundAdminService.calculateRemainingRefundableAmount(txn4.id);
  if (rem4.originalAmount !== 799 || rem4.remainingRefundable !== 799) {
    throw new Error(
      `Test 4 Failed: Expected refundable ceiling to be 799, got ${rem4.remainingRefundable}`
    );
  }

  const refundReq4 = await RefundAdminService.requestRefund(
    {
      transactionId: txn4.id,
      refundType: 'FULL',
      reason: 'Full refund on coupon-discounted purchase',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  if (refundReq4.requestedAmount.toNumber() !== 799) {
    throw new Error(`Test 4 Failed: Full refund must be for ₹799, got ₹${refundReq4.requestedAmount}`);
  }
  console.log('✅ TEST 4 (Coupon Payment Refund Ceiling): Passed');

  // ----------------------------------------------------
  // TEST 5: Reject Refund (Sec 70)
  // Pending refund rejected. Requires rejection reason.
  // Verify: Status REJECTED, No money refunded, Txn amount unchanged.
  // ----------------------------------------------------
  console.log('Running Test 5 (Reject Refund - Sec 70)...');
  const sub5 = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: upscMcqPlan.id,
      subscriptionNumber: `SUB-TEST-${Date.now()}-5`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  const txn5 = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}-5`,
      studentId: studentProfile.id,
      subscriptionId: sub5.id,
      amount: 999,
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'Net Banking',
    },
  });

  const refundReq5 = await RefundAdminService.requestRefund(
    {
      transactionId: txn5.id,
      refundType: 'FULL',
      reason: 'User claims misunderstanding',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  // Reject without reason must fail
  let rejectWithoutReasonFailed = false;
  try {
    await RefundAdminService.rejectRefund(refundReq5.id, '', undefined, {
      id: adminUser.id,
      name: adminUser.fullName,
    });
  } catch (e) {
    rejectWithoutReasonFailed = true;
  }
  if (!rejectWithoutReasonFailed) {
    throw new Error('Test 5 Failed: Rejecting without reason must be rejected by backend');
  }

  // Reject with reason
  const rejectedRefund = await RefundAdminService.rejectRefund(
    refundReq5.id,
    'Policy violation: Course videos already accessed over 80%',
    'Admin verified course consumption',
    { id: adminUser.id, name: adminUser.fullName }
  );

  if (rejectedRefund.status !== 'REJECTED' || !rejectedRefund.rejectionReason) {
    throw new Error(`Test 5 Failed: Status must be REJECTED with reason recorded`);
  }

  const checkTxn5 = await prisma.paymentTransaction.findUnique({ where: { id: txn5.id } });
  if (checkTxn5?.status !== 'SUCCESSFUL') {
    throw new Error(`Test 5 Failed: Txn status must remain SUCCESSFUL, got ${checkTxn5?.status}`);
  }
  const rem5 = await RefundAdminService.calculateRemainingRefundableAmount(txn5.id);
  if (rem5.totalRefunded !== 0 || rem5.remainingRefundable !== 999) {
    throw new Error('Test 5 Failed: Rejected refund must not reduce remaining refundable amount');
  }
  console.log('✅ TEST 5 (Reject Refund with mandatory reason): Passed');

  // ----------------------------------------------------
  // TEST 6: Duplicate Processing Idempotency (Sec 71)
  // Attempt same gateway refund twice. Only one financial refund occurs.
  // ----------------------------------------------------
  console.log('Running Test 6 (Duplicate Processing Idempotency - Sec 71)...');
  const processedOnce = await RefundAdminService.processRefund(refundReq1.id, {
    id: adminUser.id,
    name: adminUser.fullName,
  });
  const processedTwice = await RefundAdminService.processRefund(refundReq1.id, {
    id: adminUser.id,
    name: adminUser.fullName,
  });
  if (processedOnce.id !== processedTwice.id || processedTwice.status !== 'REFUNDED') {
    throw new Error('Test 6 Failed: Idempotency failed on duplicate process call');
  }
  console.log('✅ TEST 6 (Duplicate Processing Idempotency): Passed');

  // ----------------------------------------------------
  // TEST 7: Failed Gateway Refund (Sec 72)
  // Gateway rejects refund. Verify record remains, status FAILED, txn not falsely marked REFUNDED.
  // ----------------------------------------------------
  console.log('Running Test 7 (Gateway Failure - Sec 72)...');
  const sub7 = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: upscMcqPlan.id,
      subscriptionNumber: `SUB-TEST-${Date.now()}-7`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  const txn7 = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-TEST-${Date.now()}-7`,
      studentId: studentProfile.id,
      subscriptionId: sub7.id,
      amount: 999,
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'UPI',
    },
  });

  const refundReq7 = await RefundAdminService.requestRefund(
    {
      transactionId: txn7.id,
      refundType: 'FULL',
      reason: 'Testing gateway failure',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  await RefundAdminService.approveRefund(refundReq7.id, { id: adminUser.id, name: adminUser.fullName });

  // Simulate gateway failure
  const failedRefund = await RefundAdminService.processRefund(
    refundReq7.id,
    { id: adminUser.id, name: adminUser.fullName },
    { simulatedFailure: true, failureReason: 'Bank network timeout at gateway' }
  );

  if (failedRefund.status !== 'FAILED') {
    throw new Error(`Test 7 Failed: Status should be FAILED, got ${failedRefund.status}`);
  }

  const checkTxn7 = await prisma.paymentTransaction.findUnique({ where: { id: txn7.id } });
  if (checkTxn7?.status !== 'SUCCESSFUL') {
    throw new Error(`Test 7 Failed: Txn must NOT be marked refunded, got ${checkTxn7?.status}`);
  }
  console.log('✅ TEST 7 (Gateway Failure Safety): Passed');

  // ----------------------------------------------------
  // TEST 8: Subscription Independence (Sec 73)
  // Refund payment. Verify subscription is NOT silently cancelled.
  // ----------------------------------------------------
  console.log('Running Test 8 (Subscription Independence - Sec 73)...');
  const checkSub1 = await prisma.studentSubscription.findUnique({ where: { id: sub1.id } });
  if (checkSub1?.status !== 'ACTIVE') {
    throw new Error(`Test 8 Failed: Subscription must remain ACTIVE, got ${checkSub1?.status}`);
  }
  console.log('✅ TEST 8 (Subscription Independence): Passed');

  // ----------------------------------------------------
  // TEST 9: Plan Price Change Safety (Sec 74)
  // Original Transaction: ₹999. Later Plan changes to ₹1,199.
  // Refund screen must still show original ₹999.
  // ----------------------------------------------------
  console.log('Running Test 9 (Plan Price Change Safety - Sec 74)...');
  await prisma.subscriptionPlan.update({
    where: { id: upscMcqPlan.id },
    data: { price: 1199 },
  });

  const getRefund1 = await RefundAdminService.getRefundById(refundReq1.id);
  if (getRefund1?.originalAmount !== 999) {
    throw new Error(`Test 9 Failed: Refund originalAmount must remain 999, got ${getRefund1?.originalAmount}`);
  }
  // Revert plan price
  await prisma.subscriptionPlan.update({
    where: { id: upscMcqPlan.id },
    data: { price: 999 },
  });
  console.log('✅ TEST 9 (Plan Price Change Safety): Passed');

  // ----------------------------------------------------
  // TEST 10: UPSC MCQ vs KPSC Module/Exam Resolution & Isolation (Sec 75 & 76)
  // ----------------------------------------------------
  console.log('Running Test 10 (UPSC MCQ & KPSC Isolation - Sec 75 & 76)...');
  const detailsUPSC = await RefundAdminService.getRefundById(refundReq1.id);
  const upscPlanName = detailsUPSC?.subscription?.plan?.name;
  const upscModuleName = detailsUPSC?.subscription?.plan?.module?.name;
  const upscExamTitle = detailsUPSC?.subscription?.plan?.module?.exam?.titleEn;

  if (upscPlanName !== 'UPSC MCQ - Monthly' || upscModuleName !== 'UPSC MCQ Practice' || !upscExamTitle?.includes('UPSC')) {
    throw new Error(`Test 10 Failed: Expected UPSC MCQ resolution, got ${upscPlanName}, ${upscModuleName}, ${upscExamTitle}`);
  }

  // KPSC Refund
  const subKpsc = await prisma.studentSubscription.create({
    data: {
      studentId: studentProfile.id,
      planId: kpscPlan.id,
      subscriptionNumber: `SUB-KPSC-${Date.now()}`,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400000),
    },
  });

  const txnKpsc = await prisma.paymentTransaction.create({
    data: {
      transactionNumber: `TXN-KPSC-${Date.now()}`,
      studentId: studentProfile.id,
      subscriptionId: subKpsc.id,
      amount: 4999,
      currency: 'INR',
      status: 'SUCCESSFUL',
      paymentMethod: 'Net Banking',
    },
  });

  const refundKpsc = await RefundAdminService.requestRefund(
    {
      transactionId: txnKpsc.id,
      refundType: 'FULL',
      reason: 'KPSC annual refund request',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  const detailsKPSC = await RefundAdminService.getRefundById(refundKpsc.id);
  const kpscPlanName = detailsKPSC?.subscription?.plan?.name;
  const kpscModuleName = detailsKPSC?.subscription?.plan?.module?.name;
  const kpscExamTitle = detailsKPSC?.subscription?.plan?.module?.exam?.titleEn;

  if (kpscPlanName !== 'KPSC Full - Yearly' || kpscModuleName !== 'KPSC Full Access' || !kpscExamTitle?.toUpperCase().includes('KPSC') || kpscExamTitle?.toUpperCase().includes('UPSC')) {
    throw new Error(`Test 10 Failed: Expected KPSC resolution, got ${kpscPlanName}, ${kpscModuleName}, ${kpscExamTitle}`);
  }
  console.log('✅ TEST 10 (Module & Exam Resolution Isolation): Passed');

  // Verify Metrics & CSV Export
  console.log('Testing Metrics calculation & CSV export...');
  const metrics = await RefundAdminService.getMetrics();
  console.log('KPI Metrics:', JSON.stringify(metrics, null, 2));
  if (metrics.totalRequests.value <= 0 || metrics.totalRefundedAmount.value <= 0) {
    throw new Error('Metrics test failed: totalRequests and totalRefundedAmount should be > 0');
  }

  const csv = await RefundAdminService.exportRefunds({});
  if (!csv.includes('Refund ID') || !csv.includes(studentUser.fullName) || !csv.includes('UPSC MCQ - Monthly')) {
    throw new Error(`CSV Export failed to contain required columns or student data. Name was ${studentUser.fullName}`);
  }
  console.log('✅ Metrics and CSV Export: Passed');

  console.log('\n==========================================');
  console.log('🎉 ALL 10 TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==========================================');
}

runTests()
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
