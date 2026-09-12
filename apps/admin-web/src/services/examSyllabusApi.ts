import {
  ExamSyllabus,
  ExamSyllabusNode,
  SyllabusCalculatedTotals,
  SyllabusValidationResult,
  ExamSyllabusNodeType,
  ExamSyllabusScopeType,
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

export interface CreateSyllabusPayload {
  examPatternId: string;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  generalInstructionsEn?: string;
  generalInstructionsKn?: string;
  sourceResourceId?: string;
  sourceReference?: string;
}

export interface CreateNodePayload {
  parentId?: string | null;
  code: string;
  nodeType: ExamSyllabusNodeType;
  scopeType?: ExamSyllabusScopeType;
  examStageId?: string | null;
  examPaperId?: string | null;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string;
  shortNameKn?: string;
  descriptionEn?: string;
  descriptionKn?: string;
  officialTextEn?: string;
  officialTextKn?: string;
  sourceReference?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface DetailedSyllabusResponse extends ExamSyllabus {
  validation: SyllabusValidationResult;
  totals: SyllabusCalculatedTotals;
}

export const examSyllabusApi = {
  // Revisions
  getSyllabiByExam: async (examId: string): Promise<ExamSyllabus[]> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi`, { headers: getAuthHeaders() });
    const data = await parseResponse(res, 'Failed to fetch syllabus revisions');
    return data.data || [];
  },

  getSyllabusById: async (examId: string, syllabusId: string): Promise<DetailedSyllabusResponse> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}`, { headers: getAuthHeaders() });
    const data = await parseResponse(res, 'Failed to fetch syllabus details');
    return data.data;
  },

  createSyllabus: async (examId: string, payload: CreateSyllabusPayload): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res, 'Failed to create syllabus revision');
    return data.data;
  },

  updateSyllabus: async (examId: string, syllabusId: string, payload: Partial<CreateSyllabusPayload>): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res, 'Failed to update syllabus revision');
    return data.data;
  },

  deleteDraftSyllabus: async (examId: string, syllabusId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await parseResponse(res, 'Failed to delete draft syllabus');
  },

  cloneSyllabusRevision: async (examId: string, syllabusId: string, targetPatternId?: string): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}/clone-revision`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetPatternId }),
    });
    const data = await parseResponse(res, 'Failed to clone syllabus revision');
    return data.data;
  },

  // Workflow
  submitReview: async (examId: string, syllabusId: string): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}/submit-review`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to submit syllabus for review');
    return data.data;
  },

  requestChanges: async (examId: string, syllabusId: string): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}/request-changes`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to request changes');
    return data.data;
  },

  approveSyllabus: async (examId: string, syllabusId: string): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to approve syllabus revision');
    return data.data;
  },

  publishSyllabus: async (examId: string, syllabusId: string): Promise<ExamSyllabus> => {
    const res = await fetch(`${API_BASE}/admin/exams/${examId}/syllabi/${syllabusId}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to publish syllabus revision');
    return data.data;
  },

  // Nodes
  getNodes: async (syllabusId: string): Promise<ExamSyllabusNode[]> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes`, { headers: getAuthHeaders() });
    const data = await parseResponse(res, 'Failed to fetch syllabus nodes');
    return data.data || [];
  },

  createNode: async (syllabusId: string, payload: CreateNodePayload): Promise<ExamSyllabusNode> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res, 'Failed to create syllabus node');
    return data.data;
  },

  updateNode: async (syllabusId: string, nodeId: string, payload: Partial<CreateNodePayload>): Promise<ExamSyllabusNode> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res, 'Failed to update syllabus node');
    return data.data;
  },

  moveNode: async (syllabusId: string, nodeId: string, targetParentId?: string | null, displayOrder?: number): Promise<ExamSyllabusNode> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}/move`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetParentId, displayOrder }),
    });
    const data = await parseResponse(res, 'Failed to move syllabus node');
    return data.data;
  },

  reorderNodes: async (syllabusId: string, orderedIds: string[]): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/reorder`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderedIds }),
    });
    await parseResponse(res, 'Failed to reorder syllabus nodes');
  },

  deleteNode: async (syllabusId: string, nodeId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await parseResponse(res, 'Failed to delete syllabus node');
  },

  deleteSubtree: async (syllabusId: string, nodeId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}/delete-subtree`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmDeleteSubtree: true }),
    });
    await parseResponse(res, 'Failed to delete syllabus node subtree');
  },

  activateNode: async (syllabusId: string, nodeId: string): Promise<ExamSyllabusNode> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}/activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to activate node');
    return data.data;
  },

  deactivateNode: async (syllabusId: string, nodeId: string): Promise<ExamSyllabusNode> => {
    const res = await fetch(`${API_BASE}/admin/syllabi/${syllabusId}/nodes/${nodeId}/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await parseResponse(res, 'Failed to deactivate node');
    return data.data;
  },
};
