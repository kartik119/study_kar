"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const seedData_1 = require("../src/seedData");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding initial system roles and permissions...');
    // 1. Seed Roles
    const roleMap = new Map();
    for (const roleData of seedData_1.INITIAL_ROLES) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: { description: roleData.description },
            create: roleData,
        });
        roleMap.set(role.name, role.id);
        console.log(`- Seeded role: ${role.name}`);
    }
    // 2. Seed Permissions
    const permissionMap = new Map();
    for (const permData of seedData_1.INITIAL_PERMISSIONS) {
        const permission = await prisma.permission.upsert({
            where: { code: permData.code },
            update: { name: permData.name, description: permData.description },
            create: permData,
        });
        permissionMap.set(permission.code, permission.id);
    }
    console.log(`- Seeded ${seedData_1.INITIAL_PERMISSIONS.length} granular system permissions.`);
    // 3. Map Permissions to Roles
    for (const [roleName, permCodes] of Object.entries(seedData_1.ROLE_PERMISSION_MAPPINGS)) {
        const roleId = roleMap.get(roleName);
        if (!roleId)
            continue;
        for (const code of permCodes) {
            const permissionId = permissionMap.get(code);
            if (!permissionId)
                continue;
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: { roleId, permissionId },
                },
                update: {},
                create: { roleId, permissionId },
            });
        }
    }
    console.log('- Seeded role-permission mappings successfully.');
    // 4. Seed Bootstrap Super Admin Account
    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@studykarnataka.com';
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@StudyKar2026';
    const bootstrapName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Super Admin';
    const passwordHash = await bcryptjs_1.default.hash(bootstrapPassword, 10);
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
    console.log(`- Seeded Bootstrap Super Admin: ${bootstrapEmail}`);
    console.log('Seeding completed successfully.');
}
if (require.main === module) {
    main()
        .catch((e) => {
        console.error('Seeding error:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
//# sourceMappingURL=seed.js.map