const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const paymentAndCouponModels = `
enum TransactionStatus {
  PENDING
  PROCESSING
  SUCCESSFUL
  FAILED
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}

model PaymentTransaction {
  id                  String             @id @default(uuid())
  transactionNumber   String             @unique
  studentId           String
  subscriptionId      String?
  planId              String?
  moduleId            String?
  examId              String?
  amount              Decimal            @db.Decimal(10, 2)
  currency            String             @default("INR")
  paymentMethod       String?
  paymentProvider     String?
  paymentSource       String?            @default("RAZORPAY")
  gatewayOrderId      String?
  gatewayPaymentId    String?
  gatewaySignature    String?
  status              TransactionStatus  @default(PENDING)
  failureCode         String?
  failureReason       String?
  invoiceId           String?
  paidAt              DateTime?
  metadata            Json?
  
  planSnapshot        Json?
  moduleSnapshot      Json?

  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  student             StudentProfile       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subscription        StudentSubscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  couponRedemptions   CouponRedemption[]

  @@index([studentId])
  @@index([subscriptionId])
  @@index([status])
  @@index([transactionNumber])
  @@index([gatewayOrderId])
  @@index([gatewayPaymentId])
  @@index([createdAt])
  @@map("payment_transactions")
}

enum CouponScopeType {
  ALL_PLANS
  SELECTED_MODULES
  SELECTED_PLANS
  SELECTED_MODULES_AND_PLANS
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum CouponStatus {
  DRAFT
  ACTIVE
  SCHEDULED
  INACTIVE
  EXPIRED
}

enum CouponUsageType {
  LIMITED
  UNLIMITED
}

model Coupon {
  id                   String              @id @default(uuid())
  code                 String              @unique
  name                 String
  description          String?             @db.Text
  discountType         DiscountType
  discountValue        Decimal             @db.Decimal(10, 2)
  maximumDiscount      Decimal?            @db.Decimal(10, 2)
  minimumOrderAmount   Decimal?            @db.Decimal(10, 2)
  scopeType            CouponScopeType     @default(ALL_PLANS)
  startDate            DateTime
  endDate              DateTime
  usageType            CouponUsageType     @default(UNLIMITED)
  maximumUsage         Int?
  usedCount            Int                 @default(0)
  usagePerStudent      Int                 @default(1)
  firstTimeOnly        Boolean             @default(false)
  isActive             Boolean             @default(true)
  showPublicly         Boolean             @default(true)
  status               CouponStatus        @default(DRAFT)
  internalNotes        String?             @db.Text
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  createdBy            String?
  updatedBy            String?

  applicableModules    CouponModule[]
  applicablePlans      CouponPlan[]
  redemptions          CouponRedemption[]

  @@index([code])
  @@index([status])
  @@index([startDate, endDate])
  @@map("coupons")
}

model CouponModule {
  id        String             @id @default(uuid())
  couponId  String
  moduleId  String
  
  coupon    Coupon             @relation(fields: [couponId], references: [id], onDelete: Cascade)
  module    SubscriptionModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([couponId, moduleId])
  @@index([moduleId])
  @@map("coupon_modules")
}

model CouponPlan {
  id        String           @id @default(uuid())
  couponId  String
  planId    String
  
  coupon    Coupon           @relation(fields: [couponId], references: [id], onDelete: Cascade)
  plan      SubscriptionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([couponId, planId])
  @@index([planId])
  @@map("coupon_plans")
}

model CouponRedemption {
  id              String               @id @default(uuid())
  couponId        String
  studentId       String
  subscriptionId  String?
  transactionId   String?
  planId          String?
  originalAmount  Decimal              @db.Decimal(10, 2)
  discountAmount  Decimal              @db.Decimal(10, 2)
  finalAmount     Decimal              @db.Decimal(10, 2)
  redeemedAt      DateTime             @default(now())
  status          String               @default("SUCCESS")
  metadata        Json?

  coupon          Coupon               @relation(fields: [couponId], references: [id], onDelete: Cascade)
  student         StudentProfile       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subscription    StudentSubscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  transaction     PaymentTransaction?  @relation(fields: [transactionId], references: [id], onDelete: SetNull)

  @@index([couponId])
  @@index([studentId])
  @@index([transactionId])
  @@map("coupon_redemptions")
}
`;

if (!content.includes('model PaymentTransaction')) {
  content += paymentAndCouponModels;
}

// Ensure relations are present in other models
if (!content.includes('transactions                PaymentTransaction[]')) {
  content = content.replace(
    /model StudentProfile \{([^}]+)\}/,
    (match, body) => \`model StudentProfile {\${body}  transactions                PaymentTransaction[]\\n  couponRedemptions           CouponRedemption[]\\n}\`
  );
}

if (!content.includes('couponModules       CouponModule[]')) {
  content = content.replace(
    /model SubscriptionModule \{([^}]+)\}/,
    (match, body) => \`model SubscriptionModule {\${body.replace(/\\s*@@index/g, '\\n  couponModules       CouponModule[]\\n\\n  @@index')}}\`
  );
}

if (!content.includes('couponPlans           CouponPlan[]')) {
  content = content.replace(
    /model SubscriptionPlan \{([^}]+)\}/,
    (match, body) => \`model SubscriptionPlan {\${body.replace(/\\s*@@index/g, '\\n  couponPlans           CouponPlan[]\\n\\n  @@index')}}\`
  );
}

if (!content.includes('transactions       PaymentTransaction[]')) {
  content = content.replace(
    /model StudentSubscription \{([^}]+)\}/,
    (match, body) => \`model StudentSubscription {\${body.replace(/\\s*@@index/g, '\\n  transactions       PaymentTransaction[]\\n  couponRedemptions  CouponRedemption[]\\n\\n  @@index')}}\`
  );
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully aligned schema with Coupon and Transaction models.');
