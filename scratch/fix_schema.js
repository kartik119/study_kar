const fs = require('fs');
let content = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

// fix AdminProfile managedAdmins
content = content.replace('  managedAdmins    AdminProfile[] @relation("ReportingManager")\r\n', '');
if (content.includes('  adminProfile  AdminProfile?')) {
  content = content.replace('  adminProfile  AdminProfile?\r\n', '  adminProfile  AdminProfile?\r\n  managedAdmins AdminProfile[] @relation("ReportingManager")\r\n');
} else {
  content = content.replace('  adminProfile AdminProfile?\r\n', '  adminProfile AdminProfile?\r\n  managedAdmins AdminProfile[] @relation("ReportingManager")\r\n');
}

// fix AdminExamScope
content = content.replace('  testSeries TestSeries[]\r\n', '  testSeries TestSeries[]\r\n  adminScopes AdminExamScope[]\r\n');

fs.writeFileSync('packages/database/prisma/schema.prisma', content);
console.log('Done');
