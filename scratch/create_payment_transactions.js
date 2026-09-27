const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Kanishk~1122@localhost:5432/study_karnataka?schema=public"
    }
  }
});

async function run() {
  try {
    console.log("Creating enum...");
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("Creating table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
          "id" TEXT NOT NULL,
          "transactionNumber" TEXT NOT NULL,
          "studentId" TEXT NOT NULL,
          "subscriptionId" TEXT,
          "planId" TEXT,
          "moduleId" TEXT,
          "examId" TEXT,
          "amount" DECIMAL(10,2) NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "paymentMethod" TEXT,
          "paymentProvider" TEXT,
          "paymentSource" TEXT DEFAULT 'RAZORPAY',
          "gatewayOrderId" TEXT,
          "gatewayPaymentId" TEXT,
          "gatewaySignature" TEXT,
          "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
          "failureCode" TEXT,
          "failureReason" TEXT,
          "invoiceId" TEXT,
          "paidAt" TIMESTAMP(3),
          "metadata" JSONB,
          "planSnapshot" JSONB,
          "moduleSnapshot" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log("Creating indexes...");
    const queries = [
      'CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_transactionNumber_key" ON "payment_transactions"("transactionNumber");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_studentId_idx" ON "payment_transactions"("studentId");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_subscriptionId_idx" ON "payment_transactions"("subscriptionId");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions"("status");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_transactionNumber_idx" ON "payment_transactions"("transactionNumber");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_gatewayOrderId_idx" ON "payment_transactions"("gatewayOrderId");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_gatewayPaymentId_idx" ON "payment_transactions"("gatewayPaymentId");',
      'CREATE INDEX IF NOT EXISTS "payment_transactions_createdAt_idx" ON "payment_transactions"("createdAt");',
      'ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_studentId_fkey";',
      'ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
      'ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_subscriptionId_fkey";',
      'ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "student_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;'
    ];

    for (let q of queries) {
      await prisma.$executeRawUnsafe(q);
    }
    console.log("Done successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
