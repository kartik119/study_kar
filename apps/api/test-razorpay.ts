import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import crypto from 'crypto';
import { prisma, GatewayEnvironment, GatewayIntegrationStatus, TransactionStatus, SubscriptionStatus } from '@study-karnataka/database';
import { RazorpayAdminService } from './src/services/razorpay.admin.service';

async function runRazorpayTests() {
  console.log('--- STARTING RAZORPAY PAYMENT GATEWAY VERIFICATION ---');

  // Setup admin & student fixtures
  let adminUser = await prisma.user.findFirst({ where: { accountType: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'razorpayadmin@studykarnataka.com',
        fullName: 'Razorpay Admin',
        accountType: 'ADMIN',
      },
    });
  }

  let studentUser = await prisma.user.findFirst({ where: { accountType: 'STUDENT' } });
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        email: 'student.razorpay@example.com',
        fullName: 'Priya Sharma',
        accountType: 'STUDENT',
        mobile: '9888877777',
      },
    });
  }

  let studentProfile = await prisma.studentProfile.findFirst({ where: { userId: studentUser.id } });
  if (!studentProfile) {
    studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id },
    });
  }

  // Find or create test Exam, Module, and Plan
  let upscCycle = await prisma.examCycle.findFirst();
  let moduleTest = await prisma.subscriptionModule.findFirst({
    where: { name: 'UPSC Full Access' },
  });
  if (!moduleTest) {
    moduleTest = await prisma.subscriptionModule.create({
      data: {
        code: `MOD-RZP-${Date.now()}`,
        name: 'UPSC Full Access',
        examId: upscCycle?.id,
        status: 'ACTIVE',
      },
    });
  }

  let planTest = await prisma.subscriptionPlan.findFirst({
    where: { moduleId: moduleTest.id },
  });
  if (!planTest) {
    planTest = await prisma.subscriptionPlan.create({
      data: {
        code: `PLAN-RZP-${Date.now()}`,
        name: 'UPSC Full - Monthly',
        moduleId: moduleTest.id,
        billingCycle: 'MONTHLY',
        price: 999,
        durationValue: 1,
        durationUnit: 'MONTHS',
        status: 'ACTIVE',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Valid Test Credentials & Test Connection (Section 81)
  // ---------------------------------------------------------------------------
  console.log('Running Test 1 (Valid Test Credentials & Connection - Sec 81)...');
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'TEST',
      keyId: 'rzp_test_mockKey1234567890',
      keySecret: 'secret_test_mockSecret1234567890',
      webhookSecret: 'whsec_test_mockWebhookSecret1234',
      isActive: true,
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  const testConnResult = await RazorpayAdminService.testConnection('TEST', {
    id: adminUser.id,
    name: adminUser.fullName,
  });

  if (!testConnResult.success) {
    throw new Error(`Test 1 Failed: Connection test expected success, got ${JSON.stringify(testConnResult)}`);
  }

  const testConfig = await RazorpayAdminService.getConfiguration('TEST');
  if (testConfig.environment !== 'TEST' || !testConfig.lastVerifiedAt) {
    throw new Error('Test 1 Failed: Config must reflect TEST environment with lastVerifiedAt set');
  }
  console.log('✅ TEST 1 (Valid Test Credentials & Connection): Passed');

  // ---------------------------------------------------------------------------
  // TEST 2: Invalid Credentials Safety (Section 82)
  // ---------------------------------------------------------------------------
  console.log('Running Test 2 (Invalid Credentials Verification - Sec 82)...');
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'TEST',
      keyId: 'invalid_bad_key',
      keySecret: 'short',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  const invalidConnResult = await RazorpayAdminService.testConnection('TEST', {
    id: adminUser.id,
    name: adminUser.fullName,
  });

  if (invalidConnResult.success) {
    throw new Error('Test 2 Failed: Connection with invalid credentials should fail');
  }
  if (invalidConnResult.status !== 'Invalid Credentials' && invalidConnResult.status !== 'Connection Error') {
    throw new Error(`Test 2 Failed: Expected failure status, got ${invalidConnResult.status}`);
  }

  // Restore valid test credentials
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'TEST',
      keyId: 'rzp_test_mockKey1234567890',
      keySecret: 'secret_test_mockSecret1234567890',
      webhookSecret: 'whsec_test_mockWebhookSecret1234',
      isActive: true,
    },
    { id: adminUser.id, name: adminUser.fullName }
  );
  await RazorpayAdminService.testConnection('TEST', { id: adminUser.id, name: adminUser.fullName });
  console.log('✅ TEST 2 (Invalid Credentials Safety): Passed');

  // ---------------------------------------------------------------------------
  // TEST 3: Live Config & Environment Switching (Section 83)
  // ---------------------------------------------------------------------------
  console.log('Running Test 3 (Live Config & Environment Switching - Sec 83)...');
  // Configure Live credentials
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'LIVE',
      keyId: 'rzp_live_productionKey12345678',
      keySecret: 'live_secret_productionSecret98765',
      webhookSecret: 'whsec_live_mockWebhookSecret987',
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  // Switch to LIVE
  await RazorpayAdminService.switchEnvironment('LIVE', {
    id: adminUser.id,
    name: adminUser.fullName,
  });

  const liveConfig = await RazorpayAdminService.getConfiguration('LIVE');
  if (liveConfig.environment !== 'LIVE' || !liveConfig.isActive) {
    throw new Error('Test 3 Failed: Switched environment must be LIVE and isActive=true');
  }

  // Switch back to TEST for safety
  await RazorpayAdminService.switchEnvironment('TEST', {
    id: adminUser.id,
    name: adminUser.fullName,
  });
  const restoredTestConfig = await RazorpayAdminService.getConfiguration('TEST');
  if (restoredTestConfig.environment !== 'TEST' || !restoredTestConfig.isActive) {
    throw new Error('Test 3 Failed: Restored environment must be TEST and isActive=true');
  }
  console.log('✅ TEST 3 (Live Config & Environment Switching): Passed');

  // ---------------------------------------------------------------------------
  // TEST 4: Webhook Signature Verification (Section 84)
  // ---------------------------------------------------------------------------
  console.log('Running Test 4 (Webhook Signature Verification - Sec 84)...');
  const webhookTestOrder = await RazorpayAdminService.createOrder({
    planId: planTest.id,
    studentId: studentProfile.id,
  });

  const webhookSecret = 'whsec_test_mockWebhookSecret1234';
  const sampleEventId = `evt_test_${Date.now()}`;
  const validPayload = JSON.stringify({
    event_id: sampleEventId,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_test_${Date.now()}`,
          order_id: webhookTestOrder.orderId,
          amount: 99900,
          method: 'upi',
        },
      },
    },
  });

  const validSignature = crypto.createHmac('sha256', webhookSecret).update(validPayload).digest('hex');

  // Valid signature should be accepted
  const validWebhookResult = await RazorpayAdminService.handleWebhook(validPayload, validSignature);
  if (validWebhookResult.status !== 'PROCESSED') {
    throw new Error(`Test 4 Failed: Expected PROCESSED, got ${validWebhookResult.status}`);
  }

  // Invalid signature must be rejected
  let invalidSignatureFailed = false;
  try {
    await RazorpayAdminService.handleWebhook(validPayload, 'bad_signature_hash_123');
  } catch (err: any) {
    invalidSignatureFailed = true;
    console.log(`Expected webhook signature rejection: "${err.message}"`);
  }
  if (!invalidSignatureFailed) {
    throw new Error('Test 4 Failed: Invalid webhook signature should have been rejected');
  }
  console.log('✅ TEST 4 (Webhook Signature Verification): Passed');

  // ---------------------------------------------------------------------------
  // TEST 5: Duplicate Webhook Idempotency (Section 85)
  // ---------------------------------------------------------------------------
  console.log('Running Test 5 (Duplicate Webhook Idempotency - Sec 85)...');
  const duplicateResult = await RazorpayAdminService.handleWebhook(validPayload, validSignature);
  if (duplicateResult.status !== 'ALREADY_PROCESSED') {
    throw new Error(`Test 5 Failed: Expected ALREADY_PROCESSED for duplicate event, got ${duplicateResult.status}`);
  }
  console.log('✅ TEST 5 (Duplicate Webhook Idempotency): Passed');

  // ---------------------------------------------------------------------------
  // TEST 6: Successful Payment Flow (Section 86)
  // Plan: UPSC Full Monthly (₹999) -> Order Created -> Payment Completed
  // Verify: Txn SUCCESSFUL, Subscription ACTIVE, Invoice generated
  // ---------------------------------------------------------------------------
  console.log('Running Test 6 (Successful Payment Flow - Sec 86)...');
  const planPrice = Number(planTest.price);
  const planPaise = Math.round(planPrice * 100);

  const orderRes = await RazorpayAdminService.createOrder({
    planId: planTest.id,
    studentId: studentProfile.id,
  });

  if (orderRes.amount !== planPrice || orderRes.amountInPaise !== planPaise) {
    throw new Error(`Test 6 Failed: Expected amount ${planPrice} / ${planPaise} paise, got ${orderRes.amount} / ${orderRes.amountInPaise}`);
  }

  const paymentId = `pay_succ_${Date.now()}`;
  const completeRes = await RazorpayAdminService.completePayment({
    orderId: orderRes.orderId,
    paymentId,
    paymentMethod: 'UPI',
  });

  if (completeRes.transaction.status !== TransactionStatus.SUCCESSFUL) {
    throw new Error(`Test 6 Failed: Expected txn status SUCCESSFUL, got ${completeRes.transaction.status}`);
  }
  if (!completeRes.subscription || completeRes.subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new Error('Test 6 Failed: StudentSubscription must be ACTIVE');
  }
  if (!completeRes.invoice || completeRes.invoice.status !== 'PAID') {
    throw new Error('Test 6 Failed: Paid invoice must be generated');
  }
  console.log('✅ TEST 6 (Successful Payment Flow & Entity Integration): Passed');

  // ---------------------------------------------------------------------------
  // TEST 7: Failed Payment Flow (Section 87)
  // ---------------------------------------------------------------------------
  console.log('Running Test 7 (Failed Payment Flow - Sec 87)...');
  const failedOrder = await RazorpayAdminService.createOrder({
    planId: planTest.id,
    studentId: studentProfile.id,
  });

  // Webhook reports payment.failed
  const failedEventPayload = JSON.stringify({
    event_id: `evt_fail_${Date.now()}`,
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_fail_${Date.now()}`,
          order_id: failedOrder.orderId,
          error_description: 'Card declined by issuing bank',
        },
      },
    },
  });

  const failSig = crypto.createHmac('sha256', webhookSecret).update(failedEventPayload).digest('hex');
  await RazorpayAdminService.handleWebhook(failedEventPayload, failSig);

  const checkFailedTxn = await prisma.paymentTransaction.findUnique({
    where: { id: failedOrder.transactionId },
  });

  if (checkFailedTxn?.status !== TransactionStatus.FAILED) {
    throw new Error(`Test 7 Failed: Expected status FAILED, got ${checkFailedTxn?.status}`);
  }
  if (checkFailedTxn?.subscriptionId) {
    const subCheck = await prisma.studentSubscription.findUnique({ where: { id: checkFailedTxn.subscriptionId } });
    if (subCheck?.status === SubscriptionStatus.ACTIVE) {
      throw new Error('Test 7 Failed: Subscription must NOT be active on failed payment');
    }
  }
  console.log('✅ TEST 7 (Failed Payment Flow): Passed');

  // ---------------------------------------------------------------------------
  // TEST 8: Payment Retry (Section 88)
  // Attempt 1: Failed. Attempt 2: Successful. Both preserved in history.
  // ---------------------------------------------------------------------------
  console.log('Running Test 8 (Payment Retry - Sec 88)...');
  const retryOrder = await RazorpayAdminService.createOrder({
    planId: planTest.id,
    studentId: studentProfile.id,
  });

  // Attempt 1 fails
  await prisma.paymentTransaction.update({
    where: { id: retryOrder.transactionId },
    data: { status: TransactionStatus.FAILED, failureReason: 'Bank timeout' },
  });

  // Student retries -> creates new transaction attempt
  const retryOrder2 = await RazorpayAdminService.createOrder({
    planId: planTest.id,
    studentId: studentProfile.id,
  });

  // Attempt 2 succeeds
  await RazorpayAdminService.completePayment({
    orderId: retryOrder2.orderId,
    paymentId: `pay_retry_success_${Date.now()}`,
    paymentMethod: 'Card (Visa)',
  });

  const txnAttempt1 = await prisma.paymentTransaction.findUnique({ where: { id: retryOrder.transactionId } });
  const txnAttempt2 = await prisma.paymentTransaction.findUnique({ where: { id: retryOrder2.transactionId } });

  if (txnAttempt1?.status !== TransactionStatus.FAILED || txnAttempt2?.status !== TransactionStatus.SUCCESSFUL) {
    throw new Error('Test 8 Failed: Both attempts must remain in history (Failed and Successful)');
  }
  console.log('✅ TEST 8 (Payment Retry Preservation): Passed');

  // ---------------------------------------------------------------------------
  // TEST 9: Coupon Payment Backend Calculation (Section 89)
  // Plan: ₹999, Coupon 20% discount -> ₹799.20. Paise: 79920.
  // ---------------------------------------------------------------------------
  console.log('Running Test 9 (Coupon Payment Calculation - Sec 89)...');
  const couponCode = `COUPON20_${Date.now()}`;
  await prisma.coupon.create({
    data: {
      code: couponCode,
      name: '20 Percent Off',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      scopeType: 'ALL_PLANS',
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      status: 'ACTIVE',
      isActive: true,
    },
  });

  const couponOrder = await RazorpayAdminService.calculateOrderAmount(planTest.id, couponCode, studentProfile.id);
  const expectedPayable = planPrice - (planPrice * 20) / 100;
  const expectedPaise = Math.round(expectedPayable * 100);

  if (Math.abs(couponOrder.finalPayable - expectedPayable) > 0.01 || couponOrder.amountInPaise !== expectedPaise) {
    throw new Error(
      `Test 9 Failed: Expected ₹${expectedPayable} (${expectedPaise} paise), got ₹${couponOrder.finalPayable} (${couponOrder.amountInPaise})`
    );
  }
  console.log('✅ TEST 9 (Coupon Payment Calculation & Paise Conversion): Passed');

  // ---------------------------------------------------------------------------
  // TEST 10: Refund Integration (Section 90)
  // ---------------------------------------------------------------------------
  console.log('Running Test 10 (Refund Integration - Sec 90)...');
  const refundWebhookPayload = JSON.stringify({
    event_id: `evt_rfnd_${Date.now()}`,
    event: 'refund.processed',
    payload: {
      refund: {
        entity: {
          id: `rfnd_mock_${Date.now()}`,
          amount: 50000,
          status: 'processed',
        },
      },
    },
  });
  const rfndSig = crypto.createHmac('sha256', webhookSecret).update(refundWebhookPayload).digest('hex');
  const refundEventRes = await RazorpayAdminService.handleWebhook(refundWebhookPayload, rfndSig);
  if (refundEventRes.status !== 'PROCESSED') {
    throw new Error(`Test 10 Failed: Expected refund event PROCESSED, got ${refundEventRes.status}`);
  }
  console.log('✅ TEST 10 (Refund Webhook Integration): Passed');

  // ---------------------------------------------------------------------------
  // TEST 11: Payment Method Toggles (Section 91)
  // ---------------------------------------------------------------------------
  console.log('Running Test 11 (Payment Method Toggles - Sec 91)...');
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'TEST',
      walletEnabled: false,
      internationalEnabled: true,
    },
    { id: adminUser.id, name: adminUser.fullName }
  );

  const toggledConfig = await RazorpayAdminService.getConfiguration('TEST');
  if (toggledConfig.walletEnabled !== false || toggledConfig.internationalEnabled !== true) {
    throw new Error('Test 11 Failed: Payment method toggles failed to persist');
  }

  // Restore defaults
  await RazorpayAdminService.saveConfiguration(
    {
      environment: 'TEST',
      walletEnabled: true,
      internationalEnabled: false,
    },
    { id: adminUser.id, name: adminUser.fullName }
  );
  console.log('✅ TEST 11 (Payment Method Toggles): Passed');

  // ---------------------------------------------------------------------------
  // TEST 12: Secret Security & Masking (Section 92)
  // Secrets must never be returned plaintext to frontend APIs
  // ---------------------------------------------------------------------------
  console.log('Running Test 12 (Secret Security & Masking - Sec 92)...');
  const exposedConfig: any = await RazorpayAdminService.getConfiguration('TEST');
  if (exposedConfig.keySecret || exposedConfig.webhookSecret || exposedConfig.encryptedKeySecret) {
    throw new Error('Test 12 Failed: Raw or encrypted secrets exposed in API response!');
  }
  if (!exposedConfig.hasKeySecret || exposedConfig.maskedKeySecret !== '••••••••••••••••••••••••') {
    throw new Error('Test 12 Failed: Masked secret representation missing or incorrect');
  }
  console.log('✅ TEST 12 (Secret Security & Masking): Passed');

  // ---------------------------------------------------------------------------
  // TEST 13: Test Payment Sandbox Flow (Section 47-50)
  // ---------------------------------------------------------------------------
  console.log('Running Test 13 (Test Payment Sandbox Flow - Sec 47-50)...');
  const testPaymentRes = await RazorpayAdminService.createTestPayment(5, studentProfile.id);
  if (!testPaymentRes.success || testPaymentRes.amount !== 5 || !testPaymentRes.transactionNumber) {
    throw new Error(`Test 13 Failed: Test payment creation failed, got ${JSON.stringify(testPaymentRes)}`);
  }
  console.log('✅ TEST 13 (Test Payment Sandbox Flow): Passed');

  // Check KPI Metrics
  console.log('Verifying KPI Metrics aggregation...');
  const kpiMetrics = await RazorpayAdminService.getMetrics();
  console.log('KPI Metrics:', JSON.stringify(kpiMetrics, null, 2));
  if (kpiMetrics.successfulPayments.value <= 0 || !kpiMetrics.totalPaymentVolume.formatted) {
    throw new Error('Metrics verification failed');
  }
  console.log('✅ KPI Metrics Aggregation: Passed');

  console.log('\n======================================================');
  console.log('🎉 ALL 13 RAZORPAY VERIFICATION TESTS PASSED! 🎉');
  console.log('======================================================');
}

runRazorpayTests()
  .catch(err => {
    console.error('❌ Razorpay Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
