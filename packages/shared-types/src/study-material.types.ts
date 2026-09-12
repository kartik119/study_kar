import { AcademicCategory, AcademicSubcategory, AcademicTopic, AcademicKnowledgeArea } from './academic-taxonomy.types';

export type StudyMaterialContentType = 'ARTICLE' | 'STUDY_NOTE' | 'LESSON' | 'CHAPTER' | 'GUIDE' | 'REFERENCE';
export type StudyMaterialRecordStatus = 'ACTIVE' | 'ARCHIVED';
export type StudyMaterialLocaleStatus = 'DRAFT';

export type StudyMaterialFoundationReadiness =
  | 'NOT_STARTED'
  | 'INCOMPLETE'
  | 'ENGLISH_READY'
  | 'KANNADA_READY'
  | 'BOTH_LANGUAGES_READY';

export type StudyMaterialLocaleRevisionStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type StudyMaterialReviewAction =
  | 'SUBMITTED'
  | 'COMMENTED'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type BilingualContentStatus =
  | 'NOT_STARTED'
  | 'ENGLISH_ONLY'
  | 'KANNADA_ONLY'
  | 'BOTH_DRAFT'
  | 'PARTIALLY_REVIEWED'
  | 'BOTH_APPROVED'
  | 'PARTIALLY_PUBLISHED'
  | 'BOTH_PUBLISHED';

export interface StudyMaterialLocaleRevision {
  id: string;
  studyMaterialLocaleId: string;
  revisionNumber: number;
  sourceRevisionId?: string | null;

  // Content
  title: string;
  shortTitle?: string | null;
  slug: string;
  summary?: string | null;
  contentJson?: any;
  plainTextContent?: string | null;

  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  socialTitle?: string | null;
  socialDescription?: string | null;
  canonicalUrl?: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;

  // Workflow & Audit
  status: StudyMaterialLocaleRevisionStatus;
  reviewSubmittedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  reviewedByAdminId?: string | null;
  approvedAt?: string | Date | null;
  approvedByAdminId?: string | null;
  publishedAt?: string | Date | null;
  publishedByAdminId?: string | null;
  archivedAt?: string | Date | null;

  // Operational Flags
  isCurrentDraft: boolean;
  isCurrentPublished: boolean;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  reviewEvents?: StudyMaterialReviewEvent[];
}

export interface StudyMaterialReviewEvent {
  id: string;
  localeRevisionId: string;
  action: StudyMaterialReviewAction;
  comment?: string | null;
  adminUserId: string;
  adminUserName?: string | null;
  createdAt: string | Date;
}

export interface StudyMaterialLocale {
  id: string;
  studyMaterialId: string;
  language: 'en' | 'kn';
  title: string;
  shortTitle?: string | null;
  slug: string;
  summary?: string | null;
  contentJson?: any;
  plainTextContent?: string | null;
  localeStatus: StudyMaterialLocaleStatus;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  revisions?: StudyMaterialLocaleRevision[];
  currentDraftRevision?: StudyMaterialLocaleRevision | null;
  currentPublishedRevision?: StudyMaterialLocaleRevision | null;
}

export interface StudyMaterialTaxonomyMapping {
  id: string;
  studyMaterialId: string;
  categoryId: string;
  subcategoryId: string;
  topicId: string;
  knowledgeAreaId?: string | null;
  isPrimary: boolean;
  createdByAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;

  category?: AcademicCategory;
  subcategory?: AcademicSubcategory;
  topic?: AcademicTopic;
  knowledgeArea?: AcademicKnowledgeArea | null;
}

export interface StudyMaterial {
  id: string;
  code: string;
  logoUrl?: string | null;
  contentType: StudyMaterialContentType;
  recordStatus: StudyMaterialRecordStatus;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  archivedAt?: string | Date | null;
  archivedByAdminId?: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  locales?: StudyMaterialLocale[];
  taxonomyMappings?: StudyMaterialTaxonomyMapping[];
  academicStages?: any[];
  foundationReadiness?: StudyMaterialFoundationReadiness;
  bilingualStatus?: BilingualContentStatus;
  hasEnglishLocale?: boolean;
  hasKannadaLocale?: boolean;
  primaryMapping?: StudyMaterialTaxonomyMapping | null;
}

export interface StudyMaterialListItem {
  id: string;
  code: string;
  logoUrl?: string | null;
  contentType: StudyMaterialContentType;
  recordStatus: StudyMaterialRecordStatus;
  titleEn?: string | null;
  titleKn?: string | null;
  slugEn?: string | null;
  slugKn?: string | null;
  statusEn?: StudyMaterialLocaleRevisionStatus | null;
  statusKn?: StudyMaterialLocaleRevisionStatus | null;
  seoStatusEn?: 'GOOD' | 'NEEDS_ATTENTION' | 'MISSING';
  seoStatusKn?: 'GOOD' | 'NEEDS_ATTENTION' | 'MISSING';
  hasEnglishLocale: boolean;
  hasKannadaLocale: boolean;
  englishRevisionId?: string | null;
  kannadaRevisionId?: string | null;
  englishLocaleId?: string | null;
  kannadaLocaleId?: string | null;
  foundationReadiness: StudyMaterialFoundationReadiness;
  bilingualStatus: BilingualContentStatus;
  primaryTaxonomyPath: string;
  updatedAt: string | Date;
  updatedByAdminName?: string | null;
}

export interface StudyMaterialDetail extends StudyMaterial {
  englishLocale?: StudyMaterialLocale | null;
  kannadaLocale?: StudyMaterialLocale | null;
  englishRevision?: StudyMaterialLocaleRevision | null;
  kannadaRevision?: StudyMaterialLocaleRevision | null;
  auditLogs?: Array<{
    id: string;
    action: string;
    reason?: string | null;
    createdAt: string | Date;
  }>;
  readinessDetails: {
    foundationReadiness: StudyMaterialFoundationReadiness;
    bilingualStatus: BilingualContentStatus;
    isCanonicalReady: boolean;
    isEnglishReady: boolean;
    isKannadaReady: boolean;
    isTaxonomyReady: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

export interface ReviewQueueFilters {
  search?: string;
  language?: 'en' | 'kn';
  contentType?: StudyMaterialContentType;
  categoryId?: string;
  subcategoryId?: string;
  topicId?: string;
  reviewerId?: string;
  status?: StudyMaterialLocaleRevisionStatus;
  tab?: 'awaiting_review' | 'changes_requested' | 'approved' | 'recently_published';
  page?: number;
  pageSize?: number;
}

export interface ReviewQueueItem {
  revisionId: string;
  studyMaterialId: string;
  code: string;
  language: 'en' | 'kn';
  title: string;
  slug: string;
  contentType: StudyMaterialContentType;
  primaryTaxonomyPath: string;
  submittedBy: string;
  submittedAt: string | Date;
  lastUpdated: string | Date;
  revisionNumber: number;
  status: StudyMaterialLocaleRevisionStatus;
}

export interface StudyMaterialFilters {
  search?: string;
  code?: string;
  contentType?: StudyMaterialContentType;
  recordStatus?: StudyMaterialRecordStatus;
  hasEnglishLocale?: boolean;
  hasKannadaLocale?: boolean;
  foundationReadiness?: StudyMaterialFoundationReadiness;
  bilingualStatus?: BilingualContentStatus;
  categoryId?: string;
  subcategoryId?: string;
  topicId?: string;
  knowledgeAreaId?: string;
  createdByAdminId?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'code';
  sortOrder?: 'asc' | 'desc';
}

export interface StudyMaterialCreateRequest {
  code: string;
  contentType: StudyMaterialContentType;
  initialEnglishLocale?: {
    title: string;
    shortTitle?: string;
    slug?: string;
    summary?: string;
    contentJson?: any;
  };
  initialKannadaLocale?: {
    title: string;
    shortTitle?: string;
    slug?: string;
    summary?: string;
    contentJson?: any;
  };
  taxonomyMapping?: {
    categoryId: string;
    subcategoryId: string;
    topicId: string;
    knowledgeAreaId?: string;
    isPrimary?: boolean;
  };
}

export interface StudyMaterialLocaleRevisionSaveRequest {
  title?: string;
  shortTitle?: string;
  slug?: string;
  summary?: string;
  contentJson?: any;
  plainTextContent?: string;
  metaTitle?: string;
  metaDescription?: string;
  socialTitle?: string;
  socialDescription?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

export type StudyMaterialAccessType = 'FREE' | 'PAID' | 'FREEMIUM';

export type StudyMaterialPreviewMode = 'FULL' | 'SUMMARY_ONLY' | 'CONTENT_BOUNDARY';

export type StudyMaterialAccessState = 'FULL_ACCESS' | 'FREE_ACCESS' | 'PREVIEW_ACCESS' | 'LOCKED';

export type StudyMaterialAccessReadiness = 'ACCESS_READY' | 'ACCESS_INCOMPLETE' | 'BLOCKED';

export type StudyMaterialAccessPreviewMode = 'ANONYMOUS_VISITOR' | 'FREE_USER' | 'ENTITLED_USER' | 'FULL_ADMIN_PREVIEW';

export interface StudyMaterialAccessPolicy {
  id: string;
  studyMaterialId: string;
  accessType: StudyMaterialAccessType;
  entitlementKey: string;
  teaserMode: string;
  freeMcqSampleCount: number;
  freeQuickRevisionSampleCount: number;
  isActive: boolean;
  version: number;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  previewConfigs?: StudyMaterialLocalePreviewConfig[];
}

export interface StudyMaterialLocalePreviewConfig {
  id: string;
  accessPolicyId: string;
  localeRevisionId: string;
  language: 'en' | 'kn';
  previewMode: StudyMaterialPreviewMode;
  previewEndNodeId?: string | null;
  previewEndInclusive: boolean;
  paywallTitle?: string | null;
  paywallMessage?: string | null;
  version: number;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StudyMaterialPreviewOutlineItem {
  nodeId: string;
  type: string;
  label: string;
  location: string;
  wordOffset: number;
  totalWords: number;
}

export interface StudyMaterialPaywall {
  title: string;
  message: string;
  entitlementKey: string;
  callToActionNotice: string;
}

export interface StudyMaterialAccessResult {
  accessType: StudyMaterialAccessType;
  accessState: StudyMaterialAccessState;
  entitled: boolean;
  previewAvailable: boolean;
  contentAccess: 'FULL' | 'PREVIEW' | 'SUMMARY_ONLY';
  entitlementRequired: boolean;
  entitlementKey?: string;
  freeContentJson?: any;
  fullContentJson?: any;
  paywall?: StudyMaterialPaywall;
}

export interface StudyMaterialEntitlementContext {
  userId?: string | null;
  grantedKeys?: string[];
  isSuperAdmin?: boolean;
}

export interface StudyMaterialAccessUpdateRequest {
  accessType: StudyMaterialAccessType;
  paywallTitleEn?: string;
  paywallMessageEn?: string;
  paywallTitleKn?: string;
  paywallMessageKn?: string;
  previewEndNodeIdEn?: string;
  previewEndNodeIdKn?: string;
  freeMcqSampleCount?: number;
  freeQuickRevisionSampleCount?: number;
  reason?: string;
}

