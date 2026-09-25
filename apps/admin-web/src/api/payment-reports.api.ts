// Payment Reports Frontend API Client
const API_BASE = '/api/v1/admin/subscriptions/reports';

export interface PaymentReportFilterParams {
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
  trend?: number;
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

export interface PaymentReportResponse {
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

export interface FilterOptionsResponse {
  exams: Array<{ id: string; name: string }>;
  modules: Array<{ id: string; name: string; examId: string | null }>;
  plans: Array<{ id: string; name: string; moduleId: string; price: number }>;
  statuses: Array<{ id: string; label: string }>;
  paymentMethods: Array<{ id: string; label: string }>;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  if (options.headers && (options.headers as any).Accept === 'text/csv') {
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'API Error');
  }
  return data;
}

export const PaymentReportsApi = {
  /**
   * Fetch comprehensive report summary
   */
  async getSummary(params: PaymentReportFilterParams = {}): Promise<PaymentReportResponse> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.examId && params.examId !== 'ALL') query.set('examId', params.examId);
    if (params.moduleId && params.moduleId !== 'ALL') query.set('moduleId', params.moduleId);
    if (params.planId && params.planId !== 'ALL') query.set('planId', params.planId);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.paymentMethod && params.paymentMethod !== 'ALL') query.set('paymentMethod', params.paymentMethod);

    const json = await fetchWithAuth(`${API_BASE}/summary?${query.toString()}`);
    return json.data;
  },

  /**
   * Fetch available filter dropdown options
   */
  async getFilterOptions(): Promise<FilterOptionsResponse> {
    const json = await fetchWithAuth(`${API_BASE}/filters`);
    return json.data;
  },

  /**
   * Export report CSV
   */
  async exportCSV(params: PaymentReportFilterParams = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.examId && params.examId !== 'ALL') query.set('examId', params.examId);
    if (params.moduleId && params.moduleId !== 'ALL') query.set('moduleId', params.moduleId);
    if (params.planId && params.planId !== 'ALL') query.set('planId', params.planId);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.paymentMethod && params.paymentMethod !== 'ALL') query.set('paymentMethod', params.paymentMethod);

    const token = localStorage.getItem('admin_token');
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}/export?${query.toString()}`, {
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Export failed');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-karnataka-payment-report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
