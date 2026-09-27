const fs = require('fs');
const path = require('path');

const planPath = path.resolve(__dirname, '../apps/api/src/services/plan.service.ts');
const modulePath = path.resolve(__dirname, '../apps/api/src/services/subscription-module.service.ts');
const productPath = path.resolve(__dirname, '../apps/api/src/services/product.service.ts');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  // Read potentially UTF-16 file
  const rawBuf = fs.readFileSync(filePath);
  let content = rawBuf.toString('utf8');
  if (rawBuf[0] === 0xFF && rawBuf[1] === 0xFE) {
    content = rawBuf.toString('utf16le');
  }

  // Replace occurrences
  let newContent = content
    .replace(/subscriptions: true/g, 'studentSubscriptions: true')
    .replace(/\?\.subscriptions/g, '?.studentSubscriptions')
    .replace(/\._count\.subscriptions/g, '._count.studentSubscriptions');

  // Write back as UTF-8
  fs.writeFileSync(filePath, newContent, 'utf8');
}

fixFile(planPath);
fixFile(modulePath);
fixFile(productPath);
console.log('Fixed services.');
