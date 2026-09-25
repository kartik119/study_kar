import { ApiResponse } from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/revision-taxonomy';

export interface RevisionCategory {
  id: string;
  code: string;
  nameEn: string;
  nameKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories?: RevisionSubcategory[];
  _count?: { cards: number };
}

export interface RevisionSubcategory {
  id: string;
  categoryId: string;
  code: string;
  nameEn: string;
  nameKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  _count?: { cards: number };
}

export class RevisionTaxonomyApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'RevisionTaxonomyApiError';
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
      throw new RevisionTaxonomyApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new RevisionTaxonomyApiError('Access forbidden. You do not have permission to manage Revision Taxonomy.', 403, 'FORBIDDEN');
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
      throw new RevisionTaxonomyApiError(msg, response.status, data.error?.code);
    }

    return data;
  } catch (err: any) {
    if (err instanceof RevisionTaxonomyApiError) throw err;
    throw new RevisionTaxonomyApiError(err.message || 'Unable to connect to Revision Taxonomy API', 500);
  }
}

export const RevisionTaxonomyApi = {
  // Categories
  getCategories: async (): Promise<RevisionCategory[]> => {
    const res: ApiResponse<RevisionCategory[]> = await fetchWithAuth(`${API_BASE}/categories`);
    return res.data || [];
  },

  createCategory: async (payload: any): Promise<RevisionCategory> => {
    const res: ApiResponse<RevisionCategory> = await fetchWithAuth(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateCategory: async (id: string, payload: any): Promise<RevisionCategory> => {
    const res: ApiResponse<RevisionCategory> = await fetchWithAuth(`${API_BASE}/categories/${id}`, {
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

  toggleCategoryActive: async (id: string, activate: boolean): Promise<RevisionCategory> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<RevisionCategory> = await fetchWithAuth(`${API_BASE}/categories/${id}/${action}`, {
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
  createSubcategory: async (payload: any): Promise<RevisionSubcategory> => {
    const res: ApiResponse<RevisionSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  updateSubcategory: async (id: string, payload: any): Promise<RevisionSubcategory> => {
    const res: ApiResponse<RevisionSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  deleteSubcategory: async (id: string): Promise<{ success: boolean }> => {
    const res: ApiResponse<{ success: boolean }> = await fetchWithAuth(`${API_BASE}/subcategories/${id}`, {
      method: 'DELETE',
    });
    return res.data!;
  },

  toggleSubcategoryActive: async (id: string, activate: boolean): Promise<RevisionSubcategory> => {
    const action = activate ? 'activate' : 'deactivate';
    const res: ApiResponse<RevisionSubcategory> = await fetchWithAuth(`${API_BASE}/subcategories/${id}/${action}`, {
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
};
