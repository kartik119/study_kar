const BASE_URL = '/api/v1/admin/subscriptions/coupons';

class CouponsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'CouponsApiError';
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
    const data = await response.json();
    if (!response.ok) {
      throw new CouponsApiError(data.error?.message || data.message || 'API Error', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof CouponsApiError) throw error;
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}

export const couponsApi = {
  getMetrics: async () => {
    return fetchWithAuth(`${BASE_URL}/metrics`);
  },

  getCoupons: async (params?: any) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return fetchWithAuth(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
  },

  getCouponById: async (id: string) => {
    return fetchWithAuth(`${BASE_URL}/${id}`);
  },

  createCoupon: async (data: any) => {
    return fetchWithAuth(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCoupon: async (id: string, data: any) => {
    return fetchWithAuth(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCoupon: async (id: string) => {
    return fetchWithAuth(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }
};
