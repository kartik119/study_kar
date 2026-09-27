const fs = require('fs');
const path = 'packages/database/prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
content = content.replace(/(model StudyMaterial \{[^}]*locales\s+StudyMaterialLocale\[\][^}]*taxonomyMappings\s+StudyMaterialTaxonomyMapping\[\])/s, "$1\n  examMappings            StudyMaterialExamMapping[]");
content = content.replace(/(model ExamCycle \{[^}]*visibility\s+ExamVisibility\s+@default\(PRIVATE\))/s, "$1\n  studyMaterials StudyMaterialExamMapping[]");
if (!content.includes('model StudyMaterialExamMapping')) {
  content += '\nmodel StudyMaterialExamMapping {\n  id               String   @id @default(uuid())\n  studyMaterialId  String\n  examCycleId      String\n  createdByAdminId String?\n  createdAt        DateTime @default(now())\n\n  studyMaterial StudyMaterial @relation(fields: [studyMaterialId], references: [id], onDelete: Cascade)\n  examCycle     ExamCycle     @relation(fields: [examCycleId], references: [id], onDelete: Cascade)\n\n  @@unique([studyMaterialId, examCycleId])\n  @@index([studyMaterialId])\n  @@index([examCycleId])\n}\n';
}
fs.writeFileSync(path, content, 'utf8');
console.log('Schema updated successfully');
