import {
  prisma,
  SubscriptionPlan,
  PlanType,
  PlanBillingCycle,
  PlanDurationUnit,
  PlanStatus,
} from '@study-karnataka/database';

export interface PlanFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  moduleId?: string;
  examId?: string;
  planType?: string;
  billingCycle?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePlanDto {
  name: string;
  code?: string;
  moduleId: string;
  description?: string;
  planType: PlanType;
  price: number;
  currency?: string;
  billingCycle: PlanBillingCycle;
  durationValue: number;
  durationUnit: PlanDurationUnit;
  trialEnabled?: boolean;
  trialDuration?: number | null;
  trialDurationUnit?: PlanDurationUnit | null;
  autoRenewEligible?: boolean;
  benefits?: string[];
  status?: PlanStatus;
  displayOrder?: number;
  publishDate?: string | Date | null;
}

export interface UpdatePlanDto {
  name?: string;
  code?: string;
  moduleId?: string;
  description?: string;
  planType?: PlanType;
  price?: number;
  currency?: string;
  billingCycle?: PlanBillingCycle;
  durationValue?: number;
  durationUnit?: PlanDurationUnit;
  trialEnabled?: boolean;
  trialDuration?: number | null;
  trialDurationUnit?: PlanDurationUnit | null;
  autoRenewEligible?: boolean;
  benefits?: string[];
  status?: PlanStatus;
  displayOrder?: number;
  publishDate?: string | Date | null;
}

export interface ManagePricingDto {
  price: number;
  currency?: string;
  billingCycle: PlanBillingCycle;
  durationValue: number;
  durationUnit: PlanDurationUnit;
}

async function createAuditLog(params: {
  adminUserId?: string;
  action: string;
  recordId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
}) {
  if (!params.adminUserId) return;
  try {
    const adminExists = await prisma.adminUser.findUnique({
      where: { id: params.adminUserId },
    });
    if (!adminExists) return;

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        module: 'SUBSCRIPTIONS',
        recordType: 'SUBSCRIPTION_PLAN',
        recordId: params.recordId,
        previousValue: params.previousValue ? params.previousValue : undefined,
        newValue: params.newValue ? params.newValue : undefined,
        reason: params.reason,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log for subscription plan:', err);
  }
}

export class PlanService {
  /**
   * Format code into uppercase hyphenated slug
   */
  static formatCode(input: string): string {
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get paginated plans with server-side filters and search
   */
  static async getPlans(params: PlanFilterParams): Promise<any> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Filter by Module
    if (params.moduleId && params.moduleId !== 'ALL') {
      where.moduleId = params.moduleId;
    }

    // Filter by Exam through Module
    if (params.examId && params.examId !== 'ALL') {
      where.module = {
        ...(where.module || {}),
        examId: params.examId,
      };
    }

    // Filter by Plan Type
    if (params.planType && params.planType !== 'ALL') {
      where.planType = params.planType as PlanType;
    }

    // Filter by Billing Cycle
    if (params.billingCycle && params.billingCycle !== 'ALL') {
      where.billingCycle = params.billingCycle as PlanBillingCycle;
    }

    // Filter by Status
    if (params.status && params.status !== 'ALL') {
      where.status = params.status as PlanStatus;
    }

    // Search query across name, code, description, module name
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { module: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    const sortBy = params.sortBy || 'updatedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    if (['name', 'createdAt', 'updatedAt', 'displayOrder', 'status', 'price'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const [total, items] = await Promise.all([
      prisma.subscriptionPlan.count({ where }),
      prisma.subscriptionPlan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          module: {
            select: {
              id: true,
              name: true,
              code: true,
              scopeType: true,
              moduleType: true,
              accessType: true,
              status: true,
              features: true,
              examId: true,
              exam: {
                select: {
                  id: true,
                  titleEn: true,
                  cycleCode: true,
                },
              },
              entitlements: {
                select: {
                  id: true,
                  featureKey: true,
                  name: true,
                  description: true,
                  enabled: true,
                },
              },
            },
          },
          _count: {
            select: {
              studentSubscriptions: true,
            },
          },
        },
      }),
    ]);

    const formattedItems = items.map((p) => {
      const subscriberCount = p._count?.studentSubscriptions || 0;
      return {
        ...p,
        subscribers: subscriberCount,
        exam: p.module?.exam
          ? { id: p.module.exam.id, title: p.module.exam.titleEn, code: p.module.exam.cycleCode }
          : null,
        // Format access badge summary from module
        accessSummary: p.module?.moduleType
          ? p.module.moduleType.replace(/_/g, ' ')
          : 'Full Access',
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
   * Get KPI Metrics for cards
   */
  static async getPlanMetrics() {
    const [totalPlans, activePlans, paidPlans] = await Promise.all([
      prisma.subscriptionPlan.count(),
      prisma.subscriptionPlan.count({ where: { status: 'ACTIVE' } }),
      prisma.subscriptionPlan.count({ where: { planType: 'PAID' } }),
    ]);

    let activeSubscribers = 0;
    try {
      activeSubscribers = await prisma.studentSubscription.count({
        where: { status: 'ACTIVE' },
      });
    } catch {
      activeSubscribers = 0;
    }

    return {
      totalPlans,
      activePlans,
      paidPlans,
      activeSubscribers,
    };
  }

  /**
   * Get single Plan by ID with full details
   */
  static async getPlanById(id: string): Promise<any> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            scopeType: true,
            moduleType: true,
            accessType: true,
            status: true,
            features: true,
            examId: true,
            exam: {
              select: {
                id: true,
                titleEn: true,
                cycleCode: true,
              },
            },
            entitlements: {
              select: {
                id: true,
                featureKey: true,
                name: true,
                description: true,
                enabled: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentSubscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return {
      ...plan,
      subscribers: plan._count?.studentSubscriptions || 0,
      exam: plan.module?.exam
        ? { id: plan.module.exam.id, title: plan.module.exam.titleEn, code: plan.module.exam.cycleCode }
        : null,
      accessSummary: plan.module?.moduleType
        ? plan.module.moduleType.replace(/_/g, ' ')
        : 'Full Access',
    };
  }

  /**
   * Create a new SubscriptionPlan atomically
   */
  static async createPlan(dto: CreatePlanDto, adminUserId?: string): Promise<any> {
    // 1. Verify Module exists & check status
    const moduleRecord = await prisma.subscriptionModule.findUnique({
      where: { id: dto.moduleId },
    });
    if (!moduleRecord) {
      throw new Error('Selected Module does not exist');
    }
    if (dto.status === 'ACTIVE' && moduleRecord.status !== 'ACTIVE') {
      throw new Error('Cannot create an Active Plan for an Inactive or Archived Module');
    }

    // 2. Validate price based on planType
    let finalPrice = dto.price;
    if (dto.planType === 'FREE') {
      finalPrice = 0;
    } else if (dto.planType === 'PAID') {
      if (finalPrice <= 0) {
        throw new Error('Paid plans must have a price greater than 0');
      }
    }

    // 3. Generate or validate unique code
    let finalCode = dto.code ? this.formatCode(dto.code) : '';
    if (finalCode) {
      const existing = await prisma.subscriptionPlan.findUnique({
        where: { code: finalCode },
      });
      if (existing) {
        throw new Error(`Plan code "${finalCode}" is already in use`);
      }
    } else {
      // Auto-generate code
      const modPrefix = moduleRecord.code
        ? moduleRecord.code.slice(0, 8).toUpperCase()
        : 'PLAN';
      finalCode = `PLAN-${modPrefix}-${Date.now().toString(36).toUpperCase()}`;
    }

    // 4. Sanitize benefits
    const benefitsList = Array.isArray(dto.benefits)
      ? dto.benefits.map((b) => String(b).trim()).filter(Boolean)
      : [];

    // 5. Sanitize trial
    const isTrial = Boolean(dto.trialEnabled);
    const trialDuration = isTrial ? Number(dto.trialDuration) || 7 : null;
    const trialDurationUnit = isTrial ? dto.trialDurationUnit || 'DAYS' : null;

    // 6. Execute atomic creation
    const createdPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          name: dto.name.trim(),
          code: finalCode,
          moduleId: dto.moduleId,
          description: dto.description?.trim() || null,
          planType: dto.planType,
          price: finalPrice,
          currency: dto.currency?.trim() || 'INR',
          billingCycle: dto.billingCycle,
          durationValue: Math.max(1, Number(dto.durationValue) || 1),
          durationUnit: dto.durationUnit,
          trialEnabled: isTrial,
          trialDuration,
          trialDurationUnit,
          autoRenewEligible: Boolean(dto.autoRenewEligible),
          benefits: benefitsList,
          status: dto.status || 'DRAFT',
          displayOrder: Number(dto.displayOrder) || 0,
          publishDate: dto.publishDate ? new Date(dto.publishDate) : null,
          createdBy: adminUserId || null,
          updatedBy: adminUserId || null,
        },
        include: {
          module: {
            include: {
              exam: true,
              entitlements: true,
            },
          },
        },
      });

      return plan;
    });

    // 7. Audit log
    await createAuditLog({
      adminUserId,
      action: 'PLAN_CREATED',
      recordId: createdPlan.id,
      newValue: {
        id: createdPlan.id,
        name: createdPlan.name,
        code: createdPlan.code,
        price: Number(createdPlan.price),
        planType: createdPlan.planType,
        moduleId: createdPlan.moduleId,
      },
      reason: `Plan "${createdPlan.name}" created with status ${createdPlan.status}`,
    });

    return createdPlan;
  }

  /**
   * Update an existing SubscriptionPlan
   */
  static async updatePlan(id: string, dto: UpdatePlanDto, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { studentSubscriptions: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Plan not found');
    }

    // Module change restriction
    if (dto.moduleId && dto.moduleId !== existing.moduleId) {
      if ((existing._count?.studentSubscriptions || 0) > 0) {
        throw new Error('Cannot change Module on a Plan that has active subscribers or history');
      }
      const targetModule = await prisma.subscriptionModule.findUnique({
        where: { id: dto.moduleId },
      });
      if (!targetModule) {
        throw new Error('Selected Module does not exist');
      }
      if (dto.status === 'ACTIVE' && targetModule.status !== 'ACTIVE') {
        throw new Error('Cannot link Plan to an Inactive or Archived Module');
      }
    }

    // Code validation if changed
    let finalCode = existing.code;
    if (dto.code !== undefined) {
      const formatted = dto.code ? this.formatCode(dto.code) : null;
      if (formatted && formatted !== existing.code) {
        const codeTaken = await prisma.subscriptionPlan.findFirst({
          where: { code: formatted, id: { not: id } },
        });
        if (codeTaken) {
          throw new Error(`Plan code "${formatted}" is already in use`);
        }
        finalCode = formatted;
      }
    }

    // Pricing rules
    const effectivePlanType = dto.planType || existing.planType;
    let finalPrice = dto.price !== undefined ? dto.price : Number(existing.price);
    if (effectivePlanType === 'FREE') {
      finalPrice = 0;
    } else if (effectivePlanType === 'PAID') {
      if (finalPrice <= 0) {
        throw new Error('Paid plans must have a price greater than 0');
      }
    }

    // Benefits
    const benefitsList = dto.benefits !== undefined
      ? (Array.isArray(dto.benefits) ? dto.benefits.map((b) => String(b).trim()).filter(Boolean) : [])
      : (existing.benefits as any);

    // Trial
    const isTrial = dto.trialEnabled !== undefined ? Boolean(dto.trialEnabled) : existing.trialEnabled;
    const trialDuration = isTrial
      ? (dto.trialDuration !== undefined ? Number(dto.trialDuration) || 7 : existing.trialDuration || 7)
      : null;
    const trialDurationUnit = isTrial
      ? (dto.trialDurationUnit !== undefined ? dto.trialDurationUnit : existing.trialDurationUnit || 'DAYS')
      : null;

    const updatedPlan = await prisma.$transaction(async (tx) => {
      return tx.subscriptionPlan.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : existing.name,
          code: finalCode,
          moduleId: dto.moduleId !== undefined ? dto.moduleId : existing.moduleId,
          description: dto.description !== undefined ? (dto.description?.trim() || null) : existing.description,
          planType: effectivePlanType,
          price: finalPrice,
          currency: dto.currency !== undefined ? dto.currency.trim() : existing.currency,
          billingCycle: dto.billingCycle !== undefined ? dto.billingCycle : existing.billingCycle,
          durationValue: dto.durationValue !== undefined ? Math.max(1, Number(dto.durationValue) || 1) : existing.durationValue,
          durationUnit: dto.durationUnit !== undefined ? dto.durationUnit : existing.durationUnit,
          trialEnabled: isTrial,
          trialDuration,
          trialDurationUnit,
          autoRenewEligible: dto.autoRenewEligible !== undefined ? Boolean(dto.autoRenewEligible) : existing.autoRenewEligible,
          benefits: benefitsList,
          status: dto.status !== undefined ? dto.status : existing.status,
          displayOrder: dto.displayOrder !== undefined ? Number(dto.displayOrder) : existing.displayOrder,
          publishDate: dto.publishDate !== undefined ? (dto.publishDate ? new Date(dto.publishDate) : null) : existing.publishDate,
          updatedBy: adminUserId || null,
        },
        include: {
          module: {
            include: {
              exam: true,
              entitlements: true,
            },
          },
        },
      });
    });

    // Track detailed audit changes
    const changes: string[] = [];
    if (Number(existing.price) !== Number(updatedPlan.price)) {
      changes.push(`Price: ₹${existing.price} -> ₹${updatedPlan.price}`);
    }
    if (existing.billingCycle !== updatedPlan.billingCycle) {
      changes.push(`BillingCycle: ${existing.billingCycle} -> ${updatedPlan.billingCycle}`);
    }
    if (existing.durationValue !== updatedPlan.durationValue || existing.durationUnit !== updatedPlan.durationUnit) {
      changes.push(`Duration: ${existing.durationValue} ${existing.durationUnit} -> ${updatedPlan.durationValue} ${updatedPlan.durationUnit}`);
    }
    if (existing.status !== updatedPlan.status) {
      changes.push(`Status: ${existing.status} -> ${updatedPlan.status}`);
    }

    await createAuditLog({
      adminUserId,
      action: 'PLAN_UPDATED',
      recordId: id,
      previousValue: { price: Number(existing.price), status: existing.status },
      newValue: { price: Number(updatedPlan.price), status: updatedPlan.status },
      reason: changes.length > 0 ? changes.join(', ') : `Plan "${updatedPlan.name}" updated`,
    });

    return updatedPlan;
  }

  /**
   * Update Status (Activate / Deactivate / Archive)
   */
  static async updateStatus(id: string, status: PlanStatus, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { module: true },
    });
    if (!existing) {
      throw new Error('Plan not found');
    }

    if (status === 'ACTIVE' && existing.module.status !== 'ACTIVE') {
      throw new Error('Cannot activate Plan when its parent Module is Inactive or Archived');
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        status,
        updatedBy: adminUserId || null,
      },
      include: {
        module: {
          include: { exam: true },
        },
      },
    });

    let action = 'PLAN_UPDATED';
    if (status === 'ACTIVE') action = 'PLAN_ACTIVATED';
    else if (status === 'INACTIVE') action = 'PLAN_DEACTIVATED';
    else if (status === 'ARCHIVED') action = 'PLAN_ARCHIVED';

    await createAuditLog({
      adminUserId,
      action,
      recordId: id,
      previousValue: { status: existing.status },
      newValue: { status },
      reason: `Plan status transitioned to ${status}`,
    });

    return updated;
  }

  /**
   * Manage Pricing directly
   */
  static async managePricing(id: string, dto: ManagePricingDto, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Plan not found');
    }

    let finalPrice = dto.price;
    if (existing.planType === 'FREE') {
      finalPrice = 0;
    } else if (existing.planType === 'PAID') {
      if (finalPrice <= 0) {
        throw new Error('Price must be greater than 0 for Paid plans');
      }
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        price: finalPrice,
        currency: dto.currency?.trim() || existing.currency,
        billingCycle: dto.billingCycle,
        durationValue: Math.max(1, Number(dto.durationValue) || 1),
        durationUnit: dto.durationUnit,
        updatedBy: adminUserId || null,
      },
      include: {
        module: {
          include: { exam: true },
        },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'PRICE_CHANGED',
      recordId: id,
      previousValue: {
        price: Number(existing.price),
        billingCycle: existing.billingCycle,
        duration: `${existing.durationValue} ${existing.durationUnit}`,
      },
      newValue: {
        price: finalPrice,
        billingCycle: dto.billingCycle,
        duration: `${dto.durationValue} ${dto.durationUnit}`,
      },
      reason: `Pricing updated to ₹${finalPrice} (${dto.billingCycle}, ${dto.durationValue} ${dto.durationUnit})`,
    });

    return updated;
  }

  /**
   * Duplicate a Plan
   */
  static async duplicatePlan(id: string, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { module: true },
    });
    if (!existing) {
      throw new Error('Source Plan not found');
    }

    const copySuffix = Date.now().toString(36).toUpperCase();
    const newName = `${existing.name} (Copy)`;
    const baseCode = existing.code ? existing.code.replace(/-COPY-[A-Z0-9]+$/i, '') : 'PLAN';
    const newCode = `${baseCode}-COPY-${copySuffix}`;

    const duplicated = await prisma.subscriptionPlan.create({
      data: {
        name: newName,
        code: newCode,
        moduleId: existing.moduleId,
        description: existing.description,
        planType: existing.planType,
        price: existing.price,
        currency: existing.currency,
        billingCycle: existing.billingCycle,
        durationValue: existing.durationValue,
        durationUnit: existing.durationUnit,
        trialEnabled: existing.trialEnabled,
        trialDuration: existing.trialDuration,
        trialDurationUnit: existing.trialDurationUnit,
        autoRenewEligible: existing.autoRenewEligible,
        benefits: existing.benefits as any,
        status: 'DRAFT', // Duplicates always default to DRAFT
        displayOrder: existing.displayOrder + 1,
        publishDate: null,
        createdBy: adminUserId || null,
        updatedBy: adminUserId || null,
      },
      include: {
        module: {
          include: {
            exam: true,
            entitlements: true,
          },
        },
      },
    });

    await createAuditLog({
      adminUserId,
      action: 'PLAN_DUPLICATED',
      recordId: duplicated.id,
      previousValue: { sourcePlanId: id, sourceName: existing.name },
      newValue: { newPlanId: duplicated.id, newName: duplicated.name, newCode: duplicated.code },
      reason: `Duplicated from "${existing.name}" (${id})`,
    });

    return duplicated;
  }

  /**
   * Delete or archive plan
   */
  static async deletePlan(id: string, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { studentSubscriptions: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Plan not found');
    }

    if ((existing._count?.studentSubscriptions || 0) > 0) {
      // Historical references exist -> soft-archive instead of hard-delete
      const archived = await prisma.subscriptionPlan.update({
        where: { id },
        data: { status: 'ARCHIVED', updatedBy: adminUserId || null },
      });
      await createAuditLog({
        adminUserId,
        action: 'PLAN_ARCHIVED',
        recordId: id,
        reason: 'Plan archived because subscriber records exist',
      });
      return { success: true, archived: true, plan: archived };
    }

    // Hard-delete safely if no historical subscriber records
    await prisma.subscriptionPlan.delete({ where: { id } });
    await createAuditLog({
      adminUserId,
      action: 'PLAN_DELETED',
      recordId: id,
      reason: `Plan "${existing.name}" permanently deleted`,
    });
    return { success: true, deleted: true };
  }

  /**
   * Export Plans to CSV
   */
  static async exportPlans(params: PlanFilterParams): Promise<string> {
    const where: any = {};
    if (params.moduleId && params.moduleId !== 'ALL') where.moduleId = params.moduleId;
    if (params.examId && params.examId !== 'ALL') {
      where.module = { ...(where.module || {}), examId: params.examId };
    }
    if (params.planType && params.planType !== 'ALL') where.planType = params.planType as PlanType;
    if (params.billingCycle && params.billingCycle !== 'ALL') {
      where.billingCycle = params.billingCycle as PlanBillingCycle;
    }
    if (params.status && params.status !== 'ALL') where.status = params.status as PlanStatus;

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { module: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        module: {
          include: {
            exam: true,
          },
        },
        _count: {
          select: { studentSubscriptions: true },
        },
      },
    });

    const headers = [
      'Plan Name',
      'Plan Code',
      'Module',
      'Exam',
      'Plan Type',
      'Price',
      'Currency',
      'Billing Cycle',
      'Duration',
      'Subscribers',
      'Status',
      'Created Date',
      'Updated Date',
    ];

    const escapeCsv = (str: any) => {
      const val = str === null || str === undefined ? '' : String(str);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = plans.map((p) => [
      escapeCsv(p.name),
      escapeCsv(p.code || ''),
      escapeCsv(p.module?.name || ''),
      escapeCsv(p.module?.exam?.titleEn || p.module?.exam?.cycleCode || 'All Exams'),
      escapeCsv(p.planType),
      escapeCsv(Number(p.price)),
      escapeCsv(p.currency),
      escapeCsv(p.billingCycle),
      escapeCsv(`${p.durationValue} ${p.durationUnit}`),
      escapeCsv(p._count?.studentSubscriptions || 0),
      escapeCsv(p.status),
      escapeCsv(p.createdAt.toISOString()),
      escapeCsv(p.updatedAt.toISOString()),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
