import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Add subscriptions relation to StudentProfile if not present
if (!content.includes('subscriptions               StudentSubscription[]')) {
  content = content.replace(
    /model StudentProfile \{([^}]+)\}/,
    (match, body) => `model StudentProfile {${body}  subscriptions               StudentSubscription[]\n}`
  );
}

// 2. Add subscriptionModules relation to ExamCycle if not present
if (!content.includes('subscriptionModules     SubscriptionModule[]')) {
  content = content.replace(
    /model ExamCycle \{([^}]+)\}/,
    (match, body) => `model ExamCycle {${body}  subscriptionModules     SubscriptionModule[]\n}`
  );
}

// 3. Add Enums and Models if not present
const enumsAndModels = `
enum ModuleAccessType {
  FREE
  FREEMIUM
  PAID
}

enum ModuleScopeType {
  ENTIRE_EXAM
  SELECTED_FEATURES
  GLOBAL
}

enum ModuleStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum SubscriptionModuleType {
  FULL_EXAM
  MCQ
  STUDY_MATERIALS
  MOCK_TESTS
  CURRENT_AFFAIRS
  QUICK_REVISION
  STUDY_PLANS
  TEST_SERIES
  CUSTOM_BUNDLE
}

enum PlanBillingCycle {
  MONTHLY
  QUARTERLY
  HALF_YEARLY
  YEARLY
  ONE_TIME
  CUSTOM
}

enum PlanDurationUnit {
  DAYS
  MONTHS
  YEARS
  WEEKS
}

enum PlanStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum PlanType {
  FREE
  FREEMIUM
  PAID
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  PENDING
  PAUSED
  SCHEDULED
}

model SubscriptionModule {
  id                  String                 @id @default(uuid())
  code                String                 @unique
  name                String
  description         String?
  examId              String?
  scopeType           ModuleScopeType        @default(SELECTED_FEATURES)
  moduleType          SubscriptionModuleType @default(CUSTOM_BUNDLE)
  accessType          ModuleAccessType       @default(PAID)
  status              ModuleStatus           @default(DRAFT)
  iconUrl             String?
  imageUrl            String?
  features            Json?
  displayOrder        Int                    @default(0)
  publishDate         DateTime?
  createdAt           DateTime               @default(now())
  updatedAt           DateTime               @updatedAt
  createdBy           String?
  updatedBy           String?

  entitlements        ModuleEntitlement[]
  exam                ExamCycle?             @relation(fields: [examId], references: [id], onDelete: Restrict)
  plans               SubscriptionPlan[]

  @@index([accessType])
  @@index([examId])
  @@index([status])
  @@map("subscription_modules")
}

model ModuleEntitlement {
  id                   String               @id @default(uuid())
  moduleId             String
  featureKey           String
  name                 String
  description          String?
  examId               String?
  stageId              String?
  paperId              String?
  subjectId            String?
  enabled              Boolean              @default(true)
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  module               SubscriptionModule   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@index([examId])
  @@index([featureKey])
  @@index([moduleId])
  @@map("module_entitlements")
}

model SubscriptionPlan {
  id                    String                  @id @default(uuid())
  moduleId              String
  code                  String?                 @unique
  name                  String
  description           String?
  planType              PlanType                @default(PAID)
  price                 Decimal                 @default(0.00) @db.Decimal(10, 2)
  currency              String                  @default("INR")
  billingCycle          PlanBillingCycle        @default(MONTHLY)
  durationValue         Int                     @default(1)
  durationUnit          PlanDurationUnit        @default(MONTHS)
  trialEnabled          Boolean                 @default(false)
  trialDuration         Int?
  trialDurationUnit     PlanDurationUnit?
  autoRenewEligible     Boolean                 @default(false)
  benefits              Json?
  status                PlanStatus              @default(DRAFT)
  displayOrder          Int                     @default(0)
  publishDate           DateTime?
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  createdBy             String?
  updatedBy             String?

  studentSubscriptions  StudentSubscription[]
  module                SubscriptionModule      @relation(fields: [moduleId], references: [id])

  @@index([billingCycle])
  @@index([moduleId])
  @@index([planType])
  @@index([status])
  @@map("subscription_plans")
}

model StudentSubscription {
  id                 String                       @id @default(uuid())
  subscriptionNumber String?
  studentId          String
  planId             String?
  productId          String?
  status             SubscriptionStatus           @default(ACTIVE)
  paymentStatus      String                       @default("PAID")
  startDate          DateTime                     @default(now())
  endDate            DateTime?
  amount             Decimal?                     @default(0.00) @db.Decimal(10, 2)
  amountPaid         Decimal?                     @db.Decimal(10, 2)
  currency           String                       @default("INR")
  autoRenew          Boolean                      @default(false)
  assignmentSource   String                       @default("PAID_PURCHASE")
  cancelAtPeriodEnd  Boolean                      @default(false)
  cancelledAt        DateTime?
  pausedAt           DateTime?
  pauseReason        String?
  resumeDate         DateTime?
  adminNotes         String?
  createdBy          String?
  updatedBy          String?
  paymentId          String?
  paymentMethod      String?
  transactionId      String?
  invoiceId          String?
  createdAt          DateTime                     @default(now())
  updatedAt          DateTime                     @updatedAt

  plan               SubscriptionPlan?            @relation(fields: [planId], references: [id])
  student            StudentProfile               @relation(fields: [studentId], references: [id], onDelete: Cascade)
  histories          StudentSubscriptionHistory[]

  @@index([planId])
  @@index([status])
  @@index([studentId])
  @@index([subscriptionNumber])
  @@index([paymentStatus])
  @@map("student_subscriptions")
}

model StudentSubscriptionHistory {
  id                 String                     @id @default(uuid())
  subscriptionId     String
  action             String
  oldValue           Json?
  newValue           Json?
  actorType          String                     @default("ADMIN")
  actorId            String?
  actorName          String?
  reason             String?
  createdAt          DateTime                   @default(now())

  subscription       StudentSubscription        @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([action])
  @@map("student_subscription_history")
}
`;

if (!content.includes('model SubscriptionModule')) {
  content += enumsAndModels;
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('Successfully added subscription models and enums to schema.prisma');
} else {
  console.log('Subscription models already present in schema.prisma');
}
