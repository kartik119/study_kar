export type ExamPatternStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ExamStageType =
  | 'PRELIMINARY'
  | 'MAIN'
  | 'INTERVIEW'
  | 'PHYSICAL_TEST'
  | 'SKILL_TEST'
  | 'PRACTICAL_TEST'
  | 'DOCUMENT_VERIFICATION'
  | 'MEDICAL_TEST'
  | 'OTHER';

export type ExamAssessmentMode =
  | 'OBJECTIVE'
  | 'DESCRIPTIVE'
  | 'INTERVIEW'
  | 'PRACTICAL'
  | 'SKILL'
  | 'PHYSICAL'
  | 'DOCUMENT_VERIFICATION'
  | 'MEDICAL'
  | 'OTHER';

export type ExamQuestionFormat =
  | 'MCQ_SINGLE_CORRECT'
  | 'MCQ_MULTIPLE_CORRECT'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'ESSAY'
  | 'CASE_STUDY'
  | 'INTERVIEW'
  | 'PRACTICAL'
  | 'SKILL'
  | 'PHYSICAL'
  | 'OTHER';

export type ExamMediumRule =
  | 'BILINGUAL'
  | 'KANNADA'
  | 'ENGLISH'
  | 'CANDIDATE_CHOICE'
  | 'NOT_APPLICABLE'
  | 'CUSTOM';

export type NegativeMarkingType =
  | 'NONE'
  | 'FIXED_MARKS'
  | 'PERCENTAGE_OF_QUESTION_MARKS'
  | 'FRACTION_OF_QUESTION_MARKS';

export type QualifyingRuleType =
  | 'NONE'
  | 'MARKS'
  | 'PERCENTAGE'
  | 'AGGREGATE_MARKS'
  | 'AGGREGATE_PERCENTAGE'
  | 'ALL_QUALIFYING_PAPERS'
  | 'CUSTOM';

export interface ExamPaperSection {
  id: string;
  examPaperId: string;
  code: string;
  questionFormat: ExamQuestionFormat;
  nameEn: string;
  nameKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  instructionsEn?: string | null;
  instructionsKn?: string | null;
  displayOrder: number;
  totalQuestions: number;
  questionsToAnswer: number;
  marksPerQuestion: number;
  calculatedTotalMarks: number;
  durationMinutes?: number | null;
  negativeMarkingType?: NegativeMarkingType | null;
  negativeMarkingValue?: number | null;
  negativeFractionNumerator?: number | null;
  negativeFractionDenominator?: number | null;
  isQualifying: boolean;
  qualifyingRuleType: QualifyingRuleType;
  qualifyingValue?: number | null;
  contributesToPaperMerit: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamPaper {
  id: string;
  examStageId: string;
  code: string;
  assessmentMode: ExamAssessmentMode;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  instructionsEn?: string | null;
  instructionsKn?: string | null;
  mediumRule: ExamMediumRule;
  mediumInstructionsEn?: string | null;
  mediumInstructionsKn?: string | null;
  displayOrder: number;
  durationMinutes?: number | null;
  totalQuestions?: number | null;
  questionsToAnswer?: number | null;
  totalMarks: number;
  isQualifying: boolean;
  contributesToStageMerit: boolean;
  qualifyingRuleType: QualifyingRuleType;
  qualifyingValue?: number | null;
  defaultNegativeMarkingType: NegativeMarkingType;
  defaultNegativeMarkingValue?: number | null;
  defaultNegativeFractionNumerator?: number | null;
  defaultNegativeFractionDenominator?: number | null;
  calculatorEnabled: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  sections?: ExamPaperSection[];
}

export interface ExamStage {
  id: string;
  examPatternId: string;
  code: string;
  stageType: ExamStageType;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  instructionsEn?: string | null;
  instructionsKn?: string | null;
  displayOrder: number;
  isQualifying: boolean;
  contributesToFinalMerit: boolean;
  qualificationRuleType: QualifyingRuleType;
  qualificationValue?: number | null;
  qualificationRuleEn?: string | null;
  qualificationRuleKn?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  papers?: ExamPaper[];
}

export interface ExamPattern {
  id: string;
  examCycleId: string;
  revisionNumber: number;
  sourcePatternId?: string | null;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  generalInstructionsEn?: string | null;
  generalInstructionsKn?: string | null;
  sourceResourceId?: string | null;
  sourceReference?: string | null;
  status: ExamPatternStatus;
  isCurrent: boolean;
  reviewSubmittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  approvedAt?: string | null;
  approvedByAdminId?: string | null;
  publishedAt?: string | null;
  publishedByAdminId?: string | null;
  archivedAt?: string | null;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  stages?: ExamStage[];
  readiness?: {
    state: 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE';
    isEnglishComplete: boolean;
    isKannadaComplete: boolean;
    missingEnglishFields: string[];
    missingKannadaFields: string[];
  };
  totals?: PatternCalculatedTotals;
}

export interface PatternCalculatedTotals {
  stageCount: number;
  paperCount: number;
  sectionCount: number;
  totalMarks: number;
  totalMeritMarks: number;
  totalQualifyingMarks: number;
  totalQuestions: number;
  approximateDurationMinutes: number;
}

export interface PatternValidationIssue {
  code: string;
  message: string;
  path?: string[];
  severity: 'ERROR' | 'WARNING';
}

export interface PatternValidationResult {
  isValid: boolean;
  issues: PatternValidationIssue[];
}

export interface PublicLocalizedPatternResponse {
  patternId: string;
  revisionNumber: number;
  title: string;
  description?: string | null;
  generalInstructions?: string | null;
  language: 'en' | 'kn';
  totals: PatternCalculatedTotals;
  stages: Array<{
    id: string;
    code: string;
    stageType: ExamStageType;
    name: string;
    shortName?: string | null;
    description?: string | null;
    instructions?: string | null;
    displayOrder: number;
    isQualifying: boolean;
    contributesToFinalMerit: boolean;
    qualificationRuleType: QualifyingRuleType;
    qualificationValue?: number | null;
    qualificationRule?: string | null;
    papers: Array<{
      id: string;
      code: string;
      assessmentMode: ExamAssessmentMode;
      name: string;
      shortName?: string | null;
      description?: string | null;
      instructions?: string | null;
      mediumRule: ExamMediumRule;
      mediumInstructions?: string | null;
      displayOrder: number;
      durationMinutes?: number | null;
      totalQuestions?: number | null;
      questionsToAnswer?: number | null;
      totalMarks: number;
      isQualifying: boolean;
      contributesToStageMerit: boolean;
      qualifyingRuleType: QualifyingRuleType;
      qualifyingValue?: number | null;
      negativeMarkingSummary: string;
      sections: Array<{
        id: string;
        code: string;
        questionFormat: ExamQuestionFormat;
        name: string;
        description?: string | null;
        instructions?: string | null;
        displayOrder: number;
        totalQuestions: number;
        questionsToAnswer: number;
        marksPerQuestion: number;
        calculatedTotalMarks: number;
        durationMinutes?: number | null;
        negativeMarkingSummary: string;
        isQualifying: boolean;
        contributesToPaperMerit: boolean;
      }>;
    }>;
  }>;
}
