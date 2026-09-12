export type PracticeSelectionMode = 'MIXED' | 'NEW_ONLY' | 'WEAK_AREA' | 'INCORRECT_RETRY';
export type PracticeSessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type PracticeAccessClassification = 'FREE' | 'PAID' | 'FREEMIUM';

export interface PracticeScope {
  categoryId: string;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;
}

export interface PracticeAvailabilityParams {
  categoryId: string;
  subcategoryId?: string;
  topicId?: string;
  knowledgeAreaId?: string;
  selectionMode?: PracticeSelectionMode;
  difficultyFilter?: string;
  pyqFilter?: string;
  requestedQuestionCount?: number;
}

export interface PracticeAvailabilityResult {
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  topicId?: string;
  topicName?: string;
  knowledgeAreaId?: string;
  knowledgeAreaName?: string;
  totalApprovedInScope: number;
  unseenCount: number;
  previouslyCorrectCount: number;
  previouslyIncorrectCount: number;
  eligibleCount: number;
  requestedQuestionCount: number;
  hasShortage: boolean;
  shortageMessage?: string;
}

export interface StartPracticeSessionPayload {
  categoryId: string;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;
  selectionMode: PracticeSelectionMode;
  difficultyFilter?: string | null;
  pyqFilter?: string | null;
  requestedQuestionCount: number;
  acceptShortage?: boolean;
}

export interface PracticeQuestionPayload {
  sessionQuestionId: string;
  questionId: string;
  displayOrder: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: string;
  isPyq: boolean;
  pyqExamName?: string | null;
  pyqYear?: number | null;
  sourceName?: string | null;
  selectedOption?: string | null;
  isAnswered: boolean;
  isCorrect?: boolean | null;
  isRevealed: boolean;
  markedForRevision: boolean;
  // Answer & explanation are omitted in question list before submission to prevent leaks
  correctOption?: string;
  explanation?: string;
}

export interface SubmitPracticeAnswerPayload {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}

export interface SubmitPracticeAnswerResult {
  sessionQuestionId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  firstAttempt: boolean;
  correctOption: string;
  explanation: string;
}

export interface PracticeSessionSummary {
  id: string;
  studentId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  knowledgeAreaId?: string | null;
  knowledgeAreaName?: string | null;
  selectionMode: PracticeSelectionMode;
  difficultyFilter?: string | null;
  pyqFilter?: string | null;
  requestedQuestionCount: number;
  actualQuestionCount: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracyPercentage: number;
  timeSpentSeconds: number;
  markedForRevisionCount: number;
  preparationLanguage?: string;
  status: PracticeSessionStatus;
  startedAt: string | Date;
  completedAt?: string | Date | null;
  recommendations: string[];
}

export interface StudentPracticeProgressStats {
  totalQuestionsAttempted: number;
  uniqueQuestionsSeen: number;
  totalCorrect: number;
  totalWrong: number;
  accuracyPercentage: number;
  activeSessionsCount: number;
  completedSessionsCount: number;
  weakTopicsCount: number;
  strongTopicsCount: number;
  lastPracticedAt?: string | Date | null;
}

export interface WeakAreaItem {
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  knowledgeAreaId?: string | null;
  knowledgeAreaName?: string | null;
  totalAttempted: number;
  uniqueSeen: number;
  totalCorrect: number;
  totalWrong: number;
  accuracyPercentage: number;
  statusLabel: 'UNSEEN' | 'NEEDS_REVIEW' | 'WEAK' | 'DEVELOPING' | 'STRONG';
}

export interface TopicPracticeConfigPayload {
  categoryId?: string | null;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;
  isEnabled?: boolean;
  accessClassification?: PracticeAccessClassification;
  maxQuestions?: number;
  allowedDifficulties?: string;
  labelEn?: string;
  labelKn?: string;
}
