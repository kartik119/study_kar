import { z } from 'zod';

// URL validator
export const UrlSchema = z.string().trim().url('Invalid URL format').or(z.literal('')).nullable().optional();

// Code Normalizer & Sanitizer
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\u0C80-\u0CFF]/g, '') // Allows English, Kannada unicode range, hyphens
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Language Readiness Calculator
export type ExamReadinessState =
  | 'BOTH_COMPLETE'
  | 'ENGLISH_COMPLETE'
  | 'KANNADA_COMPLETE'
  | 'ENGLISH_MISSING'
  | 'KANNADA_MISSING'
  | 'INCOMPLETE';

export interface ExamReadinessResult {
  state: ExamReadinessState;
  isEnglishComplete: boolean;
  isKannadaComplete: boolean;
  missingEnglishFields: string[];
  missingKannadaFields: string[];
}

export function calculateExamReadiness(cycle: {
  titleEn?: string | null;
  titleKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  eligibility?: {
    minimumEducationEn?: string | null;
    minimumEducationKn?: string | null;
  } | null;
  seo?: {
    slugEn?: string | null;
    slugKn?: string | null;
  } | null;
}): ExamReadinessResult {
  const missingEnglishFields: string[] = [];
  const missingKannadaFields: string[] = [];

  if (!cycle.titleEn || !cycle.titleEn.trim()) missingEnglishFields.push('titleEn');
  if (!cycle.descriptionEn || !cycle.descriptionEn.trim()) missingEnglishFields.push('descriptionEn');
  if (!cycle.seo?.slugEn || !cycle.seo.slugEn.trim()) missingEnglishFields.push('seo.slugEn');

  if (!cycle.titleKn || !cycle.titleKn.trim()) missingKannadaFields.push('titleKn');
  if (!cycle.descriptionKn || !cycle.descriptionKn.trim()) missingKannadaFields.push('descriptionKn');
  if (!cycle.seo?.slugKn || !cycle.seo.slugKn.trim()) missingKannadaFields.push('seo.slugKn');

  const isEnglishComplete = missingEnglishFields.length === 0;
  const isKannadaComplete = missingKannadaFields.length === 0;

  let state: ExamReadinessState = 'INCOMPLETE';
  if (isEnglishComplete && isKannadaComplete) {
    state = 'BOTH_COMPLETE';
  } else if (isEnglishComplete && !isKannadaComplete) {
    state = 'ENGLISH_COMPLETE';
  } else if (!isEnglishComplete && isKannadaComplete) {
    state = 'KANNADA_COMPLETE';
  } else if (!isEnglishComplete && !isKannadaComplete) {
    state = 'INCOMPLETE';
  }

  return {
    state,
    isEnglishComplete,
    isKannadaComplete,
    missingEnglishFields,
    missingKannadaFields,
  };
}

// Schemas
export const CreateExamAuthoritySchema = z.object({
  code: z.string().trim().min(2, 'Code is required').transform(normalizeCode),
  nameEn: z.string().trim().min(2, 'English name is required'),
  nameKn: z.string().trim().min(2, 'Kannada name is required'),
  shortNameEn: z.string().trim().optional().nullable(),
  shortNameKn: z.string().trim().optional().nullable(),
  descriptionEn: z.string().trim().optional().nullable(),
  descriptionKn: z.string().trim().optional().nullable(),
  officialWebsiteUrl: UrlSchema,
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateExamAuthoritySchema = CreateExamAuthoritySchema.partial();

export const CreateExamProgrammeSchema = z.object({
  authorityId: z.string().uuid('Invalid Authority ID'),
  code: z.string().trim().min(2, 'Programme code is required').transform(normalizeCode),
  nameEn: z.string().trim().min(2, 'English programme name is required'),
  nameKn: z.string().trim().min(2, 'Kannada programme name is required'),
  shortNameEn: z.string().trim().optional().nullable(),
  shortNameKn: z.string().trim().optional().nullable(),
  descriptionEn: z.string().trim().optional().nullable(),
  descriptionKn: z.string().trim().optional().nullable(),
  overviewEn: z.string().trim().optional().nullable(),
  overviewKn: z.string().trim().optional().nullable(),
  eligibilitySummaryEn: z.string().trim().optional().nullable(),
  eligibilitySummaryKn: z.string().trim().optional().nullable(),
  selectionProcessSummaryEn: z.string().trim().optional().nullable(),
  selectionProcessSummaryKn: z.string().trim().optional().nullable(),
  officialProgrammeUrl: UrlSchema,
  isActive: z.boolean().default(true),
});

export const UpdateExamProgrammeSchema = CreateExamProgrammeSchema.partial();

export const ImportantDateTypeSchema = z.enum([
  'NOTIFICATION',
  'APPLICATION_START',
  'APPLICATION_END',
  'FEE_PAYMENT_END',
  'CORRECTION_WINDOW',
  'ADMIT_CARD',
  'EXAM',
  'RESULT',
  'CUSTOM',
]);

export const OfficialResourceTypeSchema = z.enum([
  'OFFICIAL_NOTIFICATION',
  'OFFICIAL_WEBSITE',
  'APPLICATION',
  'INSTRUCTIONS',
  'CALENDAR',
  'OTHER',
]);

export const ExamImportantDateInputSchema = z.object({
  id: z.string().uuid().optional(),
  type: ImportantDateTypeSchema,
  labelEn: z.string().trim().min(2, 'English label is required'),
  labelKn: z.string().trim().min(2, 'Kannada label is required'),
  startAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  endAt: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  isTentative: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  examStageId: z.string().uuid().optional().nullable(),
});

export const ExamOfficialResourceInputSchema = z.object({
  id: z.string().uuid().optional(),
  resourceType: OfficialResourceTypeSchema,
  labelEn: z.string().trim().min(2, 'English label is required'),
  labelKn: z.string().trim().min(2, 'Kannada label is required'),
  url: z.string().trim().url('Valid URL is required'),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const ExamEligibilityInputSchema = z.object({
  minimumAge: z.number().int().positive().optional().nullable(),
  maximumAge: z.number().int().positive().optional().nullable(),
  ageCalculatedOn: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  minimumEducationEn: z.string().trim().optional().nullable(),
  minimumEducationKn: z.string().trim().optional().nullable(),
  nationalityRequirementEn: z.string().trim().optional().nullable(),
  nationalityRequirementKn: z.string().trim().optional().nullable(),
  domicileRequirementEn: z.string().trim().optional().nullable(),
  domicileRequirementKn: z.string().trim().optional().nullable(),
  attemptsSummaryEn: z.string().trim().optional().nullable(),
  attemptsSummaryKn: z.string().trim().optional().nullable(),
  additionalCriteriaEn: z.string().trim().optional().nullable(),
  additionalCriteriaKn: z.string().trim().optional().nullable(),
});

export const ExamSEOInputSchema = z.object({
  slugEn: z.string().trim().min(2, 'English slug is required').transform(sanitizeSlug),
  slugKn: z.string().trim().min(2, 'Kannada slug is required').transform(sanitizeSlug),
  metaTitleEn: z.string().trim().max(70, 'Meta title max 70 chars').optional().nullable(),
  metaTitleKn: z.string().trim().max(70, 'Meta title max 70 chars').optional().nullable(),
  metaDescriptionEn: z.string().trim().max(160, 'Meta description max 160 chars').optional().nullable(),
  metaDescriptionKn: z.string().trim().max(160, 'Meta description max 160 chars').optional().nullable(),
  socialTitleEn: z.string().trim().optional().nullable(),
  socialTitleKn: z.string().trim().optional().nullable(),
  socialDescriptionEn: z.string().trim().optional().nullable(),
  socialDescriptionKn: z.string().trim().optional().nullable(),
  canonicalUrlEn: UrlSchema,
  canonicalUrlKn: UrlSchema,
});

export const CreateExamCycleSchema = z.object({
  programmeId: z.string().uuid('Invalid Programme ID'),
  cycleCode: z.string().trim().min(2, 'Cycle code is required').transform(normalizeCode),
  cycleYear: z.number().int().min(2000).max(2100),
  titleEn: z.string().trim().min(2, 'English title is required'),
  titleKn: z.string().trim().min(2, 'Kannada title is required'),
  descriptionEn: z.string().trim().optional().nullable(),
  descriptionKn: z.string().trim().optional().nullable(),
  notificationNumber: z.string().trim().optional().nullable(),
  notificationDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  applicationStartDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  applicationEndDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  feePaymentEndDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  tentativeExamDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  resultDate: z.preprocess((val) => (val && typeof val === 'string' ? new Date(val) : val), z.date().optional().nullable()),
  officialNotificationUrl: UrlSchema,
  applicationUrl: UrlSchema,
  logoUrl: z.string().optional().nullable(),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).default('PRIVATE'),
  eligibility: ExamEligibilityInputSchema.optional().nullable(),
  importantDates: z.array(ExamImportantDateInputSchema).optional().default([]),
  officialResources: z.array(ExamOfficialResourceInputSchema).optional().default([]),
  seo: ExamSEOInputSchema.optional().nullable(),
});

export const UpdateExamCycleSchema = CreateExamCycleSchema.partial().extend({
  version: z.number().int().optional(),
});

export const ExamWorkflowActionSchema = z.object({
  action: z.enum(['SUBMIT_REVIEW', 'REQUEST_CHANGES', 'APPROVE', 'PUBLISH', 'CLOSE', 'ARCHIVE', 'REVERT_DRAFT']),
  reason: z.string().trim().optional(),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).optional(),
  expectedVersion: z.number().int().optional(),
});
