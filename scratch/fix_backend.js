const fs = require('fs');
const path = require('path');

// 1. Delete product-related files
const filesToDelete = [
  'apps/api/src/services/product.service.ts',
  'apps/api/src/services/product-category.service.ts',
  'apps/api/src/routes/product.admin.routes.ts',
  'apps/api/src/routes/product-category.admin.routes.ts'
];
filesToDelete.forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log('Deleted ' + f);
  }
});

// 2. Remove their imports from app.ts (or routes/index)
const appTs = 'apps/api/src/app.ts';
if (fs.existsSync(appTs)) {
  let content = fs.readFileSync(appTs, 'utf8');
  content = content.replace(/import \{ productAdminRouter \} from '.*';\n/, '');
  content = content.replace(/import \{ productCategoryAdminRouter \} from '.*';\n/, '');
  content = content.replace(/app\.use\('\/api\/v1\/admin\/products', productAdminRouter\);\n/, '');
  content = content.replace(/app\.use\('\/api\/v1\/admin\/product-categories', productCategoryAdminRouter\);\n/, '');
  fs.writeFileSync(appTs, content);
}

// 3. Fix student-subscription.admin.routes.ts
const ssAdmin = 'apps/api/src/routes/student-subscription.admin.routes.ts';
if (fs.existsSync(ssAdmin)) {
  let content = fs.readFileSync(ssAdmin, 'utf8');
  content = content.replace(/req\.user\?\.fullName/g, "'Admin'");
  // Fix Argument of type 'string | string[]' ... by explicitly casting or stringifying
  content = content.replace(/req\.query\.studentId/g, "req.query.studentId as string");
  content = content.replace(/req\.query\.examId/g, "req.query.examId as string");
  content = content.replace(/req\.query\.moduleId/g, "req.query.moduleId as string");
  content = content.replace(/req\.query\.planId/g, "req.query.planId as string");
  content = content.replace(/req\.query\.status/g, "req.query.status as string");
  content = content.replace(/req\.query\.search/g, "req.query.search as string");
  fs.writeFileSync(ssAdmin, content);
}

// 4. Fix transaction.admin.routes.ts
const txAdmin = 'apps/api/src/routes/transaction.admin.routes.ts';
if (fs.existsSync(txAdmin)) {
  let content = fs.readFileSync(txAdmin, 'utf8');
  content = content.replace(/req\.query\.studentId/g, "req.query.studentId as string");
  content = content.replace(/req\.query\.examId/g, "req.query.examId as string");
  content = content.replace(/req\.query\.moduleId/g, "req.query.moduleId as string");
  content = content.replace(/req\.query\.planId/g, "req.query.planId as string");
  content = content.replace(/req\.query\.status/g, "req.query.status as string");
  content = content.replace(/req\.query\.search/g, "req.query.search as string");
  fs.writeFileSync(txAdmin, content);
}

console.log('Backend fixed');
