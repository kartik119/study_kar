import { TestAccessClassification, PreparationLanguage } from './index';

export type RankedTestMode = 'ANYTIME_RANKED' | 'SCHEDULED_LIVE';

export type RankedTestStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'RESULTS_PUBLISHED' | 'ARCHIVED';

export type RankedResultPublicationStatus = 'PENDING' | 'READY' | 'PUBLISHED';

export type RankedSolutionReleasePolicy = 'AFTER_RESULTS_PUBLISHED' | 'NEVER';

export type RankedAttemptStatus = 'ACTIVE' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'INVALIDATED';

export type RankedSubmissionType = 'MANUAL' | 'AUTO_TIMED_OUT';

export interface RankedTestResponse {
  id: string;
  code: string;
  mockTestId: string;
  testSeriesTestId?: string | null;
  mode: RankedTestMode;
  status: RankedTestStatus;
  availableFrom: string;
  startDeadlineAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  latestJoinAt?: string | null;
  resultPublicationStatus: RankedResultPublicationStatus;
  solutionReleasePolicy: RankedSolutionReleasePolicy;
  createdByAdminId?: string | null;
  publishedByAdminId?: string | null;
  closedAt?: string | null;
  resultsPublishedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Embedded read-only preview of underlying Test
  mockTest?: {
    id: string;
    code: string;
    titleEn: string;
    titleKn: string;
    totalQuestions: number;
    durationMinutes: number;
    totalMarks: number;
    status: string;
    isPublished: boolean;
    examCycleId?: string | null;
    examCycle?: {
      id: string;
      cycleCode: string;
      titleEn: string;
      titleKn: string;
    } | null;
  } | null;

  // Operational metrics
  totalEligibleCount?: number;
  totalAttemptsCount?: number;
  activeAttemptsCount?: number;
  submittedAttemptsCount?: number;
  autoSubmittedAttemptsCount?: number;
  invalidatedAttemptsCount?: number;

  // Derived readiness check
  isReadinessValid?: boolean;
  readinessErrors?: string[];
}

export interface StudentRankedTestSummary {
  id: string;
  code: string;
  title: string;
  examTitle: string;
  mode: RankedTestMode;
  totalQuestions: number;
  durationMinutes: number;
  availableFrom: string;
  startDeadlineAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  latestJoinAt?: string | null;
  status: RankedTestStatus;
  resultPublicationStatus: RankedResultPublicationStatus;
  attemptState: 'NOT_STARTED' | 'ACTIVE' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'INVALIDATED' | 'RESULTS_PUBLISHED';
  myAttemptId?: string | null;
}

export interface StudentAttemptResponse {
  attemptId: string;
  rankedTestId: string;
  rankedTestCode: string;
  testTitle: string;
  status: RankedAttemptStatus;
  startedAt: string;
  expiresAt: string;
  serverNow: string;
  remainingSeconds: number;
  preparationLanguage: PreparationLanguage;
  totalQuestions: number;
  attemptedCount: number;
  isExpired: boolean;
  savedAnswers: Record<string, { selectedOption: string | null; isMarkedForReview: boolean }>;
}

export interface StudentAttemptQuestionPayload {
  mockTestQuestionId: string;
  questionId: string;
  displayOrder: number;
  sectionTitle?: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  positiveMarks: number;
  negativeMarks: number;
}

export interface SaveRankedAnswerPayload {
  mockTestQuestionId: string;
  selectedOption?: string | null; // 'A' | 'B' | 'C' | 'D' | null
  isMarkedForReview?: boolean;
}

export interface StudentResultResponse {
  rankedTestId: string;
  rankedTestCode: string;
  testTitle: string;
  status: RankedTestStatus;
  resultPublicationStatus: RankedResultPublicationStatus;
  rank?: number | null;
  totalParticipants?: number | null;
  rawScore?: number | null;
  maximumMarks?: number | null;
  correctCount?: number | null;
  wrongCount?: number | null;
  unansweredCount?: number | null;
  percentage?: number | null;
  timeTakenSeconds?: number | null;
  publishedAt?: string | null;
  solutionReleasePolicy: RankedSolutionReleasePolicy;
  canViewSolutions: boolean;
}

export interface LeaderboardEntryResponse {
  rank: number;
  studentDisplayName: string;
  rawScore: number;
  correctCount: number;
  wrongCount: number;
  timeTakenSeconds: number;
  isCurrentStudent: boolean;
}

export interface SolutionReviewItem {
  mockTestQuestionId: string;
  displayOrder: number;
  sectionTitle?: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  studentSelectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  positiveMarks: number;
  negativeMarks: number;
  marksAwarded: number;
}
