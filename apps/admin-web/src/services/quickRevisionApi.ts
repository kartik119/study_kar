const API_BASE = '/api/v1/admin/quick-revision';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
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

export const quickRevisionApi = {
  getCards: async (params?: { page?: number; pageSize?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    
    return fetchWithAuth(`${API_BASE}/cards${qs}`);
  },

  getCard: async (id: string) => {
    return fetchWithAuth(`${API_BASE}/cards/${id}`);
  },

  createCard: async (payload: any) => {
    return fetchWithAuth(`${API_BASE}/cards`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCard: async (id: string, payload: any) => {
    return fetchWithAuth(`${API_BASE}/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteCard: async (id: string) => {
    return fetchWithAuth(`${API_BASE}/cards/${id}`, {
      method: 'DELETE',
    });
  },
};
