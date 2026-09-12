import { ExamAuthority, ExamProgramme, ExamCycle } from '@study-karnataka/shared-types';

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

export async function fetchAuthorities(): Promise<ExamAuthority[]> {
  const res = await fetch(`${API_BASE}/admin/exam-authorities`, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch authorities');
  return data.data || [];
}

export async function createAuthority(payload: any): Promise<ExamAuthority> {
  const res = await fetch(`${API_BASE}/admin/exam-authorities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create authority');
  return data.data;
}

export async function deleteAuthority(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exam-authorities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete authority');
}

export async function fetchProgrammes(authorityId?: string): Promise<ExamProgramme[]> {
  const url = authorityId ? `${API_BASE}/admin/exam-programmes?authorityId=${authorityId}` : `${API_BASE}/admin/exam-programmes`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch programmes');
  return data.data || [];
}

export async function createProgramme(payload: any): Promise<ExamProgramme> {
  const res = await fetch(`${API_BASE}/admin/exam-programmes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create programme');
  return data.data;
}

export async function deleteProgramme(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exam-programmes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete programme');
}

export async function fetchExams(filters?: {
  authorityId?: string;
  programmeId?: string;
  year?: number;
  status?: string;
  visibility?: string;
  search?: string;
}): Promise<ExamCycle[]> {
  const params = new URLSearchParams();
  if (filters?.authorityId) params.append('authorityId', filters.authorityId);
  if (filters?.programmeId) params.append('programmeId', filters.programmeId);
  if (filters?.year) params.append('year', String(filters.year));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.visibility) params.append('visibility', filters.visibility);
  if (filters?.search) params.append('search', filters.search);

  const res = await fetch(`${API_BASE}/admin/exams?${params.toString()}`, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch exams');
  return data.data || [];
}

export async function fetchExamById(id: string): Promise<ExamCycle> {
  const res = await fetch(`${API_BASE}/admin/exams/${id}`, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch exam detail');
  return data.data;
}

export async function createExam(payload: any): Promise<ExamCycle> {
  const res = await fetch(`${API_BASE}/admin/exams`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create exam');
  return data.data;
}

export async function updateExam(id: string, payload: any): Promise<ExamCycle> {
  const res = await fetch(`${API_BASE}/admin/exams/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to update exam');
  return data.data;
}

export async function triggerWorkflowAction(id: string, action: string, reason?: string, visibility?: string): Promise<ExamCycle> {
  const actionMap: Record<string, string> = {
    SUBMIT_REVIEW: 'submit-review',
    REQUEST_CHANGES: 'request-changes',
    APPROVE: 'approve',
    PUBLISH: 'publish',
    CLOSE: 'close',
    ARCHIVE: 'archive',
    REOPEN: 'reopen',
  };

  const endpoint = actionMap[action];
  if (!endpoint) throw new Error(`Invalid action: ${action}`);

  const res = await fetch(`${API_BASE}/admin/exams/${id}/${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, reason, visibility }),
  });

  const data = await parseResponse(res, `Failed to execute ${action}`);
  return data.data;
}

export async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exams/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete exam');
}
