import {
  StudyMaterialListItem,
  StudyMaterialDetail,
  StudyMaterialFilters,
  ApiResponse,
  PaginationMeta,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/study-materials';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new ApiError('Access forbidden. You do not have permission to manage Study Materials.', 403, 'FORBIDDEN');
    }

    const contentType = response.headers.get('content-type');
    let data: any = {};
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const msg = data.error?.message || data.message || `Study Material API error (HTTP ${response.status})`;
      throw new ApiError(msg, response.status, data.error?.code);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Unable to connect to Study Materials API', 500);
  }
}

export const StudyMaterialApi = {
  getStudyMaterials: async (filters?: StudyMaterialFilters): Promise<{ items: StudyMaterialListItem[]; meta: PaginationMeta }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.code) params.append('code', filters.code);
    if (filters?.contentType) params.append('contentType', filters.contentType);
    if (filters?.recordStatus) params.append('recordStatus', filters.recordStatus);
    if (filters?.hasEnglishLocale !== undefined) params.append('hasEnglishLocale', String(filters.hasEnglishLocale));
    if (filters?.hasKannadaLocale !== undefined) params.append('hasKannadaLocale', String(filters.hasKannadaLocale));
    if (filters?.foundationReadiness) params.append('foundationReadiness', filters.foundationReadiness);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
    if (filters?.topicId) params.append('topicId', filters.topicId);
    if (filters?.knowledgeAreaId) params.append('knowledgeAreaId', filters.knowledgeAreaId);
    if (filters?.includeArchived) params.append('includeArchived', 'true');
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<StudyMaterialListItem[]> = await fetchWithAuth(`${API_BASE}${query}`);
    return {
      items: res.data || [],
      meta: (res.meta as PaginationMeta) || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  getStudyMaterialById: async (id: string): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}`);
    return res.data!;
  },

  createStudyMaterial: async (payload: any): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateStudyMaterial: async (id: string, payload: any): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  saveLocale: async (id: string, language: 'en' | 'kn', payload: any): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  addTaxonomyMapping: async (id: string, payload: any): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/taxonomy-mappings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  deleteTaxonomyMapping: async (id: string, mappingId: string): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/taxonomy-mappings/${mappingId}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  makePrimaryTaxonomyMapping: async (id: string, mappingId: string): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/taxonomy-mappings/${mappingId}/make-primary`, {
      method: 'POST',
    });
    return res.data!;
  },

  archiveStudyMaterial: async (id: string): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/archive`, {
      method: 'POST',
    });
    return res.data!;
  },

  restoreStudyMaterial: async (id: string): Promise<StudyMaterialDetail> => {
    const res: ApiResponse<StudyMaterialDetail> = await fetchWithAuth(`${API_BASE}/${id}/restore`, {
      method: 'POST',
    });
    return res.data!;
  },

  deleteDraftStudyMaterial: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  // PROMPT 8 REVISION & WORKFLOW ENDPOINTS
  autosaveRevision: async (id: string, language: 'en' | 'kn', revisionId: string, payload: any) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/autosave`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  saveRevision: async (id: string, language: 'en' | 'kn', revisionId: string, payload: any) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  submitForReview: async (id: string, language: 'en' | 'kn', revisionId: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/submit-review`, {
      method: 'POST',
    });
    return res.data!;
  },

  requestChanges: async (id: string, language: 'en' | 'kn', revisionId: string, comment: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    return res.data!;
  },

  approveRevision: async (id: string, language: 'en' | 'kn', revisionId: string, comment?: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    return res.data!;
  },

  publishRevision: async (id: string, language: 'en' | 'kn', revisionId: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/publish`, {
      method: 'POST',
    });
    return res.data!;
  },

  cloneNewRevision: async (id: string, language: 'en' | 'kn', publishedRevisionId: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${publishedRevisionId}/clone`, {
      method: 'POST',
    });
    return res.data!;
  },

  getReviewQueue: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.language) params.append('language', filters.language);
    if (filters?.contentType) params.append('contentType', filters.contentType);
    if (filters?.tab) params.append('tab', filters.tab);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/review-queue${query}`);
    return {
      items: res.data || [],
      meta: (res.meta as PaginationMeta) || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  getPreviewData: async (id: string, language: 'en' | 'kn', revisionId: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/preview`);
    return res.data!;
  },

  getReviewEvents: async (id: string, language: 'en' | 'kn', revisionId: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId}/review-events`);
    return res.data! || [];
  },

  getAccessPolicy: async (id: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/access-policy`);
    return res.data!;
  },

  updateAccessPolicy: async (id: string, payload: any) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/access-policy`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  getAccessPreview: async (id: string, mode: string, language: 'en' | 'kn') => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/access-preview?mode=${mode}&language=${language}`);
    return res.data!;
  },

  getPreviewOutline: async (id: string, language: 'en' | 'kn', revisionId?: string) => {
    const revParam = revisionId ? `?revisionId=${revisionId}` : '';
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/locales/${language}/revisions/${revisionId || 'published'}/preview-outline${revParam}`);
    return res.data! || [];
  },

  validateAccessPolicy: async (id: string) => {
    const res: ApiResponse<any> = await fetchWithAuth(`${API_BASE}/${id}/access-policy/validate`, {
      method: 'POST',
    });
    return res.data!;
  },
};
