const API_BASE = '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(res: Response, defaultError: string) {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      throw new Error(data.error?.message || defaultError);
    }
    return data;
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    throw new Error(text || `${defaultError} (HTTP ${res.status})`);
  }
  return { data: text };
}

export const currentAffairsApi = {
  list: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
    }
    const res = await fetch(`${API_BASE}/admin/current-affairs?${searchParams.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch current affairs');
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/${id}`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch current affair details');
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create current affair');
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to update current affair');
  },

  publish: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/${id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return parseResponse(res, 'Failed to publish current affair');
  },

  duplicate: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return parseResponse(res, 'Failed to duplicate current affair');
  },

  softDelete: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return parseResponse(res, 'Failed to move current affair to trash');
  },

  getCategories: async () => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/categories`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch categories');
  },

  createCategory: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create category');
  },

  deleteCategory: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return parseResponse(res, 'Failed to delete category');
  },

  getSources: async () => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/sources`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch sources');
  },

  createSource: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create source');
  },

  deleteSource: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/sources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return parseResponse(res, 'Failed to delete source');
  },

  getTags: async () => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/tags`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch tags');
  },

  getCalendar: async (year: number, month: number) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/calendar?year=${year}&month=${month}`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch calendar');
  },

  getPdfs: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
    }
    const res = await fetch(`${API_BASE}/admin/current-affairs/pdfs?${searchParams.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch pdfs');
  },

  createPdf: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/pdfs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create pdf');
  },

  getTrendingTopics: async () => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/trending-topics`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch trending topics');
  },

  createTrendingTopic: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/trending-topics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create trending topic');
  },

  getQuizzes: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
    }
    const res = await fetch(`${API_BASE}/admin/current-affairs/quizzes?${searchParams.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res, 'Failed to fetch quizzes');
  },

  createQuiz: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/current-affairs/quizzes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return parseResponse(res, 'Failed to create quiz');
  }
};
