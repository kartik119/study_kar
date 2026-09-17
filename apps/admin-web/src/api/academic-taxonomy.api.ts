import {
  AcademicCategory,
  AcademicSubcategory,
  AcademicTopic,
  AcademicKnowledgeArea,
  AcademicTaxonomyTree,
  ApiResponse,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/academic-taxonomy';

export class TaxonomyApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'TaxonomyApiError';
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
      throw new TaxonomyApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new TaxonomyApiError('Access forbidden. You do not have permission to manage Academic Taxonomy.', 403, 'FORBIDDEN');
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
      const msg = data.error?.message || data.message || `Taxonomy API error (HTTP ${response.status})`;
      throw new TaxonomyApiError(msg, response.status, data.error?.code);
    }

    return data;
  } catch (err: any) {
    if (err instanceof TaxonomyApiError) throw err;
    throw new TaxonomyApiError(err.message || 'Unable to connect to Academic Taxonomy API', 500);
  }
}

export const AcademicTaxonomyApi = {
  getTaxonomyTree: async (filters?: { search?: string; isActive?: boolean; categoryId?: string; moduleType?: string }): Promise<AcademicTaxonomyTree> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.moduleType) params.append('moduleType', filters.moduleType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<AcademicTaxonomyTree> = await fetchWithAuth(`${API_BASE}/tree${query}`);
    return res.data!;
  },

  // Categories
  getCategories: async (filters?: { search?: string; isActive?: boolean; moduleType?: string }): Promise<AcademicCategory[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.moduleType) params.append('moduleType', filters.moduleType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<AcademicCategory[]> = await fetchWithAuth(`${API_BASE}/categories${query}`);
    return res.data || [];
  },

  createCategory: async (payload: any): Promise<AcademicCategory> => {
    const res: ApiResponse<AcademicCategory> = await fetchWithAuth(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateCategory: async (id: string, payload: any): Promise<AcademicCategory> => {
    const res: ApiResponse<AcademicCategory> = await fetchWithAuth(`${API_BASE}/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  deleteCategory: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  toggleCategoryActive: async (id: string, activate: boolean): Promise<AcademicCategory> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<AcademicCategory> = await fetchWithAuth(`${API_BASE}/categories/${id}/${action}`, {
      method: 'POST',
    });
    return res.data!;
  },

  reorderCategories: async (items: Array<{ id: string; displayOrder: number }>): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/categories/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.data!;
  },

  // Subcategories
  getSubcategories: async (categoryId?: string, filters?: { search?: string; isActive?: boolean; moduleType?: string }): Promise<AcademicSubcategory[]> => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.moduleType) params.append('moduleType', filters.moduleType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<AcademicSubcategory[]> = await fetchWithAuth(`${API_BASE}/subcategories${query}`);
    return res.data || [];
  },

  createSubcategory: async (payload: any): Promise<AcademicSubcategory> => {
    const res: ApiResponse<AcademicSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateSubcategory: async (id: string, payload: any): Promise<AcademicSubcategory> => {
    const res: ApiResponse<AcademicSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  moveSubcategory: async (id: string, targetParentId: string, reason?: string): Promise<{ success: boolean; affectedMappings: number }> => {
    const res: ApiResponse<{ success: boolean; affectedMappings: number }> = await fetchWithAuth(`${API_BASE}/subcategories/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetParentId, reason }),
    });
    return res.data!;
  },

  deleteSubcategory: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/subcategories/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  toggleSubcategoryActive: async (id: string, activate: boolean): Promise<AcademicSubcategory> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<AcademicSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories/${id}/${action}`, {
      method: 'POST',
    });
    return res.data!;
  },

  reorderSubcategories: async (items: Array<{ id: string; displayOrder: number }>): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/subcategories/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.data!;
  },

  // Topics
  getTopics: async (subcategoryId?: string, filters?: { search?: string; isActive?: boolean; moduleType?: string }): Promise<AcademicTopic[]> => {
    const params = new URLSearchParams();
    if (subcategoryId) params.append('subcategoryId', subcategoryId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.moduleType) params.append('moduleType', filters.moduleType);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<AcademicTopic[]> = await fetchWithAuth(`${API_BASE}/topics${query}`);
    return res.data || [];
  },

  createTopic: async (payload: any): Promise<AcademicTopic> => {
    const res: ApiResponse<AcademicTopic> = await fetchWithAuth(`${API_BASE}/topics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateTopic: async (id: string, payload: any): Promise<AcademicTopic> => {
    const res: ApiResponse<AcademicTopic> = await fetchWithAuth(`${API_BASE}/topics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  moveTopic: async (id: string, targetParentId: string, reason?: string): Promise<{ success: boolean; affectedMappings: number }> => {
    const res: ApiResponse<{ success: boolean; affectedMappings: number }> = await fetchWithAuth(`${API_BASE}/topics/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetParentId, reason }),
    });
    return res.data!;
  },

  deleteTopic: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/topics/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  toggleTopicActive: async (id: string, activate: boolean): Promise<AcademicTopic> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<AcademicTopic> = await fetchWithAuth(`${API_BASE}/topics/${id}/${action}`, {
      method: 'POST',
    });
    return res.data!;
  },

  reorderTopics: async (items: Array<{ id: string; displayOrder: number }>): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/topics/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.data!;
  },

  // Knowledge Areas
  getKnowledgeAreas: async (topicId?: string, filters?: { search?: string; isActive?: boolean }): Promise<AcademicKnowledgeArea[]> => {
    const params = new URLSearchParams();
    if (topicId) params.append('topicId', topicId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res: ApiResponse<AcademicKnowledgeArea[]> = await fetchWithAuth(`${API_BASE}/knowledge-areas${query}`);
    return res.data || [];
  },

  createKnowledgeArea: async (payload: any): Promise<AcademicKnowledgeArea> => {
    const res: ApiResponse<AcademicKnowledgeArea> = await fetchWithAuth(`${API_BASE}/knowledge-areas`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateKnowledgeArea: async (id: string, payload: any): Promise<AcademicKnowledgeArea> => {
    const res: ApiResponse<AcademicKnowledgeArea> = await fetchWithAuth(`${API_BASE}/knowledge-areas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  moveKnowledgeArea: async (id: string, targetParentId: string, reason?: string): Promise<{ success: boolean; affectedMappings: number }> => {
    const res: ApiResponse<{ success: boolean; affectedMappings: number }> = await fetchWithAuth(`${API_BASE}/knowledge-areas/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetParentId, reason }),
    });
    return res.data!;
  },

  deleteKnowledgeArea: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/knowledge-areas/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  toggleKnowledgeAreaActive: async (id: string, activate: boolean): Promise<AcademicKnowledgeArea> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<AcademicKnowledgeArea> = await fetchWithAuth(`${API_BASE}/knowledge-areas/${id}/${action}`, {
      method: 'POST',
    });
    return res.data!;
  },

  reorderKnowledgeAreas: async (items: Array<{ id: string; displayOrder: number }>): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/knowledge-areas/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.data!;
  },
};
