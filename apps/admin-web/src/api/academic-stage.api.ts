import { ApiResponse, AcademicStage } from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/admin/academic-stages';

export class AcademicStageApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AcademicStageApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let message = 'API request failed';
    try {
      const errData = await response.json();
      message = errData.error?.message || message;
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new AcademicStageApiError(message, response.status);
  }

  return response.json();
}

export const AcademicStageApi = {
  getAllStages: async (): Promise<AcademicStage[]> => {
    const res = await fetchWithAuth(API_BASE);
    return res.data;
  },

  getStageById: async (id: string): Promise<AcademicStage> => {
    const res = await fetchWithAuth(`${API_BASE}/${id}`);
    return res.data;
  },

  createStage: async (data: any): Promise<AcademicStage> => {
    const res = await fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateStage: async (id: string, data: any): Promise<AcademicStage> => {
    const res = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  deleteStage: async (id: string): Promise<void> => {
    await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  },
};
