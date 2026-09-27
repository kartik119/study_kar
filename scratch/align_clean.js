const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
const appendPath = path.resolve(__dirname, '../scratch/models_to_append.prisma');

let content = fs.readFileSync(schemaPath, 'utf8');

// Append models from models_to_append.prisma which contains ALL missing models (Modules, Plans, Transactions, Coupons)
const appendContent = fs.readFileSync(appendPath, 'utf8');
if (!content.includes('model PaymentTransaction')) {
  content += '\n' + appendContent;
}

// Fix relations in original models
if (!content.includes('subscriptions               StudentSubscription[]')) {
  content = content.replace(
    /model StudentProfile \{([^}]+)\}/,
    (match, body) => "model StudentProfile {" + body.replace(/\s*@@map/g, '\n  subscriptions               StudentSubscription[]\n  transactions                PaymentTransaction[]\n  couponRedemptions           CouponRedemption[]\n\n  @@map') + "}"
  );
}

if (!content.includes('subscriptionModules     SubscriptionModule[]')) {
  content = content.replace(
    /model ExamCycle \{([^}]+)\}/,
    (match, body) => "model ExamCycle {" + body.replace(/\s*@@map/g, '\n  subscriptionModules     SubscriptionModule[]\n\n  @@map') + "}"
  );
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully aligned schema cleanly.');
