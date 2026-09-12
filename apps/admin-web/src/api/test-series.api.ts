import {
  TestSeriesResponse,
  TestSeriesWorkflowStatus,
  TestSeriesReleaseMode,
  SeriesQuestionReusePolicy,
  TestAccessClassification,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/mcq-library/test-series';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok || !data.success) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    throw new Error(data.error?.message || data.message || 'API Request Failed');
  }

  return data.data;
}

export const TestSeriesApi = {
  getExamCycles: async (): Promise<any[]> => {
    return fetchJson('/api/v1/exams');
  },

  getExamProgrammes: async (): Promise<any[]> => {
    return fetchJson('/api/v1/admin/exam-programmes');
  },

  getNextSeriesCodePreview: async (): Promise<{ code: string; seqNumber: number }> => {
    return fetchJson(`${API_BASE}/next-code`);
  },

  getTestSeriesList: async (params?: {
    search?: string;
    examProgrammeId?: string;
    status?: TestSeriesWorkflowStatus;
    accessClassification?: TestAccessClassification;
    releaseMode?: TestSeriesReleaseMode;
    questionReusePolicy?: SeriesQuestionReusePolicy;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TestSeriesResponse[]; meta: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.examProgrammeId) query.set('examProgrammeId', params.examProgrammeId);
    if (params?.status) query.set('status', params.status);
    if (params?.accessClassification) query.set('accessClassification', params.accessClassification);
    if (params?.releaseMode) query.set('releaseMode', params.releaseMode);
    if (params?.questionReusePolicy) query.set('questionReusePolicy', params.questionReusePolicy);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));

    const token = localStorage.getItem('admin_token');
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}?${query.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      throw new Error(data.error?.message || 'Failed to fetch test series list');
    }
    return { items: data.data, meta: data.meta };
  },

  getTestSeriesById: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}`);
  },

  getEligibleTestsForSeries: async (params: {
    examProgrammeId: string;
    seriesId?: string;
    search?: string;
    status?: string;
  }): Promise<any[]> => {
    const query = new URLSearchParams({ examProgrammeId: params.examProgrammeId });
    if (params.seriesId) query.set('seriesId', params.seriesId);
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const token = localStorage.getItem('admin_token');
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/eligible-tests?${query.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      throw new Error(data.error?.message || 'Failed to fetch candidate tests');
    }
    return data.data;
  },

  createTestSeries: async (payload: any): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTestSeries: async (id: string, payload: any): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  reorderSeriesTests: async (id: string, items: { mockTestId: string; orderIndex: number }[]): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  submitForReview: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/submit-review`, { method: 'POST' });
  },

  requestChanges: async (id: string, rejectionReason: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  approveSeries: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/approve`, { method: 'POST' });
  },

  publishSeries: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/publish`, { method: 'POST' });
  },

  archiveSeries: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/archive`, { method: 'POST' });
  },

  reopenSeries: async (id: string): Promise<TestSeriesResponse> => {
    return fetchJson(`${API_BASE}/${id}/reopen`, { method: 'POST' });
  },

  deleteSeries: async (id: string): Promise<void> => {
    return fetchJson(`${API_BASE}/${id}`, { method: 'DELETE' });
  },
};
