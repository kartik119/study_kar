import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TeamRoleService {
  async listRoles(params: { search?: string; status?: string; type?: string; module?: string }) {
    let where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } }
      ];
    }
    if (params.status && params.status !== 'All Statuses') {
      where.isActive = params.status.toLowerCase() === 'active';
    }
    if (params.type && params.type !== 'All Types') {
      where.isSystem = params.type === 'System Role';
    }
    
    // Modules filtering (checking rolePermissions)
    // A role is associated with a module if it has permissions that start with module prefix
    
    const roles = await prisma.role.findMany({
      where,
      include: {
        adminRoles: true,
        rolePermissions: {
          include: { permission: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalRoles = await prisma.role.count();
    const activeRoles = await prisma.role.count({ where: { isActive: true } });
    const totalPermissions = await prisma.permission.count();

    const formattedRoles = roles.map(r => {
      // derive modules from permissions
      const modulesSet = new Set<string>();
      r.rolePermissions.forEach(rp => {
        const parts = rp.permission.code.split('.');
        if (parts.length > 0) modulesSet.add(parts[0]);
      });

      return {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        isSystem: r.isSystem,
        isActive: r.isActive,
        scopePolicy: r.scopePolicy,
        assignedMembers: r.adminRoles.length,
        modules: Array.from(modulesSet),
        permissionsCount: r.rolePermissions.length,
        permissions: r.rolePermissions.map(rp => rp.permission),
        updatedAt: r.updatedAt
      };
    });

    return {
      kpi: {
        totalRoles,
        activeRoles,
        totalPermissions,
        modulesCovered: 10 // Mock static
      },
      data: formattedRoles
    };
  }

  async getRoleDetails(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true }
        },
        adminRoles: {
          include: {
            adminUser: {
              include: {
                moduleAccess: true,
                examScopes: { include: { examProgramme: true } }
              }
            }
          }
        }
      }
    });

    if (!role) throw new Error('Role not found');

    const modulesSet = new Set<string>();
    role.rolePermissions.forEach(rp => {
      const parts = rp.permission.code.split('.');
      if (parts.length > 0) modulesSet.add(parts[0]);
    });

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      scopePolicy: role.scopePolicy,
      modules: Array.from(modulesSet),
      permissions: role.rolePermissions.map(rp => rp.permission),
      assignedMembers: role.adminRoles.map(ar => ({
        id: ar.adminUser.id,
        name: ar.adminUser.fullName,
        email: ar.adminUser.email,
        status: ar.adminUser.accountStatus,
        moduleScope: ar.adminUser.moduleAccess.map(m => m.moduleCode),
        examScope: ar.adminUser.examScopes.map(e => e.examProgramme.shortNameEn || e.examProgramme.code)
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }

  async createRole(data: any, adminId: string) {
    const { name, code, description, isActive, isSystem, scopePolicy, permissions } = data;
    
    const existing = await prisma.role.findFirst({
      where: { OR: [{ name }, { code }] }
    });
    if (existing) throw new Error('Role with this name or code already exists');

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description,
        isActive,
        isSystem: !!isSystem,
        scopePolicy: scopePolicy || 'ALL_EXAMS'
      }
    });

    if (permissions && permissions.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissions } }
      });
      for (const p of perms) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: p.id }
        });
      }
    }

    if (adminId) {
      await prisma.adminAuditLog.create({
        data: { adminUserId: adminId, action: 'CREATE_ROLE', module: 'TEAM', recordType: 'Role', recordId: role.id }
      });
    }

    return role;
  }

  async updateRole(id: string, data: any, adminId: string) {
    const { name, code, description, isActive, scopePolicy, permissions } = data;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new Error('Role not found');
    if (role.isSystem && code && code !== role.code) throw new Error('Cannot change code of system role');

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        isActive,
        scopePolicy,
        ...(role.isSystem ? {} : { code })
      }
    });

    if (permissions) {
      // replace permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissions } }
      });
      for (const p of perms) {
        await prisma.rolePermission.create({
          data: { roleId: id, permissionId: p.id }
        });
      }
    }

    if (adminId) {
      await prisma.adminAuditLog.create({
        data: { adminUserId: adminId, action: 'UPDATE_ROLE', module: 'TEAM', recordType: 'Role', recordId: id }
      });
    }

    return updated;
  }

  async getAllPermissions() {
    return prisma.permission.findMany();
  }

  async getRoleActivity(id: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const activities = await prisma.adminAuditLog.findMany({
      where: { recordType: 'Role', recordId: id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        adminUser: {
          select: { fullName: true, email: true }
        }
      }
    });

    const total = await prisma.adminAuditLog.count({
      where: { recordType: 'Role', recordId: id }
    });

    return {
      data: activities,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
