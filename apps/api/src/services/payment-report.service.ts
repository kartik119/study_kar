import { prisma, Prisma } from '@study-karnataka/database';
import { format, subDays, differenceInDays } from 'date-fns';

export interface PaymentReportFilterQuery {
  startDate?: string;
  endDate?: string;
  examId?: string;
  moduleId?: string;
  planId?: string;
  status?: string;
  paymentMethod?: string;
}

export interface KpiMetric {
  value: number;
  formatted: string;
  previousValue?: number;
  trend?: number; // percentage change vs previous period
}

export interface RevenueTrendPoint {
  date: string;
  rawDate: string;
  revenue: number;
  refunds: number;
  netRevenue: number;
}

export interface ExamRevenueBreakdown {
  examId: string;
  examName: string;
  revenue: number;
  formattedRevenue: string;
  percentage: number;
  count: number;
}

export interface ModuleRevenueBreakdown {
  moduleId: string;
  moduleName: string;
  revenue: number;
  formattedRevenue: string;
  percentage: number;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  percentage: number;
  revenue: number;
  formattedRevenue: string;
}

export interface TransactionStatusBreakdown {
  status: string;
  label: string;
  count: number;
  percentage: number;
  amount: number;
}

export interface KeyInsight {
  id: string;
  type: 'growth' | 'exam' | 'module' | 'method' | 'refund' | 'neutral';
  badge: string;
  primaryValue: string;
  title: string;
  description: string;
}

export interface RecentTransactionItem {
  id: string;
  transactionNumber: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  moduleName: string;
  examName: string;
  amount: number;
  formattedAmount: string;
  paymentMethod: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
}

export interface PaymentReportSummaryResponse {
  kpis: {
    totalRevenue: KpiMetric;
    successfulPayments: KpiMetric;
    refundAmount: KpiMetric;
    netRevenue: KpiMetric;
  };
  revenueTrend: RevenueTrendPoint[];
  revenueByExam: ExamRevenueBreakdown[];
  revenueByModule: ModuleRevenueBreakdown[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  transactionStatusBreakdown: TransactionStatusBreakdown[];
  keyInsights: KeyInsight[];
  recentTransactions: RecentTransactionItem[];
  meta: {
    dateRange: {
      startDate: string;
      endDate: string;
      days: number;
    };
    appliedFilters: {
      examId?: string;
      moduleId?: string;
      planId?: string;
      status?: string;
      paymentMethod?: string;
    };
    generatedAt: string;
  };
}

export class PaymentReportService {
  /**
   * Format currency in Indian numbering format (₹XX,XXX)
   */
  static formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }

  /**
   * Format numbers in Indian numbering format
   */
  static formatNumber(val: number): string {
    return new Intl.NumberFormat('en-IN').format(val);
  }

  /**
   * Resolve Date Boundaries
   */
  static resolveDateBoundaries(startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDateStr) {
      start = new Date(startDateStr);
      if (isNaN(start.getTime())) {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    } else {
      // Default: start of current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (endDateStr) {
      end = new Date(endDateStr);
      if (isNaN(end.getTime())) {
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    } else {
      // Default: end of current month
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Inclusive day boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Compute previous period of identical duration
    const durationMs = end.getTime() - start.getTime() + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

    const daysCount = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));

    return {
      start,
      end,
      prevStart,
      prevEnd,
      daysCount,
      startDateFormatted: format(start, 'yyyy-MM-dd'),
      endDateFormatted: format(end, 'yyyy-MM-dd'),
    };
  }

  /**
   * Normalize payment method name for grouping
   */
  static normalizePaymentMethod(rawMethod?: string | null): string {
    if (!rawMethod) return 'Other';
    const m = rawMethod.toUpperCase().trim();
    if (m.includes('UPI')) return 'UPI';
    if (m.includes('CARD') || m.includes('VISA') || m.includes('MASTERCARD') || m.includes('RUPAY') || m.includes('DEBIT') || m.includes('CREDIT')) return 'Card';
    if (m.includes('NET') || m.includes('BANK')) return 'Net Banking';
    if (m.includes('WALLET') || m.includes('PAYTM') || m.includes('PHONEPE')) return 'Wallet';
    if (m.includes('EMI')) return 'EMI';
    return 'Other';
  }

  /**
   * Fetch master filter options (Exams, Modules, Plans)
   */
  static async getFilterOptions() {
    const [exams, modules, plans] = await Promise.all([
      prisma.examCycle.findMany({
        select: {
          id: true,
          titleEn: true,
          titleKn: true,
          cycleCode: true,
        },
        orderBy: { titleEn: 'asc' },
      }),
      prisma.subscriptionModule.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          examId: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.subscriptionPlan.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          moduleId: true,
          price: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      exams: exams.map(e => ({
        id: e.id,
        name: e.titleEn || e.cycleCode || 'Unnamed Exam',
      })),
      modules: modules.map(m => ({
        id: m.id,
        name: m.name,
        examId: m.examId,
      })),
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        moduleId: p.moduleId,
        price: p.price,
      })),
      statuses: [
        { id: 'ALL', label: 'All Status' },
        { id: 'SUCCESSFUL', label: 'Successful / Paid' },
        { id: 'PENDING', label: 'Pending' },
        { id: 'FAILED', label: 'Failed' },
        { id: 'CANCELLED', label: 'Cancelled' },
        { id: 'REFUNDED', label: 'Refunded' },
      ],
      paymentMethods: [
        { id: 'ALL', label: 'All Methods' },
        { id: 'UPI', label: 'UPI' },
        { id: 'CARD', label: 'Card' },
        { id: 'NET_BANKING', label: 'Net Banking' },
        { id: 'WALLET', label: 'Wallet' },
        { id: 'OTHER', label: 'Other' },
      ],
    };
  }

  /**
   * Generate comprehensive Payment Report
   */
  static async getPaymentReport(query: PaymentReportFilterQuery): Promise<PaymentReportSummaryResponse> {
    const { start, end, prevStart, prevEnd, daysCount, startDateFormatted, endDateFormatted } =
      this.resolveDateBoundaries(query.startDate, query.endDate);

    // 1. Preload master modules and plans for fast lookup & filtering
    const [allPlans, allModules, allExams] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        select: {
          id: true,
          name: true,
          moduleId: true,
          price: true,
        },
      }),
      prisma.subscriptionModule.findMany({
        select: {
          id: true,
          name: true,
          examId: true,
        },
      }),
      prisma.examCycle.findMany({
        select: {
          id: true,
          titleEn: true,
          cycleCode: true,
        },
      }),
    ]);

    const planMap = new Map(allPlans.map(p => [p.id, p]));
    const moduleMap = new Map(allModules.map(m => [m.id, m]));
    const examMap = new Map(allExams.map(e => [e.id, e]));

    // Determine target plan IDs based on hierarchy filters
    let targetPlanIds: string[] | null = null;
    if (query.planId && query.planId !== 'ALL') {
      targetPlanIds = [query.planId];
    } else if (query.moduleId && query.moduleId !== 'ALL') {
      targetPlanIds = allPlans.filter(p => p.moduleId === query.moduleId).map(p => p.id);
    } else if (query.examId && query.examId !== 'ALL') {
      const moduleIdsForExam = allModules.filter(m => m.examId === query.examId).map(m => m.id);
      targetPlanIds = allPlans.filter(p => moduleIdsForExam.includes(p.moduleId)).map(p => p.id);
    }

    // 2. Fetch current period transactions
    const baseWhere: Prisma.PaymentTransactionWhereInput = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (query.status && query.status !== 'ALL') {
      baseWhere.status = query.status as any;
    }

    if (query.paymentMethod && query.paymentMethod !== 'ALL') {
      baseWhere.paymentMethod = {
        contains: query.paymentMethod,
        mode: 'insensitive',
      };
    }

    const txns = await prisma.paymentTransaction.findMany({
      where: baseWhere,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
        refunds: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter transactions by hierarchy (Exam / Module / Plan) in memory with full resolution
    const filteredTxns = txns.filter(t => {
      if (!targetPlanIds) return true;
      const pId = t.planId || t.subscription?.planId;
      return pId ? targetPlanIds.includes(pId) : false;
    });

    // 3. Fetch previous period metrics for trend comparison
    const prevWhere: Prisma.PaymentTransactionWhereInput = {
      createdAt: {
        gte: prevStart,
        lte: prevEnd,
      },
      status: 'SUCCESSFUL',
    };
    if (targetPlanIds) {
      prevWhere.OR = [
        { planId: { in: targetPlanIds } },
        { subscription: { planId: { in: targetPlanIds } } },
      ];
    }
    const prevSuccessfulTxns = await prisma.paymentTransaction.findMany({
      where: prevWhere,
      select: {
        amount: true,
        refunds: {
          where: { status: 'REFUNDED' },
          select: { approvedAmount: true, requestedAmount: true },
        },
      },
    });

    const prevTotalRevenue = prevSuccessfulTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const prevSuccessfulCount = prevSuccessfulTxns.length;
    const prevRefundAmount = prevSuccessfulTxns.reduce((sum, t) => {
      const rSum = t.refunds.reduce(
        (rs, r) => rs + (r.approvedAmount ? Number(r.approvedAmount) : Number(r.requestedAmount || 0)),
        0
      );
      return sum + rSum;
    }, 0);
    const prevNetRevenue = prevTotalRevenue - prevRefundAmount;

    // 4. Calculate Current KPI Totals
    const successfulTxns = filteredTxns.filter(t => t.status === 'SUCCESSFUL');
    const totalRevenue = successfulTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const successfulPaymentsCount = successfulTxns.length;

    // Refund amount from completed refunds on matching transactions
    let refundAmount = 0;
    for (const t of filteredTxns) {
      if (t.refunds && t.refunds.length > 0) {
        for (const r of t.refunds) {
          if (r.status === 'REFUNDED') {
            const amt = r.approvedAmount ? Number(r.approvedAmount) : Number(r.requestedAmount || 0);
            refundAmount += amt;
          }
        }
      }
    }

    const netRevenue = Math.max(0, totalRevenue - refundAmount);

    // Trends computation
    const calcTrend = (curr: number, prev: number) => {
      if (prev <= 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const kpis = {
      totalRevenue: {
        value: totalRevenue,
        formatted: this.formatINR(totalRevenue),
        previousValue: prevTotalRevenue,
        trend: calcTrend(totalRevenue, prevTotalRevenue),
      },
      successfulPayments: {
        value: successfulPaymentsCount,
        formatted: this.formatNumber(successfulPaymentsCount),
        previousValue: prevSuccessfulCount,
        trend: calcTrend(successfulPaymentsCount, prevSuccessfulCount),
      },
      refundAmount: {
        value: refundAmount,
        formatted: this.formatINR(refundAmount),
        previousValue: prevRefundAmount,
        trend: calcTrend(refundAmount, prevRefundAmount),
      },
      netRevenue: {
        value: netRevenue,
        formatted: this.formatINR(netRevenue),
        previousValue: prevNetRevenue,
        trend: calcTrend(netRevenue, prevNetRevenue),
      },
    };

    // 5. Build Revenue Trend Series
    const trendMap = new Map<string, { revenue: number; refunds: number; netRevenue: number; label: string }>();

    // Determine interval: Daily (<= 31 days), Weekly (32-90 days), Monthly (> 90 days)
    const isDaily = daysCount <= 31;
    const isMonthly = daysCount > 90;

    // Initialize all interval buckets so there are no gaps
    const iterDate = new Date(start);
    while (iterDate <= end) {
      let key = '';
      let label = '';

      if (isDaily) {
        key = format(iterDate, 'yyyy-MM-dd');
        label = format(iterDate, 'dd MMM');
        iterDate.setDate(iterDate.getDate() + 1);
      } else if (isMonthly) {
        key = format(iterDate, 'yyyy-MM');
        label = format(iterDate, 'MMM yyyy');
        iterDate.setMonth(iterDate.getMonth() + 1);
      } else {
        // Weekly
        const weekNum = format(iterDate, 'yyyy-ww');
        key = weekNum;
        label = `Wk ${format(iterDate, 'dd MMM')}`;
        iterDate.setDate(iterDate.getDate() + 7);
      }

      if (!trendMap.has(key)) {
        trendMap.set(key, { revenue: 0, refunds: 0, netRevenue: 0, label });
      }
    }

    // Populate trend buckets from transactions
    for (const t of filteredTxns) {
      const tDate = new Date(t.paidAt || t.createdAt);
      let key = '';
      if (isDaily) {
        key = format(tDate, 'yyyy-MM-dd');
      } else if (isMonthly) {
        key = format(tDate, 'yyyy-MM');
      } else {
        key = format(tDate, 'yyyy-ww');
      }

      const bucket = trendMap.get(key);
      if (bucket) {
        if (t.status === 'SUCCESSFUL') {
          const amt = Number(t.amount || 0);
          bucket.revenue += amt;
          bucket.netRevenue += amt;
        }

        if (t.refunds) {
          for (const r of t.refunds) {
            if (r.status === 'REFUNDED') {
              const rAmt = r.approvedAmount ? Number(r.approvedAmount) : Number(r.requestedAmount || 0);
              bucket.refunds += rAmt;
              bucket.netRevenue -= rAmt;
            }
          }
        }
      }
    }

    const revenueTrend: RevenueTrendPoint[] = Array.from(trendMap.entries()).map(([rawDate, b]) => ({
      date: b.label,
      rawDate,
      revenue: Math.round(b.revenue),
      refunds: Math.round(b.refunds),
      netRevenue: Math.max(0, Math.round(b.netRevenue)),
    }));

    // 6. Revenue by Exam
    const examMapRevenue = new Map<string, { examName: string; revenue: number; count: number }>();
    let unassignedExamRevenue = 0;
    let unassignedExamCount = 0;

    for (const t of successfulTxns) {
      const pId = t.planId || t.subscription?.planId;
      const plan = pId ? planMap.get(pId) : null;
      const mod = plan?.moduleId ? moduleMap.get(plan.moduleId) : null;
      const exam = mod?.examId ? examMap.get(mod.examId) : null;

      const amt = Number(t.amount || 0);

      if (exam) {
        const entry = examMapRevenue.get(exam.id) || {
          examName: exam.titleEn || exam.cycleCode || 'Exam',
          revenue: 0,
          count: 0,
        };
        entry.revenue += amt;
        entry.count += 1;
        examMapRevenue.set(exam.id, entry);
      } else {
        unassignedExamRevenue += amt;
        unassignedExamCount += 1;
      }
    }

    const revenueByExam: ExamRevenueBreakdown[] = Array.from(examMapRevenue.entries()).map(([examId, data]) => ({
      examId,
      examName: data.examName,
      revenue: Math.round(data.revenue),
      formattedRevenue: this.formatINR(data.revenue),
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      count: data.count,
    }));

    if (unassignedExamRevenue > 0) {
      revenueByExam.push({
        examId: 'other',
        examName: 'Other / General',
        revenue: Math.round(unassignedExamRevenue),
        formattedRevenue: this.formatINR(unassignedExamRevenue),
        percentage: totalRevenue > 0 ? Math.round((unassignedExamRevenue / totalRevenue) * 100) : 0,
        count: unassignedExamCount,
      });
    }

    revenueByExam.sort((a, b) => b.revenue - a.revenue);

    // 7. Revenue by Module
    const moduleMapRevenue = new Map<string, { moduleName: string; revenue: number; count: number }>();
    let unassignedModuleRevenue = 0;
    let unassignedModuleCount = 0;

    for (const t of successfulTxns) {
      const pId = t.planId || t.subscription?.planId;
      const plan = pId ? planMap.get(pId) : null;
      const mod = plan?.moduleId ? moduleMap.get(plan.moduleId) : null;

      const amt = Number(t.amount || 0);

      if (mod) {
        const entry = moduleMapRevenue.get(mod.id) || {
          moduleName: mod.name,
          revenue: 0,
          count: 0,
        };
        entry.revenue += amt;
        entry.count += 1;
        moduleMapRevenue.set(mod.id, entry);
      } else {
        unassignedModuleRevenue += amt;
        unassignedModuleCount += 1;
      }
    }

    const revenueByModule: ModuleRevenueBreakdown[] = Array.from(moduleMapRevenue.entries()).map(([moduleId, data]) => ({
      moduleId,
      moduleName: data.moduleName,
      revenue: Math.round(data.revenue),
      formattedRevenue: this.formatINR(data.revenue),
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      count: data.count,
    }));

    if (unassignedModuleRevenue > 0) {
      revenueByModule.push({
        moduleId: 'other',
        moduleName: 'Other / Direct',
        revenue: Math.round(unassignedModuleRevenue),
        formattedRevenue: this.formatINR(unassignedModuleRevenue),
        percentage: totalRevenue > 0 ? Math.round((unassignedModuleRevenue / totalRevenue) * 100) : 0,
        count: unassignedModuleCount,
      });
    }

    revenueByModule.sort((a, b) => b.revenue - a.revenue);

    // 8. Payment Method Breakdown
    const methodMap = new Map<string, { count: number; revenue: number }>();
    for (const t of filteredTxns) {
      const norm = this.normalizePaymentMethod(t.paymentMethod);
      const entry = methodMap.get(norm) || { count: 0, revenue: 0 };
      entry.count += 1;
      if (t.status === 'SUCCESSFUL') {
        entry.revenue += Number(t.amount || 0);
      }
      methodMap.set(norm, entry);
    }

    const totalTxnCount = filteredTxns.length;
    const paymentMethodBreakdown: PaymentMethodBreakdown[] = Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        percentage: totalTxnCount > 0 ? Math.round((data.count / totalTxnCount) * 100) : 0,
        revenue: Math.round(data.revenue),
        formattedRevenue: this.formatINR(data.revenue),
      }))
      .sort((a, b) => b.count - a.count);

    // 9. Transaction Status Breakdown
    const statusMap = new Map<string, { count: number; amount: number }>();
    for (const t of filteredTxns) {
      const st = t.status || 'OTHER';
      const entry = statusMap.get(st) || { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(t.amount || 0);
      statusMap.set(st, entry);
    }

    const statusLabels: Record<string, string> = {
      SUCCESSFUL: 'Successful',
      PENDING: 'Pending',
      FAILED: 'Failed',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    };

    const transactionStatusBreakdown: TransactionStatusBreakdown[] = Array.from(statusMap.entries()).map(([st, data]) => ({
      status: st,
      label: statusLabels[st] || st,
      count: data.count,
      percentage: totalTxnCount > 0 ? Math.round((data.count / totalTxnCount) * 100) : 0,
      amount: Math.round(data.amount),
    }));

    // 10. Generate Deterministic Key Insights (3-5 factual insights)
    const keyInsights: KeyInsight[] = [];

    if (totalTxnCount === 0) {
      keyInsights.push({
        id: 'no-data',
        type: 'neutral',
        badge: 'No Data',
        primaryValue: '0 Txns',
        title: 'Insufficient Data',
        description: 'Not enough payment data to generate insights for this period.',
      });
    } else {
      // 1. Revenue comparison insight
      if (kpis.totalRevenue.trend !== undefined) {
        const trendVal = kpis.totalRevenue.trend;
        if (trendVal > 0) {
          keyInsights.push({
            id: 'revenue-trend-up',
            type: 'growth',
            badge: `↑ ${trendVal}%`,
            primaryValue: `+${trendVal}%`,
            title: 'Revenue Growth',
            description: `Revenue increased by ${trendVal}% compared to previous period.`,
          });
        } else if (trendVal < 0) {
          keyInsights.push({
            id: 'revenue-trend-down',
            type: 'growth',
            badge: `↓ ${Math.abs(trendVal)}%`,
            primaryValue: `${trendVal}%`,
            title: 'Revenue Dip',
            description: `Revenue decreased by ${Math.abs(trendVal)}% compared to previous period.`,
          });
        }
      }

      // 2. Highest Revenue Exam
      if (revenueByExam.length > 0 && revenueByExam[0].revenue > 0) {
        const topExam = revenueByExam[0];
        keyInsights.push({
          id: 'top-exam',
          type: 'exam',
          badge: `${topExam.percentage}%`,
          primaryValue: topExam.examName,
          title: 'Top Generating Exam',
          description: `${topExam.examName} contributed ${topExam.percentage}% (${topExam.formattedRevenue}) of total revenue.`,
        });
      }

      // 3. Highest Revenue Module
      if (revenueByModule.length > 0 && revenueByModule[0].revenue > 0) {
        const topMod = revenueByModule[0];
        keyInsights.push({
          id: 'top-module',
          type: 'module',
          badge: topMod.formattedRevenue,
          primaryValue: topMod.moduleName,
          title: 'Leading Module',
          description: `${topMod.moduleName} is the top subscription module with ${topMod.count} sales.`,
        });
      }

      // 4. Most Used Payment Method
      if (paymentMethodBreakdown.length > 0) {
        const topMethod = paymentMethodBreakdown[0];
        keyInsights.push({
          id: 'top-method',
          type: 'method',
          badge: `${topMethod.percentage}%`,
          primaryValue: topMethod.method,
          title: 'Preferred Payment Method',
          description: `${topMethod.method} is the most-used payment method with ${topMethod.count} transactions.`,
        });
      }

      // 5. Refunds Summary
      if (refundAmount > 0) {
        const refundRate = totalRevenue > 0 ? Math.round((refundAmount / totalRevenue) * 100) : 0;
        keyInsights.push({
          id: 'refund-summary',
          type: 'refund',
          badge: `₹${this.formatNumber(refundAmount)}`,
          primaryValue: `${refundRate}%`,
          title: 'Refund Processing',
          description: `₹${this.formatNumber(refundAmount)} total refunded (${refundRate}% refund rate).`,
        });
      } else {
        keyInsights.push({
          id: 'zero-refunds',
          type: 'refund',
          badge: '0 Refunds',
          primaryValue: '100% Retained',
          title: 'Zero Refunds',
          description: 'No refunds were processed during this reporting period.',
        });
      }
    }

    // 11. Recent Transactions (Last 10)
    const recentTransactions: RecentTransactionItem[] = filteredTxns.slice(0, 10).map(t => {
      const pId = t.planId || t.subscription?.planId;
      const plan = pId ? planMap.get(pId) : null;
      const mod = plan?.moduleId ? moduleMap.get(plan.moduleId) : null;
      const exam = mod?.examId ? examMap.get(mod.examId) : null;

      const amt = Number(t.amount || 0);

      return {
        id: t.id,
        transactionNumber: t.transactionNumber,
        studentName: t.student?.user?.fullName || 'Student',
        studentEmail: t.student?.user?.email || '—',
        planName: plan?.name || 'Subscription Plan',
        moduleName: mod?.name || 'General Module',
        examName: exam?.titleEn || 'Competitive Exam',
        amount: amt,
        formattedAmount: this.formatINR(amt),
        paymentMethod: t.paymentMethod || 'UPI',
        status: t.status,
        paidAt: t.paidAt ? format(new Date(t.paidAt), 'dd MMM yyyy, hh:mm a') : null,
        createdAt: format(new Date(t.createdAt), 'dd MMM yyyy, hh:mm a'),
        invoiceId: t.invoice?.id || null,
        invoiceNumber: t.invoice?.invoiceNumber || null,
      };
    });

    return {
      kpis,
      revenueTrend,
      revenueByExam,
      revenueByModule,
      paymentMethodBreakdown,
      transactionStatusBreakdown,
      keyInsights,
      recentTransactions,
      meta: {
        dateRange: {
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          days: daysCount,
        },
        appliedFilters: {
          examId: query.examId,
          moduleId: query.moduleId,
          planId: query.planId,
          status: query.status,
          paymentMethod: query.paymentMethod,
        },
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Export Payment Report as CSV
   */
  static async exportReportCSV(query: PaymentReportFilterQuery): Promise<string> {
    const report = await this.getPaymentReport(query);

    const lines: string[] = [];

    // 1. Report Header
    lines.push('STUDY KARNATAKA - PAYMENT & REVENUE REPORT');
    lines.push(`Generated At,${new Date().toLocaleString('en-IN')}`);
    lines.push(`Reporting Period,"${report.meta.dateRange.startDate} to ${report.meta.dateRange.endDate}"`);
    lines.push(`Applied Filters,"Exam: ${query.examId || 'All'}, Module: ${query.moduleId || 'All'}, Plan: ${query.planId || 'All'}, Status: ${query.status || 'All'}, Method: ${query.paymentMethod || 'All'}"`);
    lines.push('');

    // 2. Financial KPI Summary
    lines.push('--- FINANCIAL KPI SUMMARY ---');
    lines.push('Metric,Value,Previous Period,Trend');
    lines.push(`Total Revenue,${report.kpis.totalRevenue.formatted},${report.kpis.totalRevenue.previousValue || 0},${report.kpis.totalRevenue.trend || 0}%`);
    lines.push(`Successful Payments,${report.kpis.successfulPayments.formatted},${report.kpis.successfulPayments.previousValue || 0},${report.kpis.successfulPayments.trend || 0}%`);
    lines.push(`Refund Amount,${report.kpis.refundAmount.formatted},${report.kpis.refundAmount.previousValue || 0},${report.kpis.refundAmount.trend || 0}%`);
    lines.push(`Net Revenue,${report.kpis.netRevenue.formatted},${report.kpis.netRevenue.previousValue || 0},${report.kpis.netRevenue.trend || 0}%`);
    lines.push('');

    // 3. Revenue by Exam
    lines.push('--- REVENUE BY EXAM ---');
    lines.push('Exam,Revenue (INR),Percentage,Transactions');
    for (const ex of report.revenueByExam) {
      lines.push(`"${ex.examName}",${ex.revenue},${ex.percentage}%,${ex.count}`);
    }
    lines.push('');

    // 4. Revenue by Module
    lines.push('--- REVENUE BY MODULE ---');
    lines.push('Module,Revenue (INR),Percentage,Transactions');
    for (const mod of report.revenueByModule) {
      lines.push(`"${mod.moduleName}",${mod.revenue},${mod.percentage}%,${mod.count}`);
    }
    lines.push('');

    // 5. Payment Methods
    lines.push('--- PAYMENT METHOD BREAKDOWN ---');
    lines.push('Method,Transactions,Percentage,Revenue (INR)');
    for (const pm of report.paymentMethodBreakdown) {
      lines.push(`"${pm.method}",${pm.count},${pm.percentage}%,${pm.revenue}`);
    }
    lines.push('');

    // 6. Transaction Status
    lines.push('--- TRANSACTION STATUS BREAKDOWN ---');
    lines.push('Status,Count,Percentage,Total Amount (INR)');
    for (const st of report.transactionStatusBreakdown) {
      lines.push(`"${st.label}",${st.count},${st.percentage}%,${st.amount}`);
    }
    lines.push('');

    // 7. Recent Transactions List
    lines.push('--- DETAILED TRANSACTIONS ---');
    lines.push('Transaction Number,Date,Student Name,Student Email,Plan,Module,Exam,Amount (INR),Payment Method,Status,Invoice Number');
    for (const t of report.recentTransactions) {
      lines.push(
        `"${t.transactionNumber}","${t.paidAt || t.createdAt}","${t.studentName}","${t.studentEmail}","${t.planName}","${t.moduleName}","${t.examName}",${t.amount},"${t.paymentMethod}","${t.status}","${t.invoiceNumber || '—'}"`
      );
    }

    return lines.join('\n');
  }
}
