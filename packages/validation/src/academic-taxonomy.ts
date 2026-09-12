import { z } from 'zod';
import { AcademicTaxonomyReadiness } from '@study-karnataka/shared-types';

export function toUpperSnakeCase(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim().length === 0) return false;
  // Allows English lowercase alphanumeric with hyphens AND Kannada Unicode range \u0C80-\u0CFF
  const slugRegex = /^[a-z0-9\u0C80-\u0CFF]+(?:-[a-z0-9\u0C80-\u0CFF]+)*$/;
  return slugRegex.test(slug.trim());
}

export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0C80-\u0CFF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function evaluateTaxonomyReadiness(record: {
  nameEn?: string | null;
  slugEn?: string | null;
  nameKn?: string | null;
  slugKn?: string | null;
}): AcademicTaxonomyReadiness {
  const hasEn = Boolean(record.nameEn && record.nameEn.trim() && record.slugEn && record.slugEn.trim());
  const hasKn = Boolean(record.nameKn && record.nameKn.trim() && record.slugKn && record.slugKn.trim());

  if (hasEn && hasKn) return 'BOTH_COMPLETE';
  if (hasEn) return 'ENGLISH_COMPLETE';
  if (hasKn) return 'KANNADA_COMPLETE';
  return 'INCOMPLETE';
}

// Zod Validation Schemas
export const createCategorySchema = z.object({
  moduleType: z.enum(['STUDY_MATERIAL', 'MCQ', 'GENERAL']).default('GENERAL'),
  code: z.string().min(2).max(50).transform(toUpperSnakeCase),
  nameEn: z.string().min(2, 'English name is required').max(150),
  nameKn: z.string().min(2, 'Kannada name is required').max(150),
  shortNameEn: z.string().max(50).optional().nullable(),
  shortNameKn: z.string().max(50).optional().nullable(),
  slugEn: z.string().min(2).max(150).refine(isValidSlug, 'Invalid English slug format'),
  slugKn: z.string().min(2).max(150).refine(isValidSlug, 'Invalid Kannada slug format'),
  descriptionEn: z.string().max(2000).optional().nullable(),
  descriptionKn: z.string().max(2000).optional().nullable(),
  displayOrder: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  version: z.number().int().optional(),
});

export const createSubcategorySchema = createCategorySchema.extend({
  categoryId: z.string().uuid('Valid Category ID is required'),
});

export const updateSubcategorySchema = createSubcategorySchema.partial().extend({
  version: z.number().int().optional(),
});

export const createTopicSchema = createCategorySchema.extend({
  subcategoryId: z.string().uuid('Valid Subcategory ID is required'),
});

export const updateTopicSchema = createTopicSchema.partial().extend({
  version: z.number().int().optional(),
});

export const createKnowledgeAreaSchema = createCategorySchema.extend({
  topicId: z.string().uuid('Valid Topic ID is required'),
});

export const updateKnowledgeAreaSchema = createKnowledgeAreaSchema.partial().extend({
  version: z.number().int().optional(),
});

export const moveTaxonomyItemSchema = z.object({
  targetParentId: z.string().uuid('Valid target parent ID is required'),
  reason: z.string().max(500).optional(),
});

export const reorderTaxonomyItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(1),
    })
  ).min(1, 'At least one item required for reordering'),
});

export const createAcademicStageSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(50, 'Code must be under 50 characters').transform(toUpperSnakeCase),
  nameEn: z.string().min(2, 'English name is required').max(100),
  nameKn: z.string().min(2, 'Kannada name is required').max(100),
  descriptionEn: z.string().max(1000).optional(),
  descriptionKn: z.string().max(1000).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateAcademicStageSchema = createAcademicStageSchema.partial();
