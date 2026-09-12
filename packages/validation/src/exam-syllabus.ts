import { z } from 'zod';
import {
  ExamSyllabusStatus,
  ExamSyllabusNodeType,
  ExamSyllabusScopeType,
  SyllabusLanguageReadiness,
} from '@study-karnataka/shared-types';

export const ExamSyllabusStatusEnum = z.enum([
  'DRAFT',
  'REVIEW_PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
]);

export const ExamSyllabusNodeTypeEnum = z.enum([
  'SUBJECT',
  'SECTION',
  'UNIT',
  'TOPIC',
  'SUBTOPIC',
  'KNOWLEDGE_AREA',
  'THEME',
  'OTHER',
]);

export const ExamSyllabusScopeTypeEnum = z.enum(['GLOBAL', 'STAGE', 'PAPER']);

export const createExamSyllabusSchema = z.object({
  examPatternId: z.string().uuid('Invalid exam pattern revision ID'),
  titleEn: z.string().trim().min(2, 'English title is required'),
  titleKn: z.string().trim().min(2, 'Kannada title is required'),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  generalInstructionsEn: z.string().optional().nullable(),
  generalInstructionsKn: z.string().optional().nullable(),
  sourceResourceId: z.string().uuid().optional().nullable(),
  sourceReference: z.string().optional().nullable(),
});

export const updateExamSyllabusSchema = createExamSyllabusSchema.partial().extend({
  version: z.number().int().optional(),
});

export const createExamSyllabusNodeBaseSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(1, 'Node code is required')
    .transform((val) => val.trim().toUpperCase().replace(/\s+/g, '_'))
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores')),
  nodeType: ExamSyllabusNodeTypeEnum,
  scopeType: ExamSyllabusScopeTypeEnum.default('GLOBAL'),
  examStageId: z.string().uuid().optional().nullable(),
  examPaperId: z.string().uuid().optional().nullable(),
  nameEn: z.string().trim().min(2, 'English node name is required'),
  nameKn: z.string().trim().min(2, 'Kannada node name is required'),
  shortNameEn: z.string().optional().nullable(),
  shortNameKn: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  officialTextEn: z.string().optional().nullable(),
  officialTextKn: z.string().optional().nullable(),
  sourceReference: z.string().optional().nullable(),
  displayOrder: z.number().int().min(1, 'Display order must be at least 1').optional(),
  isActive: z.boolean().default(true),
});

export const createExamSyllabusNodeSchema = createExamSyllabusNodeBaseSchema.refine(
  (data) => {
    if (data.scopeType === 'GLOBAL') {
      return !data.examStageId && !data.examPaperId;
    }
    if (data.scopeType === 'STAGE') {
      return !!data.examStageId && !data.examPaperId;
    }
    if (data.scopeType === 'PAPER') {
      return !!data.examPaperId && !data.examStageId;
    }
    return true;
  },
  {
    message: 'Scope type mismatch: GLOBAL requires no stage/paper; STAGE requires examStageId; PAPER requires examPaperId',
    path: ['scopeType'],
  }
);

export const updateExamSyllabusNodeSchema = createExamSyllabusNodeBaseSchema.partial().extend({
  version: z.number().int().optional(),
});

export const moveNodeSchema = z.object({
  targetParentId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().min(1).optional(),
});

export const reorderNodesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one node ID is required'),
});

export const deleteSubtreeSchema = z.object({
  confirmDeleteSubtree: z.literal(true, {
    errorMap: () => ({ message: 'Explicit subtree deletion confirmation is required' }),
  }),
});

export const cloneSyllabusRevisionSchema = z.object({
  targetPatternId: z.string().uuid().optional().nullable(),
});

// Readiness Calculations
export function calculateNodeReadiness(node: {
  nameEn?: string | null;
  nameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  officialTextEn?: string | null;
  officialTextKn?: string | null;
}): SyllabusLanguageReadiness {
  const hasEnName = !!node.nameEn?.trim();
  const hasKnName = !!node.nameKn?.trim();

  const hasEnDesc = !!(node.descriptionEn?.trim() || node.officialTextEn?.trim());
  const hasKnDesc = !!(node.descriptionKn?.trim() || node.officialTextKn?.trim());

  const enComplete = hasEnName;
  const knComplete = hasKnName;

  if (enComplete && knComplete) {
    if ((hasEnDesc && !hasKnDesc) || (!hasEnDesc && hasKnDesc)) {
      return enComplete ? 'ENGLISH_COMPLETE' : 'KANNADA_COMPLETE';
    }
    return 'BOTH_COMPLETE';
  }
  if (enComplete) return 'ENGLISH_COMPLETE';
  if (knComplete) return 'KANNADA_COMPLETE';
  return 'INCOMPLETE';
}
