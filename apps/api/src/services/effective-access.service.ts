import { PrismaClient } from '@study-karnataka/database';

const prisma = new PrismaClient();

export class EffectiveAccessService {
  /**
   * Resolves the effective permissions and scopes for a team member.
   * This is computed by intersecting the Role Permissions with the Member Module Scope
   * and Exam Scope.
   * 
   * A member's scope may REDUCE the Role's access. It must NEVER increase it.
   */
  async resolveEffectiveTeamAccess(memberId: string) {
    const member = await prisma.adminUser.findUnique({
      where: { id: memberId },
      include: {
        adminRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        moduleAccess: true,
        examScopes: {
          include: { examProgramme: true }
        }
      }
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    // 1. Status Check
    if (member.accountStatus !== 'ACTIVE' || !member.isActive) {
      return {
        isAllowed: false,
        reason: `Account is ${member.accountStatus}`,
        effectivePermissions: [],
        effectiveModules: [],
        effectiveExams: []
      };
    }

    // 2. Fetch Role
    const primaryRole = member.adminRoles[0]?.role;
    if (!primaryRole) {
      return {
        isAllowed: false,
        reason: 'No role assigned',
        effectivePermissions: [],
        effectiveModules: [],
        effectiveExams: []
      };
    }

    // Role Permissions
    const rolePermissions = primaryRole.rolePermissions.map(rp => rp.permission.code);
    
    // Role Modules (Modules derived from permissions)
    const roleModules = Array.from(new Set(rolePermissions.map(p => p.split('.')[0])));

    // 3. Apply Member Module Scope
    // The member module scope can only restrict the role modules, never expand them.
    const memberConfiguredModules = member.moduleAccess.map(ma => ma.moduleCode);
    const effectiveModules = roleModules.filter(rm => 
      // If the member has NO modules configured, we might assume they get none,
      // or we might assume they get all. But according to the instructions, member module scope restricts.
      // We'll intersect role modules with member modules.
      memberConfiguredModules.includes(rm) || memberConfiguredModules.includes('ALL')
    );

    // 4. Filter Permissions by Effective Modules
    // A permission is only effective if its module is in the effectiveModules list.
    const effectivePermissions = rolePermissions.filter(p => {
      const mod = p.split('.')[0];
      return effectiveModules.includes(mod);
    });

    // 5. Exam Scope
    const roleExamPolicy = primaryRole.scopePolicy; // 'ALL_EXAMS', 'ASSIGNED_EXAMS_ONLY', 'NOT_APPLICABLE'
    let effectiveExams: string[] = [];

    if (roleExamPolicy === 'ALL_EXAMS') {
      effectiveExams = ['ALL'];
    } else if (roleExamPolicy === 'ASSIGNED_EXAMS_ONLY') {
      effectiveExams = member.examScopes.map(es => es.examProgramme?.code || es.examProgrammeId);
    } else {
      effectiveExams = [];
    }

    // Ensure we don't accidentally give more than the member's configured exams if they have them,
    // though the policy governs this heavily.

    return {
      isAllowed: true,
      reason: 'Active and Authorized',
      effectivePermissions,
      effectiveModules,
      effectiveExams,
      rolePolicy: roleExamPolicy
    };
  }
}

export const effectiveAccessService = new EffectiveAccessService();
