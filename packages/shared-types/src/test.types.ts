export type TestWorkflowStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type TestSelectionMode = 'MANUAL' | 'AUTOMATIC';
export type TestScoringPolicy = 'TEST_DEFAULT' | 'MCQ_DEFAULT';
export type TestAccessClassification = 'FREE' | 'PAID' | 'FREEMIUM';
export type PyqPreference = 'ANY' | 'EXCLUDE_PYQ' | 'PYQ_ONLY';

export interface TestCategoryDistributionDto {
  categoryId: string;
  categoryCode?: string;
  categoryNameEn?: string;
  categoryNameKn?: string;
  targetCount: number;
  availableCount?: number;
}

export interface TestSubcategoryDistributionDto {
  subcategoryId: string;
  subcategoryCode?: string;
  subcategoryNameEn?: string;
  subcategoryNameKn?: string;
  categoryId?: string;
  targetCount: number;
  availableCount?: number;
}

export interface TestDifficultyDistributionDto {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetCount: number;
  availableCount?: number;
}

export interface CreateTestDto {
  titleEn: string;
  titleKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  instructionsEn?: string;
  instructionsKn?: string;
  examCycleId?: string;
  examStageId?: string;
  examPaperId?: string;
  totalQuestions: number;
  durationMinutes: number;
  passingPercentage?: number;
  accessClassification?: TestAccessClassification;
  scoringPolicy?: TestScoringPolicy;
  positiveMarks?: number;
  negativeMarks?: number;
  selectionMode: TestSelectionMode;
  pyqPreference?: PyqPreference;
  categoryDistributions?: { categoryId: string; targetCount: number }[];
  subcategoryDistributions?: { subcategoryId: string; targetCount: number }[];
  difficultyDistributions?: { difficulty: 'EASY' | 'MEDIUM' | 'HARD'; targetCount: number }[];
}

export interface UpdateTestDto extends Partial<CreateTestDto> {}

export interface AvailabilityCheckRequest {
  totalQuestions: number;
  examCycleId?: string;
  pyqPreference?: PyqPreference;
  categoryDistributions: { categoryId: string; targetCount: number }[];
  subcategoryDistributions?: { subcategoryId: string; targetCount: number }[];
  difficultyDistributions: { difficulty: 'EASY' | 'MEDIUM' | 'HARD'; targetCount: number }[];
}

export interface ShortageDetail {
  dimension: 'CATEGORY' | 'SUBCATEGORY' | 'DIFFICULTY' | 'INTERSECTION';
  identifier: string;
  nameEn: string;
  required: number;
  available: number;
  shortage: number;
}

export interface AvailabilityCheckResult {
  isFeasible: boolean;
  totalQuestions: number;
  totalAvailableEligiblePool: number;
  categoryStatus: {
    categoryId: string;
    code: string;
    nameEn: string;
    required: number;
    available: number;
    isSufficient: boolean;
  }[];
  difficultyStatus: {
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    required: number;
    available: number;
    isSufficient: boolean;
  }[];
  shortages: ShortageDetail[];
  correctiveSuggestions: string[];
}

export interface TestQuestionDto {
  id: string;
  mockTestId: string;
  questionId: string;
  displayOrder: number;
  selectionSource: 'MANUAL' | 'AUTOMATIC';
  selectedCategoryId?: string;
  selectedSubcategoryId?: string;
  selectedDifficulty?: string;
  positiveMarks: number;
  negativeMarks: number;
  question: any;
  // Snapshot properties when published
  snapshotQuestionEn?: string;
  snapshotQuestionKn?: string;
  snapshotOptionA_En?: string;
  snapshotOptionA_Kn?: string;
  snapshotOptionB_En?: string;
  snapshotOptionB_Kn?: string;
  snapshotOptionC_En?: string;
  snapshotOptionC_Kn?: string;
  snapshotOptionD_En?: string;
  snapshotOptionD_Kn?: string;
  snapshotCorrectOption?: string;
  snapshotExplanationEn?: string;
  snapshotExplanationKn?: string;
  snapshotDifficulty?: string;
  snapshotPositiveMarks?: number;
  snapshotNegativeMarks?: number;
}

export interface MockTestDetailDto {
  id: string;
  code: string;
  seqNumber?: number;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  instructionsEn?: string;
  instructionsKn?: string;
  examCycleId?: string;
  examStageId?: string;
  examPaperId?: string;
  examCycle?: any;
  examStage?: any;
  examPaper?: any;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  passingPercentage: number;
  accessClassification: TestAccessClassification;
  scoringPolicy: TestScoringPolicy;
  positiveMarks: number;
  negativeMarks: number;
  selectionMode: TestSelectionMode;
  pyqPreference: PyqPreference;
  generationSeed?: string;
  status: TestWorkflowStatus;
  isPublished: boolean;
  createdByAdminId?: string;
  submittedByAdminId?: string;
  reviewedByAdminId?: string;
  approvedByAdminId?: string;
  publishedByAdminId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  categoryDistributions: TestCategoryDistributionDto[];
  subcategoryDistributions: TestSubcategoryDistributionDto[];
  difficultyDistributions: TestDifficultyDistributionDto[];
  questions: TestQuestionDto[];
  selectedCount: number;
  bilingualEligibleCount: number;
  isBlueprintValid: boolean;
  blueprintErrors: string[];
}
