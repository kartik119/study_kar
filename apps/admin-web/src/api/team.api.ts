export interface TeamMemberQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  moduleAccess?: string;
}

export interface InviteMemberData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  adminModuleAccess?: string[];
  examScope?: string[];
  mentorSettings?: {
    mentorshipMode: string;
    maxCapacity: string;
  };
}

const API_BASE = '/api/v1/admin/team';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const teamApi = {
  getKPIs: async () => {
    return await fetchWithAuth(`${API_BASE}/kpi`);
  },

  getMembers: async (query: TeamMemberQuery) => {
    const searchParams = new URLSearchParams();
    if (query.page) searchParams.append('page', query.page.toString());
    if (query.limit) searchParams.append('limit', query.limit.toString());
    if (query.search) searchParams.append('search', query.search);
    if (query.role) searchParams.append('role', query.role);
    if (query.status) searchParams.append('status', query.status);
    if (query.moduleAccess) searchParams.append('moduleAccess', query.moduleAccess);
    
    const qs = searchParams.toString();
    return await fetchWithAuth(`${API_BASE}/members${qs ? `?${qs}` : ''}`);
  },

  getMember: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}`);
  },

  getMemberActivity: async (id: string, page = 1, limit = 10) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}/activity?page=${page}&limit=${limit}`);
  },

  inviteMember: async (data: InviteMemberData) => {
    return await fetchWithAuth(`${API_BASE}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resendInvite: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}/resend-invite`, { method: 'POST' });
  },

  cancelInvite: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}/cancel-invite`, { method: 'POST' });
  },

  suspendMember: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}/suspend`, { method: 'POST' });
  },

  reactivateMember: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}/reactivate`, { method: 'POST' });
  },

  deactivateMember: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/members/${id}`, { method: 'DELETE' });
  },

  getRoles: async (query?: any) => {
    const searchParams = new URLSearchParams();
    if (query?.search) searchParams.append('search', query.search);
    if (query?.status) searchParams.append('status', query.status);
    if (query?.type) searchParams.append('type', query.type);
    
    const qs = searchParams.toString();
    return await fetchWithAuth(`${API_BASE}/roles${qs ? `?${qs}` : ''}`);
  },

  getRole: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/roles/${id}`);
  },

  getRoleActivity: async (id: string, page = 1, limit = 10) => {
    return await fetchWithAuth(`${API_BASE}/roles/${id}/activity?page=${page}&limit=${limit}`);
  },

  createRole: async (data: any) => {
    return await fetchWithAuth(`${API_BASE}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateRole: async (id: string, data: any) => {
    return await fetchWithAuth(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getPermissions: async () => {
    return await fetchWithAuth(`${API_BASE}/permissions`);
  }
};
