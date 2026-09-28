import { PrismaClient, AccountStatus } from '@study-karnataka/database';
import { sendInvitationEmail } from '../utils/email.service';
import crypto from 'crypto';
import { hashToken } from '../utils/crypto';

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
      where.accountStatus = status.toUpperCase();
    }

    if (role && role !== 'all' && role !== 'All Roles') {
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

    const formattedMembers = members.map(m => {
      const primaryRole = m.adminRoles[0]?.role?.name || 'Admin';
      let mappedStatus = m.accountStatus as string;
      if (mappedStatus === 'PENDING_INVITE') {
        mappedStatus = 'Pending Invite';
      }

      return {
        id: m.id,
        name: m.fullName,
        email: m.email,
        avatarUrl: m.avatarUrl,
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
      prisma.adminUser.count({ where: { accountStatus: { not: 'PENDING_INVITE' } } }),
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
      roleId, role,
      adminModuleAccess,
      examScope,
      mentorSettings 
    } = data;

    let roleRecord;
    if (roleId) {
      roleRecord = await prisma.role.findUnique({ where: { id: roleId } });
    } else if (role) {
      roleRecord = await prisma.role.findFirst({ where: { name: { equals: role, mode: 'insensitive' } } });
    }
    
    if (!roleRecord) {
      throw new Error(`Role not found or not specified.`);
    }

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

    const existingUser = await prisma.adminUser.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error(`A team member with the email ${email} already exists.`);
    }

    const empIdStr = employeeId?.trim() || null;
    if (empIdStr) {
      const existingProfile = await prisma.adminProfile.findFirst({ where: { employeeId: empIdStr } });
      if (existingProfile) {
        throw new Error(`A team member with the Employee ID ${empIdStr} already exists.`);
      }
    }

    let finalInviterId = inviterId;
    if (!finalInviterId) {
      const fallbackAdmin = await prisma.adminUser.findFirst();
      if (fallbackAdmin) finalInviterId = fallbackAdmin.id;
    }

    const adminUser = await prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.create({
        data: {
          email,
          fullName,
          passwordHash: 'pending',
          accountStatus: 'PENDING_INVITE',
          isActive: false,
          adminRoles: {
            create: { roleId: roleRecord.id }
          },
          adminProfile: {
            create: { phone, employeeId: empIdStr, department, designation }
          },
          moduleAccess: adminModuleAccess ? {
            create: adminModuleAccess.map((code: string) => ({ moduleCode: code }))
          } : undefined,
          examScopes: validExamScopes.length > 0 ? {
            create: validExamScopes.map((id: string) => ({ examProgrammeId: id }))
          } : undefined,
          mentorProfile: (roleRecord.name === 'Mentor' && mentorSettings) ? {
            create: {
              mentorshipMode: mentorSettings.mentorshipMode || 'BOTH',
              maxCapacity: mentorSettings.maxCapacity ? parseInt(mentorSettings.maxCapacity) : null,
              activeStudentCount: 0
            }
          } : undefined
        }
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await tx.adminInvitation.create({
        data: {
          adminUserId: user.id,
          tokenHash,
          expiresAt,
          createdByAdminId: finalInviterId,
          status: 'PENDING'
        }
      });

      const emailResult = await sendInvitationEmail(user.email, rawToken, user.fullName);
      
      if (emailResult.success) {
        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: { status: 'SENT', sentAt: new Date() }
        });
      } else {
        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: { status: 'DELIVERY_FAILED' }
        });
        console.warn(`Failed to send invitation email: ${emailResult.error}`);
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: finalInviterId,
          action: 'INVITE_MEMBER',
          module: 'TEAM',
          recordType: 'AdminUser',
          recordId: user.id,
          newValue: JSON.stringify({ email, role: roleRecord.name, status: emailResult.success ? 'SENT' : 'DELIVERY_FAILED' })
        }
      });

      return user;
    });

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
    if (mappedStatus === 'PENDING_INVITE') {
      mappedStatus = 'Pending Invite';
    }

    return {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      avatarUrl: m.avatarUrl,
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

  async getMemberActivity(id: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [total, activities] = await Promise.all([
      prisma.adminAuditLog.count({
        where: { recordId: id, recordType: 'AdminUser' }
      }),
      prisma.adminAuditLog.findMany({
        where: { recordId: id, recordType: 'AdminUser' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: { select: { fullName: true, email: true } }
        }
      })
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async resendInvite(id: string, adminId: string) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user || user.accountStatus !== 'PENDING_INVITE') {
      throw new Error('User is not pending invitation.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminInvitation.updateMany({
        where: { adminUserId: id, status: { in: ['PENDING', 'SENT', 'DELIVERY_FAILED'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const newInv = await tx.adminInvitation.create({
        data: {
          adminUserId: id,
          tokenHash,
          expiresAt,
          createdByAdminId: adminId,
          status: 'PENDING'
        }
      });

      const emailResult = await sendInvitationEmail(user.email, rawToken, user.fullName);
      
      if (emailResult.success) {
        await tx.adminInvitation.update({
          where: { id: newInv.id },
          data: { status: 'SENT', sentAt: new Date() }
        });
      } else {
        await tx.adminInvitation.update({
          where: { id: newInv.id },
          data: { status: 'DELIVERY_FAILED' }
        });
        console.warn('Failed to send email.');
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'INVITATION_RESENT',
          module: 'TEAM',
          recordType: 'AdminUser',
          recordId: id
        }
      });
    });

    return { success: true };
  }

  async cancelInvite(id: string, adminId: string) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.findUnique({ where: { id } });
      if (!user || user.accountStatus !== 'PENDING_INVITE') {
        throw new Error('User is not pending invitation.');
      }

      await tx.adminInvitation.updateMany({
        where: { adminUserId: id, status: { in: ['PENDING', 'SENT', 'DELIVERY_FAILED'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });

      await tx.adminUser.update({
        where: { id },
        data: { accountStatus: 'INACTIVE', isActive: false }
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'CANCEL_INVITE',
          module: 'TEAM',
          recordType: 'AdminUser',
          recordId: id,
          previousValue: JSON.stringify({ status: 'PENDING_INVITE' }),
          newValue: JSON.stringify({ status: 'INACTIVE' })
        }
      });
    });
    return { success: true };
  }

  async editMember(id: string, data: any, adminId: string) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    // Protect Super Admin
    if (data.roleId) {
      const isSuperAdmin = await prisma.adminRole.findFirst({
        where: { adminUserId: id, role: { OR: [{ name: 'Super Admin' }, { code: 'SUPER_ADMIN' }] } }
      });
      if (isSuperAdmin) {
        const newRole = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (newRole && newRole.name !== 'Super Admin' && newRole.code !== 'SUPER_ADMIN') {
          await this.checkSuperAdminProtection(id);
        }
      }
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id },
      data: {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
      }
    });

    await prisma.adminProfile.upsert({
      where: { adminUserId: id },
      update: {
        phone: data.phone || null,
        employeeId: data.employeeId?.trim() || null,
        department: data.department?.trim() || null,
        designation: data.designation?.trim() || null,
        reportingManagerId: data.reportingManagerId?.trim() || null,
      },
      create: {
        adminUserId: id,
        phone: data.phone || null,
        employeeId: data.employeeId?.trim() || null,
        department: data.department?.trim() || null,
        designation: data.designation?.trim() || null,
        reportingManagerId: data.reportingManagerId?.trim() || null,
      }
    });

    if (data.roleId) {
      await prisma.adminRole.deleteMany({ where: { adminUserId: id } });
      await prisma.adminRole.create({
        data: { adminUserId: id, roleId: data.roleId }
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: 'EDIT_MEMBER',
        module: 'TEAM',
        recordType: 'AdminUser',
        recordId: id,
        newValue: { updates: data }
      }
    });
    return updatedUser;
  }

  async editAccess(id: string, data: any, adminId: string) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    if (data.memberModuleScope) {
      await prisma.adminModuleAccess.deleteMany({ where: { adminUserId: id } });
      if (data.memberModuleScope.length > 0) {
        await prisma.adminModuleAccess.createMany({
          data: data.memberModuleScope.map((mod: string) => ({ adminUserId: id, moduleCode: mod }))
        });
      }
    }

    if (data.examScope) {
      await prisma.adminExamScope.deleteMany({ where: { adminUserId: id } });
      if (data.examScope.length > 0) {
        await prisma.adminExamScope.createMany({
          data: data.examScope.map((exam: string) => ({ adminUserId: id, examProgrammeId: exam }))
        });
      }
    }

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: 'EDIT_MEMBER_SCOPE',
        module: 'TEAM',
        recordType: 'AdminUser',
        recordId: id,
        newValue: { memberModuleScope: data.memberModuleScope, examScope: data.examScope }
      }
    });
    return { success: true };
  }

  async checkSuperAdminProtection(id: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id },
      include: { adminRoles: { include: { role: true } } }
    });
    
    if (!user) throw new Error('User not found');
    const isSuperAdmin = user.adminRoles.some(ar => ar.role.name === 'Super Admin' || ar.role.code === 'SUPER_ADMIN');
    
    if (isSuperAdmin) {
      const activeSuperAdminsCount = await prisma.adminUser.count({
        where: {
          accountStatus: 'ACTIVE',
          adminRoles: {
            some: { role: { OR: [{ name: 'Super Admin' }, { code: 'SUPER_ADMIN' }] } }
          }
        }
      });

      if (activeSuperAdminsCount <= 1 && user.accountStatus === 'ACTIVE') {
        throw new Error('This action cannot be completed because the platform must retain at least one active Super Admin.');
      }
    }
  }

  async suspendMember(id: string, adminId: string) {
    if (id === adminId) {
      throw new Error('You cannot suspend yourself.');
    }
    await this.checkSuperAdminProtection(id);

    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({ where: { id }, data: { accountStatus: 'SUSPENDED', isActive: false } });
      await tx.userSession.deleteMany({ where: { adminUserId: id } });
      
      await tx.adminAuditLog.create({
        data: { adminUserId: adminId, action: 'SUSPEND_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
      });
    });
    return { success: true };
  }

  async reactivateMember(id: string, adminId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({ where: { id }, data: { accountStatus: 'ACTIVE', isActive: true } });
      await tx.adminAuditLog.create({
        data: { adminUserId: adminId, action: 'REACTIVATE_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
      });
    });
    return { success: true };
  }

  async deactivateMember(id: string, adminId: string) {
    if (id === adminId) {
      throw new Error('You cannot deactivate yourself.');
    }
    await this.checkSuperAdminProtection(id);

    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({ where: { id }, data: { accountStatus: 'INACTIVE', isActive: false } });
      await tx.userSession.deleteMany({ where: { adminUserId: id } });

      await tx.adminAuditLog.create({
        data: { adminUserId: adminId, action: 'DEACTIVATE_MEMBER', module: 'TEAM', recordType: 'AdminUser', recordId: id }
      });
    });
    return { success: true };
  }
}
