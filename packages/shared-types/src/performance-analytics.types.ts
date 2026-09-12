export type PerformanceSourceType = 'RANKED_TEST' | 'PRACTICE';

export type PerformanceOutcome = 'CORRECT' | 'INCORRECT' | 'UNANSWERED' | 'REVEALED';

export type PerformanceStatus = 'NOT_STARTED' | 'NEEDS_MORE_DATA' | 'NEEDS_REVIEW' | 'DEVELOPING' | 'STRONG';

export type PerformanceTimeframe = '7D' | '30D' | '90D' | 'ALL_TIME';

export interface StudentPerformanceOverview {
  totalAnswered: number;
  uniqueQuestionsSeen: number;
  overallAccuracy: number | null;
  rankedAccuracy: number | null;
  practiceAccuracy: number | null;
  rankedAnswered: number;
  practiceAnswered: number;
  needsReviewCount: number;
  developingCount: number;
  strongCount: number;
  timeframe: PerformanceTimeframe;
}

export interface TaxonomyPerformanceSummary {
  entityId: string;
  entityName: string;
  entityCode: string;
  level: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
  categoryId: string;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;
  totalEvents: number;
  answeredEvents: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  revealedCount: number;
  uniqueQuestionCount: number;
  latestUniqueCorrectCount: number;
  latestUniqueIncorrectCount: number;
  recentAccuracy: number | null;
  lifetimeAccuracy: number | null;
  latestUniqueAccuracy: number | null;
  repeatedWrongCount: number;
  status: PerformanceStatus;
  statusLabel: string;
  priorityScore: number;
  lastActivityAt?: string | Date | null;
  trend?: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
}

export interface FrequentlyWrongQuestionItem {
  mcqQuestionId: string;
  code: string;
  questionText: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  timesWrong: number;
  timesCorrect: number;
  timesSeen: number;
  latestOutcome: PerformanceOutcome;
  lastAttemptedAt: string | Date;
  difficulty: string;
  isPyq: boolean;
}

export interface PerformanceRecommendationItem {
  id: string;
  type: 'PRACTICE_WEAK_AREA' | 'RETRY_INCORRECT' | 'TRY_HARDER_DIFFICULTY' | 'CONTINUE_PRACTICE';
  title: string;
  description: string;
  reason: string;
  categoryId?: string;
  subcategoryId?: string;
  topicId?: string;
  suggestedMode: 'WEAK_AREA' | 'INCORRECT_RETRY' | 'MIXED';
  isAvailable: boolean;
  availabilityMessage?: string;
}

export interface UnifiedResultItem {
  id: string;
  sourceType: PerformanceSourceType;
  sourceRecordId: string;
  title: string;
  subtitle?: string;
  status: string;
  isResultsAwaited: boolean;
  score?: number | null;
  maxScore?: number | null;
  rank?: number | null;
  totalParticipants?: number | null;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number | null;
  accuracyPercentage: number | null;
  date: string | Date;
  detailUrl: string;
}

export interface AdminPerformanceOverview {
  totalStudentsWithActivity: number;
  totalAcademicResponses: number;
  overallAccuracy: number | null;
  rankedAccuracy: number | null;
  practiceAccuracy: number | null;
  rankedParticipationCount: number;
  practiceParticipationCount: number;
  topCategories: { categoryId: string; categoryName: string; accuracy: number; totalAnswered: number }[];
  lowestCategories: { categoryId: string; categoryName: string; accuracy: number; totalAnswered: number }[];
}
