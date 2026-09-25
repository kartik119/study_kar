class PlansApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'PlansApiError';
  }
}

const API_BASE_URL = '/api/v1/admin/subscriptions/plans';

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
      throw new PlansApiError(
        errorData.error?.message || errorData.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof PlansApiError) {
      throw error;
    }
    throw new PlansApiError(error.message || 'Network request failed', 0);
  }
}

export type PlanType = 'FREE' | 'FREEMIUM' | 'PAID';
export type PlanBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'ONE_TIME' | 'CUSTOM';
export type PlanDurationUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface SubscriptionPlan {
  id: string;
  moduleId: string;
  code: string;
  name: string;
  description?: string | null;
  planType: PlanType;
  price: number;
  currency: string;
  billingCycle: PlanBillingCycle;
  durationValue: number;
  durationUnit: PlanDurationUnit;
  trialEnabled: boolean;
  trialDuration?: number | null;
  trialDurationUnit?: PlanDurationUnit | null;
  autoRenewEligible: boolean;
  benefits?: string[] | null;
  status: PlanStatus;
  displayOrder: number;
  publishDate?: string | null;
  createdAt: string;
  updatedAt: string;
  subscribers?: number;
  accessSummary?: string;
  exam?: {
    id: string;
    title: string;
    code: string;
  } | null;
  module?: {
    id: string;
    name: string;
    code: string;
    scopeType: string;
    moduleType: string;
    accessType: string;
    status: string;
    features?: string[] | null;
    examId?: string | null;
    exam?: {
      id: string;
      title: string;
      code: string;
    } | null;
    entitlements?: Array<{
      id: string;
      featureKey: string;
      name: string;
      description?: string | null;
      enabled: boolean;
    }>;
  };
}

export interface PlanMetrics {
  totalPlans: number;
  activePlans: number;
  paidPlans: number;
  activeSubscribers: number;
}

export interface PlanFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  moduleId?: string;
  examId?: string;
  planType?: string;
  billingCycle?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedPlans {
  items: SubscriptionPlan[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const PlansApi = {
  getPlans: async (params: PlanFilterParams = {}): Promise<PaginatedPlans> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', String(params.page));
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
    if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
    if (params.moduleId && params.moduleId !== 'ALL') searchParams.append('moduleId', params.moduleId);
    if (params.examId && params.examId !== 'ALL') searchParams.append('examId', params.examId);
    if (params.planType && params.planType !== 'ALL') searchParams.append('planType', params.planType);
    if (params.billingCycle && params.billingCycle !== 'ALL') searchParams.append('billingCycle', params.billingCycle);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;
    const res = await fetchWithAuth(url);
    return res.data;
  },

  getPlanMetrics: async (): Promise<PlanMetrics> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/metrics`);
    return res.data;
  },

  getPlanById: async (id: string): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`);
    return res.data;
  },

  createPlan: async (data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(API_BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updatePlan: async (id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updatePlanStatus: async (id: string, status: PlanStatus): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  managePricing: async (
    id: string,
    pricing: {
      price: number;
      currency?: string;
      billingCycle: PlanBillingCycle;
      durationValue: number;
      durationUnit: PlanDurationUnit;
    }
  ): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify(pricing),
    });
    return res.data;
  },

  duplicatePlan: async (id: string): Promise<SubscriptionPlan> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}/duplicate`, {
      method: 'POST',
    });
    return res.data;
  },

  deletePlan: async (id: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  exportPlans: async (params: PlanFilterParams = {}): Promise<void> => {
    const token = localStorage.getItem('admin_token');
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.moduleId && params.moduleId !== 'ALL') searchParams.append('moduleId', params.moduleId);
    if (params.examId && params.examId !== 'ALL') searchParams.append('examId', params.examId);
    if (params.planType && params.planType !== 'ALL') searchParams.append('planType', params.planType);
    if (params.billingCycle && params.billingCycle !== 'ALL') searchParams.append('billingCycle', params.billingCycle);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);

    const queryString = searchParams.toString();
    const url = queryString ? `${API_BASE_URL}/export?${queryString}` : `${API_BASE_URL}/export`;

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export plans');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `plans-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
