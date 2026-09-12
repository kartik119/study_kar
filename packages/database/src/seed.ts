import { prisma } from './index';
import bcrypt from 'bcryptjs';
import { INITIAL_ROLES, INITIAL_PERMISSIONS, ROLE_PERMISSION_MAPPINGS } from './seedData';

export async function seedDatabase() {
  // 1. Seed Roles
  const roleMap = new Map<string, string>();
  for (const roleData of INITIAL_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    roleMap.set(role.name, role.id);
  }

  // 2. Seed Permissions
  const permissionMap = new Map<string, string>();
  for (const permData of INITIAL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: permData.code },
      update: { name: permData.name, description: permData.description },
      create: permData,
    });
    permissionMap.set(permission.code, permission.id);
  }

  // 3. Map Permissions to Roles
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const code of permCodes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // 4. Seed Bootstrap Super Admin Account
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@studykarnataka.com';
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@StudyKar2026';
  const bootstrapName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Super Admin';

  const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
  const superAdminRole = roleMap.get('Super Admin');

  const adminUser = await prisma.adminUser.upsert({
    where: { email: bootstrapEmail },
    update: {
      fullName: bootstrapName,
    },
    create: {
      email: bootstrapEmail,
      fullName: bootstrapName,
      passwordHash,
      accountStatus: 'ACTIVE',
    },
  });

  if (superAdminRole) {
    await prisma.adminRole.upsert({
      where: {
        adminUserId_roleId: { adminUserId: adminUser.id, roleId: superAdminRole },
      },
      update: {},
      create: { adminUserId: adminUser.id, roleId: superAdminRole },
    });
  }

  // 5. Seed Baseline Exam Authority, Programme, and Exam Cycle
  const authority = await prisma.examAuthority.upsert({
    where: { code: 'KPSC' },
    update: { nameEn: 'Karnataka Public Service Commission', nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ', isActive: true },
    create: {
      code: 'KPSC',
      nameEn: 'Karnataka Public Service Commission',
      nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ',
      officialWebsiteUrl: 'https://kpsc.kar.nic.in',
      isActive: true,
    },
  });

  const programme = await prisma.examProgramme.upsert({
    where: { code: 'KAS_GP' },
    update: { nameEn: 'Gazetted Probationers (KAS)', nameKn: 'ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ (ಕೆಎಎಸ್)', isActive: true },
    create: {
      authorityId: authority.id,
      code: 'KAS_GP',
      nameEn: 'Gazetted Probationers (KAS)',
      nameKn: 'ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ (ಕೆಎಎಸ್)',
      isActive: true,
    },
  });

  await prisma.examCycle.upsert({
    where: {
      programmeId_cycleCode: { programmeId: programme.id, cycleCode: 'KAS_2026_GP' },
    },
    update: { titleEn: 'KAS Gazetted Probationers Exam 2026', titleKn: 'ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬' },
    create: {
      programmeId: programme.id,
      cycleCode: 'KAS_2026_GP',
      cycleYear: 2026,
      titleEn: 'KAS Gazetted Probationers Exam 2026',
      titleKn: 'ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬',
      descriptionEn: 'Karnataka Administrative Service Gazetted Probationers Competitive Examination 2026',
      descriptionKn: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆ ೨೦೨೬',
      notificationNumber: 'KPSC/GP/2026/01',
      status: 'DRAFT',
      visibility: 'PRIVATE',
      createdByAdminId: adminUser.id,
      updatedByAdminId: adminUser.id,
    },
  });

  // 6. Seed Baseline Taxonomy
  let polityCat = await prisma.academicCategory.findFirst({
    where: { OR: [{ code: 'POLITY' }, { slugEn: 'indian-polity' }] },
  });
  if (!polityCat) {
    polityCat = await prisma.academicCategory.create({
      data: {
        code: 'POLITY',
        nameEn: 'Indian Polity & Governance',
        nameKn: 'ಭಾರತೀಯ ರಾಜಕೀಯ ಮತ್ತು ಆಡಳಿತ',
        slugEn: 'indian-polity',
        slugKn: 'indian-polity-kn',
      },
    });
  }

  let politySub = await prisma.academicSubcategory.findFirst({
    where: { categoryId: polityCat.id, code: 'FUNDAMENTAL_RIGHTS' },
  });
  if (!politySub) {
    politySub = await prisma.academicSubcategory.create({
      data: {
        categoryId: polityCat.id,
        code: 'FUNDAMENTAL_RIGHTS',
        nameEn: 'Fundamental Rights',
        nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
        slugEn: 'fundamental-rights',
        slugKn: 'fundamental-rights-kn',
      },
    });
  }

  let historyCat = await prisma.academicCategory.findFirst({
    where: { OR: [{ code: 'HISTORY' }, { slugEn: 'karnataka-history' }] },
  });
  if (!historyCat) {
    historyCat = await prisma.academicCategory.create({
      data: {
        code: 'HISTORY',
        nameEn: 'Karnataka History & Heritage',
        nameKn: 'ಕರ್ನಾಟಕದ ಇತಿಹಾಸ ಮತ್ತು ಪರಂಪರೆ',
        slugEn: 'karnataka-history',
        slugKn: 'karnataka-history-kn',
      },
    });
  }

  let historySub = await prisma.academicSubcategory.findFirst({
    where: { categoryId: historyCat.id, code: 'UNIFICATION' },
  });
  if (!historySub) {
    historySub = await prisma.academicSubcategory.create({
      data: {
        categoryId: historyCat.id,
        code: 'UNIFICATION',
        nameEn: 'Unification of Karnataka',
        nameKn: 'ಕರ್ನಾಟಕ ಏಕೀಕರಣ',
        slugEn: 'karnataka-unification',
        slugKn: 'karnataka-unification-kn',
      },
    });
  }

}
