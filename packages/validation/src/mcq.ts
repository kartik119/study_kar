import { z } from 'zod';

export const mcqDifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
export const correctOptionEnum = z.enum(['A', 'B', 'C', 'D']);
export const mcqWorkflowStatusEnum = z.enum([
  'DRAFT',
  'REVIEW_PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
  'ARCHIVED',
]);
export const mcqSourceTypeEnum = z.enum([
  'ORIGINAL',
  'PREVIOUS_YEAR_QUESTION',
  'OFFICIAL_SOURCE',
  'REFERENCE',
]);

export const createMcqSchema = z.object({
  questionTextEn: z.string().optional(),
  questionTextKn: z.string().optional(),
  optionA_En: z.string().optional(),
  optionA_Kn: z.string().optional(),
  optionB_En: z.string().optional(),
  optionB_Kn: z.string().optional(),
  optionC_En: z.string().optional(),
  optionC_Kn: z.string().optional(),
  optionD_En: z.string().optional(),
  optionD_Kn: z.string().optional(),
  correctOption: correctOptionEnum.optional(),
  explanationEn: z.string().optional(),
  explanationKn: z.string().optional(),
  difficulty: mcqDifficultyEnum.default('MEDIUM'),
  positiveMarks: z.number().positive('Positive marks must be greater than 0').default(1.0),
  negativeMarks: z.number().min(0, 'Negative marks cannot be negative').default(0.25),
  status: mcqWorkflowStatusEnum.default('DRAFT'),

  categoryId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  topicId: z.string().nullable().optional(),
  knowledgeAreaId: z.string().nullable().optional(),

  examCycleId: z.string().nullable().optional(),
  syllabusNodeId: z.string().nullable().optional(),

  sourceType: mcqSourceTypeEnum.default('ORIGINAL').optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  isPyq: z.boolean().default(false),
  pyqExamName: z.string().optional(),
  pyqYear: z.number().int().optional(),
  pyqPaperStage: z.string().optional(),
  pyqQuestionNumber: z.string().optional(),
  pyqNotes: z.string().optional(),
});

export const updateMcqSchema = createMcqSchema.partial();

export const mcqFilterQuerySchema = z.object({
  search: z.string().optional(),
  difficulty: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  topicId: z.string().optional(),
  knowledgeAreaId: z.string().optional(),
  readiness: z.string().optional(),
  status: z.string().optional(),
  isPyq: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  pageSize: z.string().optional(),
});

export const bulkImportModeEnum = z.enum(['ADD_NEW', 'UPDATE_EXISTING']);

export const mcqTaxonomyOverrideSchema = z.object({
  categories: z.record(z.string(), z.string()).optional(),
  subcategories: z.record(z.string(), z.string()).optional(),
  topics: z.record(z.string(), z.string()).optional(),
  knowledgeAreas: z.record(z.string(), z.string()).optional(),
}).optional();

export const mcqBulkImportValidateSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  importMode: bulkImportModeEnum.default('ADD_NEW'),
  columnMappings: z.record(z.string(), z.string()),
  selectedWorksheet: z.string().optional(),
  taxonomyOverrides: mcqTaxonomyOverrideSchema,
});

export const mcqBulkImportExecuteSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  importMode: bulkImportModeEnum.default('ADD_NEW'),
  columnMappings: z.record(z.string(), z.string()),
  selectedWorksheet: z.string().optional(),
  taxonomyOverrides: mcqTaxonomyOverrideSchema,
});

