class RefundsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'RefundsApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/subscriptions/refunds';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle CSV binary responses
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      if (!response.ok) throw new RefundsApiError('Export failed', response.status);
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new RefundsApiError(data.error?.message || data.message || 'API Error', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof RefundsApiError) throw error;
    throw new Error('Network error or server is down');
  }
}

export interface RefundHistory {
  id: string;
  refundId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  notes?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundNumber: string;
  studentId: string;
  subscriptionId?: string;
  transactionId: string;
  invoiceId?: string;
  refundType: 'FULL' | 'PARTIAL';
  requestedAmount: number;
  approvedAmount?: number | null;
  originalAmount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'REFUNDED' | 'REJECTED' | 'FAILED';
  reason: string;
  rejectionReason?: string;
  internalNotes?: string;
  paymentMethod?: string;
  gatewayRefundId?: string;
  failureReason?: string;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  rejectedAt?: string;
  requestedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
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
  transaction: {
    id: string;
    transactionNumber: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    status: string;
    amount: number;
    paidAt?: string;
    paymentMethod?: string;
    paymentSource?: string;
    paymentProvider?: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    finalAmount: number;
    status: string;
    invoiceDate: string;
  };
  histories?: RefundHistory[];
}

export interface RefundMetrics {
  totalRequests: { value: number; trend: number };
  approvedRefunds: { value: number; trend: number };
  pendingRefunds: { value: number; trend: number };
  totalRefundedAmount: { value: number; trend: number };
}

export interface GetRefundsParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface RequestRefundParams {
  transactionId: string;
  refundType: 'FULL' | 'PARTIAL';
  requestedAmount?: number;
  reason: string;
  internalNotes?: string;
}

export const RefundsApi = {
  async getMetrics(): Promise<RefundMetrics> {
    const res = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return res.data;
  },

  async getRefunds(params: GetRefundsParams = {}): Promise<{
    refunds: Refund[];
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

    const res = await fetchWithAuth(`${API_BASE_URL}?${query.toString()}`);
    return res.data;
  },

  async getRefundById(id: string): Promise<Refund> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`);
    return res.data;
  },

  async getRefundableAmount(transactionId: string): Promise<{
    originalAmount: number;
    totalRefunded: number;
    remainingRefundable: number;
    currency: string;
  }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/refundable-amount/${transactionId}`);
    return res.data;
  },

  async requestRefund(data: RequestRefundParams): Promise<Refund> {
    const res = await fetchWithAuth(API_BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async approveRefund(id: string): Promise<Refund> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  },

  async rejectRefund(id: string, rejectionReason: string, internalNotes?: string): Promise<Refund> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason, internalNotes }),
    });
    return res.data;
  },

  async processRefund(id: string): Promise<Refund> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/process`, {
      method: 'POST',
    });
    return res.data;
  },

  async exportRefunds(params: GetRefundsParams = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.paymentMethod && params.paymentMethod !== 'ALL') query.append('paymentMethod', params.paymentMethod);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    return fetchWithAuth(`${API_BASE_URL}/export?${query.toString()}`);
  },
};
