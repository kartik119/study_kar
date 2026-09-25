class SubscriptionsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'SubscriptionsApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/subscriptions/student-subscriptions';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SubscriptionsApiError(
        errorData.error?.message || errorData.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof SubscriptionsApiError) {
      throw error;
    }
    throw new SubscriptionsApiError(error.message || 'Network request failed', 0);
  }
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING'
  | 'PAUSED'
  | 'SCHEDULED';

export type PaymentStatus =
  | 'PAID'
  | 'PENDING'
  | 'NOT_REQUIRED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type AssignmentSource =
  | 'PAID_PURCHASE'
  | 'ADMIN_GRANT'
  | 'FREE_PLAN'
  | 'PROMOTION'
  | 'MIGRATION'
  | 'COMPENSATION';

export interface StudentSubscriptionItem {
  id: string;
  subscriptionNumber: string;
  status: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  startDate: string;
  endDate: string | null;
  amount: number;
  currency: string;
  autoRenew: boolean;
  assignmentSource: AssignmentSource;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
  resumeDate: string | null;
  adminNotes: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  invoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  plan: {
    id: string;
    name: string;
    code: string;
    planType: string;
    price: number;
    billingCycle: string;
    durationValue: number;
    durationUnit: string;
    autoRenewEligible: boolean;
  } | null;
  module: {
    id: string;
    name: string;
    code: string;
    scopeType: string;
    moduleType: string;
    accessType: string;
    features: string[];
    entitlements?: any[];
  } | null;
  exam: {
    id: string;
    titleEn: string;
    cycleCode?: string;
    cycleYear?: number;
  } | null;
  histories?: SubscriptionHistoryItem[];
}

export interface SubscriptionHistoryItem {
  id: string;
  subscriptionId: string;
  action: string;
  oldValue: any;
  newValue: any;
  actorType: string;
  actorId?: string | null;
  actorName?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface SubscriptionFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  moduleId?: string;
  planId?: string;
  examId?: string;
  status?: string;
  paymentStatus?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSoonSubscriptions: number;
  expiredSubscriptions: number;
  paidSubscriptions: number;
  totalRevenue: number;
}

export interface CreateSubscriptionPayload {
  studentId: string;
  planId: string;
  startDate?: string;
  endDate?: string;
  overrideExpiry?: boolean;
  overrideReason?: string;
  assignmentSource?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  autoRenew?: boolean;
  adminNotes?: string;
  allowOverlap?: boolean;
}

export interface StudentOption {
  userId: string;
  studentProfileId: string;
  fullName: string;
  email: string;
  mobile: string;
  accountStatus: string;
}

export interface PlanSelectionOption {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  planType: string;
  billingCycle: string;
  durationValue: number;
  durationUnit: string;
  autoRenewEligible: boolean;
  module: {
    id: string;
    name: string;
    code: string;
    scopeType: string;
    moduleType: string;
    accessType: string;
    exam?: {
      id: string;
      titleEn: string;
      cycleCode?: string;
    };
    features: string[];
  };
}

export const studentSubscriptionsApi = {
  async getSubscriptions(params: SubscriptionFilterParams = {}): Promise<{
    items: StudentSubscriptionItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.search) query.append('search', params.search);
    if (params.moduleId && params.moduleId !== 'ALL') query.append('moduleId', params.moduleId);
    if (params.planId && params.planId !== 'ALL') query.append('planId', params.planId);
    if (params.examId && params.examId !== 'ALL') query.append('examId', params.examId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.paymentStatus && params.paymentStatus !== 'ALL') query.append('paymentStatus', params.paymentStatus);
    if (params.startDateFrom) query.append('startDateFrom', params.startDateFrom);
    if (params.startDateTo) query.append('startDateTo', params.startDateTo);
    if (params.endDateFrom) query.append('endDateFrom', params.endDateFrom);
    if (params.endDateTo) query.append('endDateTo', params.endDateTo);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const queryString = query.toString();
    const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

    const res = await fetchWithAuth(url);
    return res.data;
  },

  async getMetrics(): Promise<SubscriptionMetrics> {
    const res = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return res.data;
  },

  async getSubscriptionById(id: string): Promise<StudentSubscriptionItem> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`);
    return res.data;
  },

  async createSubscription(payload: CreateSubscriptionPayload): Promise<StudentSubscriptionItem> {
    const res = await fetchWithAuth(API_BASE_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async renewSubscription(
    id: string,
    payload: {
      durationValue?: number;
      durationUnit?: string;
      amount?: number;
      paymentStatus?: string;
      paymentMethod?: string;
      transactionId?: string;
      reason?: string;
    }
  ): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async changePlan(
    id: string,
    payload: {
      newPlanId: string;
      recalculateExpiry?: boolean;
      reason: string;
    }
  ): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/change-plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async pauseSubscription(
    id: string,
    payload: {
      reason: string;
      resumeDate?: string;
    }
  ): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async resumeSubscription(id: string): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/resume`, {
      method: 'POST',
    });
    return res.data;
  },

  async cancelSubscription(
    id: string,
    payload: {
      immediate?: boolean;
      reason: string;
    }
  ): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async searchStudents(query: string = ''): Promise<StudentOption[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/students-search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getPlansOptions(): Promise<PlanSelectionOption[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/plans-options`);
    return res.data;
  },

  async exportSubscriptions(params: SubscriptionFilterParams = {}): Promise<void> {
    const token = localStorage.getItem('admin_token');
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.moduleId && params.moduleId !== 'ALL') query.append('moduleId', params.moduleId);
    if (params.planId && params.planId !== 'ALL') query.append('planId', params.planId);
    if (params.examId && params.examId !== 'ALL') query.append('examId', params.examId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.paymentStatus && params.paymentStatus !== 'ALL') query.append('paymentStatus', params.paymentStatus);

    const res = await fetch(`${API_BASE_URL}/export?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to export student subscriptions');
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `study-karnataka-student-subscriptions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
