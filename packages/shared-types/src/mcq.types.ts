export type McqDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type CorrectOption = 'A' | 'B' | 'C' | 'D';
export type McqWorkflowStatus = 'DRAFT' | 'REVIEW_PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'ARCHIVED';
export type McqSourceType = 'ORIGINAL' | 'PREVIOUS_YEAR_QUESTION' | 'OFFICIAL_SOURCE' | 'REFERENCE';
export type McqBilingualReadiness = 'BILINGUAL_READY' | 'ENGLISH_INCOMPLETE' | 'KANNADA_INCOMPLETE' | 'INCOMPLETE';

export interface McqApprovalEligibility {
  eligible: boolean;
  missingFields: string[];
}

export interface McqDuplicateWarning {
  matchedId: string;
  matchedCode: string;
  matchedStemEn: string;
  similarityScore: number;
}

export interface McqQuestion {
  id: string;
  code: string;
  seqNumber?: number | null;
  questionTextEn: string;
  questionTextKn: string;
  optionA_En: string;
  optionA_Kn: string;
  optionB_En: string;
  optionB_Kn: string;
  optionC_En: string;
  optionC_Kn: string;
  optionD_En: string;
  optionD_Kn: string;
  correctOption: CorrectOption;
  explanationEn?: string | null;
  explanationKn?: string | null;
  difficulty: McqDifficulty;
  positiveMarks: number | string;
  negativeMarks: number | string;
  status: McqWorkflowStatus;
  readiness?: McqBilingualReadiness;
  approvalEligibility?: McqApprovalEligibility;

  // Academic Taxonomy
  categoryId?: string | null;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;

  // Optional Exam & Syllabus Mapping
  examCycleId?: string | null;
  syllabusNodeId?: string | null;

  // Source & PYQ
  sourceType?: McqSourceType | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  isPyq: boolean;
  pyqExamName?: string | null;
  pyqYear?: number | null;
  pyqPaperStage?: string | null;
  pyqQuestionNumber?: string | null;
  pyqNotes?: string | null;

  isActive: boolean;
  createdByAdminId?: string | null;
  reviewedByAdminId?: string | null;
  approvedByAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Formatted / Joined Display Fields
  examCycleTitleEn?: string;
  syllabusNodeNameEn?: string;
  categoryNameEn?: string;
  subcategoryNameEn?: string;
  topicNameEn?: string;
  knowledgeAreaNameEn?: string;
  duplicateWarnings?: McqDuplicateWarning[];
}

export interface CreateMcqQuestionPayload {
  code?: string;
  questionTextEn?: string;
  questionTextKn?: string;
  optionA_En?: string;
  optionA_Kn?: string;
  optionB_En?: string;
  optionB_Kn?: string;
  optionC_En?: string;
  optionC_Kn?: string;
  optionD_En?: string;
  optionD_Kn?: string;
  correctOption?: CorrectOption;
  explanationEn?: string;
  explanationKn?: string;
  difficulty: McqDifficulty;
  positiveMarks?: number;
  negativeMarks?: number;
  status?: McqWorkflowStatus;

  categoryId?: string | null;
  subcategoryId?: string | null;
  topicId?: string | null;
  knowledgeAreaId?: string | null;

  examCycleId?: string | null;
  syllabusNodeId?: string | null;

  sourceType?: McqSourceType;
  sourceName?: string;
  sourceUrl?: string;
  isPyq?: boolean;
  pyqExamName?: string;
  pyqYear?: number;
  pyqPaperStage?: string;
  pyqQuestionNumber?: string;
  pyqNotes?: string;
}

export interface McqQueryParams {
  search?: string;
  difficulty?: string;
  categoryId?: string | string[];
  subcategoryId?: string | string[];
  topicId?: string;
  knowledgeAreaId?: string;
  readiness?: string;
  status?: string;
  isPyq?: boolean;
  page?: number;
  limit?: number;
  pageSize?: number;
}

export interface MockTest {
  id: string;
  code: string;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  examCycleId?: string | null;
  durationMinutes: number;
  totalMarks: number | string;
  passingPercentage: number | string;
  isPublished: boolean;
  createdByAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;

  questionCount?: number;
  questions?: MockTestQuestionItem[];
}

export interface MockTestQuestionItem {
  id: string;
  mockTestId: string;
  questionId: string;
  displayOrder: number;
  sectionTitleEn?: string | null;
  sectionTitleKn?: string | null;
  question?: McqQuestion;
}

export interface CreateMockTestPayload {
  code?: string;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string;
  descriptionKn?: string;
  examCycleId?: string | null;
  durationMinutes?: number;
  totalMarks?: number;
  passingPercentage?: number;
  isPublished?: boolean;
}

// ----------------------------------------------------------------------------
// MCQ BULK IMPORT ENGINE TYPES (PROMPT 11)
// ----------------------------------------------------------------------------
export type McqImportMode = 'ADD_NEW' | 'UPDATE_EXISTING';
export type McqImportStatus = 'UPLOADED' | 'VALIDATING' | 'VALIDATED' | 'IMPORTING' | 'COMPLETED' | 'FAILED';

export interface McqColumnMapping {
  uploadedColumn: string;
  targetField: string;
}

export interface McqRowValidationError {
  rowNumber: number;
  field: string;
  uploadedValue?: string;
  errorCode: string;
  errorMessage: string;
  isBlocking: boolean;
}

export interface McqRowValidationResult {
  rowNumber: number;
  mcqId?: string;
  status: 'VALID' | 'ERROR' | 'WARNING';
  questionPreviewEn?: string;
  questionPreviewKn?: string;
  categoryCode?: string;
  subcategoryCode?: string;
  categoryNameEn?: string;
  subcategoryNameEn?: string;
  difficulty?: string;
  correctAnswer?: string;
  issues: McqRowValidationError[];
  diffPreview?: {
    field: string;
    currentValue: any;
    incomingValue: any;
  }[];
}

export interface McqBulkImportAnalyzeResult {
  sessionId: string;
  originalFileName: string;
  fileType: 'XLSX' | 'CSV';
  totalRowsDetected: number;
  detectedHeaders: string[];
  headers?: string[];
  autoColumnMappings: Record<string, string>;
  worksheets?: string[];
  selectedWorksheet?: string;
}

export interface McqTaxonomyOverridePayload {
  categories?: Record<string, string>;
  subcategories?: Record<string, string>;
  topics?: Record<string, string>;
  knowledgeAreas?: Record<string, string>;
}

export interface McqTaxonomyResolutionSummaryItem {
  uploadedKey: string;
  uploadedCode?: string;
  uploadedName?: string;
  type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
  parentKey?: string;
  rowCount: number;
  status: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT' | 'IGNORED_OPTIONAL';
  resolvedId?: string;
  resolvedNameEn?: string;
  resolutionMethod?: 'Exact Code' | 'Name Match' | 'Manual Batch Override' | 'Ignored Optional';
  errorMessage?: string;
}

export interface McqBulkImportValidatePayload {
  sessionId: string;
  importMode: McqImportMode;
  columnMappings: Record<string, string>;
  selectedWorksheet?: string;
  taxonomyOverrides?: McqTaxonomyOverridePayload;
}

export interface McqBulkImportValidateResult {
  sessionId: string;
  importMode: McqImportMode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  isImportAllowed: boolean;
  rows: McqRowValidationResult[];
  taxonomyResolution: {
    uploadedCode: string;
    type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
    matchedNameEn?: string;
    matchedId?: string;
    parentCode?: string;
    isValid: boolean;
    errorMessage?: string;
  }[];
  taxonomySummary?: McqTaxonomyResolutionSummaryItem[];
  difficultySummary?: {
    easy: number;
    medium: number;
    hard: number;
    normalizedModerateCount: number;
  };
  sourceSummary?: {
    original: number;
    previousYear: number;
    officialSource: number;
    reference: number;
    normalizedAliasesCount: number;
  };
}

export interface McqBulkImportExecutePayload {
  sessionId: string;
  importMode: McqImportMode;
  columnMappings: Record<string, string>;
  selectedWorksheet?: string;
  taxonomyOverrides?: McqTaxonomyOverridePayload;
}

export interface McqBulkImportExecuteResult {
  sessionId: string;
  importMode: McqImportMode;
  importedRows: number;
  generatedCodeRange?: string;
  status: 'COMPLETED' | 'FAILED';
  failureReason?: string;
}

export interface McqBulkImportSessionRecord {
  id: string;
  originalFileName: string;
  fileType: string;
  importMode: McqImportMode;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  importedRows: number;
  status: McqImportStatus;
  startedByAdminId?: string | null;
  failureReason?: string | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
}

