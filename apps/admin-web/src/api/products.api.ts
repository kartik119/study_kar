export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductAccessType = 'FREE' | 'FREEMIUM' | 'PAID';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type ProductScopeType = 'GLOBAL' | 'ENTIRE_EXAM' | 'SPECIFIC_MODULES';

export type ProductType = 'FULL_EXAM' | 'MCQ' | 'STUDY_MATERIALS' | 'MOCK_TESTS' | 'QUICK_REVISION' | 'STUDY_PLANS' | 'TEST_SERIES' | 'CURRENT_AFFAIRS' | 'CUSTOM_BUNDLE';

export interface ProductPlan {
  id: string;
  name: string;
  code: string;
  price: number | string;
  discountPrice?: number | string | null;
  duration: number;
  durationUnit: 'DAYS' | 'MONTHS' | 'YEARS';
  isActive: boolean;
}

export interface ProductEntitlement {
  id?: string;
  entitlementKey: string;
  name: string;
  description?: string | null;
  examId?: string | null;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  categoryId?: string | null;
  category?: ProductCategory | null;
  examId?: string | null;
  exam?: { id: string; titleEn: string } | null;
  scopeType: ProductScopeType;
  productType: ProductType;
  accessType: ProductAccessType;
  status: ProductStatus;
  iconUrl?: string | null;
  imageUrl?: string | null;
  features: string[];
  displayOrder: number;
  publishDate?: string | null;
  createdAt: string;
  updatedAt: string;
  plans: ProductPlan[];
  entitlements: ProductEntitlement[];
  plansCount: number;
  studentsCount: number;
}

export interface ProductMetrics {
  totalProducts: number;
  activeProducts: number;
  paidProducts: number;
  studentsEnrolled: number;
}

export interface ProductFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categoryId?: string;
  accessType?: string;
  scopeType?: string;
  productType?: string;
  examId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductPayload {
  name: string;
  code?: string;
  description?: string;
  categoryId?: string;
  examId?: string;
  scopeType?: ProductScopeType;
  productType?: ProductType;
  accessType: ProductAccessType;
  status?: ProductStatus;
  iconUrl?: string;
  features?: string[];
  displayOrder?: number;
  publishDate?: string;
  entitlements?: Array<{ entitlementKey: string; name: string; description?: string }>;
  plans?: Array<{ name: string; code: string; price: number; duration: number; durationUnit?: 'DAYS' | 'MONTHS' | 'YEARS' }>;
}

export interface UpdateProductPayload {
  name?: string;
  code?: string;
  description?: string;
  categoryId?: string;
  examId?: string;
  scopeType?: ProductScopeType;
  productType?: ProductType;
  accessType?: ProductAccessType;
  status?: ProductStatus;
  iconUrl?: string;
  features?: string[];
  displayOrder?: number;
  publishDate?: string;
  entitlements?: Array<{ entitlementKey: string; name: string; description?: string }>;
}

export class ProductsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ProductsApiError';
  }
}

const API_BASE = '/api/v1/admin/subscriptions/products';

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
      throw new ProductsApiError(
        errorData.error?.message || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ProductsApiError) {
      throw error;
    }
    throw new ProductsApiError(error.message || 'Network request failed', 0);
  }
}

export const ProductsApi = {
  async getProducts(params: ProductFilterParams = {}): Promise<{ items: Product[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', String(params.page));
    if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.categoryId && params.categoryId !== 'ALL') searchParams.append('categoryId', params.categoryId);
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

  async getMetrics(): Promise<ProductMetrics> {
    const res = await fetchWithAuth(`${API_BASE}/metrics`);
    return (
      res.data || {
        totalProducts: 0,
        activeProducts: 0,
        paidProducts: 0,
        studentsEnrolled: 0,
      }
    );
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/${id}`);
    return res.data;
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const res = await fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async setProductStatus(id: string, status: ProductStatus): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  async archiveProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithAuth(`${API_BASE}/${id}/archive`, {
      method: 'POST',
    });
    return res.data;
  },

  async manageEntitlements(
    id: string,
    entitlements: Array<{ entitlementKey: string; name: string; description?: string }>
  ): Promise<Product> {
    const res = await fetchWithAuth(`${API_BASE}/${id}/entitlements`, {
      method: 'PUT',
      body: JSON.stringify({ entitlements }),
    });
    return res.data;
  },

  async exportProducts(params: ProductFilterParams = {}): Promise<void> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params.categoryId && params.categoryId !== 'ALL') searchParams.append('categoryId', params.categoryId);
    if (params.accessType && params.accessType !== 'ALL') searchParams.append('accessType', params.accessType);

    const token = localStorage.getItem('admin_token');
    const qs = searchParams.toString();
    const url = `${API_BASE}/export${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Category endpoints
  async getCategories(includeInactive = false): Promise<ProductCategory[]> {
    const res = await fetchWithAuth(`/api/v1/admin/subscriptions/categories?includeInactive=${includeInactive}`);
    return res.data || [];
  },

  async getExams(): Promise<Array<{ id: string; titleEn: string; cycleYear: number }>> {
    const res = await fetchWithAuth('/api/v1/admin/exams');
    return res.data?.items || res.data || [];
  },

  async createCategory(payload: { name: string; code?: string; description?: string; isActive?: boolean }): Promise<ProductCategory> {
    const res = await fetchWithAuth('/api/v1/admin/subscriptions/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateCategory(id: string, payload: { name?: string; code?: string; description?: string; isActive?: boolean }): Promise<ProductCategory> {
    const res = await fetchWithAuth(`/api/v1/admin/subscriptions/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithAuth(`/api/v1/admin/subscriptions/categories/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async uploadProductImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }
    return response.json();
  }
};
