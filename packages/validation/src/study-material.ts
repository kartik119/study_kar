import { z } from 'zod';
import {
  StudyMaterialContentType,
  StudyMaterialFoundationReadiness,
  StudyMaterialLocaleStatus,
} from '@study-karnataka/shared-types';
import { toUpperSnakeCase, isValidSlug } from './academic-taxonomy';

export function evaluateStudyMaterialFoundationReadiness(
  material: { code?: string; contentType?: string },
  locales: Array<{
    language: string;
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    localeStatus?: string | null;
  }> = [],
  mappings: Array<{
    categoryId?: string | null;
    subcategoryId?: string | null;
    topicId?: string | null;
    isPrimary?: boolean;
  }> = []
): {
  foundationReadiness: StudyMaterialFoundationReadiness;
  isCanonicalReady: boolean;
  isEnglishReady: boolean;
  isKannadaReady: boolean;
  isTaxonomyReady: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // 1. Canonical structural checks (Material Code is sufficient)
  const isCanonicalReady = Boolean(material.code);
  if (!material.code) missingFields.push('Study Material Code');

  // 2. Taxonomy mapping structural checks (Informational only — optional)
  const primaryMapping = mappings.find((m) => m.isPrimary) || mappings[0];
  const isTaxonomyReady = Boolean(
    mappings.length > 0 &&
      primaryMapping &&
      primaryMapping.categoryId &&
      primaryMapping.subcategoryId &&
      primaryMapping.topicId
  );

  if (mappings.length === 0) {
    warnings.push('Taxonomy Mapping is unassigned (Optional)');
  }

  // 3. Locale checks
  const enLocale = locales.find((l) => l.language === 'en');
  const knLocale = locales.find((l) => l.language === 'kn');

  const isEnglishReady = Boolean(
    enLocale &&
      enLocale.title &&
      enLocale.title.trim() &&
      enLocale.slug &&
      enLocale.slug.trim() &&
      enLocale.summary &&
      enLocale.summary.trim()
  );

  const isKannadaReady = Boolean(
    knLocale &&
      knLocale.title &&
      knLocale.title.trim() &&
      knLocale.slug &&
      knLocale.slug.trim() &&
      knLocale.summary &&
      knLocale.summary.trim()
  );

  if (!enLocale) missingFields.push('English Locale (Title, Slug, Summary)');
  else if (!isEnglishReady) missingFields.push('Complete English Locale (Title, Slug, Summary)');

  if (!knLocale) missingFields.push('Kannada Locale (Title, Slug, Summary)');
  else if (!isKannadaReady) missingFields.push('Complete Kannada Locale (Title, Slug, Summary)');

  // Overall foundation readiness calculation (Taxonomy is NO LONGER a blocker)
  let foundationReadiness: StudyMaterialFoundationReadiness = 'NOT_STARTED';

  const isStructurallyComplete = isCanonicalReady;

  if (!enLocale && !knLocale) {
    foundationReadiness = 'NOT_STARTED';
  } else if (isStructurallyComplete && isEnglishReady && isKannadaReady) {
    foundationReadiness = 'BOTH_LANGUAGES_READY';
  } else if (isStructurallyComplete && isEnglishReady) {
    foundationReadiness = 'ENGLISH_READY';
  } else if (isStructurallyComplete && isKannadaReady) {
    foundationReadiness = 'KANNADA_READY';
  } else {
    foundationReadiness = 'INCOMPLETE';
  }

  return {
    foundationReadiness,
    isCanonicalReady,
    isEnglishReady,
    isKannadaReady,
    isTaxonomyReady,
    missingFields,
    warnings,
  };
}

// Zod Schemas for Study Material APIs
export const createStudyMaterialSchema = z.object({
  code: z.string().min(2).max(100).transform(toUpperSnakeCase).optional().nullable(),
  contentType: z.enum(['ARTICLE', 'STUDY_NOTE', 'LESSON', 'CHAPTER', 'GUIDE', 'REFERENCE']).optional().default('ARTICLE'),
  logoUrl: z.string().optional().nullable(),
  initialEnglishLocale: z
    .object({
      title: z.string().min(2).max(200),
      shortTitle: z.string().max(100).optional().nullable(),
      slug: z.string().min(2).max(200).refine(isValidSlug, 'Invalid English slug format').optional(),
      summary: z.string().max(2000).optional().nullable(),
    })
    .optional(),
  initialKannadaLocale: z
    .object({
      title: z.string().min(2).max(200),
      shortTitle: z.string().max(100).optional().nullable(),
      slug: z.string().min(2).max(200).refine(isValidSlug, 'Invalid Kannada slug format').optional(),
      summary: z.string().max(2000).optional().nullable(),
    })
    .optional(),
  taxonomyMapping: z
    .object({
      categoryId: z.string().uuid(),
      subcategoryId: z.string().uuid(),
      topicId: z.string().uuid(),
      knowledgeAreaId: z.string().uuid().optional().nullable(),
      isPrimary: z.boolean().default(true),
    })
    .optional(),
  academicStageIds: z.array(z.string().uuid()).optional().nullable(),
});

export const updateStudyMaterialSchema = z.object({
  code: z.string().min(3).max(100).transform(toUpperSnakeCase).optional(),
  contentType: z.enum(['ARTICLE', 'STUDY_NOTE', 'LESSON', 'CHAPTER', 'GUIDE', 'REFERENCE']).optional(),
  logoUrl: z.string().optional().nullable(),
  version: z.number().int().optional(),
  academicStageIds: z.array(z.string().uuid()).optional().nullable(),
});

export const saveStudyMaterialLocaleSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  shortTitle: z.string().max(100).optional().nullable(),
  slug: z.string().min(2, 'Slug is required').max(200).refine(isValidSlug, 'Invalid slug format'),
  summary: z.string().max(2000).optional().nullable(),
  contentJson: z.any().optional().nullable(),
  plainTextContent: z.string().max(50000).optional().nullable(),
});

export const createTaxonomyMappingSchema = z.object({
  categoryId: z.string().uuid('Valid Category ID is required'),
  subcategoryId: z.string().uuid('Valid Subcategory ID is required'),
  topicId: z.string().uuid('Valid Topic ID is required'),
  knowledgeAreaId: z.string().uuid().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

// Prompt 9 — Access Control Helpers & Validation

export function generateEntitlementKey(studyMaterialId: string): string {
  return `STUDY_MATERIAL:${studyMaterialId}:FULL`;
}

/**
 * Ensures all block-level Tiptap nodes have a stable, unique nodeId attribute.
 */
export function ensureStableNodeIds(contentJson: any): any {
  if (!contentJson || typeof contentJson !== 'object' || !Array.isArray(contentJson.content)) {
    return contentJson;
  }

  let counter = 1;
  const newContent = contentJson.content.map((node: any) => {
    if (!node || typeof node !== 'object') return node;
    const existingNodeId = node.attrs?.nodeId;
    const nodeId = existingNodeId || `node_${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 6)}`;
    return {
      ...node,
      attrs: {
        ...(node.attrs || {}),
        nodeId,
      },
    };
  });

  return {
    ...contentJson,
    content: newContent,
  };
}

/**
 * Extract node text for labels and word counting.
 */
export function extractNodeText(node: any): string {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractNodeText).join(' ');
  }
  return '';
}

export function countNodeWords(node: any): number {
  const text = extractNodeText(node).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract human-readable outline from structured Tiptap content.
 */
export function extractPreviewOutline(contentJson: any): Array<{
  nodeId: string;
  type: string;
  label: string;
  location: string;
  wordOffset: number;
  totalWords: number;
}> {
  if (!contentJson || typeof contentJson !== 'object' || !Array.isArray(contentJson.content)) {
    return [];
  }

  const items: Array<{
    nodeId: string;
    type: string;
    label: string;
    location: string;
    wordOffset: number;
    totalWords: number;
  }> = [];

  let runningWordOffset = 0;
  let sectionIndex = 1;

  for (let i = 0; i < contentJson.content.length; i++) {
    const node = contentJson.content[i];
    if (!node || typeof node !== 'object') continue;

    const nodeId = node.attrs?.nodeId || `node_${i + 1}`;
    const nodeType = node.type || 'paragraph';
    const rawText = extractNodeText(node).trim();
    const wordCount = countNodeWords(node);

    let label = '';
    if (nodeType === 'heading') {
      const level = node.attrs?.level || 1;
      label = `H${level}: ${rawText || 'Untitled Section'}`;
    } else if (nodeType === 'callout') {
      const calloutType = node.attrs?.calloutType || 'SHORT_NOTE';
      label = `Callout (${calloutType}): ${rawText.slice(0, 50) || 'Callout Block'}`;
    } else {
      label = `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}: ${rawText.slice(0, 60)}${rawText.length > 60 ? '...' : ''}`;
      if (!rawText) label = `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Block`;
    }

    const location = `Block #${i + 1} (Word ${runningWordOffset + 1}-${runningWordOffset + wordCount})`;

    items.push({
      nodeId,
      type: nodeType,
      label,
      location,
      wordOffset: runningWordOffset,
      totalWords: wordCount,
    });

    runningWordOffset += wordCount;
  }

  return items;
}

/**
 * Split Tiptap document content at configured preview boundary.
 */
export function splitContentAtNodeBoundary(
  contentJson: any,
  previewEndNodeId?: string | null,
  previewEndInclusive: boolean = true
): {
  freeContentJson: any;
  lockedContentJson: any;
  previewFound: boolean;
  freeWordCount: number;
  lockedWordCount: number;
} {
  if (!contentJson || typeof contentJson !== 'object' || !Array.isArray(contentJson.content)) {
    return {
      freeContentJson: contentJson,
      lockedContentJson: { type: 'doc', content: [] },
      previewFound: false,
      freeWordCount: 0,
      lockedWordCount: 0,
    };
  }

  if (!previewEndNodeId) {
    const totalWords = contentJson.content.reduce((acc: number, n: any) => acc + countNodeWords(n), 0);
    return {
      freeContentJson: contentJson,
      lockedContentJson: { type: 'doc', content: [] },
      previewFound: false,
      freeWordCount: totalWords,
      lockedWordCount: 0,
    };
  }

  const nodeIndex = contentJson.content.findIndex((n: any) => n?.attrs?.nodeId === previewEndNodeId);

  if (nodeIndex === -1) {
    const totalWords = contentJson.content.reduce((acc: number, n: any) => acc + countNodeWords(n), 0);
    return {
      freeContentJson: { type: 'doc', content: [] },
      lockedContentJson: contentJson,
      previewFound: false,
      freeWordCount: 0,
      lockedWordCount: totalWords,
    };
  }

  const splitIndex = previewEndInclusive ? nodeIndex + 1 : nodeIndex;
  const freeNodes = contentJson.content.slice(0, splitIndex);
  const lockedNodes = contentJson.content.slice(splitIndex);

  const freeWordCount = freeNodes.reduce((acc: number, n: any) => acc + countNodeWords(n), 0);
  const lockedWordCount = lockedNodes.reduce((acc: number, n: any) => acc + countNodeWords(n), 0);

  return {
    freeContentJson: { ...contentJson, content: freeNodes },
    lockedContentJson: { ...contentJson, content: lockedNodes },
    previewFound: true,
    freeWordCount,
    lockedWordCount,
  };
}

/**
 * Access Readiness Evaluator
 */
export function evaluateStudyMaterialAccessReadiness(
  accessType: 'FREE' | 'PAID' | 'FREEMIUM',
  previewConfigs: Array<{
    language: string;
    previewMode: string;
    previewEndNodeId?: string | null;
    paywallTitle?: string | null;
    paywallMessage?: string | null;
  }>,
  locales: Array<{
    language: string;
    contentJson?: any;
    isCurrentPublished?: boolean;
  }>
): {
  readiness: 'ACCESS_READY' | 'ACCESS_INCOMPLETE' | 'BLOCKED';
  missingRequirements: string[];
  warnings: string[];
} {
  const missingRequirements: string[] = [];
  const warnings: string[] = [];

  if (accessType === 'FREE') {
    return {
      readiness: 'ACCESS_READY',
      missingRequirements,
      warnings,
    };
  }

  if (accessType === 'PAID') {
    // Check paywall configs for published locales
    for (const locale of locales) {
      const config = previewConfigs.find((c) => c.language === locale.language);
      if (!config) {
        warnings.push(`Missing Paywall Configuration for ${locale.language.toUpperCase()}`);
      }
    }

    return {
      readiness: 'ACCESS_READY',
      missingRequirements,
      warnings,
    };
  }

  // FREEMIUM
  let isBlocked = false;
  for (const locale of locales) {
    const config = previewConfigs.find((c) => c.language === locale.language);
    if (!config || !config.previewEndNodeId) {
      missingRequirements.push(`Missing Preview Boundary for ${locale.language.toUpperCase()}`);
      continue;
    }

    if (locale.contentJson) {
      const splitResult = splitContentAtNodeBoundary(locale.contentJson, config.previewEndNodeId);
      if (!splitResult.previewFound) {
        missingRequirements.push(`Preview Boundary node (${config.previewEndNodeId}) no longer exists in ${locale.language.toUpperCase()} revision`);
        isBlocked = true;
      } else if (splitResult.freeWordCount === 0) {
        missingRequirements.push(`Free preview is empty for ${locale.language.toUpperCase()}`);
      } else if (splitResult.lockedWordCount === 0) {
        warnings.push(`No locked content exists after boundary for ${locale.language.toUpperCase()}`);
      }
    }
  }

  if (isBlocked) {
    return {
      readiness: 'BLOCKED',
      missingRequirements,
      warnings,
    };
  }

  if (missingRequirements.length > 0) {
    return {
      readiness: 'ACCESS_INCOMPLETE',
      missingRequirements,
      warnings,
    };
  }

  return {
    readiness: 'ACCESS_READY',
    missingRequirements,
    warnings,
  };
}

export const updateAccessPolicySchema = z.object({
  accessType: z.enum(['FREE', 'PAID', 'FREEMIUM']),
  paywallTitleEn: z.string().max(200).optional().nullable(),
  paywallMessageEn: z.string().max(2000).optional().nullable(),
  paywallTitleKn: z.string().max(200).optional().nullable(),
  paywallMessageKn: z.string().max(2000).optional().nullable(),
  previewEndNodeIdEn: z.string().optional().nullable(),
  previewEndNodeIdKn: z.string().optional().nullable(),
  freeMcqSampleCount: z.number().int().min(0).max(50).default(0),
  freeQuickRevisionSampleCount: z.number().int().min(0).max(50).default(0),
  reason: z.string().max(500).optional(),
});

