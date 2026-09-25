import { prisma, Prisma, RefundStatus, RefundType } from '@study-karnataka/database';
import { format } from 'date-fns';

export interface GetRefundsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  planId?: string;
  moduleId?: string;
}

export interface RequestRefundInput {
  transactionId: string;
  refundType: 'FULL' | 'PARTIAL';
  requestedAmount?: number;
  reason: string;
  internalNotes?: string;
  requestedBy?: string;
}

export class RefundAdminService {
  /**
   * Helper to format currency
   */
  static formatCurrency(amount: number | string | Prisma.Decimal): string {
    const num = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Generate unique human-readable refund number: REF-YYYYMMDD-XXXXXX
   */
  static generateRefundNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `REF-${year}${month}${day}-${randomHex}`;
  }

  /**
   * Calculate Remaining Refundable Amount for a Transaction
   * - Based on actual paid amount (after any coupon discount)
   * - Deducts already successfully refunded amounts
   */
  static async calculateRemainingRefundableAmount(transactionId: string): Promise<{
    originalAmount: number;
    totalRefunded: number;
    remainingRefundable: number;
    currency: string;
  }> {
    const txn = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        refunds: {
          where: { status: 'REFUNDED' },
        },
      },
    });

    if (!txn) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const originalAmount = txn.amount.toNumber();
    const totalRefunded = txn.refunds.reduce((sum, r) => {
      const amt = r.approvedAmount ? r.approvedAmount.toNumber() : r.requestedAmount.toNumber();
      return sum + amt;
    }, 0);

    const remainingRefundable = Math.max(0, originalAmount - totalRefunded);

    return {
      originalAmount,
      totalRefunded,
      remainingRefundable,
      currency: txn.currency || 'INR',
    };
  }

  /**
   * KPI Metrics
   * 1. Total Refund Requests (count all refund records)
   * 2. Approved Refunds (count approved and completed refunds)
   * 3. Pending Refunds (count requests waiting)
   * 4. Total Refunded Amount (sum only successfully refunded amounts)
   */
  static async getMetrics() {
    const [totalRequests, approvedCount, pendingCount, refundedAgg] = await Promise.all([
      prisma.refund.count(),
      prisma.refund.count({ where: { status: { in: ['APPROVED', 'REFUNDED'] } } }),
      prisma.refund.count({ where: { status: 'PENDING' } }),
      prisma.refund.aggregate({
        _sum: { approvedAmount: true, requestedAmount: true },
        where: { status: 'REFUNDED' },
      }),
    ]);

    const totalRefundedAmount = refundedAgg._sum.approvedAmount
      ? refundedAgg._sum.approvedAmount.toNumber()
      : refundedAgg._sum.requestedAmount
      ? refundedAgg._sum.requestedAmount.toNumber()
      : 0;

    return {
      totalRequests: { value: totalRequests, trend: 0 },
      approvedRefunds: { value: approvedCount, trend: 0 },
      pendingRefunds: { value: pendingCount, trend: 0 },
      totalRefundedAmount: { value: totalRefundedAmount, trend: 0 },
    };
  }

  /**
   * List Refunds with filters, search, and pagination
   */
  static async getRefunds(query: GetRefundsQuery) {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'requestedAt',
      sortOrder = 'desc',
      search,
      status,
      paymentMethod,
      startDate,
      endDate,
    } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: Prisma.RefundWhereInput = {};

    // Search support:
    // Refund ID, Student Name, Student Email, Invoice Number, Transaction ID, Subscription ID, Plan Name, Module Name
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { refundNumber: { contains: term, mode: 'insensitive' } },
        { gatewayRefundId: { contains: term, mode: 'insensitive' } },
        {
          student: {
            user: {
              OR: [
                { fullName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { mobile: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          transaction: {
            OR: [
              { transactionNumber: { contains: term, mode: 'insensitive' } },
              { gatewayPaymentId: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
        {
          invoice: {
            invoiceNumber: { contains: term, mode: 'insensitive' },
          },
        },
        {
          subscription: {
            OR: [
              { subscriptionNumber: { contains: term, mode: 'insensitive' } },
              { plan: { name: { contains: term, mode: 'insensitive' } } },
              { plan: { module: { name: { contains: term, mode: 'insensitive' } } } },
            ],
          },
        },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status as RefundStatus;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) {
        where.requestedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        where.requestedAt.lte = endD;
      }
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            include: { user: true },
          },
          subscription: {
            include: {
              plan: {
                include: {
                  module: {
                    include: { exam: true },
                  },
                },
              },
            },
          },
          transaction: true,
          invoice: true,
          histories: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    return {
      refunds: refunds.map(r => ({
        ...r,
        requestedAmount: r.requestedAmount.toNumber(),
        approvedAmount: r.approvedAmount ? r.approvedAmount.toNumber() : null,
        originalAmount: r.originalAmount.toNumber(),
        histories: r.histories.map(h => ({ ...h })),
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)) || 1,
    };
  }

  /**
   * Get single Refund by ID with complete relationships
   */
  static async getRefundById(id: string) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true },
        },
        subscription: {
          include: {
            plan: {
              include: {
                module: {
                  include: { exam: true },
                },
              },
            },
          },
        },
        transaction: true,
        invoice: true,
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!refund) return null;

    return {
      ...refund,
      requestedAmount: refund.requestedAmount.toNumber(),
      approvedAmount: refund.approvedAmount ? refund.approvedAmount.toNumber() : null,
      originalAmount: refund.originalAmount.toNumber(),
    };
  }

  /**
   * Request / Initiate Refund
   */
  static async requestRefund(input: RequestRefundInput, actor?: { id: string; name: string }) {
    const { transactionId, refundType, reason, internalNotes, requestedBy = 'STUDENT' } = input;

    if (!reason || !reason.trim()) {
      throw new Error('Refund reason is required');
    }

    const txn = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        subscription: true,
        invoice: true,
      },
    });

    if (!txn) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const { originalAmount, remainingRefundable, currency } =
      await this.calculateRemainingRefundableAmount(transactionId);

    if (remainingRefundable <= 0) {
      throw new Error('This transaction has already been fully refunded');
    }

    let finalRequestedAmount = 0;
    if (refundType === 'FULL') {
      finalRequestedAmount = remainingRefundable;
    } else {
      if (!input.requestedAmount || Number(input.requestedAmount) <= 0) {
        throw new Error('A valid refund amount greater than 0 is required for partial refunds');
      }
      if (Number(input.requestedAmount) > remainingRefundable) {
        throw new Error(
          `Requested refund amount (₹${input.requestedAmount}) cannot exceed remaining refundable amount (₹${remainingRefundable})`
        );
      }
      finalRequestedAmount = Number(input.requestedAmount);
    }

    const refundNumber = this.generateRefundNumber();

    return prisma.$transaction(async tx => {
      const newRefund = await tx.refund.create({
        data: {
          refundNumber,
          studentId: txn.studentId,
          subscriptionId: txn.subscriptionId,
          transactionId: txn.id,
          invoiceId: txn.invoiceId || txn.invoice?.id,
          refundType: refundType as RefundType,
          requestedAmount: new Prisma.Decimal(finalRequestedAmount),
          originalAmount: new Prisma.Decimal(originalAmount),
          currency,
          status: RefundStatus.PENDING,
          reason: reason.trim(),
          internalNotes: internalNotes?.trim() || null,
          paymentMethod: txn.paymentMethod || txn.paymentSource || 'UPI',
          requestedBy,
          histories: {
            create: [
              {
                action: 'REFUND_REQUESTED',
                newStatus: RefundStatus.PENDING,
                actorType: actor ? 'ADMIN' : 'STUDENT',
                actorId: actor?.id,
                actorName: actor?.name || requestedBy,
                notes: `Refund requested for ${refundType === 'FULL' ? 'Full' : 'Partial'} amount ₹${finalRequestedAmount}`,
              },
            ],
          },
        },
        include: { histories: true },
      });

      return newRefund;
    });
  }

  /**
   * Approve Refund
   * - Records approval details
   * - Can transition directly to process if desired
   */
  static async approveRefund(id: string, actor: { id: string; name: string }) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: { transaction: true },
    });

    if (!refund) {
      throw new Error(`Refund with ID ${id} not found`);
    }

    if (refund.status !== 'PENDING') {
      throw new Error(`Only PENDING refunds can be approved. Current status: ${refund.status}`);
    }

    return prisma.$transaction(async tx => {
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: actor.name || actor.id,
          approvedAmount: refund.requestedAmount,
          histories: {
            create: [
              {
                action: 'REFUND_APPROVED',
                previousStatus: RefundStatus.PENDING,
                newStatus: RefundStatus.APPROVED,
                actorType: 'ADMIN',
                actorId: actor.id,
                actorName: actor.name,
                notes: `Refund approved for amount ₹${refund.requestedAmount.toNumber()}`,
              },
            ],
          },
        },
        include: { histories: true },
      });

      return updated;
    });
  }

  /**
   * Reject Refund
   * - Requires rejection reason
   * - Sets status to REJECTED without altering transaction money
   */
  static async rejectRefund(
    id: string,
    rejectionReason: string,
    internalNotes: string | undefined,
    actor: { id: string; name: string }
  ) {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('Rejection reason is mandatory to reject a refund request');
    }

    const refund = await prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new Error(`Refund with ID ${id} not found`);
    }

    if (refund.status !== 'PENDING') {
      throw new Error(`Only PENDING refunds can be rejected. Current status: ${refund.status}`);
    }

    return prisma.$transaction(async tx => {
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
          internalNotes: internalNotes?.trim() || refund.internalNotes,
          rejectedAt: new Date(),
          rejectedBy: actor.name || actor.id,
          histories: {
            create: [
              {
                action: 'REFUND_REJECTED',
                previousStatus: RefundStatus.PENDING,
                newStatus: RefundStatus.REJECTED,
                actorType: 'ADMIN',
                actorId: actor.id,
                actorName: actor.name,
                notes: `Rejection reason: ${rejectionReason.trim()}`,
              },
            ],
          },
        },
        include: { histories: true },
      });

      return updated;
    });
  }

  /**
   * Process Refund
   * - Idempotent (prevents double refunding)
   * - Updates transaction status (PARTIALLY_REFUNDED or REFUNDED)
   * - Preserves historical transaction and invoice amounts
   * - Subscription access is NOT silently cancelled (remains separate)
   */
  static async processRefund(
    id: string,
    actor: { id: string; name: string },
    options: { gatewayRefundId?: string; simulatedFailure?: boolean; failureReason?: string } = {}
  ) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            refunds: {
              where: { status: 'REFUNDED' },
            },
          },
        },
        invoice: true,
      },
    });

    if (!refund) {
      throw new Error(`Refund with ID ${id} not found`);
    }

    // Idempotency: If already REFUNDED, return without repeating
    if (refund.status === 'REFUNDED') {
      return refund;
    }

    if (refund.status === 'REJECTED') {
      throw new Error('A rejected refund request cannot be processed');
    }

    // If simulated gateway failure was requested
    if (options.simulatedFailure) {
      return prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.FAILED,
          failureReason: options.failureReason || 'Payment gateway rejected refund processing',
          histories: {
            create: [
              {
                action: 'REFUND_FAILED',
                previousStatus: refund.status,
                newStatus: RefundStatus.FAILED,
                actorType: 'GATEWAY',
                notes: options.failureReason || 'Gateway refund failure',
              },
            ],
          },
        },
        include: { histories: true },
      });
    }

    const refundAmount = refund.approvedAmount
      ? refund.approvedAmount.toNumber()
      : refund.requestedAmount.toNumber();

    const txn = refund.transaction;
    const previousRefundsTotal = txn.refunds.reduce(
      (sum, r) => sum + (r.approvedAmount ? r.approvedAmount.toNumber() : r.requestedAmount.toNumber()),
      0
    );

    const newTotalRefunded = previousRefundsTotal + refundAmount;
    const isFullRefund = newTotalRefunded >= txn.amount.toNumber();

    return prisma.$transaction(async tx => {
      // 1. Mark refund record as REFUNDED
      const updatedRefund = await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.REFUNDED,
          approvedAmount: new Prisma.Decimal(refundAmount),
          processedAt: new Date(),
          gatewayRefundId: options.gatewayRefundId || `rfnd_${Date.now()}`,
          histories: {
            create: [
              {
                action: 'REFUND_COMPLETED',
                previousStatus: refund.status,
                newStatus: RefundStatus.REFUNDED,
                actorType: 'ADMIN',
                actorId: actor.id,
                actorName: actor.name,
                notes: `Successfully processed refund of ₹${refundAmount} (${isFullRefund ? 'Full' : 'Partial'})`,
              },
            ],
          },
        },
        include: { histories: true },
      });

      // 2. Update PaymentTransaction refund status (without touching original payment amount)
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      // 3. Update Invoice related status if invoice exists (without modifying historical issued total)
      if (refund.invoiceId) {
        await tx.invoice.update({
          where: { id: refund.invoiceId },
          data: {
            status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          },
        });
      }

      return updatedRefund;
    });
  }

  /**
   * Export Refunds to CSV (Section 57)
   */
  static async exportRefunds(query: GetRefundsQuery): Promise<string> {
    const result = await this.getRefunds({ ...query, page: 1, pageSize: 10000 });
    const refunds = result.refunds;

    const headers = [
      'Refund ID',
      'Student Name',
      'Student Email',
      'Invoice Number',
      'Transaction ID',
      'Subscription ID',
      'Plan',
      'Module',
      'Exam',
      'Original Amount',
      'Refund Amount',
      'Refund Type',
      'Refund Method',
      'Refund Status',
      'Reason',
      'Requested Date',
      'Processed Date',
    ];

    const rows = refunds.map(r => {
      const studentName = r.student?.user?.fullName || '';
      const studentEmail = r.student?.user?.email || '';
      const invNum = r.invoice?.invoiceNumber || '';
      const txnNum = r.transaction?.transactionNumber || '';
      const subNum = r.subscription?.subscriptionNumber || '';
      const planName = r.subscription?.plan?.name || '';
      const modName = r.subscription?.plan?.module?.name || '';
      const examName = r.subscription?.plan?.module?.exam?.titleEn || '';
      const reqAmt = r.approvedAmount ?? r.requestedAmount;
      const reqDate = r.requestedAt ? format(new Date(r.requestedAt), 'yyyy-MM-dd HH:mm:ss') : '';
      const procDate = r.processedAt ? format(new Date(r.processedAt), 'yyyy-MM-dd HH:mm:ss') : '';

      return [
        `"${r.refundNumber}"`,
        `"${studentName}"`,
        `"${studentEmail}"`,
        `"${invNum}"`,
        `"${txnNum}"`,
        `"${subNum}"`,
        `"${planName}"`,
        `"${modName}"`,
        `"${examName}"`,
        r.originalAmount,
        reqAmt,
        `"${r.refundType}"`,
        `"${r.paymentMethod || ''}"`,
        `"${r.status}"`,
        `"${r.reason ? r.reason.replace(/"/g, '""') : ''}"`,
        `"${reqDate}"`,
        `"${procDate}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
