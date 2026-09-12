import {
  RankedTestResponse,
  RankedTestMode,
  RankedTestStatus,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/mcq-library/ranked-tests';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token') || 'dev_access_token_secret_key_2026';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options?.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || data.message || 'API Request Failed');
  }

  return data.data;
}

export const RankedTestApi = {
  getNextRankedCodePreview: async (): Promise<{ code: string; seqNumber: number }> => {
    return fetchJson(`${API_BASE}/next-code`);
  },

  getRankedTestList: async (params?: {
    search?: string;
    mode?: RankedTestMode;
    status?: RankedTestStatus;
    examCycleId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: RankedTestResponse[]; meta: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.mode) query.set('mode', params.mode);
    if (params?.status) query.set('status', params.status);
    if (params?.examCycleId) query.set('examCycleId', params.examCycleId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));

    const token = localStorage.getItem('admin_token') || 'dev_access_token_secret_key_2026';
    const res = await fetch(`${API_BASE}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to fetch Ranked Tests list');
    }
    return { items: data.data, meta: data.meta };
  },

  getRankedTestById: async (id: string): Promise<RankedTestResponse> => {
    return fetchJson(`${API_BASE}/${id}`);
  },

  getEligiblePublishedTests: async (): Promise<any[]> => {
    const token = localStorage.getItem('admin_token') || 'dev_access_token_secret_key_2026';
    const res = await fetch(`/api/v1/admin/mcq-library/tests?status=PUBLISHED&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to fetch published candidate tests');
    }
    return data.data;
  },

  createRankedTest: async (payload: any): Promise<RankedTestResponse> => {
    return fetchJson(`${API_BASE}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  activateRankedTest: async (id: string): Promise<RankedTestResponse> => {
    return fetchJson(`${API_BASE}/${id}/activate`, { method: 'POST' });
  },

  closeRankedTest: async (id: string): Promise<RankedTestResponse> => {
    return fetchJson(`${API_BASE}/${id}/close`, { method: 'POST' });
  },

  generateRankings: async (id: string): Promise<any> => {
    return fetchJson(`${API_BASE}/${id}/generate-rankings`, { method: 'POST' });
  },

  publishResults: async (id: string): Promise<RankedTestResponse> => {
    return fetchJson(`${API_BASE}/${id}/publish-results`, { method: 'POST' });
  },

  invalidateAttempt: async (attemptId: string, invalidationReason: string): Promise<any> => {
    return fetchJson(`${API_BASE}/attempts/${attemptId}/invalidate`, {
      method: 'POST',
      body: JSON.stringify({ invalidationReason }),
    });
  },
};
