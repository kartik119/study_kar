import {
  PracticeAvailabilityParams,
  PracticeAvailabilityResult,
  StartPracticeSessionPayload,
  PracticeQuestionPayload,
  SubmitPracticeAnswerPayload,
  SubmitPracticeAnswerResult,
  PracticeSessionSummary,
  StudentPracticeProgressStats,
  WeakAreaItem,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/student/topic-practice';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('student_token') || 'dev_student_token';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options?.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || data.message || 'API Request Failed');
  }

  return data.data;
}

export const StudentTopicPracticeApi = {
  checkAvailability: async (params: PracticeAvailabilityParams): Promise<PracticeAvailabilityResult> => {
    return fetchJson(`${API_BASE}/availability`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  startSession: async (
    payload: StartPracticeSessionPayload
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> => {
    return fetchJson(`${API_BASE}/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSession: async (
    sessionId: string
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}`);
  },

  submitAnswer: async (
    sessionId: string,
    payload: SubmitPracticeAnswerPayload
  ): Promise<SubmitPracticeAnswerResult> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  skipQuestion: async (sessionId: string, questionId: string): Promise<{ success: boolean; nextQuestionId?: string }> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  },

  revealAnswer: async (sessionId: string, questionId: string): Promise<SubmitPracticeAnswerResult> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/reveal`, {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  },

  toggleMarkForRevision: async (sessionId: string, questionId: string): Promise<{ questionId: string; markedForRevision: boolean }> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/revision-mark`, {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  },

  completeSession: async (sessionId: string, timeSpentSeconds?: number): Promise<PracticeSessionSummary> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ timeSpentSeconds }),
    });
  },

  abandonSession: async (sessionId: string): Promise<{ id: string; status: string }> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/abandon`, {
      method: 'POST',
    });
  },

  retryIncorrectSession: async (
    sessionId: string
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> => {
    return fetchJson(`${API_BASE}/sessions/${sessionId}/retry-incorrect`, {
      method: 'POST',
    });
  },

  getHistory: async (): Promise<PracticeSessionSummary[]> => {
    return fetchJson(`${API_BASE}/history`);
  },

  getWeakAreas: async (): Promise<WeakAreaItem[]> => {
    return fetchJson(`${API_BASE}/weak-areas`);
  },

  getStats: async (): Promise<StudentPracticeProgressStats> => {
    return fetchJson(`${API_BASE}/stats`);
  },
};
