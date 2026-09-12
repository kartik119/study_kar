import {
  CreateMcqQuestionPayload,
  CreateMockTestPayload,
  McqQuestion,
  MockTest,
  ApiResponse,
  McqQueryParams,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/mcq-library';

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    throw new Error(data.error?.message || data.message || 'API call failed');
  }
  return data;
}

export const mcqLibraryApi = {
  getCategories: async () => {
    return fetchWithAuth<any[]>('/api/v1/admin/academic-taxonomy/categories?moduleType=MCQ');
  },
  getSubcategories: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/v1/admin/academic-taxonomy/subcategories?categoryId=${categoryId}`
      : '/api/v1/admin/academic-taxonomy/subcategories';
    return fetchWithAuth<any[]>(url);
  },
  getNextCode: async () => {
    return fetchWithAuth<{ code: string; seqNumber: number }>(`${API_BASE}/questions/next-code`);
  },

  getQuestions: async (params?: McqQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.categoryId) {
      if (Array.isArray(params.categoryId)) {
        params.categoryId.forEach(id => searchParams.append('categoryId', id));
      } else {
        searchParams.append('categoryId', params.categoryId);
      }
    }
    if (params?.subcategoryId) {
      if (Array.isArray(params.subcategoryId)) {
        params.subcategoryId.forEach(id => searchParams.append('subcategoryId', id));
      } else {
        searchParams.append('subcategoryId', params.subcategoryId);
      }
    }
    if (params?.topicId) searchParams.set('topicId', params.topicId);
    if (params?.knowledgeAreaId) searchParams.set('knowledgeAreaId', params.knowledgeAreaId);
    if (params?.readiness) searchParams.set('readiness', params.readiness);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.isPyq !== undefined) searchParams.set('isPyq', String(params.isPyq));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit || params?.pageSize) searchParams.set('limit', String(params.limit || params.pageSize));

    const qs = searchParams.toString();
    const endpoint = `${API_BASE}/questions${qs ? `?${qs}` : ''}`;
    return fetchWithAuth<McqQuestion[]>(endpoint);
  },

  createQuestion: async (payload: CreateMcqQuestionPayload) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getQuestionById: async (id: string) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}`);
  },

  updateQuestion: async (id: string, payload: Partial<CreateMcqQuestionPayload>) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  submitReview: async (id: string) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}/submit-review`, {
      method: 'POST',
    });
  },

  requestChanges: async (id: string) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}/request-changes`, {
      method: 'POST',
    });
  },

  approveQuestion: async (id: string) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}/approve`, {
      method: 'POST',
    });
  },

  archiveQuestion: async (id: string) => {
    return fetchWithAuth<McqQuestion>(`${API_BASE}/questions/${id}/archive`, {
      method: 'POST',
    });
  },

  deleteQuestion: async (id: string) => {
    return fetchWithAuth<{ success: boolean; id?: string; code?: string }>(`${API_BASE}/questions/${id}`, {
      method: 'DELETE',
    });
  },

  bulkDeleteQuestions: async (ids: string[]) => {
    return fetchWithAuth<{ success: boolean; deletedCount: number; totalRequested: number; skipped?: any[] }>(
      `${API_BASE}/questions/bulk-delete`,
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }
    );
  },

  bulkUpdateStatus: async (ids: string[], action: 'submit' | 'approve' | 'archive') => {
    return fetchWithAuth<{ success: boolean; updatedCount: number }>(`${API_BASE}/questions/bulk-status`, {
      method: 'POST',
      body: JSON.stringify({ ids, action }),
    });
  },

  getMockTests: async (params?: { examCycleId?: string; isPublished?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.examCycleId) searchParams.set('examCycleId', params.examCycleId);
    if (params?.isPublished !== undefined) searchParams.set('isPublished', String(params.isPublished));

    const qs = searchParams.toString();
    return fetchWithAuth<MockTest[]>(`${API_BASE}/tests${qs ? `?${qs}` : ''}`);
  },

  createMockTest: async (payload: CreateMockTestPayload) => {
    return fetchWithAuth<MockTest>(`${API_BASE}/tests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  addQuestionsToMockTest: async (mockTestId: string, questionIds: string[]) => {
    return fetchWithAuth<{ success: boolean; count: number }>(`${API_BASE}/tests/${mockTestId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ questionIds }),
    });
  },

  // Bulk Import Endpoints
  downloadExcelTemplate: async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/bulk-import/template/excel`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to download this template.');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Unable to download the Excel template. Please try again.');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = 'study-karnataka-mcq-import-template.xlsx';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { blob, filename };
  },

  downloadCsvTemplate: async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/bulk-import/template/csv`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to download this template.');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Unable to download the CSV template. Please try again.');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = 'study-karnataka-mcq-import-template.csv';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { blob, filename };
  },

  analyzeBulkImportFile: async (file: File) => {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/bulk-import/analyze`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
      throw new Error(data.error?.message || 'File analysis failed');
    }
    return data as ApiResponse<any>;
  },

  validateBulkImport: async (payload: {
    sessionId: string;
    importMode: 'ADD_NEW' | 'UPDATE_EXISTING';
    columnMappings: Record<string, string>;
    selectedWorksheet?: string;
    taxonomyOverrides?: Record<string, any>;
  }) => {
    return fetchWithAuth<any>(`${API_BASE}/bulk-import/validate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  executeBulkImport: async (payload: {
    sessionId: string;
    importMode: 'ADD_NEW' | 'UPDATE_EXISTING';
    columnMappings: Record<string, string>;
    selectedWorksheet?: string;
    taxonomyOverrides?: Record<string, any>;
  }) => {
    return fetchWithAuth<any>(`${API_BASE}/bulk-import/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createTaxonomyMaster: async (payload: {
    type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC';
    nameEn: string;
    nameKn?: string;
    parentId?: string;
    customCode?: string;
  }) => {
    return fetchWithAuth<{ id: string; code: string; nameEn: string }>(`${API_BASE}/bulk-import/taxonomy/create`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getBulkImportHistory: async () => {
    return fetchWithAuth<any[]>(`${API_BASE}/bulk-import/history`);
  },

  deleteImportSession: async (sessionId: string) => {
    return fetchWithAuth<void>(`${API_BASE}/bulk-import/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};

export const testApi = {
  getNextTestCode: async () => {
    return fetchWithAuth<{ code: string; seqNumber: number }>(`${API_BASE}/tests/next-code`);
  },

  getTests: async (params?: { search?: string; examCycleId?: string; selectionMode?: string; status?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.examCycleId) sp.set('examCycleId', params.examCycleId);
    if (params?.selectionMode) sp.set('selectionMode', params.selectionMode);
    if (params?.status) sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return fetchWithAuth<any[]>(`${API_BASE}/tests${query}`);
  },

  getTestById: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}`);
  },

  createTest: async (payload: any) => {
    return fetchWithAuth<any>(`${API_BASE}/tests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTest: async (id: string, payload: any) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getEligibleQuestions: async (params?: any) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.categoryId) sp.set('categoryId', params.categoryId);
    if (params?.subcategoryId) sp.set('subcategoryId', params.subcategoryId);
    if (params?.topicId) sp.set('topicId', params.topicId);
    if (params?.knowledgeAreaId) sp.set('knowledgeAreaId', params.knowledgeAreaId);
    if (params?.difficulty) sp.set('difficulty', params.difficulty);
    if (params?.isPyq !== undefined) sp.set('isPyq', String(params.isPyq));
    if (params?.page) sp.set('page', String(params.page));
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return fetchWithAuth<any[]>(`${API_BASE}/tests/eligible-questions${query}`);
  },

  checkAvailability: async (payload: any) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/availability-check`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  saveManualSelection: async (id: string, questionIds: string[]) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/manual-selection`, {
      method: 'POST',
      body: JSON.stringify({ questionIds }),
    });
  },

  autoGenerate: async (id: string, seed?: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/auto-generate`, {
      method: 'POST',
      body: JSON.stringify({ seed }),
    });
  },

  replaceQuestion: async (id: string, oldQuestionId: string, newQuestionId: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/replace-question`, {
      method: 'POST',
      body: JSON.stringify({ oldQuestionId, newQuestionId }),
    });
  },

  reorderQuestions: async (id: string, questionOrder: { questionId: string; displayOrder: number }[]) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ questionOrder }),
    });
  },

  submitForReview: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/submit-review`, {
      method: 'POST',
    });
  },

  requestChanges: async (id: string, rejectionReason: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  approveTest: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/approve`, {
      method: 'POST',
    });
  },

  publishTest: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/publish`, {
      method: 'POST',
    });
  },

  reopenTest: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/reopen`, {
      method: 'POST',
    });
  },

  archiveTest: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}/archive`, {
      method: 'POST',
    });
  },

  deleteTest: async (id: string) => {
    return fetchWithAuth<any>(`${API_BASE}/tests/${id}`, {
      method: 'DELETE',
    });
  },
};
