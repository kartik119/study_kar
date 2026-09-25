import {
  prisma,
  StudentSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@study-karnataka/database';

export interface SubscriptionFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  moduleId?: string;
  planId?: string;
  examId?: string;
  status?: string;
  paymentStatus?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSubscriptionDto {
  studentId: string; // studentProfileId or userId
  planId: string;
  startDate?: string | Date;
  endDate?: string | Date;
  overrideExpiry?: boolean;
  overrideReason?: string;
  assignmentSource?: string; // 'PAID_PURCHASE' | 'ADMIN_GRANT' | 'FREE_PLAN' | 'PROMOTION' | 'MIGRATION' | 'COMPENSATION'
  paymentStatus?: string; // 'PAID' | 'PENDING' | 'NOT_REQUIRED' | 'FAILED'
  paymentMethod?: string; // 'UPI' | 'CARD' | 'NET_BANKING' | 'MANUAL_OFFLINE'
  transactionId?: string;
  amount?: number;
  currency?: string;
  autoRenew?: boolean;
  adminNotes?: string;
  allowOverlap?: boolean;
}

export interface RenewSubscriptionDto {
  durationValue?: number;
  durationUnit?: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  amount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  reason?: string;
}

export interface ChangePlanDto {
  newPlanId: string;
  recalculateExpiry?: boolean;
  reason: string;
}

export interface PauseSubscriptionDto {
  reason: string;
  resumeDate?: string | Date;
}

export interface CancelSubscriptionDto {
  immediate?: boolean;
  reason: string;
}

export class StudentSubscriptionService {
  /**
   * Calculate end date from start date and duration unit/value
   */
  static calculateEndDate(
    startDate: Date,
    durationValue: number,
    durationUnit: string
  ): Date {
    const end = new Date(startDate.getTime());
    switch (durationUnit?.toUpperCase()) {
      case 'DAYS':
        end.setDate(end.getDate() + durationValue);
        break;
      case 'WEEKS':
        end.setDate(end.getDate() + durationValue * 7);
        break;
      case 'MONTHS':
        end.setMonth(end.getMonth() + durationValue);
        break;
      case 'YEARS':
        end.setFullYear(end.getFullYear() + durationValue);
        break;
      default:
        end.setMonth(end.getMonth() + durationValue);
    }
    return end;
  }

  /**
   * Generate human-readable subscription reference: e.g. SUB-2026-001234
   */
  static generateSubscriptionNumber(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `SUB-${year}-${randomSuffix}`;
  }

  /**
   * Helper to resolve features list from module features JSON or entitlements
   */
  static resolveFeatures(module: any): string[] {
    if (!module) return [];
    if (Array.isArray(module.features) && module.features.length > 0) {
      return module.features;
    }
    if (Array.isArray(module.entitlements) && module.entitlements.length > 0) {
      return module.entitlements.map((e: any) => e.name || e.featureKey);
    }
    // Default fallback based on moduleType
    switch (module.moduleType) {
      case 'FULL_EXAM':
        return ['Study Materials', 'MCQ Practice', 'Mock Tests', 'Current Affairs', 'Quick Revision', 'Study Plans', 'Test Series'];
      case 'MCQ':
        return ['MCQ Practice'];
      case 'STUDY_MATERIALS':
        return ['Study Materials'];
      case 'MOCK_TESTS':
        return ['Mock Tests'];
      case 'CURRENT_AFFAIRS':
        return ['Current Affairs'];
      case 'QUICK_REVISION':
        return ['Quick Revision'];
      case 'STUDY_PLANS':
        return ['Study Plans'];
      case 'TEST_SERIES':
        return ['Test Series'];
      default:
        return ['Standard Module Access'];
    }
  }

  /**
   * List subscriptions with server-side filtering, search, and pagination
   */
  static async getSubscriptions(params: SubscriptionFilterParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Filter by Module (via Plan -> Module)
    if (params.moduleId && params.moduleId !== 'ALL') {
      where.plan = {
        ...(where.plan || {}),
        moduleId: params.moduleId,
      };
    }

    // Filter by Plan
    if (params.planId && params.planId !== 'ALL') {
      where.planId = params.planId;
    }

    // Filter by Exam (via Plan -> Module -> Exam)
    if (params.examId && params.examId !== 'ALL') {
      where.plan = {
        ...(where.plan || {}),
        module: {
          examId: params.examId,
        },
      };
    }

    // Filter by Subscription Status
    if (params.status && params.status !== 'ALL') {
      where.status = params.status as SubscriptionStatus;
    }

    // Filter by Payment Status
    if (params.paymentStatus && params.paymentStatus !== 'ALL') {
      where.paymentStatus = params.paymentStatus;
    }

    // Filter by Start Date
    if (params.startDateFrom || params.startDateTo) {
      where.startDate = {};
      if (params.startDateFrom) where.startDate.gte = new Date(params.startDateFrom);
      if (params.startDateTo) where.startDate.lte = new Date(params.startDateTo);
    }

    // Filter by End Date
    if (params.endDateFrom || params.endDateTo) {
      where.endDate = {};
      if (params.endDateFrom) where.endDate.gte = new Date(params.endDateFrom);
      if (params.endDateTo) where.endDate.lte = new Date(params.endDateTo);
    }

    // Search query across student name, student email, subscriptionNumber, plan name, module name
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { subscriptionNumber: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        {
          student: {
            user: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q, mode: 'insensitive' } },
                { id: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          plan: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              {
                module: {
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { code: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    // Sorting
    const sortBy = params.sortBy || 'updatedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    if (['createdAt', 'updatedAt', 'startDate', 'endDate', 'status', 'amount', 'subscriptionNumber'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const [total, items] = await Promise.all([
      prisma.studentSubscription.count({ where }),
      prisma.studentSubscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  mobile: true,
                },
              },
            },
          },
          plan: {
            include: {
              module: {
                include: {
                  exam: {
                    select: {
                      id: true,
                      titleEn: true,
                      cycleCode: true,
                      cycleYear: true,
                    },
                  },
                  entitlements: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedItems = items.map((sub: any) => {
      const module = sub.plan?.module;
      const exam = module?.exam;
      const features = this.resolveFeatures(module);

      return {
        id: sub.id,
        subscriptionNumber: sub.subscriptionNumber || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
        status: sub.status,
        paymentStatus: sub.paymentStatus || 'PAID',
        startDate: sub.startDate,
        endDate: sub.endDate,
        amount: Number(sub.amount || sub.amountPaid || sub.plan?.price || 0),
        currency: sub.currency || 'INR',
        autoRenew: sub.autoRenew,
        assignmentSource: sub.assignmentSource || 'PAID_PURCHASE',
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        cancelledAt: sub.cancelledAt,
        pausedAt: sub.pausedAt,
        pauseReason: sub.pauseReason,
        resumeDate: sub.resumeDate,
        adminNotes: sub.adminNotes,
        paymentMethod: sub.paymentMethod,
        transactionId: sub.transactionId || sub.paymentId,
        invoiceId: sub.invoiceId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        student: {
          id: sub.student?.id,
          userId: sub.student?.userId || sub.student?.user?.id,
          fullName: sub.student?.user?.fullName || 'Student',
          email: sub.student?.user?.email || 'N/A',
          mobile: sub.student?.user?.mobile || '',
        },
        plan: sub.plan ? {
          id: sub.plan.id,
          name: sub.plan.name,
          code: sub.plan.code,
          planType: sub.plan.planType,
          price: Number(sub.plan.price),
          billingCycle: sub.plan.billingCycle,
          durationValue: sub.plan.durationValue,
          durationUnit: sub.plan.durationUnit,
          autoRenewEligible: sub.plan.autoRenewEligible,
        } : null,
        module: module ? {
          id: module.id,
          name: module.name,
          code: module.code,
          scopeType: module.scopeType,
          moduleType: module.moduleType,
          accessType: module.accessType,
          features,
        } : null,
        exam: exam ? {
          id: exam.id,
          titleEn: exam.titleEn,
          cycleCode: exam.cycleCode,
          cycleYear: exam.cycleYear,
        } : null,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Get KPI Cards Metrics
   */
  static async getMetrics() {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [
      totalSubscriptions,
      activeSubscriptions,
      expiringSoonSubscriptions,
      expiredSubscriptions,
      paidSubscriptions,
      revenueResult,
    ] = await Promise.all([
      prisma.studentSubscription.count(),
      prisma.studentSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.studentSubscription.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: in14Days,
          },
        },
      }),
      prisma.studentSubscription.count({ where: { status: 'EXPIRED' } }),
      prisma.studentSubscription.count({ where: { paymentStatus: 'PAID' } }),
      prisma.studentSubscription.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum.amount || 0);

    return {
      totalSubscriptions,
      activeSubscriptions,
      expiringSoonSubscriptions,
      expiredSubscriptions,
      paidSubscriptions,
      totalRevenue,
    };
  }

  /**
   * Get Subscription by ID with full details & history
   */
  static async getSubscriptionById(id: string) {
    const sub: any = await prisma.studentSubscription.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
              },
            },
          },
        },
        plan: {
          include: {
            module: {
              include: {
                exam: {
                  select: {
                    id: true,
                    titleEn: true,
                    cycleCode: true,
                    cycleYear: true,
                  },
                },
                entitlements: true,
              },
            },
          },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sub) {
      throw new Error(`Subscription with ID ${id} not found`);
    }

    const module = sub.plan?.module;
    const exam = module?.exam;
    const features = this.resolveFeatures(module);

    return {
      id: sub.id,
      subscriptionNumber: sub.subscriptionNumber || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
      status: sub.status,
      paymentStatus: sub.paymentStatus || 'PAID',
      startDate: sub.startDate,
      endDate: sub.endDate,
      amount: Number(sub.amount || sub.amountPaid || sub.plan?.price || 0),
      currency: sub.currency || 'INR',
      autoRenew: sub.autoRenew,
      assignmentSource: sub.assignmentSource || 'PAID_PURCHASE',
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancelledAt: sub.cancelledAt,
      pausedAt: sub.pausedAt,
      pauseReason: sub.pauseReason,
      resumeDate: sub.resumeDate,
      adminNotes: sub.adminNotes,
      createdBy: sub.createdBy,
      updatedBy: sub.updatedBy,
      paymentMethod: sub.paymentMethod,
      transactionId: sub.transactionId || sub.paymentId,
      invoiceId: sub.invoiceId,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      student: {
        id: sub.student?.id,
        userId: sub.student?.userId || sub.student?.user?.id,
        fullName: sub.student?.user?.fullName || 'Student',
        email: sub.student?.user?.email || 'N/A',
        mobile: sub.student?.user?.mobile || '',
      },
      plan: sub.plan ? {
        id: sub.plan.id,
        name: sub.plan.name,
        code: sub.plan.code,
        planType: sub.plan.planType,
        price: Number(sub.plan.price),
        billingCycle: sub.plan.billingCycle,
        durationValue: sub.plan.durationValue,
        durationUnit: sub.plan.durationUnit,
        autoRenewEligible: sub.plan.autoRenewEligible,
      } : null,
      module: module ? {
        id: module.id,
        name: module.name,
        code: module.code,
        scopeType: module.scopeType,
        moduleType: module.moduleType,
        accessType: module.accessType,
        features,
        entitlements: module.entitlements || [],
      } : null,
      exam: exam ? {
        id: exam.id,
        titleEn: exam.titleEn,
        cycleCode: exam.cycleCode,
        cycleYear: exam.cycleYear,
      } : null,
      histories: sub.histories || [],
    };
  }

  /**
   * Create / Manually Assign Subscription to a Student
   */
  static async createSubscription(
    dto: CreateSubscriptionDto,
    adminUserId?: string,
    adminName?: string
  ) {
    // 1. Resolve Student Profile
    let studentProfile = await prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
      include: { user: true },
    });

    if (!studentProfile) {
      // Try resolving by User ID
      studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: dto.studentId },
        include: { user: true },
      });
    }

    if (!studentProfile) {
      throw new Error(`Student not found with ID ${dto.studentId}`);
    }

    // 2. Resolve Plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
      include: {
        module: {
          include: {
            exam: true,
          },
        },
      },
    });

    if (!plan) {
      throw new Error(`Plan not found with ID ${dto.planId}`);
    }

    if (plan.status !== 'ACTIVE') {
      throw new Error(`Plan "${plan.name}" is not active (${plan.status})`);
    }

    // 3. Duplicate / Overlapping active subscription check
    const now = new Date();
    const existingActive = await prisma.studentSubscription.findFirst({
      where: {
        studentId: studentProfile.id,
        planId: plan.id,
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
      include: { plan: true },
    });

    if (existingActive && !dto.allowOverlap) {
      throw new Error(
        `Student already has an active subscription for "${plan.name}" (valid until ${
          existingActive.endDate ? existingActive.endDate.toLocaleDateString() : 'Lifetime'
        }). Use Renew/Extend or enable overlap override.`
      );
    }

    // 4. Calculate Dates
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    let endDate: Date;

    if (dto.overrideExpiry && dto.endDate) {
      if (!dto.overrideReason?.trim()) {
        throw new Error('An override reason is required when manually specifying an expiry date');
      }
      endDate = new Date(dto.endDate);
    } else {
      endDate = this.calculateEndDate(startDate, plan.durationValue, plan.durationUnit);
    }

    // 5. Determine Assignment & Payment details
    const isFreePlan = plan.planType === 'FREE' || Number(plan.price) === 0;
    const assignmentSource = dto.assignmentSource || (isFreePlan ? 'FREE_PLAN' : 'PAID_PURCHASE');
    
    let paymentStatus = dto.paymentStatus;
    if (!paymentStatus) {
      if (assignmentSource === 'ADMIN_GRANT' || assignmentSource === 'FREE_PLAN' || isFreePlan) {
        paymentStatus = 'NOT_REQUIRED';
      } else {
        paymentStatus = 'PAID';
      }
    }

    const amount = isFreePlan ? 0 : (dto.amount !== undefined ? dto.amount : Number(plan.price));
    const autoRenew = plan.autoRenewEligible ? Boolean(dto.autoRenew) : false;
    const subscriptionNumber = this.generateSubscriptionNumber();

    // 6. Execute atomic creation in transaction
    return await prisma.$transaction(async (tx) => {
      const created = await tx.studentSubscription.create({
        data: {
          subscriptionNumber,
          studentId: studentProfile.id,
          planId: plan.id,
          status: 'ACTIVE',
          paymentStatus,
          startDate,
          endDate,
          amount,
          amountPaid: paymentStatus === 'PAID' ? amount : 0,
          currency: dto.currency || plan.currency || 'INR',
          autoRenew,
          assignmentSource,
          adminNotes: dto.adminNotes,
          paymentMethod: dto.paymentMethod,
          transactionId: dto.transactionId,
          createdBy: adminName || adminUserId || 'System Admin',
        },
        include: {
          student: {
            include: { user: true },
          },
          plan: {
            include: {
              module: {
                include: { exam: true },
              },
            },
          },
        },
      });

      // Record History
      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: created.id,
          action: 'CREATED',
          newValue: {
            planName: plan.name,
            moduleName: plan.module?.name,
            examTitle: plan.module?.exam?.titleEn,
            startDate,
            endDate,
            amount,
            assignmentSource,
            paymentStatus,
          },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: dto.adminNotes || dto.overrideReason || `Subscription assigned to student`,
        },
      });

      // Record Admin Audit Log if admin user exists
      if (adminUserId) {
        try {
          const adminExists = await tx.adminUser.findUnique({
            where: { id: adminUserId },
          });
          if (adminExists) {
            await tx.adminAuditLog.create({
              data: {
                adminUserId,
                action: 'SUBSCRIPTION_CREATED',
                module: 'SUBSCRIPTIONS',
                recordType: 'STUDENT_SUBSCRIPTION',
                recordId: created.id,
                newValue: {
                  subscriptionNumber,
                  studentName: studentProfile.user.fullName,
                  planName: plan.name,
                },
                reason: dto.adminNotes,
              },
            });
          }
        } catch (logErr) {
          console.warn('Audit log creation skipped:', logErr);
        }
      }

      return created;
    });
  }

  /**
   * Renew / Extend Subscription
   */
  static async renewSubscription(
    id: string,
    dto: RenewSubscriptionDto,
    adminUserId?: string,
    adminName?: string
  ) {
    const sub = await prisma.studentSubscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!sub) {
      throw new Error(`Subscription with ID ${id} not found`);
    }

    const plan = sub.plan;
    const durationValue = dto.durationValue || plan?.durationValue || 1;
    const durationUnit = dto.durationUnit || plan?.durationUnit || 'MONTHS';

    const now = new Date();
    // If current endDate is in the future, extend from current endDate; else extend from now
    const baseDate = sub.endDate && sub.endDate > now ? sub.endDate : now;
    const newEndDate = this.calculateEndDate(baseDate, durationValue, durationUnit);
    const oldEndDate = sub.endDate;

    const renewAmount = dto.amount !== undefined ? dto.amount : Number(plan?.price || 0);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.studentSubscription.update({
        where: { id },
        data: {
          endDate: newEndDate,
          status: 'ACTIVE',
          paymentStatus: dto.paymentStatus || sub.paymentStatus || 'PAID',
          paymentMethod: dto.paymentMethod || sub.paymentMethod,
          transactionId: dto.transactionId || sub.transactionId,
          amount: renewAmount > 0 ? renewAmount : sub.amount,
          amountPaid: renewAmount > 0 ? renewAmount : sub.amountPaid,
          updatedBy: adminName || adminUserId || 'System Admin',
        },
      });

      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: id,
          action: 'RENEWED',
          oldValue: { endDate: oldEndDate, status: sub.status },
          newValue: {
            endDate: newEndDate,
            status: 'ACTIVE',
            extension: `${durationValue} ${durationUnit}`,
            renewAmount,
          },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: dto.reason || `Subscription extended by ${durationValue} ${durationUnit}`,
        },
      });

      return updated;
    });
  }

  /**
   * Change Plan for an active subscription
   */
  static async changePlan(
    id: string,
    dto: ChangePlanDto,
    adminUserId?: string,
    adminName?: string
  ) {
    const sub = await prisma.studentSubscription.findUnique({
      where: { id },
      include: {
        plan: {
          include: { module: true },
        },
      },
    });

    if (!sub) {
      throw new Error(`Subscription with ID ${id} not found`);
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: dto.newPlanId },
      include: {
        module: {
          include: { exam: true },
        },
      },
    });

    if (!newPlan) {
      throw new Error(`Target Plan with ID ${dto.newPlanId} not found`);
    }

    if (newPlan.status !== 'ACTIVE') {
      throw new Error(`Plan "${newPlan.name}" is not active (${newPlan.status})`);
    }

    const oldPlan = sub.plan;
    let newEndDate = sub.endDate;

    if (dto.recalculateExpiry) {
      const startDate = sub.startDate || new Date();
      newEndDate = this.calculateEndDate(startDate, newPlan.durationValue, newPlan.durationUnit);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.studentSubscription.update({
        where: { id },
        data: {
          planId: newPlan.id,
          endDate: newEndDate,
          amount: Number(newPlan.price),
          autoRenew: newPlan.autoRenewEligible ? sub.autoRenew : false,
          updatedBy: adminName || adminUserId || 'System Admin',
        },
      });

      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: id,
          action: 'PLAN_CHANGED',
          oldValue: {
            planId: oldPlan?.id,
            planName: oldPlan?.name,
            moduleName: oldPlan?.module?.name,
            endDate: sub.endDate,
          },
          newValue: {
            planId: newPlan.id,
            planName: newPlan.name,
            moduleName: newPlan.module?.name,
            endDate: newEndDate,
          },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: dto.reason || `Plan changed to ${newPlan.name}`,
        },
      });

      return updated;
    });
  }

  /**
   * Pause Subscription
   */
  static async pauseSubscription(
    id: string,
    dto: PauseSubscriptionDto,
    adminUserId?: string,
    adminName?: string
  ) {
    const sub = await prisma.studentSubscription.findUnique({ where: { id } });
    if (!sub) throw new Error(`Subscription with ID ${id} not found`);

    if (sub.status !== 'ACTIVE') {
      throw new Error(`Only active subscriptions can be paused. Current status: ${sub.status}`);
    }

    const resumeDate = dto.resumeDate ? new Date(dto.resumeDate) : null;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.studentSubscription.update({
        where: { id },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          pauseReason: dto.reason,
          resumeDate,
          updatedBy: adminName || adminUserId || 'System Admin',
        },
      });

      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: id,
          action: 'PAUSED',
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'PAUSED', pauseReason: dto.reason, resumeDate },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: dto.reason,
        },
      });

      return updated;
    });
  }

  /**
   * Resume Subscription
   */
  static async resumeSubscription(
    id: string,
    adminUserId?: string,
    adminName?: string
  ) {
    const sub = await prisma.studentSubscription.findUnique({ where: { id } });
    if (!sub) throw new Error(`Subscription with ID ${id} not found`);

    if (sub.status !== 'PAUSED') {
      throw new Error(`Only paused subscriptions can be resumed. Current status: ${sub.status}`);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.studentSubscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
          pauseReason: null,
          resumeDate: null,
          updatedBy: adminName || adminUserId || 'System Admin',
        },
      });

      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: id,
          action: 'RESUMED',
          oldValue: { status: 'PAUSED', pausedAt: sub.pausedAt },
          newValue: { status: 'ACTIVE' },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: 'Subscription resumed by admin',
        },
      });

      return updated;
    });
  }

  /**
   * Cancel Subscription (Immediate or at End of Period)
   */
  static async cancelSubscription(
    id: string,
    dto: CancelSubscriptionDto,
    adminUserId?: string,
    adminName?: string
  ) {
    const sub = await prisma.studentSubscription.findUnique({ where: { id } });
    if (!sub) throw new Error(`Subscription with ID ${id} not found`);

    if (sub.status === 'CANCELLED') {
      throw new Error('Subscription is already cancelled');
    }

    const immediate = dto.immediate !== false;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.studentSubscription.update({
        where: { id },
        data: {
          status: immediate ? 'CANCELLED' : sub.status,
          cancelAtPeriodEnd: !immediate,
          cancelledAt: immediate ? new Date() : null,
          updatedBy: adminName || adminUserId || 'System Admin',
        },
      });

      await tx.studentSubscriptionHistory.create({
        data: {
          subscriptionId: id,
          action: immediate ? 'CANCELLED' : 'CANCELLATION_SCHEDULED',
          oldValue: { status: sub.status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd },
          newValue: {
            status: immediate ? 'CANCELLED' : sub.status,
            cancelAtPeriodEnd: !immediate,
            effectiveDate: immediate ? new Date() : sub.endDate,
          },
          actorType: adminUserId ? 'ADMIN' : 'SYSTEM',
          actorId: adminUserId,
          actorName: adminName || 'Admin',
          reason: dto.reason || 'Subscription cancelled',
        },
      });

      return updated;
    });
  }

  /**
   * Background expiry worker / process: Mark expired subscriptions
   */
  static async processExpirations() {
    const now = new Date();
    const expiredList = await prisma.studentSubscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      select: { id: true, endDate: true },
    });

    let processedCount = 0;
    for (const sub of expiredList) {
      await prisma.$transaction(async (tx) => {
        await tx.studentSubscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        });

        await tx.studentSubscriptionHistory.create({
          data: {
            subscriptionId: sub.id,
            action: 'EXPIRED',
            oldValue: { status: 'ACTIVE', endDate: sub.endDate },
            newValue: { status: 'EXPIRED' },
            actorType: 'SYSTEM',
            reason: 'Subscription period ended',
          },
        });
      });
      processedCount++;
    }

    return { processedCount };
  }

  /**
   * Search students for auto-complete in Add Subscription form
   */
  static async searchStudents(query: string) {
    const q = (query || '').trim();
    const users = await prisma.user.findMany({
      where: {
        accountType: 'STUDENT',
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q, mode: 'insensitive' } },
                { id: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        studentProfile: true,
      },
      take: 20,
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      userId: u.id,
      studentProfileId: u.studentProfile?.id || u.id,
      fullName: u.fullName,
      email: u.email,
      mobile: u.mobile,
      accountStatus: u.accountStatus,
    }));
  }

  /**
   * Get plans list formatted with module and feature info for plan selector
   */
  static async getPlansForSelection() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        module: {
          include: {
            exam: {
              select: {
                id: true,
                titleEn: true,
                cycleCode: true,
              },
            },
            entitlements: true,
          },
        },
      },
    });

    return plans.map((p) => {
      const features = this.resolveFeatures(p.module);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        price: Number(p.price),
        currency: p.currency,
        planType: p.planType,
        billingCycle: p.billingCycle,
        durationValue: p.durationValue,
        durationUnit: p.durationUnit,
        autoRenewEligible: p.autoRenewEligible,
        module: {
          id: p.module.id,
          name: p.module.name,
          code: p.module.code,
          scopeType: p.module.scopeType,
          moduleType: p.module.moduleType,
          accessType: p.module.accessType,
          exam: p.module.exam,
          features,
        },
      };
    });
  }

  /**
   * Export subscriptions as CSV
   */
  static async exportSubscriptions(params: SubscriptionFilterParams): Promise<string> {
    const { items } = await this.getSubscriptions({ ...params, page: 1, pageSize: 5000 });

    const headers = [
      'Subscription ID',
      'Student Name',
      'Student Email',
      'Student Mobile',
      'Module Name',
      'Exam',
      'Plan Name',
      'Plan Type',
      'Start Date',
      'End Date',
      'Subscription Status',
      'Payment Status',
      'Amount',
      'Currency',
      'Auto Renew',
      'Assignment Source',
      'Created Date',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((sub: any) => [
      escapeCsv(sub.subscriptionNumber),
      escapeCsv(sub.student?.fullName),
      escapeCsv(sub.student?.email),
      escapeCsv(sub.student?.mobile),
      escapeCsv(sub.module?.name),
      escapeCsv(sub.exam?.titleEn || sub.exam?.cycleCode || 'N/A'),
      escapeCsv(sub.plan?.name),
      escapeCsv(sub.plan?.planType),
      escapeCsv(sub.startDate ? new Date(sub.startDate).toLocaleDateString() : ''),
      escapeCsv(sub.endDate ? new Date(sub.endDate).toLocaleDateString() : ''),
      escapeCsv(sub.status),
      escapeCsv(sub.paymentStatus),
      escapeCsv(sub.amount),
      escapeCsv(sub.currency),
      escapeCsv(sub.autoRenew ? 'On' : 'Off'),
      escapeCsv(sub.assignmentSource),
      escapeCsv(sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
