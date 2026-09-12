import { z } from 'zod';
import {
  ExamPatternStatus,
  ExamStageType,
  ExamAssessmentMode,
  ExamQuestionFormat,
  ExamMediumRule,
  NegativeMarkingType,
  QualifyingRuleType,
  PatternCalculatedTotals,
  PatternValidationIssue,
  PatternValidationResult,
} from '@study-karnataka/shared-types';

export const ExamPatternStatusEnum = z.enum([
  'DRAFT',
  'REVIEW_PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
]);

export const ExamStageTypeEnum = z.enum([
  'PRELIMINARY',
  'MAIN',
  'INTERVIEW',
  'PHYSICAL_TEST',
  'SKILL_TEST',
  'PRACTICAL_TEST',
  'DOCUMENT_VERIFICATION',
  'MEDICAL_TEST',
  'OTHER',
]);

export const ExamAssessmentModeEnum = z.enum([
  'OBJECTIVE',
  'DESCRIPTIVE',
  'INTERVIEW',
  'PRACTICAL',
  'SKILL',
  'PHYSICAL',
  'DOCUMENT_VERIFICATION',
  'MEDICAL',
  'OTHER',
]);

export const ExamQuestionFormatEnum = z.enum([
  'MCQ_SINGLE_CORRECT',
  'MCQ_MULTIPLE_CORRECT',
  'TRUE_FALSE',
  'MATCHING',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'ESSAY',
  'CASE_STUDY',
  'INTERVIEW',
  'PRACTICAL',
  'SKILL',
  'PHYSICAL',
  'OTHER',
]);

export const ExamMediumRuleEnum = z.enum([
  'BILINGUAL',
  'KANNADA',
  'ENGLISH',
  'CANDIDATE_CHOICE',
  'NOT_APPLICABLE',
  'CUSTOM',
]);

export const NegativeMarkingTypeEnum = z.enum([
  'NONE',
  'FIXED_MARKS',
  'PERCENTAGE_OF_QUESTION_MARKS',
  'FRACTION_OF_QUESTION_MARKS',
]);

export const QualifyingRuleTypeEnum = z.enum([
  'NONE',
  'MARKS',
  'PERCENTAGE',
  'AGGREGATE_MARKS',
  'AGGREGATE_PERCENTAGE',
  'ALL_QUALIFYING_PAPERS',
  'CUSTOM',
]);

// -----------------------------------------------------------------------------
// SCHEMAS
// -----------------------------------------------------------------------------

export const createExamPatternSchema = z.object({
  titleEn: z.string().min(2, 'English title is required'),
  titleKn: z.string().min(2, 'Kannada title is required'),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  generalInstructionsEn: z.string().optional().nullable(),
  generalInstructionsKn: z.string().optional().nullable(),
  sourceResourceId: z.string().optional().nullable(),
  sourceReference: z.string().optional().nullable(),
});

export const updateExamPatternSchema = createExamPatternSchema.partial().extend({
  version: z.number().int().optional(),
});

export const createExamStageSchema = z.object({
  code: z
    .string()
    .min(1, 'Stage code is required')
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_'))
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores')),
  stageType: ExamStageTypeEnum,
  nameEn: z.string().min(2, 'English stage name is required'),
  nameKn: z.string().min(2, 'Kannada stage name is required'),
  shortNameEn: z.string().optional().nullable(),
  shortNameKn: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  instructionsEn: z.string().optional().nullable(),
  instructionsKn: z.string().optional().nullable(),
  displayOrder: z.number().int().min(1, 'Display order must be at least 1'),
  isQualifying: z.boolean().default(false),
  contributesToFinalMerit: z.boolean().default(true),
  qualificationRuleType: QualifyingRuleTypeEnum.default('NONE'),
  qualificationValue: z.number().optional().nullable(),
  qualificationRuleEn: z.string().optional().nullable(),
  qualificationRuleKn: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateExamStageSchema = createExamStageSchema.partial().extend({
  version: z.number().int().optional(),
});

export const createExamPaperSchema = z.object({
  code: z
    .string()
    .min(1, 'Paper code is required')
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_'))
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores')),
  assessmentMode: ExamAssessmentModeEnum,
  nameEn: z.string().min(2, 'English paper name is required'),
  nameKn: z.string().min(2, 'Kannada paper name is required'),
  shortNameEn: z.string().optional().nullable(),
  shortNameKn: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  instructionsEn: z.string().optional().nullable(),
  instructionsKn: z.string().optional().nullable(),
  mediumRule: ExamMediumRuleEnum.default('BILINGUAL'),
  mediumInstructionsEn: z.string().optional().nullable(),
  mediumInstructionsKn: z.string().optional().nullable(),
  displayOrder: z.number().int().min(1),
  durationMinutes: z.number().int().positive().optional().nullable(),
  totalQuestions: z.number().int().positive().optional().nullable(),
  questionsToAnswer: z.number().int().positive().optional().nullable(),
  totalMarks: z.number().positive('Total marks must be positive').optional().nullable(),
  isQualifying: z.boolean().default(false),
  contributesToStageMerit: z.boolean().default(true),
  qualifyingRuleType: QualifyingRuleTypeEnum.default('NONE'),
  qualifyingValue: z.number().optional().nullable(),
  defaultNegativeMarkingType: NegativeMarkingTypeEnum.default('NONE'),
  defaultNegativeMarkingValue: z.number().optional().nullable(),
  defaultNegativeFractionNumerator: z.number().int().positive().optional().nullable(),
  defaultNegativeFractionDenominator: z.number().int().positive().optional().nullable(),
  calculatorEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateExamPaperSchema = createExamPaperSchema.partial().extend({
  version: z.number().int().optional(),
});

export const createExamPaperSectionSchema = z.object({
  code: z
    .string()
    .min(1, 'Section code is required')
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_'))
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores')),
  questionFormat: ExamQuestionFormatEnum,
  nameEn: z.string().min(2, 'English section name is required'),
  nameKn: z.string().min(2, 'Kannada section name is required'),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  instructionsEn: z.string().optional().nullable(),
  instructionsKn: z.string().optional().nullable(),
  displayOrder: z.number().int().min(1),
  totalQuestions: z.number().int().min(1, 'Total questions must be at least 1'),
  questionsToAnswer: z.number().int().min(1, 'Questions to answer must be at least 1'),
  marksPerQuestion: z.number().positive('Marks per question must be positive'),
  durationMinutes: z.number().int().positive().optional().nullable(),
  negativeMarkingType: NegativeMarkingTypeEnum.optional().nullable(),
  negativeMarkingValue: z.number().optional().nullable(),
  negativeFractionNumerator: z.number().int().positive().optional().nullable(),
  negativeFractionDenominator: z.number().int().positive().optional().nullable(),
  isQualifying: z.boolean().default(false),
  qualifyingRuleType: QualifyingRuleTypeEnum.default('NONE'),
  qualifyingValue: z.number().optional().nullable(),
  contributesToPaperMerit: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateExamPaperSectionSchema = createExamPaperSectionSchema.partial().extend({
  version: z.number().int().optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1, 'At least one ID is required'),
});

export const workflowActionSchema = z.object({
  action: z.enum(['SUBMIT_REVIEW', 'REQUEST_CHANGES', 'APPROVE', 'PUBLISH']),
  reason: z.string().optional(),
});

// -----------------------------------------------------------------------------
// NEGATIVE MARKING VALIDATOR
// -----------------------------------------------------------------------------

export function validateNegativeMarking(
  type: NegativeMarkingType,
  value?: number | null,
  numerator?: number | null,
  denominator?: number | null,
  questionMarks?: number
): { isValid: boolean; error?: string } {
  if (type === 'NONE') {
    return { isValid: true };
  }

  if (type === 'FIXED_MARKS') {
    if (value === undefined || value === null || value <= 0) {
      return { isValid: false, error: 'Fixed negative marks must be greater than zero' };
    }
    if (questionMarks !== undefined && value > questionMarks) {
      return { isValid: false, error: 'Fixed negative marks cannot exceed question marks' };
    }
    return { isValid: true };
  }

  if (type === 'PERCENTAGE_OF_QUESTION_MARKS') {
    if (value === undefined || value === null || value <= 0 || value > 100) {
      return { isValid: false, error: 'Percentage negative marking must be between 0 and 100%' };
    }
    return { isValid: true };
  }

  if (type === 'FRACTION_OF_QUESTION_MARKS') {
    if (!numerator || !denominator || numerator <= 0 || denominator <= 0) {
      return { isValid: false, error: 'Fraction numerator and denominator must be positive integers' };
    }
    if (numerator > denominator) {
      return { isValid: false, error: 'Fraction numerator cannot exceed denominator' };
    }
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid negative marking type' };
}

// -----------------------------------------------------------------------------
// MARKS & TOTALS CALCULATOR
// -----------------------------------------------------------------------------

export function calculateExamPatternTotals(pattern: any): PatternCalculatedTotals {
  let stageCount = 0;
  let paperCount = 0;
  let sectionCount = 0;
  let totalMarks = 0;
  let totalMeritMarks = 0;
  let totalQualifyingMarks = 0;
  let totalQuestions = 0;
  let approximateDurationMinutes = 0;

  const stages = (pattern.stages || []).filter((s: any) => s.isActive !== false);
  stageCount = stages.length;

  for (const stage of stages) {
    const papers = (stage.papers || []).filter((p: any) => p.isActive !== false);
    paperCount += papers.length;

    let stageTotalMarks = 0;
    let stageMeritMarks = 0;
    let stageQualifyingMarks = 0;

    for (const paper of papers) {
      const sections = (paper.sections || []).filter((sec: any) => sec.isActive !== false);
      sectionCount += sections.length;

      let paperMarks = Number(paper.totalMarks) || 0;
      let paperQuestions = Number(paper.questionsToAnswer) || Number(paper.totalQuestions) || 0;
      let paperDuration = Number(paper.durationMinutes) || 0;

      if (sections.length > 0) {
        let sectionMarksSum = 0;
        let sectionQuestionsSum = 0;
        let sectionDurationSum = 0;

        for (const sec of sections) {
          const qToAnswer = Number(sec.questionsToAnswer) || Number(sec.totalQuestions) || 0;
          const mPerQ = Number(sec.marksPerQuestion) || 0;
          const calculatedSecMarks = qToAnswer * mPerQ;
          sectionMarksSum += calculatedSecMarks;
          sectionQuestionsSum += qToAnswer;
          if (sec.durationMinutes) {
            sectionDurationSum += Number(sec.durationMinutes);
          }
        }

        paperMarks = sectionMarksSum;
        paperQuestions = sectionQuestionsSum;
        if (sectionDurationSum > 0) {
          paperDuration = sectionDurationSum;
        }
      }

      totalQuestions += paperQuestions;
      approximateDurationMinutes += paperDuration;
      stageTotalMarks += paperMarks;

      if (paper.contributesToStageMerit !== false && !paper.isQualifying) {
        stageMeritMarks += paperMarks;
      } else {
        stageQualifyingMarks += paperMarks;
      }
    }

    totalMarks += stageTotalMarks;
    if (stage.contributesToFinalMerit !== false && !stage.isQualifying) {
      totalMeritMarks += stageMeritMarks;
    } else {
      totalQualifyingMarks += stageTotalMarks;
    }
  }

  return {
    stageCount,
    paperCount,
    sectionCount,
    totalMarks: Math.round(totalMarks * 100) / 100,
    totalMeritMarks: Math.round(totalMeritMarks * 100) / 100,
    totalQualifyingMarks: Math.round(totalQualifyingMarks * 100) / 100,
    totalQuestions,
    approximateDurationMinutes,
  };
}

// -----------------------------------------------------------------------------
// BILINGUAL READINESS CALCULATOR
// -----------------------------------------------------------------------------

export function calculateExamPatternReadiness(pattern: any) {
  const missingEnglishFields: string[] = [];
  const missingKannadaFields: string[] = [];

  if (!pattern.titleEn?.trim()) missingEnglishFields.push('Pattern English Title');
  if (!pattern.titleKn?.trim()) missingKannadaFields.push('Pattern Kannada Title');
  if (!pattern.descriptionEn?.trim() && !pattern.generalInstructionsEn?.trim()) {
    missingEnglishFields.push('Pattern English Description or General Instructions');
  }
  if (!pattern.descriptionKn?.trim() && !pattern.generalInstructionsKn?.trim()) {
    missingKannadaFields.push('Pattern Kannada Description or General Instructions');
  }

  const stages = pattern.stages || [];
  if (stages.length === 0) {
    missingEnglishFields.push('At least one Stage required');
    missingKannadaFields.push('At least one Stage required');
  }

  stages.forEach((stage: any, sIdx: number) => {
    const sLabel = `Stage ${stage.code || sIdx + 1}`;
    if (!stage.nameEn?.trim()) missingEnglishFields.push(`${sLabel} English Name`);
    if (!stage.nameKn?.trim()) missingKannadaFields.push(`${sLabel} Kannada Name`);

    const papers = stage.papers || [];
    if (papers.length === 0) {
      missingEnglishFields.push(`${sLabel}: At least one Paper required`);
      missingKannadaFields.push(`${sLabel}: At least one Paper required`);
    }

    papers.forEach((paper: any, pIdx: number) => {
      const pLabel = `${sLabel} -> Paper ${paper.code || pIdx + 1}`;
      if (!paper.nameEn?.trim()) missingEnglishFields.push(`${pLabel} English Name`);
      if (!paper.nameKn?.trim()) missingKannadaFields.push(`${pLabel} Kannada Name`);

      const sections = paper.sections || [];
      sections.forEach((sec: any, secIdx: number) => {
        const secLabel = `${pLabel} -> Section ${sec.code || secIdx + 1}`;
        if (!sec.nameEn?.trim()) missingEnglishFields.push(`${secLabel} English Name`);
        if (!sec.nameKn?.trim()) missingKannadaFields.push(`${secLabel} Kannada Name`);
      });
    });
  });

  const isEnglishComplete = missingEnglishFields.length === 0;
  const isKannadaComplete = missingKannadaFields.length === 0;

  let state: 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE' = 'INCOMPLETE';
  if (isEnglishComplete && isKannadaComplete) {
    state = 'BOTH_COMPLETE';
  } else if (isEnglishComplete) {
    state = 'ENGLISH_COMPLETE';
  } else if (isKannadaComplete) {
    state = 'KANNADA_COMPLETE';
  }

  return {
    state,
    isEnglishComplete,
    isKannadaComplete,
    missingEnglishFields,
    missingKannadaFields,
  };
}

// -----------------------------------------------------------------------------
// PATTERN VALIDATOR (FOR APPROVAL & PUBLICATION)
// -----------------------------------------------------------------------------

export function validateExamPatternStructure(pattern: any): PatternValidationResult {
  const issues: PatternValidationIssue[] = [];

  const readiness = calculateExamPatternReadiness(pattern);
  if (readiness.state !== 'BOTH_COMPLETE') {
    issues.push({
      code: 'EXAM_PATTERN_INCOMPLETE',
      message: 'Exam Pattern is not fully bilingual. Both English and Kannada content are required.',
      severity: 'ERROR',
    });
  }

  const stages = pattern.stages || [];
  if (stages.length === 0) {
    issues.push({
      code: 'EXAM_PATTERN_NO_STAGES',
      message: 'Exam Pattern must have at least one Stage.',
      severity: 'ERROR',
    });
  }

  const stageCodes = new Set<string>();
  const stageOrders = new Set<number>();

  stages.forEach((stage: any) => {
    if (stageCodes.has(stage.code)) {
      issues.push({
        code: 'EXAM_STAGE_CODE_EXISTS',
        message: `Duplicate Stage code: ${stage.code}`,
        severity: 'ERROR',
      });
    }
    stageCodes.add(stage.code);

    if (stageOrders.has(stage.displayOrder)) {
      issues.push({
        code: 'EXAM_STAGE_ORDER_CONFLICT',
        message: `Duplicate Stage display order: ${stage.displayOrder}`,
        severity: 'ERROR',
      });
    }
    stageOrders.add(stage.displayOrder);

    const papers = stage.papers || [];
    if (papers.length === 0) {
      issues.push({
        code: 'EXAM_STAGE_NO_PAPERS',
        message: `Stage ${stage.code} has no Papers.`,
        severity: 'ERROR',
      });
    }

    const paperCodes = new Set<string>();
    const paperOrders = new Set<number>();

    papers.forEach((paper: any) => {
      if (paperCodes.has(paper.code)) {
        issues.push({
          code: 'EXAM_PAPER_CODE_EXISTS',
          message: `Duplicate Paper code: ${paper.code} in Stage ${stage.code}`,
          severity: 'ERROR',
        });
      }
      paperCodes.add(paper.code);

      if (paperOrders.has(paper.displayOrder)) {
        issues.push({
          code: 'EXAM_PAPER_ORDER_CONFLICT',
          message: `Duplicate Paper display order: ${paper.displayOrder} in Stage ${stage.code}`,
          severity: 'ERROR',
        });
      }
      paperOrders.add(paper.displayOrder);

      // Validate Questions count vs Questions to Answer
      if (paper.totalQuestions && paper.questionsToAnswer && paper.questionsToAnswer > paper.totalQuestions) {
        issues.push({
          code: 'EXAM_INVALID_QUESTION_COUNT',
          message: `Paper ${paper.code}: Questions to answer (${paper.questionsToAnswer}) cannot exceed total questions (${paper.totalQuestions}).`,
          severity: 'ERROR',
        });
      }

      // Negative marking validation
      const negValidation = validateNegativeMarking(
        paper.defaultNegativeMarkingType,
        paper.defaultNegativeMarkingValue,
        paper.defaultNegativeFractionNumerator,
        paper.defaultNegativeFractionDenominator
      );
      if (!negValidation.isValid) {
        issues.push({
          code: 'EXAM_INVALID_NEGATIVE_MARKING',
          message: `Paper ${paper.code}: ${negValidation.error}`,
          severity: 'ERROR',
        });
      }

      const sections = paper.sections || [];
      if (sections.length > 0) {
        let sectionMarksSum = 0;
        const sectionCodes = new Set<string>();
        const sectionOrders = new Set<number>();

        sections.forEach((sec: any) => {
          if (sectionCodes.has(sec.code)) {
            issues.push({
              code: 'EXAM_SECTION_CODE_EXISTS',
              message: `Duplicate Section code: ${sec.code} in Paper ${paper.code}`,
              severity: 'ERROR',
            });
          }
          sectionCodes.add(sec.code);

          if (sectionOrders.has(sec.displayOrder)) {
            issues.push({
              code: 'EXAM_SECTION_ORDER_CONFLICT',
              message: `Duplicate Section display order: ${sec.displayOrder} in Paper ${paper.code}`,
              severity: 'ERROR',
            });
          }
          sectionOrders.add(sec.displayOrder);

          if (sec.questionsToAnswer > sec.totalQuestions) {
            issues.push({
              code: 'EXAM_INVALID_QUESTION_COUNT',
              message: `Section ${sec.code}: Questions to answer (${sec.questionsToAnswer}) cannot exceed total questions (${sec.totalQuestions}).`,
              severity: 'ERROR',
            });
          }

          const calculatedMarks = (Number(sec.questionsToAnswer) || 0) * (Number(sec.marksPerQuestion) || 0);
          sectionMarksSum += calculatedMarks;

          if (sec.negativeMarkingType) {
            const secNegVal = validateNegativeMarking(
              sec.negativeMarkingType,
              sec.negativeMarkingValue,
              sec.negativeFractionNumerator,
              sec.negativeFractionDenominator,
              Number(sec.marksPerQuestion)
            );
            if (!secNegVal.isValid) {
              issues.push({
                code: 'EXAM_INVALID_NEGATIVE_MARKING',
                message: `Section ${sec.code}: ${secNegVal.error}`,
                severity: 'ERROR',
              });
            }
          }
        });

        // Verify section totals roll up to declared paper total marks
        const declaredPaperMarks = Number(paper.totalMarks) || 0;
        if (Math.abs(sectionMarksSum - declaredPaperMarks) > 0.01) {
          issues.push({
            code: 'EXAM_PATTERN_INVALID_TOTALS',
            message: `Paper ${paper.code}: Declared total marks (${declaredPaperMarks}) do not match sum of active section calculated total marks (${sectionMarksSum}).`,
            severity: 'ERROR',
          });
        }
      }
    });
  });

  return {
    isValid: issues.filter((i) => i.severity === 'ERROR').length === 0,
    issues,
  };
}
