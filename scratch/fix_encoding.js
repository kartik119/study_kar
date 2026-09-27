const fs = require('fs');

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const buf = fs.readFileSync(filePath);
  
  let content = '';
  // Check for UTF-16 LE BOM
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    content = buf.toString('utf16le');
  } 
  // If it's UTF-16 without BOM (usually lots of null bytes)
  else if (buf.includes(0x00)) {
    content = buf.toString('utf16le');
  } else {
    content = buf.toString('utf8');
  }

  // Remove BOM if it was included in the string
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  // Replace occurrences
  let newContent = content
    .replace(/subscriptions: true/g, 'studentSubscriptions: true')
    .replace(/\?\.subscriptions/g, '?.studentSubscriptions')
    .replace(/\._count\.subscriptions/g, '._count.studentSubscriptions');

  // Write as clean UTF-8
  fs.writeFileSync(filePath, Buffer.from(newContent, 'utf8'));
  console.log('Fixed', filePath);
}

fixFile('apps/api/src/services/plan.service.ts');
fixFile('apps/api/src/services/subscription-module.service.ts');
fixFile('apps/api/src/services/product.service.ts');
