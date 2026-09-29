import { prisma } from '@study-karnataka/database';

export class ActivityLogsService {
  async listActivityLogs(filters: {
    search?: string;
    activityType?: string;
    actorId?: string;
    module?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
  }) {
    const { page, limit, search, activityType, actorId, module, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (actorId) {
      where.adminUserId = actorId;
    }

    if (module) {
      where.module = module;
    }

    if (activityType) {
      // Treat activityType as module alias for simplicity, if mapped 1:1, or handle separately if action-based.
      // Usually activityType in the prompt maps to modules or groups of actions.
      // E.g., 'Team', 'Role & Permission', 'Work Assignment'
      const moduleMap: Record<string, string> = {
        'Team': 'TEAM',
        'Role & Permission': 'ROLE_PERMISSION',
        'Work Assignment': 'WORK_ASSIGNMENT',
        'Authentication': 'AUTH',
        'Study Material': 'STUDY_MATERIAL',
        'Student': 'STUDENT',
        'Settings': 'SETTINGS',
        'System': 'SYSTEM'
      };
      const mappedModule = moduleMap[activityType] || activityType;
      where.module = mappedModule;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { recordId: { contains: search, mode: 'insensitive' } },
        { adminUser: { fullName: { contains: search, mode: 'insensitive' } } },
        { adminUser: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              adminRoles: {
                include: { role: { select: { name: true } } }
              },
              adminProfile: {
                select: { designation: true }
              }
            }
          }
        }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getActivityLogDetails(id: string) {
    const log = await prisma.adminAuditLog.findUnique({
      where: { id },
      include: {
        adminUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            adminRoles: {
              include: { role: { select: { name: true } } }
            },
            adminProfile: {
              select: { designation: true, department: true }
            }
          }
        }
      }
    });

    if (!log) {
      throw new Error('Activity log not found');
    }

    return log;
  }

  async getKPIs(filters?: { dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalActivities,
      teamManagement,
      workAssignments,
      systemActivities,
      todayActivities,
      activeTeamMembersToday
    ] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.count({
        where: { ...where, module: { in: ['TEAM', 'ROLE_PERMISSION'] } }
      }),
      prisma.adminAuditLog.count({
        where: { ...where, module: 'WORK_ASSIGNMENT' }
      }),
      prisma.adminAuditLog.count({
        where: { ...where, module: { in: ['AUTH', 'SYSTEM', 'SETTINGS'] } }
      }),
      prisma.adminAuditLog.count({
        where: { createdAt: { gte: startOfToday } }
      }),
      prisma.adminAuditLog.findMany({
        where: { createdAt: { gte: startOfToday } },
        distinct: ['adminUserId'],
        select: { adminUserId: true }
      }).then(res => res.length)
    ]);

    return {
      totalActivities,
      teamManagement,
      workAssignments,
      systemActivities,
      todayActivities,
      activeTeamMembersToday
    };
  }

  async getSummary(filters?: { dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    // Category breakdown
    const categoryBreakdownRaw = await prisma.adminAuditLog.groupBy({
      by: ['module'],
      where,
      _count: { _all: true }
    });

    const categoryBreakdown = categoryBreakdownRaw.map(c => ({
      category: c.module,
      count: c._count._all
    }));

    // Top active members
    const topMembersRaw = await prisma.adminAuditLog.groupBy({
      by: ['adminUserId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { adminUserId: 'desc' } },
      take: 5
    });

    const topMembersIds = topMembersRaw.map(t => t.adminUserId);
    const users = await prisma.adminUser.findMany({
      where: { id: { in: topMembersIds } },
      select: {
        id: true,
        fullName: true,
        adminRoles: { include: { role: { select: { name: true } } } },
        adminProfile: { select: { designation: true } }
      }
    });

    const topActiveMembers = topMembersRaw.map(raw => {
      const u = users.find(u => u.id === raw.adminUserId);
      return {
        id: raw.adminUserId,
        count: raw._count._all,
        name: u?.fullName || 'Deleted User',
        role: u?.adminProfile?.designation || u?.adminRoles?.[0]?.role?.name || 'Admin'
      };
    }).filter(m => m.name !== 'System Automated Process'); // Exclude system actor if defined as such

    const validTopMembers = topActiveMembers.filter(m => m.name !== 'Deleted User');

    const insights = [];
    if (validTopMembers.length > 0) {
      insights.push(`${validTopMembers[0].name} was the most active member with ${validTopMembers[0].count} actions.`);
    }
    if (categoryBreakdown.length > 0) {
      const topCategory = [...categoryBreakdown].sort((a, b) => b.count - a.count)[0];
      insights.push(`Most activities occurred in the ${topCategory.category} module (${topCategory.count} actions).`);
    }

    return {
      categoryBreakdown,
      topActiveMembers: validTopMembers,
      insights
    };
  }
}
