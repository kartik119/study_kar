import { prisma, Prisma } from '@study-karnataka/database';
import { format } from 'date-fns';

export interface GetTransactionsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  paymentSource?: string;
  startDate?: string;
  endDate?: string;
  planId?: string;
}

export class TransactionAdminService {
  static async getMetrics() {
    // 1. Total Volume (Amount of SUCCESSFUL transactions)
    // 2. Successful Txns (Count)
    // 3. Failed Txns (Count)
    // 4. Avg. Txn Value (Amount / Count)
    
    const successfulTxns = await prisma.paymentTransaction.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { status: 'SUCCESSFUL' },
    });

    const failedTxnsCount = await prisma.paymentTransaction.count({
      where: { status: 'FAILED' },
    });

    const totalAmount = successfulTxns._sum.amount ? successfulTxns._sum.amount.toNumber() : 0;
    const successCount = successfulTxns._count.id;
    const avgAmount = successCount > 0 ? totalAmount / successCount : 0;

    // To add trend data, we would compare with a previous period, but for now just mock trend or return 0
    return {
      totalVolume: {
        value: totalAmount,
        trend: 0, 
      },
      successfulTxns: {
        value: successCount,
        trend: 0,
      },
      failedTxns: {
        value: failedTxnsCount,
        trend: 0,
      },
      avgTxnValue: {
        value: avgAmount,
        trend: 0,
      }
    };
  }

  static async getTransactions(query: GetTransactionsQuery) {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      paymentSource,
      startDate,
      endDate,
      planId
    } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: Prisma.PaymentTransactionWhereInput = {};

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { gatewayOrderId: { contains: search, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: search, mode: 'insensitive' } },
        { 
          student: {
            OR: [
              { user: { fullName: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { mobile: { contains: search, mode: 'insensitive' } } }
            ]
          }
        }
      ];
    }

    if (status) {
      where.status = status as any;
    }

    if (paymentSource) {
      where.paymentSource = paymentSource;
    }

    if (planId) {
      where.planId = planId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            include: { user: true }
          },
          subscription: {
            include: { plan: true }
          }
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map(t => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    };
  }

  static async getTransactionById(id: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true }
        },
        subscription: {
          include: { plan: true }
        }
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return {
      ...transaction,
      amount: transaction.amount.toNumber(),
    };
  }

  static async exportTransactions(query: GetTransactionsQuery) {
    const where: Prisma.PaymentTransactionWhereInput = {};
    if (query.search) {
      where.OR = [
        { transactionNumber: { contains: query.search, mode: 'insensitive' } },
        { student: { user: { fullName: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.status) {
      where.status = query.status as any;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: true } },
        subscription: { include: { plan: true } }
      }
    });

    const headers = [
      'Transaction ID',
      'Date',
      'Student Name',
      'Student Email',
      'Amount',
      'Currency',
      'Status',
      'Payment Source',
      'Gateway Order ID',
      'Gateway Payment ID',
    ];

    const rows = transactions.map(t => [
      t.transactionNumber,
      format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      t.student.user?.fullName || '',
      t.student.user?.email || '',
      t.amount.toNumber().toString(),
      t.currency,
      t.status,
      t.paymentSource || '',
      t.gatewayOrderId || '',
      t.gatewayPaymentId || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}
