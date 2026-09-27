import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@study-karnataka/database';

async function main() {
  console.log('Checking and safely updating Postgres student_subscriptions schema...');

  // 1. Add enum values to SubscriptionStatus if missing
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED'`);
    console.log('✓ SubscriptionStatus enum updated with PAUSED and SCHEDULED');
  } catch (err: any) {
    console.log('Enum check note:', err.message);
  }

  // 2. Allow productId to be nullable on student_subscriptions
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "student_subscriptions" ALTER COLUMN "productId" DROP NOT NULL`);
    console.log('✓ productId made nullable on student_subscriptions');
  } catch (err: any) {
    console.log('productId nullable note:', err.message);
  }

  // 3. Add missing columns to student_subscriptions safely
  const columnsToAdd = [
    `ADD COLUMN IF NOT EXISTS "subscriptionNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'PAID'`,
    `ADD COLUMN IF NOT EXISTS "amount" NUMERIC(10, 2) DEFAULT 0`,
    `ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR'`,
    `ADD COLUMN IF NOT EXISTS "assignmentSource" TEXT DEFAULT 'PAID_PURCHASE'`,
    `ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN DEFAULT false`,
    `ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3)`,
    `ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3)`,
    `ADD COLUMN IF NOT EXISTS "pauseReason" TEXT`,
    `ADD COLUMN IF NOT EXISTS "resumeDate" TIMESTAMP(3)`,
    `ADD COLUMN IF NOT EXISTS "adminNotes" TEXT`,
    `ADD COLUMN IF NOT EXISTS "createdBy" TEXT`,
    `ADD COLUMN IF NOT EXISTS "updatedBy" TEXT`,
    `ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT`,
    `ADD COLUMN IF NOT EXISTS "transactionId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "invoiceId" TEXT`
  ];

  for (const col of columnsToAdd) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "student_subscriptions" ${col}`);
  }
  console.log('✓ student_subscriptions columns added');

  // Add index on subscriptionNumber
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_subscriptions_subscriptionNumber_idx" ON "student_subscriptions"("subscriptionNumber")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_subscriptions_paymentStatus_idx" ON "student_subscriptions"("paymentStatus")`);

  // 4. Create student_subscription_history table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "student_subscription_history" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subscriptionId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "oldValue" JSONB,
      "newValue" JSONB,
      "actorType" TEXT NOT NULL DEFAULT 'ADMIN',
      "actorId" TEXT,
      "actorName" TEXT,
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "student_subscription_history_subscriptionId_fkey" 
        FOREIGN KEY ("subscriptionId") REFERENCES "student_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_subscription_history_subscriptionId_idx" ON "student_subscription_history"("subscriptionId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_subscription_history_action_idx" ON "student_subscription_history"("action")`);
  console.log('✓ student_subscription_history table verified/created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
