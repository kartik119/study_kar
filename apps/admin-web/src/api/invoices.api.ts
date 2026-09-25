class InvoicesApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'InvoicesApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/subscriptions/invoices';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle CSV or PDF binary responses
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('application/pdf')) {
      if (!response.ok) throw new InvoicesApiError('Download failed', response.status);
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new InvoicesApiError(data.error?.message || data.message || 'API Error', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof InvoicesApiError) throw error;
    throw new Error('Network error or server is down');
  }
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  itemType: string;
  quantity: number;
  unitAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  subscriptionId?: string;
  transactionId?: string;
  planId?: string;
  moduleId?: string;
  examId?: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  taxableAmount?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  totalTax?: number | null;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  paymentMethod?: string;
  paymentGateway?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  invoiceDate: string;
  pdfUrl?: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  studentNameSnapshot?: string;
  studentEmailSnapshot?: string;
  studentPhoneSnapshot?: string;
  planNameSnapshot?: string;
  moduleNameSnapshot?: string;
  examNameSnapshot?: string;
  billingPeriodSnapshot?: string;
  couponCodeSnapshot?: string;
  discountTypeSnapshot?: string;
  discountValueSnapshot?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    userId: string;
    user: {
      fullName: string;
      email: string;
      mobile: string;
    };
  };
  subscription?: {
    id: string;
    subscriptionNumber?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    plan?: {
      id: string;
      name: string;
      price: number;
      module?: {
        id: string;
        name: string;
        exam?: {
          id: string;
          titleEn: string;
        };
      };
    };
  };
  transaction?: {
    id: string;
    transactionNumber: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    status: string;
    amount: number;
  };
  items?: InvoiceItem[];
}

export interface InvoiceMetrics {
  totalInvoices: { value: number; trend: number };
  paidInvoices: { value: number; trend: number };
  pendingInvoices: { value: number; trend: number };
  failedCancelledInvoices: { value: number; trend: number };
}

export interface GetInvoicesParams {
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

export const InvoicesApi = {
  async getMetrics(): Promise<InvoiceMetrics> {
    const res = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return res.data;
  },

  async getInvoices(params: GetInvoicesParams = {}): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.paymentMethod && params.paymentMethod !== 'ALL') query.append('paymentMethod', params.paymentMethod);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.planId) query.append('planId', params.planId);
    if (params.moduleId) query.append('moduleId', params.moduleId);

    const res = await fetchWithAuth(`${API_BASE_URL}?${query.toString()}`);
    return res.data;
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`);
    return res.data;
  },

  async exportInvoices(params: GetInvoicesParams = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.paymentMethod && params.paymentMethod !== 'ALL') query.append('paymentMethod', params.paymentMethod);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    return fetchWithAuth(`${API_BASE_URL}/export?${query.toString()}`);
  },

  async downloadInvoicePdf(id: string, invoiceNumber: string): Promise<void> {
    const blob = await fetchWithAuth(`${API_BASE_URL}/${id}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async regenerateInvoicePdf(id: string): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/${id}/regenerate-pdf`, {
      method: 'POST',
    });
  },

  async generateFromTransaction(transactionId: string): Promise<Invoice> {
    const res = await fetchWithAuth(`${API_BASE_URL}/generate-from-transaction`, {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    });
    return res.data;
  },
};
