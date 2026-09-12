import { ExamCycleStatus, ExamVisibility } from './exam.types';
import { ExamPatternStatus } from './exam-pattern.types';
import { ExamSyllabusStatus } from './exam-syllabus.types';

export type ExamReadinessStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'READY'
  | 'LIVE'
  | 'ARCHIVED';

export type ExamReadinessSeverity = 'BLOCKER' | 'WARNING' | 'INFORMATION';

export type ExamReadinessCategory =
  | 'BASIC_DETAILS'
  | 'BILINGUAL_CONTENT'
  | 'ELIGIBILITY'
  | 'IMPORTANT_DATES'
  | 'OFFICIAL_RESOURCES'
  | 'SEO'
  | 'WORKFLOW'
  | 'PATTERN'
  | 'STAGES'
  | 'PAPERS'
  | 'SECTIONS'
  | 'SYLLABUS'
  | 'PUBLICATION'
  | 'VISIBILITY';

export interface ExamReadinessIssue {
  code: string;
  category: ExamReadinessCategory;
  severity: ExamReadinessSeverity;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  field?: string | null;
  message: string;
  suggestedAction?: string | null;
  destinationRoute?: string | null;
  blocking: boolean;
  createdFromRule: string;
}

export interface ExamReadinessCheck {
  code: string;
  name: string;
  category: ExamReadinessCategory;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_APPLICABLE';
  isBlocking: boolean;
  message?: string;
}

export interface ExamReadinessSection {
  title: string;
  category: ExamReadinessCategory;
  checks: ExamReadinessCheck[];
  passedCount: number;
  totalCount: number;
  blockerCount: number;
  warningCount: number;
}

export interface ExamReadinessSummary {
  completionPercentage: number;
  overallStatus: ExamReadinessStatus;
  blockerCount: number;
  warningCount: number;
  informationCount: number;
  issues: ExamReadinessIssue[];
  nextRequiredAction?: string | null;
}

export interface ExamPortfolioOverview {
  totalAuthorities: number;
  activeAuthorities: number;
  totalProgrammes: number;
  activeProgrammes: number;
  totalCycles: number;
  statusCounts: Record<ExamCycleStatus, number>;
  visibilityCounts: Record<ExamVisibility, number>;
  readinessCounts: Record<ExamReadinessStatus, number>;
  bilingualCounts: {
    bothComplete: number;
    englishCompleteOnly: number;
    kannadaCompleteOnly: number;
    incomplete: number;
  };
  patternReadinessCounts: {
    hasCurrentPattern: number;
    missingPattern: number;
    publishedPattern: number;
    draftOrPendingPattern: number;
  };
  syllabusReadinessCounts: {
    hasCurrentSyllabus: number;
    missingSyllabus: number;
    publishedSyllabus: number;
    draftOrPendingSyllabus: number;
  };
  staleCount: number;
  asOf: string;
}

export interface ExamWorkflowQueueItem {
  id: string;
  examId: string;
  titleEn: string;
  titleKn: string;
  cycleCode: string;
  cycleYear: number;
  authorityNameEn: string;
  programmeNameEn: string;
  currentStatus: ExamCycleStatus | ExamPatternStatus | ExamSyllabusStatus;
  queueCategory:
    | 'AWAITING_CONTENT_MANAGER'
    | 'AWAITING_REVIEWER'
    | 'AWAITING_SUPER_ADMIN_PUBLICATION'
    | 'BLOCKED_BY_VALIDATION'
    | 'MISSING_CURRENT_PATTERN'
    | 'MISSING_CURRENT_SYLLABUS'
    | 'BILINGUAL_INCOMPLETE'
    | 'STALE_DRAFT';
  updatedAt: string;
  daysWithoutUpdate: number;
  responsibleRole: string;
  blockerCount: number;
  destinationRoute: string;
}

export interface ExamWorkflowQueue {
  awaitingManager: ExamWorkflowQueueItem[];
  awaitingReviewer: ExamWorkflowQueueItem[];
  awaitingSuperAdmin: ExamWorkflowQueueItem[];
  blockedByValidation: ExamWorkflowQueueItem[];
  missingPattern: ExamWorkflowQueueItem[];
  missingSyllabus: ExamWorkflowQueueItem[];
  bilingualIncomplete: ExamWorkflowQueueItem[];
  staleDrafts: ExamWorkflowQueueItem[];
}

export interface ExamImportantDateItem {
  id: string;
  examId: string;
  examTitleEn: string;
  examTitleKn: string;
  authorityNameEn: string;
  programmeNameEn: string;
  dateType: string;
  labelEn: string;
  labelKn: string;
  startAt: string;
  endAt?: string | null;
  isTentative: boolean;
  stageNameEn?: string | null;
  destinationRoute: string;
  isPast: boolean;
  isClosingSoon: boolean;
}

export interface ExamImportantDateAnalytics {
  today: ExamImportantDateItem[];
  next7Days: ExamImportantDateItem[];
  next30Days: ExamImportantDateItem[];
  next90Days: ExamImportantDateItem[];
  pastDates: ExamImportantDateItem[];
  tentativeDates: ExamImportantDateItem[];
  applicationsOpen: ExamImportantDateItem[];
  applicationsClosingSoon: ExamImportantDateItem[];
  upcomingExams: ExamImportantDateItem[];
  upcomingResults: ExamImportantDateItem[];
  stageLinkedDates: ExamImportantDateItem[];
}

export interface ExamStaleWorkItem {
  entityType: 'EXAM_CYCLE' | 'EXAM_PATTERN' | 'EXAM_SYLLABUS';
  entityId: string;
  examId: string;
  label: string;
  currentStatus: string;
  updatedAt: string;
  daysWithoutUpdate: number;
  responsibleRole: string;
  destinationRoute: string;
}

export interface ExamReadinessListItem {
  id: string;
  cycleCode: string;
  cycleYear: number;
  titleEn: string;
  titleKn: string;
  authorityId: string;
  authorityNameEn: string;
  authorityNameKn: string;
  programmeId: string;
  programmeNameEn: string;
  programmeNameKn: string;
  status: ExamCycleStatus;
  visibility: ExamVisibility;
  englishReadiness: 'COMPLETE' | 'INCOMPLETE';
  kannadaReadiness: 'COMPLETE' | 'INCOMPLETE';
  bilingualState: 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE';
  examRecordReadiness: ExamReadinessStatus;
  patternReadiness: ExamReadinessStatus;
  syllabusReadiness: ExamReadinessStatus;
  patternStatus?: ExamPatternStatus | null;
  syllabusStatus?: ExamSyllabusStatus | null;
  overallCompletionPercentage: number;
  overallReadinessStatus: ExamReadinessStatus;
  blockerCount: number;
  warningCount: number;
  nextRequiredAction?: string | null;
  lastUpdated: string;
  patternRevisionNumber?: number | null;
  syllabusRevisionNumber?: number | null;
}

export interface ExamReadinessDetail {
  overview: {
    examId: string;
    titleEn: string;
    titleKn: string;
    cycleCode: string;
    cycleYear: number;
    authorityNameEn: string;
    authorityNameKn: string;
    programmeNameEn: string;
    programmeNameKn: string;
    status: ExamCycleStatus;
    visibility: ExamVisibility;
    overallReadiness: ExamReadinessStatus;
    completionPercentage: number;
    blockerCount: number;
    warningCount: number;
    nextAction?: string | null;
    lastUpdated: string;
  };
  examRecordSection: ExamReadinessSection;
  patternSection: ExamReadinessSection & {
    currentRevision?: number | null;
    status?: ExamPatternStatus | null;
    stageCount: number;
    paperCount: number;
    sectionCount: number;
    totalMarks: number;
    totalMeritMarks: number;
    totalQualifyingMarks: number;
    totalQuestions: number;
    approximateDurationMinutes: number;
    validationIssues: Array<{ code: string; message: string; severity: string }>;
  };
  syllabusSection: ExamReadinessSection & {
    currentRevision?: number | null;
    linkedPatternRevision?: number | null;
    status?: ExamSyllabusStatus | null;
    totalNodes: number;
    activeNodes: number;
    inactiveNodes: number;
    rootNodes: number;
    maxDepth: number;
    subjectCount: number;
    unitCount: number;
    topicCount: number;
    subtopicCount: number;
    knowledgeAreaCount: number;
    englishCompleteNodes: number;
    kannadaCompleteNodes: number;
    bothLanguageCompleteNodes: number;
    incompleteNodes: number;
    globalScopeNodes: number;
    stageScopedNodes: number;
    paperScopedNodes: number;
    validationIssues: Array<{ code: string; message: string; severity: string }>;
  };
  publicationSection: ExamReadinessSection & {
    isEligibleForPublication: boolean;
    isEligibleForPublicApi: boolean;
    publicationBlockers: ExamReadinessIssue[];
  };
  issues: ExamReadinessIssue[];
  recentActivity: Array<{
    id: string;
    adminUserId: string;
    adminName: string;
    action: string;
    module: string;
    recordType?: string | null;
    recordId?: string | null;
    createdAt: string;
  }>;
  asOf: string;
}

export interface ExamAnalyticsFilters {
  search?: string;
  authorityId?: string;
  programmeId?: string;
  cycleYear?: number;
  status?: ExamCycleStatus;
  visibility?: ExamVisibility;
  readinessStatus?: ExamReadinessStatus;
  bilingualState?: 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE';
  patternStatus?: ExamPatternStatus;
  syllabusStatus?: ExamSyllabusStatus;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
