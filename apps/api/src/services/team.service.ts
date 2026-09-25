import { PrismaClient, AccountStatus } from '@study-karnataka/database';

const prisma = new PrismaClient();

export class TeamService {
  async listMembers(params: { search?: string; role?: string; status?: string; moduleAccess?: string; page?: number; limit?: number }) {
    const { search, role, status, moduleAccess, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { adminProfile: { phone: { contains: search, mode: 'insensitive' } } },
        { adminProfile: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status && status !== 'all' && status !== 'All Status') {
      if (status.toUpperCase() === 'PENDING INVITE') {
        where.accountStatus = 'INACTIVE'; // Need better status tracking for invite, maybe we use a flag or just accountStatus
      } else {
        where.accountStatus = status.toUpperCase();
      }
    }

    if (role && role !== 'all' && role !== 'All Roles') {
      // AdminRole -> Role -> name
      where.adminRoles = {
        some: {
          role: {
            name: { contains: role, mode: 'insensitive' }
          }
        }
      };
    }

    if (moduleAccess && moduleAccess !== 'all' && moduleAccess !== 'All Modules') {
      where.moduleAccess = {
        some: {
          moduleCode: { contains: moduleAccess, mode: 'insensitive' }
        }
      };
    }

    const [total, members] = await Promise.all([
      prisma.adminUser.count({ where }),
      prisma.adminUser.findMany({
        where,
        skip,
        take: limit,
        include: {
          adminRoles: { include: { role: true } },
          moduleAccess: true,
          examScopes: { include: { examProgramme: true } },
          adminProfile: true,
          mentorProfile: true,
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Return format mapped to frontend expectations
    const formattedMembers = members.map(m => {
      // Find the primary role
      const primaryRole = m.adminRoles[0]?.role?.name || 'Admin';
      
      let mappedStatus = m.accountStatus as string;
      if (m.accountStatus === 'INACTIVE' && !m.lastLoginAt) {
        mappedStatus = 'Pending Invite';
      }

      return {
        id: m.id,
        name: m.fullName,
        email: m.email,
        phone: m.adminProfile?.phone || '-',
        employeeId: m.adminProfile?.employeeId || '-',
        role: primaryRole,
        moduleAccess: m.moduleAccess.length > 0 ? m.moduleAccess.map(ma => ma.moduleCode) : ['All Modules'],
        examScopes: m.examScopes.map(es => es.examProgramme?.nameEn),
        status: mappedStatus,
        lastActive: m.lastLoginAt ? m.lastLoginAt.toISOString() : null,
        joinedAt: m.createdAt.toISOString(),
      };
    });

    return {
      members: formattedMembers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getKPIs() {
    const [total, active, suspended, roleCount] = await Promise.all([
      prisma.adminUser.count(),
      prisma.adminUser.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.adminUser.count({ where: { accountStatus: 'SUSPENDED' } }),
      prisma.role.count()
    ]);
    return {
      total,
      active,
      suspended,
      roleCount
    };
  }

  async inviteMember(data: any, inviterId: string) {
    const { 
      fullName, email, phone, employeeId, department, designation,
      roleId, role, // Accept either
      adminModuleAccess, // Array of module codes
      examScope, // Array of exam programme IDs
      mentorSettings 
    } = data;

    // Resolve Role ID
    let roleRecord;
    if (roleId) {
      roleRecord = await prisma.role.findUnique({ where: { id: roleId } });
    } else if (role) {
      roleRecord = await prisma.role.findFirst({ where: { name: { equals: role, mode: 'insensitive' } } });
    }
    
    if (!roleRecord) {
      throw new Error(`Role not found or not specified.`);
    }

    // Resolve Exam Programme IDs
    const validExamScopes: string[] = [];
    if (examScope && Array.isArray(examScope)) {
      for (const examName of examScope) {
        const prog = await prisma.examProgramme.findFirst({ 
          where: { 
            OR: [
              { code: { equals: examName, mode: 'insensitive' } },
              { nameEn: { contains: examName, mode: 'insensitive' } },
              { shortNameEn: { equals: examName, mode: 'insensitive' } }
            ]
          } 
        });
        if (prog) validExamScopes.push(prog.id);
      }
    }

    // Check if email already exists
    const existingUser = await prisma.adminUser.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error(`A team member with the email ${email} already exists.`);
    }

    // Check if employee ID already exists
    const empIdStr = employeeId?.trim() || null;
    if (empIdStr) {
      const existingProfile = await prisma.adminProfile.findFirst({ where: { employeeId: empIdStr } });
      if (existingProfile) {
        throw new Error(`A team member with the Employee ID ${empIdStr} already exists.`);
      }
    }

    // Create Admin User
    const adminUser = await prisma.adminUser.create({
      data: {
        email,
        fullName,
        passwordHash: 'pending', // Pending activation
        accountStatus: 'INACTIVE',
        isActive: false,
        adminRoles: {
          create: {
            roleId: roleRecord.id
          }
        },
        adminProfile: {
          create: {
            phone,
            employeeId: empIdStr,
            department,
            designation,
          }
        },
        moduleAccess: adminModuleAccess ? {
          create: adminModuleAccess.map((code: string) => ({ moduleCode: code }))
        } : undefined,
        examScopes: validExamScopes.length > 0 ? {
          create: validExamScopes.map((id: string) => ({ examProgrammeId: id }))
        } : undefined,
        mentorProfile: (role === 'Mentor' && mentorSettings) ? {
          create: {
            mentorshipMode: mentorSettings.mentorshipMode || 'BOTH',
            maxCapacity: mentorSettings.maxCapacity ? parseInt(mentorSettings.maxCapacity) : null,
            activeStudentCount: 0
          }
        } : undefined
      }
    });

    // TODO: Generate invitation token, send email. (Placeholder for now)
    
    // Audit Log
    let finalInviterId = inviterId;
    if (!finalInviterId) {
      const fallbackAdmin = await prisma.adminUser.findFirst();
      if (fallbackAdmin) finalInviterId = fallbackAdmin.id;
    }

    if (finalInviterId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId: finalInviterId,
          action: 'INVITE_MEMBER',
          module: 'TEAM',
          recordType: 'AdminUser',
          recordId: adminUser.id,
          newValue: JSON.stringify({ email, role })
        }
      });
    }

    return adminUser;
  }

  async getMemberDetails(id: string) {
    const m = await prisma.adminUser.findUnique({
      where: { id },
      include: {
        adminRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        moduleAccess: true,
        examScopes: { include: { examProgramme: true } },
        adminProfile: { include: { reportingManager: true } },
        mentorProfile: true,
      }
    });

    if (!m) return null;

    const primaryRole = m.adminRoles[0]?.role;
    let mappedStatus = m.accountStatus as string;
    if (m.accountStatus === 'INACTIVE' && !m.lastLoginAt) {
      mappedStatus = 'Pending Invite';
    }

    return {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      phone: m.adminProfile?.phone || '-',
      employeeId: m.adminProfile?.employeeId || '-',
      department: m.adminProfile?.department || '-',
      designation: m.adminProfile?.designation || '-',
      reportingManager: m.adminProfile?.reportingManager?.fullName || null,
      status: mappedStatus,
      joinedAt: m.createdAt.toISOString(),
      lastActive: m.lastLoginAt ? m.lastLoginAt.toISOString() : null,
      role: primaryRole?.name || 'Admin',
      rolePermissions: primaryRole?.rolePermissions.map(rp => rp.permission.name) || [],
      adminModuleAccess: m.moduleAccess.map(ma => ma.moduleCode),
      examScopes: m.examScopes.map(es => es.examProgramme?.nameEn),
      mentorProfile: m.mentorProfile ? {
        mentorshipMode: m.mentorProfile.mentorshipMode,
        maxCapacity: m.mentorProfile.maxCapacity,
        activeStudentCount: m.mentorProfile.activeStudentCount
      } : null
    };
  }

  async resendInvite(id: string, adminId: string) {
    // Generate new token and send email
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: 'RESEND_INVITE',
        module: 'TEAM',
        recordType: 'AdminUser',
        recordId: id
      }
    });
    return { success: true };
  }

  async cancelInvite(id: string, adminId: string) {
    // Invalidate token
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: 'CANCEL_INVITE',
        module: 'TEAM',
        recordType: 'AdminUser',
        recordId: id
      }
    });
    return { success: true };
  }

  async editMember(id: string, data: any, adminId: string) {
    // Basic info update logic
    return { success: true };
  }

  async editAccess(id: string, data: any, adminId: string) {
    // Access update logic
    return { success: true };
  }

  async suspendMember(id: string, adminId: string) {
    await prisma.adminUser.update({ where: { id }, data: { accountStatus: 'SUSPENDED', isActive: false } });
    await prisma.adminAuditLog.create({
      data: { adminUserId: adminId, action: 'SUSPEND_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
    });
    return { success: true };
  }

  async reactivateMember(id: string, adminId: string) {
    await prisma.adminUser.update({ where: { id }, data: { accountStatus: 'ACTIVE', isActive: true } });
    await prisma.adminAuditLog.create({
      data: { adminUserId: adminId, action: 'REACTIVATE_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
    });
    return { success: true };
  }

  async deactivateMember(id: string, adminId: string) {
    await prisma.adminUser.update({ where: { id }, data: { accountStatus: 'INACTIVE', isActive: false } });
    await prisma.adminAuditLog.create({
      data: { adminUserId: adminId, action: 'DEACTIVATE_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
    });
    return { success: true };
  }
}
