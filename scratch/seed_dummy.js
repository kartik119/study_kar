const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function seed() {
  console.log('Fetching dependencies...');
  
  // Need a student
  let student = await prisma.studentProfile.findFirst({
     include: { user: true }
  });
  if (!student) {
     const user = await prisma.user.create({
        data: {
           firebaseUid: 'dummy_firebase_123',
           email: 'student@example.com',
           mobile: '9999999999',
           fullName: 'Dummy Student'
        }
     });
     student = await prisma.studentProfile.create({
        data: {
           userId: user.id,
           locale: 'en',
           isEmailVerified: true,
           isMobileVerified: true,
           onboardingStatus: 'COMPLETED'
        }
     });
  }

  // Need a plan
  let plan = await prisma.subscriptionPlan.findFirst({
     include: { module: true }
  });

  if (!plan) {
     console.log('No plan found. Creating one...');
     const mod = await prisma.subscriptionModule.create({
        data: {
           moduleType: 'FULL_EXAM',
           name: 'UPSC Full Access',
           slug: 'upsc-full-access',
           accessType: 'PAID',
           status: 'ACTIVE'
        }
     });
     plan = await prisma.subscriptionPlan.create({
        data: {
           moduleId: mod.id,
           name: 'Yearly Plan',
           planType: 'STANDARD',
           billingCycle: 'YEARLY',
           durationDays: 365,
           mrpPrice: 19999,
           sellingPrice: 14999,
           status: 'ACTIVE'
        }
     });
  }

  // Need a subscription
  let sub = await prisma.studentSubscription.findFirst({
      where: { studentId: student.id }
  });
  if (!sub) {
     sub = await prisma.studentSubscription.create({
        data: {
           studentId: student.id,
           planId: plan.id,
           status: 'ACTIVE',
           startDate: new Date(),
           endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
     });
  }

  console.log('Creating coupons...');
  
  await prisma.coupon.create({
     data: {
        code: 'UPSC20',
        name: 'UPSC Launch Offer',
        description: 'Get 20% discount on eligible UPSC Full Access plans.',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        maximumDiscountAmount: 5000,
        minimumOrderAmount: 1000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageType: 'LIMITED',
        maximumUsage: 500,
        usedCount: 15,
        perUserLimit: 1,
        firstTimeUserOnly: true,
        showOnWebsite: true,
        status: 'ACTIVE',
        applicableModules: {
           create: {
              moduleId: plan.moduleId
           }
        }
     }
  });

  await prisma.coupon.create({
     data: {
        code: 'FESTIVE500',
        name: 'Festive Discount',
        description: 'Flat ₹500 off on any plan.',
        discountType: 'FIXED_AMOUNT',
        discountValue: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usageType: 'UNLIMITED',
        usedCount: 142,
        perUserLimit: 1,
        firstTimeUserOnly: false,
        showOnWebsite: true,
        status: 'ACTIVE'
     }
  });

  await prisma.coupon.create({
     data: {
        code: 'OLD30',
        name: 'Old Promotion',
        description: 'Previous 30% discount offer.',
        discountType: 'PERCENTAGE',
        discountValue: 30,
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        usageType: 'LIMITED',
        maximumUsage: 100,
        usedCount: 100,
        perUserLimit: 1,
        firstTimeUserOnly: false,
        showOnWebsite: false,
        status: 'EXPIRED'
     }
  });

  console.log('Creating transactions...');
  
  await prisma.paymentTransaction.create({
     data: {
        transactionNumber: 'pay_' + crypto.randomBytes(8).toString('hex'),
        studentId: student.id,
        subscriptionId: sub.id,
        planId: plan.id,
        moduleId: plan.moduleId,
        amount: 14999,
        currency: 'INR',
        paymentMethod: 'UPI',
        paymentProvider: 'PhonePe',
        gatewayOrderId: 'order_' + crypto.randomBytes(8).toString('hex'),
        gatewayPaymentId: 'pay_' + crypto.randomBytes(8).toString('hex'),
        status: 'SUCCESSFUL',
        paidAt: new Date(),
        planSnapshot: { name: plan.name, price: plan.sellingPrice },
        moduleSnapshot: { name: plan.module.name, type: plan.module.moduleType }
     }
  });

  await prisma.paymentTransaction.create({
     data: {
        transactionNumber: 'pay_' + crypto.randomBytes(8).toString('hex'),
        studentId: student.id,
        subscriptionId: sub.id,
        planId: plan.id,
        moduleId: plan.moduleId,
        amount: 14999,
        currency: 'INR',
        paymentMethod: 'CARD',
        paymentProvider: 'Visa',
        gatewayOrderId: 'order_' + crypto.randomBytes(8).toString('hex'),
        status: 'FAILED',
        failureReason: 'Insufficient funds',
        planSnapshot: { name: plan.name, price: plan.sellingPrice },
        moduleSnapshot: { name: plan.module.name, type: plan.module.moduleType }
     }
  });

  await prisma.paymentTransaction.create({
     data: {
        transactionNumber: 'pay_' + crypto.randomBytes(8).toString('hex'),
        studentId: student.id,
        subscriptionId: sub.id,
        planId: plan.id,
        moduleId: plan.moduleId,
        amount: 14999,
        currency: 'INR',
        paymentMethod: 'NET_BANKING',
        paymentProvider: 'HDFC',
        gatewayOrderId: 'order_' + crypto.randomBytes(8).toString('hex'),
        gatewayPaymentId: 'pay_' + crypto.randomBytes(8).toString('hex'),
        status: 'REFUNDED',
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        planSnapshot: { name: plan.name, price: plan.sellingPrice },
        moduleSnapshot: { name: plan.module.name, type: plan.module.moduleType }
     }
  });

  console.log('Seed complete!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
