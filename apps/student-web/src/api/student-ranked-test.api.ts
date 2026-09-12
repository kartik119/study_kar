import {
  StudentRankedTestSummary,
  StudentAttemptResponse,
  StudentAttemptQuestionPayload,
  StudentResultResponse,
  LeaderboardEntryResponse,
  SolutionReviewItem,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/student/ranked-tests';

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

export const StudentRankedTestApi = {
  getStudentRankedTests: async (): Promise<StudentRankedTestSummary[]> => {
    return fetchJson(`${API_BASE}`);
  },

  startOrResumeAttempt: async (rankedTestId: string): Promise<StudentAttemptResponse> => {
    return fetchJson(`${API_BASE}/${rankedTestId}/start`, { method: 'POST' });
  },

  getAttemptQuestions: async (attemptId: string): Promise<StudentAttemptQuestionPayload[]> => {
    return fetchJson(`${API_BASE}/attempts/${attemptId}/questions`);
  },

  saveAnswer: async (
    attemptId: string,
    mockTestQuestionId: string,
    selectedOption: string | null,
    isMarkedForReview?: boolean
  ): Promise<any> => {
    return fetchJson(`${API_BASE}/attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ mockTestQuestionId, selectedOption, isMarkedForReview }),
    });
  },

  submitAttempt: async (attemptId: string): Promise<any> => {
    return fetchJson(`${API_BASE}/attempts/${attemptId}/submit`, { method: 'POST' });
  },

  getStudentResult: async (rankedTestId: string): Promise<StudentResultResponse> => {
    return fetchJson(`${API_BASE}/${rankedTestId}/result`);
  },

  getLeaderboard: async (
    rankedTestId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<{ entries: LeaderboardEntryResponse[]; myRank: any; meta: any }> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));

    const token = localStorage.getItem('student_token') || 'dev_student_token';
    const res = await fetch(`${API_BASE}/${rankedTestId}/leaderboard?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to fetch Leaderboard');
    }
    return { entries: data.data, myRank: data.myRank, meta: data.meta };
  },

  getSolutionReview: async (rankedTestId: string): Promise<SolutionReviewItem[]> => {
    return fetchJson(`${API_BASE}/${rankedTestId}/solutions`);
  },
};
