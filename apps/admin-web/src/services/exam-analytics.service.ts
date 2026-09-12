import {
  ApiResponse,
  ExamPortfolioOverview,
  ExamReadinessListItem,
  ExamWorkflowQueue,
  ExamImportantDateAnalytics,
  ExamStaleWorkItem,
  ExamReadinessDetail,
  ExamReadinessIssue,
  ExamAnalyticsFilters,
} from '@study-karnataka/shared-types';

const API_BASE_URL = '/api/v1/admin/exam-analytics';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const data = await res.json();
  if (!res.ok || !data.success) {
    const errorMsg = data.error?.message || data.message || 'Request failed';
    throw new Error(errorMsg);
  }
  return data;
}

function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  const str = params.toString();
  return str ? `?${str}` : '';
}

export async function fetchPortfolioOverview(filters: ExamAnalyticsFilters = {}): Promise<ExamPortfolioOverview> {
  const url = `${API_BASE_URL}/overview${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamPortfolioOverview>(res);
  return body.data!;
}

export async function fetchReadinessList(filters: ExamAnalyticsFilters = {}): Promise<{ data: ExamReadinessListItem[]; meta: any }> {
  const url = `${API_BASE_URL}/readiness${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamReadinessListItem[]>(res);
  return { data: body.data || [], meta: body.meta };
}

export async function fetchWorkflowQueues(filters: ExamAnalyticsFilters = {}): Promise<ExamWorkflowQueue> {
  const url = `${API_BASE_URL}/workflow${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamWorkflowQueue>(res);
  return body.data!;
}

export async function fetchImportantDatesAnalytics(filters: ExamAnalyticsFilters = {}): Promise<ExamImportantDateAnalytics> {
  const url = `${API_BASE_URL}/important-dates${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamImportantDateAnalytics>(res);
  return body.data!;
}

export async function fetchStaleWorkItems(filters: ExamAnalyticsFilters = {}): Promise<ExamStaleWorkItem[]> {
  const url = `${API_BASE_URL}/stale${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamStaleWorkItem[]>(res);
  return body.data || [];
}

export async function fetchPerExamReadinessDetail(examId: string): Promise<ExamReadinessDetail> {
  const url = `${API_BASE_URL}/exams/${examId}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamReadinessDetail>(res);
  return body.data!;
}

export async function fetchPerExamIssues(
  examId: string,
  filters: { category?: string; severity?: string; blocking?: boolean } = {}
): Promise<ExamReadinessIssue[]> {
  const url = `${API_BASE_URL}/exams/${examId}/issues${buildQueryString(filters)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const body = await handleResponse<ExamReadinessIssue[]>(res);
  return body.data || [];
}
