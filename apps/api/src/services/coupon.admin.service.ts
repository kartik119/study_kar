import { prisma, Prisma, CouponScopeType, DiscountType, CouponStatus, CouponUsageType } from '@study-karnataka/database';
import { AppError } from '../middleware/errorHandler';

export interface CreateCouponDto {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount?: number;
  minimumOrderAmount?: number;
  scopeType: CouponScopeType;
  startDate: string;
  endDate: string;
  usageType: CouponUsageType;
  maximumUsage?: number;
  usagePerStudent: number;
  firstTimeOnly: boolean;
  isActive: boolean;
  showPublicly: boolean;
  internalNotes?: string;
  status: CouponStatus;
  applicableModules?: string[];
  applicablePlans?: string[];
}

export interface UpdateCouponDto extends Partial<CreateCouponDto> {}

export class CouponAdminService {
  static async getCoupons(query: any) {
    const {
      page = 1,
      pageSize = 10,
      search,
      discountType,
      status,
      scopeType
    } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: Prisma.CouponWhereInput = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (discountType && discountType !== 'ALL') {
      where.discountType = discountType as DiscountType;
    }

    if (status && status !== 'ALL') {
      where.status = status as CouponStatus;
    }
    
    if (scopeType && scopeType !== 'ALL') {
      where.scopeType = scopeType as CouponScopeType;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          applicableModules: { include: { module: true } },
          applicablePlans: { include: { plan: true } }
        }
      }),
      prisma.coupon.count({ where })
    ]);

    return {
      coupons,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize))
    };
  }

  static async getCouponById(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        applicableModules: { include: { module: true } },
        applicablePlans: { include: { plan: true } },
        redemptions: {
          take: 10,
          orderBy: { redeemedAt: 'desc' },
          include: { student: { include: { user: true } } }
        }
      }
    });

    if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');
    return coupon;
  }

  static async createCoupon(data: CreateCouponDto) {
    // Validate uniqueness
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() }
    });
    if (existing) throw new AppError('Coupon code already exists', 400, 'BAD_REQUEST');

    const newCoupon = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({
        data: {
          code: data.code.toUpperCase().trim(),
          name: data.name,
          description: data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          maximumDiscount: data.maximumDiscount,
          minimumOrderAmount: data.minimumOrderAmount,
          scopeType: data.scopeType,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          usageType: data.usageType,
          maximumUsage: data.maximumUsage,
          usagePerStudent: data.usagePerStudent,
          firstTimeOnly: data.firstTimeOnly,
          isActive: data.isActive,
          showPublicly: data.showPublicly,
          status: data.status,
          internalNotes: data.internalNotes,
        }
      });

      if (data.applicableModules?.length) {
        await tx.couponModule.createMany({
          data: data.applicableModules.map(moduleId => ({
            couponId: coupon.id,
            moduleId
          }))
        });
      }

      if (data.applicablePlans?.length) {
        await tx.couponPlan.createMany({
          data: data.applicablePlans.map(planId => ({
            couponId: coupon.id,
            planId
          }))
        });
      }

      return coupon;
    });

    return this.getCouponById(newCoupon.id);
  }

  static async updateCoupon(id: string, data: UpdateCouponDto) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const codeCheck = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
      if (codeCheck) throw new AppError('Coupon code already exists', 400, 'BAD_REQUEST');
    }

    return prisma.$transaction(async (tx) => {
      const updateData: any = { ...data };
      delete updateData.applicableModules;
      delete updateData.applicablePlans;

      if (updateData.code) updateData.code = updateData.code.toUpperCase().trim();
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

      await tx.coupon.update({
        where: { id },
        data: updateData
      });

      if (data.applicableModules) {
        await tx.couponModule.deleteMany({ where: { couponId: id } });
        if (data.applicableModules.length) {
          await tx.couponModule.createMany({
            data: data.applicableModules.map(moduleId => ({ couponId: id, moduleId }))
          });
        }
      }

      if (data.applicablePlans) {
        await tx.couponPlan.deleteMany({ where: { couponId: id } });
        if (data.applicablePlans.length) {
          await tx.couponPlan.createMany({
            data: data.applicablePlans.map(planId => ({ couponId: id, planId }))
          });
        }
      }

      return id;
    });

    return this.getCouponById(id);
  }

  static async deleteCoupon(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { redemptions: true } }
      }
    });

    if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

    if (coupon._count.redemptions > 0) {
      throw new AppError('Cannot hard-delete coupon with existing redemptions. Archive or deactivate it instead.', 400, 'BAD_REQUEST');
    }

    await prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  static async getMetrics() {
    const now = new Date();

    const [totalCoupons, activeCoupons, expiredCoupons, totalRedemptions] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({
        where: {
          isActive: true,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now }
        }
      }),
      prisma.coupon.count({
        where: {
          OR: [
            { endDate: { lt: now } },
            { status: 'EXPIRED' }
          ]
        }
      }),
      prisma.couponRedemption.count({
        where: { status: 'SUCCESS' }
      })
    ]);

    return {
      totalCoupons: { value: totalCoupons, trend: 0 },
      activeCoupons: { value: activeCoupons, trend: 0 },
      expiredCoupons: { value: expiredCoupons, trend: 0 },
      totalRedemptions: { value: totalRedemptions, trend: 0 }
    };
  }

  static async updateStatuses() {
    // Cron job placeholder to transition Scheduled -> Active -> Expired
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Scheduled to Active
      await tx.coupon.updateMany({
        where: {
          status: 'SCHEDULED',
          startDate: { lte: now },
          endDate: { gt: now }
        },
        data: { status: 'ACTIVE' }
      });

      // Active to Expired
      await tx.coupon.updateMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: now }
        },
        data: { status: 'EXPIRED' }
      });
    });
  }
}
