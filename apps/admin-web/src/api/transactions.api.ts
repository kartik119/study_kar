class TransactionsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'TransactionsApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/transactions';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    // For blob downloads (like export)
    if (response.headers.get('content-type')?.includes('text/csv')) {
      if (!response.ok) throw new TransactionsApiError('Export failed', response.status);
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new TransactionsApiError(data.error?.message || 'API Error', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof TransactionsApiError) throw error;
    throw new Error('Network error or server is down');
  }
}

export interface TransactionMetrics {
  totalVolume: { value: number; trend: number };
  successfulTxns: { value: number; trend: number };
  failedTxns: { value: number; trend: number };
  avgTxnValue: { value: number; trend: number };
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  studentId: string;
  subscriptionId?: string;
  planId?: string;
  moduleId?: string;
  examId?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentSource?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  failureCode?: string;
  failureReason?: string;
  invoiceId?: string;
  paidAt?: string;
  metadata?: any;
  planSnapshot?: any;
  moduleSnapshot?: any;
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
    plan?: {
      name: string;
    };
  };
}

export interface GetTransactionsParams {
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

export interface GetTransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const TransactionsApi = {
  getMetrics: async (): Promise<TransactionMetrics> => {
    const data = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return data.data;
  },

  exportTransactions: async (params?: GetTransactionsParams): Promise<Blob> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${API_BASE_URL}/export?${query}` : `${API_BASE_URL}/export`;
    const response = await fetchWithAuth(url);
    return response as unknown as Blob;
  },

  getTransactions: async (params?: GetTransactionsParams): Promise<GetTransactionsResponse> => {
    // Filter out undefined values
    const queryParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams[key] = String(value);
        }
      });
    }
    const query = new URLSearchParams(queryParams).toString();
    const url = query ? `${API_BASE_URL}?${query}` : API_BASE_URL;
    const data = await fetchWithAuth(url);
    return data.data;
  },

  getTransactionById: async (id: string): Promise<Transaction> => {
    const data = await fetchWithAuth(`${API_BASE_URL}/${id}`);
    return data.data;
  },
};
