import { TestAccessClassification } from './test.types';

export type TestSeriesWorkflowStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type TestSeriesReleaseMode = 'ALL_AVAILABLE' | 'SCHEDULED' | 'SEQUENTIAL';

export type SeriesQuestionReusePolicy = 'ALLOW_REPEATS' | 'NO_REPEAT';

export type SeriesTestEntryType = 'PRACTICE' | 'RANKED';

export interface TestSeriesTestResponse {
  id: string;
  testSeriesId: string;
  mockTestId: string;
  orderIndex: number;
  entryType: SeriesTestEntryType;
  availableFrom?: string | null;
  availableUntil?: string | null;
  labelEn?: string | null;
  labelKn?: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  mockTest?: {
    id: string;
    code: string;
    titleEn: string;
    titleKn: string;
    totalQuestions: number;
    durationMinutes: number;
    status: string;
    isPublished: boolean;
    selectionMode: string;
    accessClassification: string;
  };
}

export interface TestSeriesResponse {
  id: string;
  seqNumber?: number | null;
  code: string;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  instructionsEn?: string | null;
  instructionsKn?: string | null;
  examProgrammeId: string;
  examStageId?: string | null;
  examPaperId?: string | null;
  examProgramme?: {
    id: string;
    code: string;
    titleEn: string;
    titleKn: string;
  };
  examStage?: {
    id: string;
    code: string;
    nameEn: string;
    nameKn: string;
  } | null;
  examPaper?: {
    id: string;
    code: string;
    nameEn: string;
    nameKn: string;
  } | null;
  accessClassification: TestAccessClassification;
  releaseMode: TestSeriesReleaseMode;
  questionReusePolicy: SeriesQuestionReusePolicy;
  seriesStartAt?: string | null;
  seriesEndAt?: string | null;
  status: TestSeriesWorkflowStatus;
  isPublished: boolean;
  rejectionReason?: string | null;
  createdByAdminId?: string | null;
  submittedByAdminId?: string | null;
  reviewedByAdminId?: string | null;
  approvedByAdminId?: string | null;
  publishedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
  tests: TestSeriesTestResponse[];
  totalTests: number;
  studentReadyTestsCount: number;
  totalQuestionSlots: number;
  uniqueMcqCount: number;
  repeatedMcqCount: number;
  questionReusePercentage: number;
  isReusePolicyValid: boolean;
  reuseErrors: string[];
  duplicateMcqDetails: {
    mcqId: string;
    mcqCode?: string;
    locations: {
      testId: string;
      testCode: string;
      testTitleEn: string;
      orderIndex: number;
      questionDisplayOrder: number;
      entryType: SeriesTestEntryType;
    }[];
  }[];
  isReadinessValid: boolean;
  readinessErrors: string[];
}

export interface QuestionReuseValidationResult {
  isValid: boolean;
  policy: SeriesQuestionReusePolicy;
  totalTests: number;
  totalQuestionSlots: number;
  uniqueMcqCount: number;
  repeatedMcqCount: number;
  questionReusePercentage: number;
  duplicates: {
    mcqId: string;
    mcqCode?: string;
    locations: {
      testId: string;
      testCode: string;
      testTitleEn: string;
      orderIndex: number;
      questionDisplayOrder: number;
      entryType: SeriesTestEntryType;
    }[];
  }[];
  errors: string[];
}
