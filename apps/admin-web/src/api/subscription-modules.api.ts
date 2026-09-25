export type ModuleScopeType = 'ENTIRE_EXAM' | 'SELECTED_FEATURES' | 'GLOBAL';

export type SubscriptionModuleType =
  | 'FULL_EXAM'
  | 'MCQ'
  | 'STUDY_MATERIALS'
  | 'MOCK_TESTS'
  | 'CURRENT_AFFAIRS'
  | 'QUICK_REVISION'
  | 'STUDY_PLANS'
  | 'TEST_SERIES'
  | 'CUSTOM_BUNDLE';

export type ModuleAccessType = 'FREE' | 'FREEMIUM' | 'PAID';

export type ModuleStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface ModuleEntitlement {
  id?: string;
  moduleId?: string;
  featureKey: string;
  name: string;
  description?: string | null;
  examId?: string | null;
  stageId?: string | null;
  paperId?: string | null;
  subjectId?: string | null;
  enabled?: boolean;
}

export interface SubscriptionModule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  examId?: string | null;
  exam?: {
    id: string;
    titleEn: string;
    cycleCode?: string;
    cycleYear?: number;
  } | null;
  scopeType: ModuleScopeType;
  moduleType: SubscriptionModuleType;
  accessType: ModuleAccessType;
  status: ModuleStatus;
  iconUrl?: string | null;
  imageUrl?: string | null;
  features: string[];
  displayOrder: number;
  publishDate?: string | null;
  createdAt: string;
  updatedAt: string;
  entitlements: ModuleEntitlement[];
  plansCount: number;
  studentsCount: number;
}

export interface ModuleMetrics {
  totalModules: number;
  activeModules: number;
  paidModules: number;
  studentsEnrolled: number;
}

export interface CreateModulePayload {
  name: string;
  code?: string;
  description?: string;
  examId?: string | null;
  scopeType: ModuleScopeType;
  moduleType: SubscriptionModuleType;
  accessType: ModuleAccessType;
  status?: ModuleStatus;
  iconUrl?: string | null;
  imageUrl?: string | null;
  features?: string[];
  displayOrder?: number;
  publishDate?: string | null;
  entitlements: Array<{
    featureKey: string;
    name: string;
    description?: string;
    stageId?: string | null;
    paperId?: string | null;
    subjectId?: string | null;
  }>;
}

export interface UpdateModulePayload extends Partial<CreateModulePayload> {}

export interface ModuleFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  examId?: string;
  scopeType?: string;
  moduleType?: string;
  accessType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ModulesApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ModulesApiError';
  }
}

const API_BASE = '/api/v1/admin/subscriptions/modules';

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
      throw new ModulesApiError(
        errorData.error?.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ModulesApiError) {
      throw error;
    }
    throw new ModulesApiError(error.message || 'Network request failed', 0);
  }
}

export const SubscriptionModulesApi = {
  async getModules(params: ModuleFilterParams = {}): Promise<{ items: SubscriptionModule[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', String(params.page));
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.examId && params.examId !== 'ALL') searchParams.append('examId', params.examId);
    if (params.scopeType && params.scopeType !== 'ALL') searchParams.append('scopeType', params.scopeType);
    if (params.moduleType && params.moduleType !== 'ALL') searchParams.append('moduleType', params.moduleType);
    if (params.accessType && params.accessType !== 'ALL') searchParams.append('accessType', params.accessType);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const qs = searchParams.toString();
    const url = `${API_BASE}${qs ? `?${qs}` : ''}`;
    const res = await fetchWithAuth(url);
    return {
      items: res.data || [],
      pagination: res.pagination || { total: 0, page: 1, pageSize: 10, totalPages: 1 },
    };
  },

  async getMetrics(): Promise<ModuleMetrics> {
    const res = await fetchWithAuth(`${API_BASE}/metrics`);
    return res.data || { totalModules: 0, activeModules: 0, paidModules: 0, studentsEnrolled: 0 };
  },

  async getModuleById(id: string): Promise<SubscriptionModule> {
    const res = await fetchWithAuth(`${API_BASE}/${id}`);
    return res.data;
  },

  async createModule(payload: CreateModulePayload): Promise<SubscriptionModule> {
    const res = await fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateModule(id: string, payload: UpdateModulePayload): Promise<SubscriptionModule> {
    const res = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateStatus(id: string, status: ModuleStatus): Promise<SubscriptionModule> {
    const res = await fetchWithAuth(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  async archiveModule(id: string): Promise<SubscriptionModule> {
    const res = await fetchWithAuth(`${API_BASE}/${id}/archive`, {
      method: 'PATCH',
    });
    return res.data;
  },

  async deleteModule(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  },

  getExportUrl(params: ModuleFilterParams = {}): string {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.examId && params.examId !== 'ALL') searchParams.append('examId', params.examId);
    if (params.scopeType && params.scopeType !== 'ALL') searchParams.append('scopeType', params.scopeType);
    if (params.moduleType && params.moduleType !== 'ALL') searchParams.append('moduleType', params.moduleType);
    if (params.accessType && params.accessType !== 'ALL') searchParams.append('accessType', params.accessType);
    return `${API_BASE}/export?${searchParams.toString()}`;
  },
};
