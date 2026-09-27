const fs = require('fs');
let content = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

const additionalModels = `
model AdminProfile {
  id                 String    @id @default(uuid())
  adminUserId        String    @unique
  employeeId         String?   @unique
  phone              String?
  department         String?
  designation        String?
  reportingManagerId String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  adminUser        AdminUser  @relation(fields: [adminUserId], references: [id], onDelete: Cascade)
  reportingManager AdminUser? @relation("ReportingManager", fields: [reportingManagerId], references: [id], onDelete: SetNull)
  managedAdmins    AdminProfile[] @relation("ReportingManager")

  @@map("admin_profiles")
}

model AdminModuleAccess {
  adminUserId String
  moduleCode  String
  grantedAt   DateTime @default(now())

  adminUser AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@id([adminUserId, moduleCode])
  @@map("admin_module_access")
}

model AdminExamScope {
  adminUserId     String
  examProgrammeId String
  grantedAt       DateTime @default(now())

  adminUser     AdminUser     @relation(fields: [adminUserId], references: [id], onDelete: Cascade)
  examProgramme ExamProgramme @relation(fields: [examProgrammeId], references: [id], onDelete: Cascade)

  @@id([adminUserId, examProgrammeId])
  @@map("admin_exam_scopes")
}

model AdminMentorProfile {
  adminUserId        String   @id
  mentorshipMode     String   @default("BOTH")
  maxCapacity        Int?
  activeStudentCount Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  adminUser AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@map("admin_mentor_profiles")
}
`;

content = content.replace('  sessions   UserSession[]', '  sessions   UserSession[]\n\n  adminProfile  AdminProfile?\n  moduleAccess  AdminModuleAccess[]\n  examScopes    AdminExamScope[]\n  mentorProfile AdminMentorProfile?\n  managedAdmins AdminProfile[] @relation("ReportingManager")');
content = content.replace('  @@map("admin_roles")\r\n}', '  @@map("admin_roles")\r\n}\r\n\r\n' + additionalModels);

fs.writeFileSync('packages/database/prisma/schema.prisma', content);
console.log('Done');
