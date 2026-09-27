const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
const appendPath = path.resolve(__dirname, '../scratch/models_to_append.prisma');
const updateScript = path.resolve(__dirname, '../scratch/update_prisma_schema.ts');

let content = fs.readFileSync(schemaPath, 'utf8');

if (!content.includes('subscriptions               StudentSubscription[]')) {
  content = content.replace(
    /model StudentProfile \{([^}]+)\}/,
    (match, body) => "model StudentProfile {" + body + "  subscriptions               StudentSubscription[]\n}"
  );
}
if (!content.includes('subscriptionModules     SubscriptionModule[]')) {
  content = content.replace(
    /model ExamCycle \{([^}]+)\}/,
    (match, body) => "model ExamCycle {" + body + "  subscriptionModules     SubscriptionModule[]\n}"
  );
}

const updateContent = fs.readFileSync(updateScript, 'utf8');
const enumsMatch = updateContent.match(/const enumsAndModels = `([\s\S]+?)`;/);
if (enumsMatch && !content.includes('model SubscriptionModule')) {
  content += '\n' + enumsMatch[1];
}

const appendContent = fs.readFileSync(appendPath, 'utf8');
if (!content.includes('model PaymentTransaction')) {
  content += '\n' + appendContent;
}

if (!content.includes('transactions                PaymentTransaction[]')) {
  content = content.replace(
    /model StudentProfile \{([^}]+)\}/,
    (match, body) => "model StudentProfile {" + body.replace(/\s*@@map/g, '\n  transactions                PaymentTransaction[]\n  couponRedemptions           CouponRedemption[]\n\n  @@map') + "}"
  );
}

if (content.includes('model SubscriptionModule') && !content.includes('couponModules       CouponModule[]')) {
  content = content.replace(
    /model SubscriptionModule \{([^}]+)\}/,
    (match, body) => "model SubscriptionModule {" + body.replace(/\s*@@index/g, '\n  couponModules       CouponModule[]\n\n  @@index') + "}"
  );
}

if (content.includes('model SubscriptionPlan') && !content.includes('couponPlans           CouponPlan[]')) {
  content = content.replace(
    /model SubscriptionPlan \{([^}]+)\}/,
    (match, body) => "model SubscriptionPlan {" + body.replace(/\s*@@index/g, '\n  couponPlans           CouponPlan[]\n\n  @@index') + "}"
  );
}

if (content.includes('model StudentSubscription') && !content.includes('transactions       PaymentTransaction[]')) {
  content = content.replace(
    /model StudentSubscription \{([^}]+)\}/,
    (match, body) => "model StudentSubscription {" + body.replace(/\s*@@index/g, '\n  transactions       PaymentTransaction[]\n  couponRedemptions  CouponRedemption[]\n\n  @@index') + "}"
  );
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully aligned schema entirely using JS.');
