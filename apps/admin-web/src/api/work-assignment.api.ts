

export interface WorkAssignment {
  id: string;
  assignmentCode: string;
  title: string;
  description?: string;
  assignmentType: string;
  assigneeId: string;
  roleId: string;
  reportingManagerId?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'SCHEDULED' | 'ACTIVE' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  dueDate?: string;
  visibleToAssignee: boolean;
  reviewRequired: boolean;
  autoNotifyAssignee: boolean;
  escalateIfOverdue: boolean;
  slaValue?: number;
  slaUnit?: string;
  instructions?: string;
  internalNotes?: string;
  createdAt: string;
  
  assignee?: any;
  role?: any;
  reportingManager?: any;
  examScopes?: any[];
  modules?: any[];
  targetStudents?: any[];
}

export interface WorkAssignmentListResponse {
  success: boolean;
  data: WorkAssignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkAssignmentKpiResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    pendingReview: number;
    overdue: number;
  };
}

const API_BASE = '/api/v1/admin/team/work-assignments';

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

export const workAssignmentApi = {
  getAssignments: async (query?: any) => {
    const searchParams = new URLSearchParams();
    if (query?.page) searchParams.append('page', query.page.toString());
    if (query?.limit) searchParams.append('limit', query.limit.toString());
    if (query?.search) searchParams.append('search', query.search);
    if (query?.assignmentType) searchParams.append('assignmentType', query.assignmentType);
    if (query?.roleId) searchParams.append('roleId', query.roleId);
    if (query?.status) searchParams.append('status', query.status);
    if (query?.priority) searchParams.append('priority', query.priority);
    
    const qs = searchParams.toString();
    return await fetchWithAuth(`${API_BASE}${qs ? `?${qs}` : ''}`);
  },

  getAssignmentById: async (id: string) => {
    return await fetchWithAuth(`${API_BASE}/${id}`);
  },

  getKpis: async () => {
    return await fetchWithAuth(`${API_BASE}/kpi`);
  },

  createAssignment: async (data: any) => {
    return await fetchWithAuth(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string, comments?: string) => {
    return await fetchWithAuth(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comments }),
    });
  },
};
