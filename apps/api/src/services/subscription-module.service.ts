import {
  prisma,
  SubscriptionModule,
  ModuleEntitlement,
  ModuleScopeType,
  SubscriptionModuleType,
  ModuleAccessType,
  ModuleStatus,
} from '@study-karnataka/database';

export interface ModuleFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  accessType?: string;
  scopeType?: string;
  moduleType?: string;
  examId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EntitlementInput {
  featureKey: string;
  name: string;
  description?: string;
  stageId?: string | null;
  paperId?: string | null;
  subjectId?: string | null;
}

export interface CreateModuleDto {
  name: string;
  code?: string;
  description?: string;
  examId?: string | null;
  scopeType: ModuleScopeType;
  moduleType: SubscriptionModuleType;
  accessType: ModuleAccessType;
  status?: ModuleStatus;
  iconUrl?: string | null;
  imageUrl?: string | null;
  features?: string[];
  displayOrder?: number;
  publishDate?: string | Date | null;
  entitlements: EntitlementInput[];
}

export interface UpdateModuleDto {
  name?: string;
  code?: string;
  description?: string;
  examId?: string | null;
  scopeType?: ModuleScopeType;
  moduleType?: SubscriptionModuleType;
  accessType?: ModuleAccessType;
  status?: ModuleStatus;
  iconUrl?: string | null;
  imageUrl?: string | null;
  features?: string[];
  displayOrder?: number;
  publishDate?: string | Date | null;
  entitlements?: EntitlementInput[];
}

export class SubscriptionModuleService {
  /**
   * Helper to format slugs / codes in UPPER_SNAKE_CASE / HYPHENATED UPPERCASE
   */
  static formatCode(input: string): string {
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * List modules with server-side filters, search, sorting and pagination
   */
  static async getModules(params: ModuleFilterParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Filter by Status
    if (params.status && params.status !== 'ALL') {
      where.status = params.status as ModuleStatus;
    }

    // Filter by Access Type
    if (params.accessType && params.accessType !== 'ALL') {
      where.accessType = params.accessType as ModuleAccessType;
    }

    // Filter by Scope Type
    if (params.scopeType && params.scopeType !== 'ALL') {
      where.scopeType = params.scopeType as ModuleScopeType;
    }

    // Filter by Module Type
    if (params.moduleType && params.moduleType !== 'ALL') {
      where.moduleType = params.moduleType as SubscriptionModuleType;
    }

    // Filter by Exam
    if (params.examId && params.examId !== 'ALL') {
      where.examId = params.examId;
    }

    // Search query by name, description or code
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const sortBy = params.sortBy || 'updatedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    if (['name', 'createdAt', 'updatedAt', 'displayOrder', 'status'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    const [total, items] = await Promise.all([
      prisma.subscriptionModule.count({ where }),
      prisma.subscriptionModule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          entitlements: {
            select: {
              id: true,
              featureKey: true,
              name: true,
              description: true,
              examId: true,
              enabled: true,
            },
          },
          exam: {
            select: {
              id: true,
              titleEn: true,
              cycleCode: true,
              cycleYear: true,
            },
          },
        },
      }),
    ]);

    const mapped = items.map((mod) => ({
      ...mod,
      plansCount: 0,
      studentsCount: 0,
      features: (mod.features as string[]) || [],
    }));

    return {
      items: mapped,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * Summary KPI metrics computed from real database values
   */
  static async getModuleMetrics() {
    const [totalModules, activeModules, paidModules] = await Promise.all([
      prisma.subscriptionModule.count(),
      prisma.subscriptionModule.count({ where: { status: 'ACTIVE' } }),
      prisma.subscriptionModule.count({ where: { accessType: 'PAID' } }),
    ]);

    return {
      totalModules,
      activeModules,
      paidModules,
      studentsEnrolled: 0,
    };
  }

  /**
   * Get single module by ID with relational exam & entitlements
   */
  static async getModuleById(id: string) {
    const mod = await prisma.subscriptionModule.findUnique({
      where: { id },
      include: {
        entitlements: true,
        exam: {
          select: {
            id: true,
            titleEn: true,
            cycleCode: true,
            cycleYear: true,
          },
        },
      },
    });

    if (!mod) return null;

    return {
      ...mod,
      plansCount: 0,
      studentsCount: 0,
      features: (mod.features as string[]) || [],
    };
  }

  /**
   * Create a new SubscriptionModule + Entitlements atomically
   */
  static async createModule(dto: CreateModuleDto, adminUserId?: string): Promise<any> {
    // 1. Validation for Exam and Scope
    if (dto.scopeType !== 'GLOBAL' && (!dto.examId || !dto.examId.trim())) {
      throw new Error(`Exam is required for scope "${dto.scopeType}". Only GLOBAL modules can omit exam.`);
    }

    // 2. Validate at least one feature entitlement
    if (!dto.entitlements || dto.entitlements.length === 0) {
      throw new Error('A Module must include at least one feature entitlement.');
    }

    // 3. Format or auto-generate unique code
    let code = dto.code ? this.formatCode(dto.code) : '';
    if (!code) {
      const prefix = dto.scopeType === 'GLOBAL' ? 'GLOBAL' : 'EXAM';
      const cleanName = this.formatCode(dto.name).slice(0, 15);
      code = `MOD-${prefix}-${cleanName}-${Date.now().toString().slice(-4)}`;
    }

    // Check duplicate code
    const existing = await prisma.subscriptionModule.findUnique({
      where: { code },
    });
    if (existing) {
      throw new Error(`A module with code "${code}" already exists. Please use a unique internal code.`);
    }

    // Determine examId for entitlements (exam isolation)
    const entitlementExamId = dto.scopeType === 'GLOBAL' ? null : dto.examId;

    // 4. Transactional creation
    return prisma.$transaction(async (tx) => {
      const created = await tx.subscriptionModule.create({
        data: {
          name: dto.name.trim(),
          code,
          description: dto.description?.trim() || null,
          examId: dto.scopeType === 'GLOBAL' ? null : dto.examId,
          scopeType: dto.scopeType,
          moduleType: dto.moduleType,
          accessType: dto.accessType,
          status: dto.status || 'DRAFT',
          iconUrl: dto.iconUrl || null,
          imageUrl: dto.imageUrl || null,
          features: dto.features && dto.features.length > 0 ? dto.features : undefined,
          displayOrder: Number(dto.displayOrder) || 0,
          publishDate: dto.publishDate ? new Date(dto.publishDate) : null,
          createdBy: adminUserId || null,
          updatedBy: adminUserId || null,
          entitlements: {
            create: dto.entitlements.map((ent) => ({
              featureKey: ent.featureKey,
              name: ent.name,
              description: ent.description || null,
              examId: entitlementExamId,
              stageId: ent.stageId || null,
              paperId: ent.paperId || null,
              subjectId: ent.subjectId || null,
              enabled: true,
            })),
          },
        },
        include: {
          entitlements: true,
          exam: {
            select: {
              id: true,
              titleEn: true,
              cycleCode: true,
            },
          },
        },
      });

      return created;
    });
  }

  /**
   * Update an existing module + Entitlements atomically
   */
  static async updateModule(id: string, dto: UpdateModuleDto, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionModule.findUnique({
      where: { id },
      include: { entitlements: true },
    });

    if (!existing) {
      throw new Error(`Module with ID "${id}" not found.`);
    }

    const scopeType = dto.scopeType || existing.scopeType;
    const examId = dto.examId !== undefined ? dto.examId : existing.examId;

    if (scopeType !== 'GLOBAL' && (!examId || !examId.trim())) {
      throw new Error(`Exam is required for scope "${scopeType}". Only GLOBAL modules can omit exam.`);
    }

    if (dto.entitlements !== undefined && dto.entitlements.length === 0) {
      throw new Error('A Module must include at least one feature entitlement.');
    }

    // Check code collision if code changed
    let code = existing.code;
    if (dto.code && dto.code !== existing.code) {
      code = this.formatCode(dto.code);
      const codeTaken = await prisma.subscriptionModule.findFirst({
        where: { code, NOT: { id } },
      });
      if (codeTaken) {
        throw new Error(`Code "${code}" is already in use by another module.`);
      }
    }

    const entitlementExamId = scopeType === 'GLOBAL' ? null : examId;

    return prisma.$transaction(async (tx) => {
      // If entitlements are provided, replace them atomically
      if (dto.entitlements && dto.entitlements.length > 0) {
        await tx.moduleEntitlement.deleteMany({
          where: { moduleId: id },
        });

        await tx.moduleEntitlement.createMany({
          data: dto.entitlements.map((ent) => ({
            moduleId: id,
            featureKey: ent.featureKey,
            name: ent.name,
            description: ent.description || null,
            examId: entitlementExamId,
            stageId: ent.stageId || null,
            paperId: ent.paperId || null,
            subjectId: ent.subjectId || null,
            enabled: true,
          })),
        });
      }

      const updated = await tx.subscriptionModule.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : undefined,
          code,
          description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
          examId: scopeType === 'GLOBAL' ? null : examId,
          scopeType,
          moduleType: dto.moduleType || undefined,
          accessType: dto.accessType || undefined,
          status: dto.status || undefined,
          iconUrl: dto.iconUrl !== undefined ? dto.iconUrl : undefined,
          imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : undefined,
          features: dto.features !== undefined ? dto.features : undefined,
          displayOrder: dto.displayOrder !== undefined ? Number(dto.displayOrder) : undefined,
          publishDate: dto.publishDate !== undefined ? (dto.publishDate ? new Date(dto.publishDate) : null) : undefined,
          updatedBy: adminUserId || null,
        },
        include: {
          entitlements: true,
          exam: {
            select: {
              id: true,
              titleEn: true,
              cycleCode: true,
            },
          },
        },
      });

      return updated;
    });
  }

  /**
   * Update status directly (ACTIVATE, DEACTIVATE, ARCHIVE)
   */
  static async updateStatus(id: string, status: ModuleStatus, adminUserId?: string): Promise<any> {
    const existing = await prisma.subscriptionModule.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Module with ID "${id}" not found.`);
    }

    return prisma.subscriptionModule.update({
      where: { id },
      data: {
        status,
        updatedBy: adminUserId || null,
      },
    });
  }

  /**
   * Delete module safely:
   * - Verifies module exists
   * - Checks whether any linked plans have student subscriptions
   * - If student subscriptions exist, rejects deletion to protect financial and access history
   * - If no student subscriptions exist, atomically deletes dependent entitlements, linked plans, and the module
   */
  static async deleteModule(id: string): Promise<any> {
    const existing = await prisma.subscriptionModule.findUnique({
      where: { id },
      include: {
        plans: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { studentSubscriptions: true },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new Error(`Module with ID "${id}" not found.`);
    }

    const plansWithSubscribers = (existing.plans || []).filter(
      (p) => (p._count?.studentSubscriptions || 0) > 0
    );

    if (plansWithSubscribers.length > 0) {
      throw new Error(
        `Cannot delete module "${existing.name}" because it is linked to ${plansWithSubscribers.length} plan(s) with student subscriptions. Please archive this module instead to preserve subscription records.`
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Delete dependent entitlements
      await tx.moduleEntitlement.deleteMany({
        where: { moduleId: id },
      });
      // 2. Delete linked plans without subscriptions
      await tx.subscriptionPlan.deleteMany({
        where: { moduleId: id },
      });
      // 3. Delete the module
      return tx.subscriptionModule.delete({
        where: { id },
      });
    });
  }

  /**
   * Export modules as CSV content
   */
  static async exportModules(params: ModuleFilterParams): Promise<string> {
    const result = await this.getModules({ ...params, pageSize: 1000 });
    const headers = [
      'ID',
      'Code',
      'Name',
      'Exam',
      'Scope',
      'Module Type',
      'Access Type',
      'Status',
      'Included Features Count',
      'Updated At',
    ];

    const rows = result.items.map((m) => [
      `"${m.id}"`,
      `"${m.code}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.exam?.titleEn?.replace(/"/g, '""') || (m.scopeType === 'GLOBAL' ? 'Global' : 'None')}"`,
      `"${m.scopeType}"`,
      `"${m.moduleType}"`,
      `"${m.accessType}"`,
      `"${m.status}"`,
      `"${m.entitlements?.length || 0}"`,
      `"${m.updatedAt.toISOString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
