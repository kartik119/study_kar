import { Language } from './index';

export type ExamSyllabusStatus =
  | 'DRAFT'
  | 'REVIEW_PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ExamSyllabusNodeType =
  | 'SUBJECT'
  | 'SECTION'
  | 'UNIT'
  | 'TOPIC'
  | 'SUBTOPIC'
  | 'KNOWLEDGE_AREA'
  | 'THEME'
  | 'OTHER';

export type ExamSyllabusScopeType = 'GLOBAL' | 'STAGE' | 'PAPER';

export type SyllabusLanguageReadiness = 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE';

export interface ExamSyllabusNode {
  id: string;
  examSyllabusId: string;
  parentId?: string | null;
  code: string;
  nodeType: ExamSyllabusNodeType;
  scopeType: ExamSyllabusScopeType;
  examStageId?: string | null;
  examPaperId?: string | null;
  nameEn: string;
  nameKn: string;
  shortNameEn?: string | null;
  shortNameKn?: string | null;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  officialTextEn?: string | null;
  officialTextKn?: string | null;
  sourceReference?: string | null;
  displayOrder: number;
  depth: number;
  isActive: boolean;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;

  examStage?: any;
  examPaper?: any;
  parent?: ExamSyllabusNode | null;
  children?: ExamSyllabusNode[];
  readiness?: SyllabusLanguageReadiness;
}

export interface ExamSyllabus {
  id: string;
  examCycleId: string;
  examPatternId: string;
  revisionNumber: number;
  sourceSyllabusId?: string | null;
  titleEn: string;
  titleKn: string;
  descriptionEn?: string | null;
  descriptionKn?: string | null;
  generalInstructionsEn?: string | null;
  generalInstructionsKn?: string | null;
  sourceResourceId?: string | null;
  sourceReference?: string | null;
  status: ExamSyllabusStatus;
  isCurrent: boolean;
  reviewSubmittedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  reviewedByAdminId?: string | null;
  approvedAt?: Date | string | null;
  approvedByAdminId?: string | null;
  publishedAt?: Date | string | null;
  publishedByAdminId?: string | null;
  archivedAt?: Date | string | null;
  createdByAdminId?: string | null;
  updatedByAdminId?: string | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;

  examCycle?: any;
  examPattern?: any;
  sourceSyllabus?: ExamSyllabus | null;
  nodes?: ExamSyllabusNode[];
  totals?: SyllabusCalculatedTotals;
  readiness?: {
    state: SyllabusLanguageReadiness;
    englishCompleteCount: number;
    kannadaCompleteCount: number;
    bothCompleteCount: number;
    incompleteCount: number;
  };
  validation?: SyllabusValidationResult;
}

export interface SyllabusCalculatedTotals {
  totalNodes: number;
  activeNodes: number;
  inactiveNodes: number;
  rootNodesCount: number;
  maxTreeDepth: number;
  subjectsCount: number;
  sectionsCount: number;
  unitsCount: number;
  topicsCount: number;
  subtopicsCount: number;
  knowledgeAreasCount: number;
  globalScopedCount: number;
  stageScopedCount: number;
  paperScopedCount: number;
  englishCompleteCount: number;
  kannadaCompleteCount: number;
  bothCompleteCount: number;
  incompleteCount: number;
  validationIssueCount: number;
  publicationReadiness: SyllabusLanguageReadiness;
}

export interface SyllabusValidationIssue {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  nodeId?: string | null;
  nodeCode?: string | null;
  field?: string | null;
  message: string;
  messageKn?: string | null;
  suggestedCorrection?: string | null;
}

export interface SyllabusValidationResult {
  isValid: boolean;
  isPublishable: boolean;
  issues: SyllabusValidationIssue[];
}

export interface SyllabusTreeResponse {
  syllabus: ExamSyllabus;
  tree: ExamSyllabusNode[];
}

export interface PublicSyllabusNode {
  id: string;
  code: string;
  nodeType: ExamSyllabusNodeType;
  name: string;
  shortName?: string | null;
  description?: string | null;
  officialText?: string | null;
  scopeType: ExamSyllabusScopeType;
  stageCode?: string | null;
  paperCode?: string | null;
  displayOrder: number;
  depth: number;
  sourceReference?: string | null;
  children: PublicSyllabusNode[];
}

export interface PublicSyllabusResponse {
  syllabusId: string;
  examCycleId: string;
  examSlug: string;
  examTitle: string;
  syllabusRevisionNumber: number;
  patternRevisionNumber: number;
  language: Language;
  title: string;
  description?: string | null;
  generalInstructions?: string | null;
  tree: PublicSyllabusNode[];
}
