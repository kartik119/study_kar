import {
  StudentPerformanceOverview,
  TaxonomyPerformanceSummary,
  FrequentlyWrongQuestionItem,
  PerformanceRecommendationItem,
  UnifiedResultItem,
  ApiResponse,
  PerformanceTimeframe,
} from '@study-karnataka/shared-types';

const API_BASE = '/api/v1/student';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('student_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class StudentPerformanceApi {
  static async getOverview(timeframe: PerformanceTimeframe = '30D', sourceType: string = 'ALL'): Promise<StudentPerformanceOverview> {
    const res = await fetch(`${API_BASE}/performance/overview?timeframe=${timeframe}&sourceType=${sourceType}`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<StudentPerformanceOverview> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch performance overview');
    }
    return json.data;
  }

  static async getCategories(): Promise<TaxonomyPerformanceSummary[]> {
    const res = await fetch(`${API_BASE}/performance/categories`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<TaxonomyPerformanceSummary[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch category performance');
    }
    return json.data;
  }

  static async getCategoryDetail(categoryId: string): Promise<TaxonomyPerformanceSummary[]> {
    const res = await fetch(`${API_BASE}/performance/categories/${categoryId}`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<TaxonomyPerformanceSummary[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch category detail');
    }
    return json.data;
  }

  static async getWeakAreas(): Promise<TaxonomyPerformanceSummary[]> {
    const res = await fetch(`${API_BASE}/performance/weak-areas`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<TaxonomyPerformanceSummary[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch weak areas');
    }
    return json.data;
  }

  static async getStrongAreas(): Promise<TaxonomyPerformanceSummary[]> {
    const res = await fetch(`${API_BASE}/performance/strong-areas`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<TaxonomyPerformanceSummary[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch strong areas');
    }
    return json.data;
  }

  static async getFrequentlyWrongQuestions(): Promise<FrequentlyWrongQuestionItem[]> {
    const res = await fetch(`${API_BASE}/performance/questions/frequently-wrong`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<FrequentlyWrongQuestionItem[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch frequently wrong questions');
    }
    return json.data;
  }

  static async getRecommendations(): Promise<PerformanceRecommendationItem[]> {
    const res = await fetch(`${API_BASE}/performance/recommendations`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<PerformanceRecommendationItem[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch recommendations');
    }
    return json.data;
  }

  static async getUnifiedResults(params?: { sourceType?: string; page?: number; pageSize?: number }): Promise<{ results: UnifiedResultItem[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.sourceType) query.append('sourceType', params.sourceType);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

    const res = await fetch(`${API_BASE}/results?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResponse<UnifiedResultItem[]> = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message || 'Failed to fetch unified results');
    }

    const meta: any = json.meta || {};
    return {
      results: json.data,
      total: meta.total || json.data.length,
      page: meta.page || 1,
      totalPages: meta.totalPages || 1,
    };
  }
}
