import {
  ExamPattern,
  ExamStage,
  ExamPaper,
  ExamPaperSection,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatErrorMessage(msg: any): string {
  if (!msg) return '';
  if (typeof msg === 'string') {
    if (msg.trim().startsWith('[') || msg.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => item.message || JSON.stringify(item)).join('; ');
        }
      } catch (e) {
        // use raw string
      }
    }
    return msg;
  }
  return String(msg);
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
      const rawMsg = data.error?.message || defaultError;
      throw new Error(formatErrorMessage(rawMsg));
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
    throw new Error(formatErrorMessage(text) || `${defaultError} (HTTP ${res.status})`);
  }
  return { data: text };
}

// Pattern APIs
export async function fetchPatterns(examId: string): Promise<ExamPattern[]> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns`, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch pattern revisions');
  return data.data || [];
}

export async function createPattern(examId: string, payload: any): Promise<ExamPattern> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create pattern');
  return data.data;
}

export async function fetchPatternById(examId: string, patternId: string): Promise<ExamPattern> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}`, { headers: getAuthHeaders() });
  const data = await parseResponse(res, 'Failed to fetch pattern detail');
  return data.data;
}

export async function updatePattern(examId: string, patternId: string, payload: any): Promise<ExamPattern> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to update pattern');
  return data.data;
}

export async function deleteDraftPattern(examId: string, patternId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete draft pattern');
}

export async function clonePatternRevision(examId: string, patternId: string): Promise<ExamPattern> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/clone-revision`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await parseResponse(res, 'Failed to clone pattern revision');
  return data.data;
}

export async function triggerPatternWorkflow(
  examId: string,
  patternId: string,
  action: 'submit-review' | 'request-changes' | 'approve' | 'publish',
  reason?: string
): Promise<ExamPattern> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/${action}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await parseResponse(res, `Failed to ${action} pattern`);
  return data.data;
}

// Stage APIs
export async function createStage(examId: string, patternId: string, payload: any): Promise<ExamStage> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/stages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create stage');
  return data.data;
}

export async function updateStage(examId: string, patternId: string, stageId: string, payload: any): Promise<ExamStage> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/stages/${stageId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to update stage');
  return data.data;
}

export async function deleteDraftStage(examId: string, patternId: string, stageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/stages/${stageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete stage');
}

export async function reorderStages(examId: string, patternId: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/patterns/${patternId}/stages/reorder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderedIds }),
  });
  await parseResponse(res, 'Failed to reorder stages');
}

// Paper APIs
export async function createPaper(stageId: string, payload: any): Promise<ExamPaper> {
  const res = await fetch(`${API_BASE}/admin/stages/${stageId}/papers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create paper');
  return data.data;
}

export async function updatePaper(stageId: string, paperId: string, payload: any): Promise<ExamPaper> {
  const res = await fetch(`${API_BASE}/admin/stages/${stageId}/papers/${paperId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to update paper');
  return data.data;
}

export async function deleteDraftPaper(stageId: string, paperId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/stages/${stageId}/papers/${paperId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete paper');
}

export async function reorderPapers(stageId: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/stages/${stageId}/papers/reorder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderedIds }),
  });
  await parseResponse(res, 'Failed to reorder papers');
}

// Section APIs
export async function createSection(paperId: string, payload: any): Promise<ExamPaperSection> {
  const res = await fetch(`${API_BASE}/admin/papers/${paperId}/sections`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to create section');
  return data.data;
}

export async function updateSection(paperId: string, sectionId: string, payload: any): Promise<ExamPaperSection> {
  const res = await fetch(`${API_BASE}/admin/papers/${paperId}/sections/${sectionId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res, 'Failed to update section');
  return data.data;
}

export async function deleteDraftSection(paperId: string, sectionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/papers/${paperId}/sections/${sectionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await parseResponse(res, 'Failed to delete section');
}

export async function reorderSections(paperId: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/papers/${paperId}/sections/reorder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderedIds }),
  });
  await parseResponse(res, 'Failed to reorder sections');
}
