import { z } from 'zod';
import {
  ExamReadinessStatus,
  ExamReadinessIssue,
  ExamReadinessCheck,
  ExamReadinessSection,
  ExamReadinessSummary,
  ExamReadinessCategory,
} from '@study-karnataka/shared-types';
import {
  calculateExamPatternTotals,
  calculateExamPatternReadiness,
  validateExamPatternStructure,
} from './exam-pattern';
import { calculateNodeReadiness } from './exam-syllabus';

export const examAnalyticsFiltersSchema = z.object({
  search: z.string().optional(),
  authorityId: z.string().uuid().optional(),
  programmeId: z.string().uuid().optional(),
  cycleYear: z.coerce.number().int().optional(),
  status: z.enum(['DRAFT', 'REVIEW_PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).optional(),
  readinessStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'READY', 'LIVE', 'ARCHIVED']).optional(),
  bilingualState: z.enum(['BOTH_COMPLETE', 'ENGLISH_COMPLETE', 'KANNADA_COMPLETE', 'INCOMPLETE']).optional(),
  patternStatus: z.enum(['DRAFT', 'REVIEW_PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
  syllabusStatus: z.enum(['DRAFT', 'REVIEW_PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const STALE_DAYS_DEFAULT = 14;

export function getStaleDaysConfig(): number {
  if (typeof process !== 'undefined' && process.env && process.env.EXAM_ANALYTICS_STALE_DAYS) {
    const parsed = parseInt(process.env.EXAM_ANALYTICS_STALE_DAYS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return STALE_DAYS_DEFAULT;
}

export function isRecordStale(updatedAt: Date | string, status: string, staleDays = getStaleDaysConfig()): boolean {
  if (status !== 'DRAFT' && status !== 'CHANGES_REQUESTED') return false;
  const updated = new Date(updatedAt).getTime();
  const now = new Date().getTime();
  const diffDays = (now - updated) / (1000 * 60 * 60 * 24);
  return diffDays >= staleDays;
}

export function calculateCompletionPercentage(checks: ExamReadinessCheck[]): number {
  const applicableChecks = checks.filter((c) => c.status !== 'NOT_APPLICABLE');
  if (applicableChecks.length === 0) return 0;
  const passedChecks = applicableChecks.filter((c) => c.status === 'PASSED');
  return Math.round((passedChecks.length / applicableChecks.length) * 100);
}

export function evaluateOverallReadiness(
  status: string,
  visibility: string,
  hasPattern: boolean,
  hasSyllabus: boolean,
  currentPatternPublished: boolean,
  currentSyllabusPublished: boolean,
  issues: ExamReadinessIssue[],
  archivedAt?: Date | string | null
): ExamReadinessStatus {
  if (status === 'ARCHIVED' || !!archivedAt) {
    return 'ARCHIVED';
  }

  if (!hasPattern || !hasSyllabus) {
    return 'NOT_STARTED';
  }

  const hasBlocker = issues.some((i) => i.blocking || i.severity === 'BLOCKER');

  if (
    status === 'PUBLISHED' &&
    (visibility === 'PUBLIC' || visibility === 'UNLISTED') &&
    currentPatternPublished &&
    currentSyllabusPublished &&
    !hasBlocker
  ) {
    return 'LIVE';
  }

  if (hasBlocker) {
    return 'BLOCKED';
  }

  if (status === 'APPROVED' && currentPatternPublished && currentSyllabusPublished) {
    return 'READY';
  }

  return 'IN_PROGRESS';
}

export function evaluateExamCycleReadiness(exam: any): {
  summary: ExamReadinessSummary;
  examRecordSection: ExamReadinessSection;
  patternSection: ExamReadinessSection & any;
  syllabusSection: ExamReadinessSection & any;
  publicationSection: ExamReadinessSection & any;
  issues: ExamReadinessIssue[];
} {
  const issues: ExamReadinessIssue[] = [];
  const examRecordChecks: ExamReadinessCheck[] = [];

  const authority = exam.programme?.authority;
  const programme = exam.programme;

  // 1. Authority & Programme
  const authActive = authority && authority.isActive;
  examRecordChecks.push({
    code: 'AUTHORITY_ACTIVE',
    name: 'Conducting Authority Active',
    category: 'BASIC_DETAILS',
    status: authActive ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: authActive ? 'Authority is active' : 'Exam Authority is missing or inactive',
  });
  if (!authActive) {
    issues.push({
      code: 'AUTHORITY_INACTIVE',
      category: 'BASIC_DETAILS',
      severity: 'BLOCKER',
      entityType: 'EXAM_AUTHORITY',
      entityId: authority?.id,
      entityLabel: authority?.nameEn || 'Authority',
      message: 'Exam Authority is inactive or missing',
      suggestedAction: 'Activate or assign a valid Exam Authority',
      destinationRoute: '/exams',
      blocking: true,
      createdFromRule: 'AUTHORITY_ACTIVE',
    });
  }

  const progActive = programme && programme.isActive;
  examRecordChecks.push({
    code: 'PROGRAMME_ACTIVE',
    name: 'Exam Programme Active',
    category: 'BASIC_DETAILS',
    status: progActive ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: progActive ? 'Programme is active' : 'Exam Programme is missing or inactive',
  });
  if (!progActive) {
    issues.push({
      code: 'PROGRAMME_INACTIVE',
      category: 'BASIC_DETAILS',
      severity: 'BLOCKER',
      entityType: 'EXAM_PROGRAMME',
      entityId: programme?.id,
      entityLabel: programme?.nameEn || 'Programme',
      message: 'Exam Programme is inactive or missing',
      suggestedAction: 'Activate or assign a valid Exam Programme',
      destinationRoute: '/exams',
      blocking: true,
      createdFromRule: 'PROGRAMME_ACTIVE',
    });
  }

  // 2. Exam Cycle Basic Details
  const titleEnOk = !!exam.titleEn?.trim();
  const titleKnOk = !!exam.titleKn?.trim();
  const cycleTitleOk = titleEnOk && titleKnOk;
  examRecordChecks.push({
    code: 'CYCLE_BILINGUAL_TITLES',
    name: 'Bilingual Titles Complete',
    category: 'BILINGUAL_CONTENT',
    status: cycleTitleOk ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: cycleTitleOk ? 'English and Kannada titles present' : 'Missing English or Kannada Exam Title',
  });
  if (!cycleTitleOk) {
    issues.push({
      code: 'EXAM_TITLE_MISSING',
      category: 'BILINGUAL_CONTENT',
      severity: 'BLOCKER',
      entityType: 'EXAM_CYCLE',
      entityId: exam.id,
      entityLabel: exam.titleEn || exam.cycleCode,
      field: !titleEnOk ? 'titleEn' : 'titleKn',
      message: !titleEnOk ? 'English Exam title is missing' : 'Kannada Exam title is missing',
      suggestedAction: 'Update Exam details with both English and Kannada titles',
      destinationRoute: `/exams/${exam.id}/edit`,
      blocking: true,
      createdFromRule: 'CYCLE_BILINGUAL_TITLES',
    });
  }

  const descEnOk = !!exam.descriptionEn?.trim();
  const descKnOk = !!exam.descriptionKn?.trim();
  const cycleDescOk = descEnOk && descKnOk;
  examRecordChecks.push({
    code: 'CYCLE_BILINGUAL_DESCRIPTION',
    name: 'Bilingual Descriptions Complete',
    category: 'BILINGUAL_CONTENT',
    status: cycleDescOk ? 'PASSED' : 'WARNING',
    isBlocking: false,
    message: cycleDescOk ? 'Descriptions present in both languages' : 'Incomplete descriptions in English/Kannada',
  });
  if (!cycleDescOk) {
    issues.push({
      code: 'EXAM_DESCRIPTION_INCOMPLETE',
      category: 'BILINGUAL_CONTENT',
      severity: 'WARNING',
      entityType: 'EXAM_CYCLE',
      entityId: exam.id,
      entityLabel: exam.titleEn || exam.cycleCode,
      message: 'Exam description is missing in English or Kannada',
      suggestedAction: 'Add descriptions for both languages for better portal clarity',
      destinationRoute: `/exams/${exam.id}/edit`,
      blocking: false,
      createdFromRule: 'CYCLE_BILINGUAL_DESCRIPTION',
    });
  }

  // Notification Number check
  const notificationOk = !!exam.notificationNumber?.trim();
  examRecordChecks.push({
    code: 'NOTIFICATION_NUMBER',
    name: 'Notification Number Provided',
    category: 'BASIC_DETAILS',
    status: notificationOk ? 'PASSED' : exam.status === 'PUBLISHED' || exam.status === 'APPROVED' ? 'FAILED' : 'WARNING',
    isBlocking: exam.status === 'PUBLISHED' || exam.status === 'APPROVED',
    message: notificationOk ? 'Notification number recorded' : 'Notification number missing',
  });
  if (!notificationOk && (exam.status === 'PUBLISHED' || exam.status === 'APPROVED')) {
    issues.push({
      code: 'NOTIFICATION_NUMBER_REQUIRED',
      category: 'BASIC_DETAILS',
      severity: 'BLOCKER',
      entityType: 'EXAM_CYCLE',
      entityId: exam.id,
      entityLabel: exam.titleEn,
      field: 'notificationNumber',
      message: 'Notification number is required before publication',
      suggestedAction: 'Enter official notification number',
      destinationRoute: `/exams/${exam.id}/edit`,
      blocking: true,
      createdFromRule: 'NOTIFICATION_NUMBER',
    });
  }

  // 3. Eligibility Checks
  const eligibility = exam.eligibility;
  let eligibilityValid = true;
  if (eligibility) {
    if (eligibility.minimumAge !== null && eligibility.maximumAge !== null) {
      if (eligibility.minimumAge > eligibility.maximumAge) {
        eligibilityValid = false;
        issues.push({
          code: 'INVALID_AGE_RANGE',
          category: 'ELIGIBILITY',
          severity: 'BLOCKER',
          entityType: 'EXAM_ELIGIBILITY',
          entityId: eligibility.id,
          entityLabel: 'Age Limits',
          field: 'minimumAge',
          message: `Minimum age (${eligibility.minimumAge}) cannot exceed maximum age (${eligibility.maximumAge})`,
          suggestedAction: 'Correct age limits in Exam Eligibility settings',
          destinationRoute: `/exams/${exam.id}/edit`,
          blocking: true,
          createdFromRule: 'ELIGIBILITY_AGE_RANGE',
        });
      }
    }

    const hasEduEn = !!eligibility.minimumEducationEn?.trim();
    const hasEduKn = !!eligibility.minimumEducationKn?.trim();
    if ((hasEduEn && !hasEduKn) || (!hasEduEn && hasEduKn)) {
      issues.push({
        code: 'ELIGIBILITY_BILINGUAL_MISMATCH',
        category: 'ELIGIBILITY',
        severity: 'WARNING',
        entityType: 'EXAM_ELIGIBILITY',
        entityId: eligibility.id,
        message: 'Minimum education requirement is only specified in one language',
        suggestedAction: 'Provide education criteria in both English and Kannada',
        destinationRoute: `/exams/${exam.id}/edit`,
        blocking: false,
        createdFromRule: 'ELIGIBILITY_BILINGUAL',
      });
    }
  }

  examRecordChecks.push({
    code: 'ELIGIBILITY_CONFIGURED',
    name: 'Eligibility Rules Configured',
    category: 'ELIGIBILITY',
    status: eligibility && eligibilityValid ? 'PASSED' : eligibilityValid ? 'WARNING' : 'FAILED',
    isBlocking: !eligibilityValid,
    message: eligibility ? 'Eligibility criteria configured' : 'No eligibility criteria attached',
  });

  // 4. Important Dates
  const importantDates = exam.importantDates || [];
  let dateRangeValid = true;
  if (exam.applicationStartDate && exam.applicationEndDate) {
    if (new Date(exam.applicationEndDate) < new Date(exam.applicationStartDate)) {
      dateRangeValid = false;
      issues.push({
        code: 'INVALID_APPLICATION_DATE_RANGE',
        category: 'IMPORTANT_DATES',
        severity: 'BLOCKER',
        entityType: 'EXAM_CYCLE',
        entityId: exam.id,
        field: 'applicationEndDate',
        message: 'Application end date cannot be before application start date',
        suggestedAction: 'Fix application date window',
        destinationRoute: `/exams/${exam.id}/edit`,
        blocking: true,
        createdFromRule: 'IMPORTANT_DATES_APPLICATION',
      });
    }
  }

  if (exam.applicationStartDate && exam.feePaymentEndDate) {
    if (new Date(exam.feePaymentEndDate) < new Date(exam.applicationStartDate)) {
      dateRangeValid = false;
      issues.push({
        code: 'INVALID_FEE_PAYMENT_DATE_RANGE',
        category: 'IMPORTANT_DATES',
        severity: 'BLOCKER',
        entityType: 'EXAM_CYCLE',
        entityId: exam.id,
        field: 'feePaymentEndDate',
        message: 'Fee payment end date cannot be before application start date',
        suggestedAction: 'Fix fee payment end date',
        destinationRoute: `/exams/${exam.id}/edit`,
        blocking: true,
        createdFromRule: 'IMPORTANT_DATES_FEE',
      });
    }
  }

  examRecordChecks.push({
    code: 'IMPORTANT_DATES_VALID',
    name: 'Important Dates Consistency',
    category: 'IMPORTANT_DATES',
    status: dateRangeValid ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: dateRangeValid ? 'Date ranges are valid' : 'Invalid date sequence detected',
  });

  // 5. Official Resources
  const resources = (exam.officialResources || []).filter((r: any) => r.isActive !== false);
  const notificationRes = resources.find((r: any) => r.resourceType === 'OFFICIAL_NOTIFICATION' || r.url);
  const hasOfficialResource = resources.length > 0 && !!notificationRes;

  examRecordChecks.push({
    code: 'OFFICIAL_NOTIFICATION_RESOURCE',
    name: 'Official Resource URL',
    category: 'OFFICIAL_RESOURCES',
    status: hasOfficialResource ? 'PASSED' : exam.status === 'APPROVED' || exam.status === 'PUBLISHED' ? 'FAILED' : 'WARNING',
    isBlocking: exam.status === 'APPROVED' || exam.status === 'PUBLISHED',
    message: hasOfficialResource ? 'Official notification link present' : 'Official notification resource link missing',
  });
  if (!hasOfficialResource && (exam.status === 'APPROVED' || exam.status === 'PUBLISHED')) {
    issues.push({
      code: 'OFFICIAL_RESOURCE_MISSING',
      category: 'OFFICIAL_RESOURCES',
      severity: 'BLOCKER',
      entityType: 'EXAM_OFFICIAL_RESOURCE',
      entityId: exam.id,
      message: 'At least one active Official Resource URL is required before publication',
      suggestedAction: 'Add official notification link or document URL',
      destinationRoute: `/exams/${exam.id}/edit`,
      blocking: true,
      createdFromRule: 'OFFICIAL_NOTIFICATION_RESOURCE',
    });
  }

  // 6. SEO
  const seo = exam.seo;
  const seoEnSlug = !!seo?.slugEn?.trim();
  const seoKnSlug = !!seo?.slugKn?.trim();
  const seoOk = seoEnSlug && seoKnSlug;

  examRecordChecks.push({
    code: 'SEO_SLUGS_CONFIGURED',
    name: 'Bilingual SEO Slugs',
    category: 'SEO',
    status: seoOk ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: seoOk ? 'English and Kannada SEO slugs present' : 'Missing English or Kannada SEO slug',
  });
  if (!seoOk) {
    issues.push({
      code: 'SEO_SLUG_MISSING',
      category: 'SEO',
      severity: 'BLOCKER',
      entityType: 'EXAM_SEO',
      entityId: seo?.id || exam.id,
      field: !seoEnSlug ? 'slugEn' : 'slugKn',
      message: 'Both English and Kannada SEO URL slugs are required',
      suggestedAction: 'Generate or specify unique bilingual SEO slugs',
      destinationRoute: `/exams/${exam.id}/edit`,
      blocking: true,
      createdFromRule: 'SEO_SLUGS_CONFIGURED',
    });
  }

  // Pattern Section Checks
  const patterns = exam.patterns || [];
  const currentPattern = patterns.find((p: any) => p.isCurrent) || patterns[0];
  const patternChecks: ExamReadinessCheck[] = [];
  let patternTotals = {
    stageCount: 0,
    paperCount: 0,
    sectionCount: 0,
    totalMarks: 0,
    totalMeritMarks: 0,
    totalQualifyingMarks: 0,
    totalQuestions: 0,
    approximateDurationMinutes: 0,
  };
  let patternValidationIssues: Array<{ code: string; message: string; severity: string }> = [];

  if (!currentPattern) {
    patternChecks.push({
      code: 'PATTERN_EXISTS',
      name: 'Exam Pattern Revision Exists',
      category: 'PATTERN',
      status: 'FAILED',
      isBlocking: true,
      message: 'No Exam Pattern configuration exists',
    });
    issues.push({
      code: 'MISSING_EXAM_PATTERN',
      category: 'PATTERN',
      severity: 'BLOCKER',
      entityType: 'EXAM_CYCLE',
      entityId: exam.id,
      message: 'Exam Cycle has no Exam Pattern defined',
      suggestedAction: 'Create and configure an Exam Pattern revision',
      destinationRoute: `/exams/${exam.id}/pattern`,
      blocking: true,
      createdFromRule: 'PATTERN_EXISTS',
    });
  } else {
    patternTotals = calculateExamPatternTotals(currentPattern);
    const patternStruct = validateExamPatternStructure(currentPattern);
    patternValidationIssues = patternStruct.issues;

    patternChecks.push({
      code: 'PATTERN_STRUCTURAL_VALIDITY',
      name: 'Pattern Structure & Rollups',
      category: 'PATTERN',
      status: patternStruct.isValid ? 'PASSED' : 'FAILED',
      isBlocking: true,
      message: patternStruct.isValid ? 'Pattern structure and marks rollups valid' : 'Pattern structural validation errors found',
    });

    if (!patternStruct.isValid) {
      patternStruct.issues.forEach((iss) => {
        issues.push({
          code: iss.code,
          category: 'PATTERN',
          severity: 'BLOCKER',
          entityType: 'EXAM_PATTERN',
          entityId: currentPattern.id,
          entityLabel: currentPattern.titleEn,
          message: iss.message,
          suggestedAction: 'Review and fix pattern stages, papers or section rollups in Pattern Builder',
          destinationRoute: `/exams/${exam.id}/pattern`,
          blocking: true,
          createdFromRule: 'PATTERN_STRUCTURAL_VALIDITY',
        });
      });
    }

    const patternBilingual = calculateExamPatternReadiness(currentPattern);
    patternChecks.push({
      code: 'PATTERN_BILINGUAL_COMPLETE',
      name: 'Pattern Bilingual Completeness',
      category: 'BILINGUAL_CONTENT',
      status: patternBilingual.state === 'BOTH_COMPLETE' ? 'PASSED' : 'FAILED',
      isBlocking: true,
      message: patternBilingual.state === 'BOTH_COMPLETE' ? 'Pattern content complete in EN and KN' : 'Incomplete English/Kannada content in Pattern',
    });
  }

  // Syllabus Section Checks
  const syllabi = exam.syllabi || [];
  const currentSyllabus = syllabi.find((s: any) => s.isCurrent) || syllabi[0];
  const syllabusChecks: ExamReadinessCheck[] = [];
  let syllabusValidationIssues: Array<{ code: string; message: string; severity: string }> = [];

  let nodeSummary = {
    totalNodes: 0,
    activeNodes: 0,
    inactiveNodes: 0,
    rootNodes: 0,
    maxDepth: 0,
    subjectCount: 0,
    unitCount: 0,
    topicCount: 0,
    subtopicCount: 0,
    knowledgeAreaCount: 0,
    englishCompleteNodes: 0,
    kannadaCompleteNodes: 0,
    bothLanguageCompleteNodes: 0,
    incompleteNodes: 0,
    globalScopeNodes: 0,
    stageScopedNodes: 0,
    paperScopedNodes: 0,
  };

  if (!currentSyllabus) {
    syllabusChecks.push({
      code: 'SYLLABUS_EXISTS',
      name: 'Syllabus Tree Exists',
      category: 'SYLLABUS',
      status: 'FAILED',
      isBlocking: true,
      message: 'No Exam Syllabus tree exists',
    });
    issues.push({
      code: 'MISSING_EXAM_SYLLABUS',
      category: 'SYLLABUS',
      severity: 'BLOCKER',
      entityType: 'EXAM_CYCLE',
      entityId: exam.id,
      message: 'Exam Cycle has no Syllabus tree defined',
      suggestedAction: 'Create and configure an Exam Syllabus revision',
      destinationRoute: `/exams/${exam.id}/syllabus`,
      blocking: true,
      createdFromRule: 'SYLLABUS_EXISTS',
    });
  } else {
    // Check syllabus pattern link matches current pattern
    if (currentPattern && currentSyllabus.examPatternId !== currentPattern.id) {
      issues.push({
        code: 'SYLLABUS_PATTERN_MISMATCH',
        category: 'SYLLABUS',
        severity: 'BLOCKER',
        entityType: 'EXAM_SYLLABUS',
        entityId: currentSyllabus.id,
        message: 'Current Syllabus is not linked to the current Exam Pattern revision',
        suggestedAction: 'Re-link or clone syllabus for the active Pattern revision',
        destinationRoute: `/exams/${exam.id}/syllabus`,
        blocking: true,
        createdFromRule: 'SYLLABUS_PATTERN_LINK',
      });
    }

    const nodes = currentSyllabus.nodes || [];
    nodeSummary.totalNodes = nodes.length;

    let hasRoot = false;
    nodes.forEach((n: any) => {
      if (n.isActive !== false) nodeSummary.activeNodes++;
      else nodeSummary.inactiveNodes++;

      if (!n.parentId) {
        nodeSummary.rootNodes++;
        hasRoot = true;
      }
      if (n.depth > nodeSummary.maxDepth) nodeSummary.maxDepth = n.depth;

      if (n.nodeType === 'SUBJECT') nodeSummary.subjectCount++;
      else if (n.nodeType === 'UNIT') nodeSummary.unitCount++;
      else if (n.nodeType === 'TOPIC') nodeSummary.topicCount++;
      else if (n.nodeType === 'SUBTOPIC') nodeSummary.subtopicCount++;
      else if (n.nodeType === 'KNOWLEDGE_AREA') nodeSummary.knowledgeAreaCount++;

      if (n.scopeType === 'GLOBAL') nodeSummary.globalScopeNodes++;
      else if (n.scopeType === 'STAGE') nodeSummary.stageScopedNodes++;
      else if (n.scopeType === 'PAPER') nodeSummary.paperScopedNodes++;

      const nodeLang = calculateNodeReadiness(n);
      if (nodeLang === 'BOTH_COMPLETE') nodeSummary.bothLanguageCompleteNodes++;
      else if (nodeLang === 'ENGLISH_COMPLETE') nodeSummary.englishCompleteNodes++;
      else if (nodeLang === 'KANNADA_COMPLETE') nodeSummary.kannadaCompleteNodes++;
      else nodeSummary.incompleteNodes++;
    });

    syllabusChecks.push({
      code: 'SYLLABUS_ROOT_NODES',
      name: 'Active Root Nodes Present',
      category: 'SYLLABUS',
      status: hasRoot ? 'PASSED' : 'FAILED',
      isBlocking: true,
      message: hasRoot ? `${nodeSummary.rootNodes} root node(s) present` : 'Syllabus tree has no root nodes',
    });

    if (!hasRoot) {
      issues.push({
        code: 'SYLLABUS_NO_ROOT_NODES',
        category: 'SYLLABUS',
        severity: 'BLOCKER',
        entityType: 'EXAM_SYLLABUS',
        entityId: currentSyllabus.id,
        message: 'Syllabus tree must contain at least one root node',
        suggestedAction: 'Add root subject nodes to syllabus tree',
        destinationRoute: `/exams/${exam.id}/syllabus`,
        blocking: true,
        createdFromRule: 'SYLLABUS_ROOT_NODES',
      });
    }

    const syllabusBilingualOk = nodeSummary.incompleteNodes === 0 && nodeSummary.activeNodes > 0;
    syllabusChecks.push({
      code: 'SYLLABUS_BILINGUAL_COMPLETE',
      name: 'Syllabus Nodes Bilingual Coverage',
      category: 'BILINGUAL_CONTENT',
      status: syllabusBilingualOk ? 'PASSED' : 'FAILED',
      isBlocking: true,
      message: syllabusBilingualOk ? 'All active syllabus nodes are bilingual' : `${nodeSummary.incompleteNodes} node(s) incomplete in EN/KN`,
    });

    if (!syllabusBilingualOk && nodeSummary.activeNodes > 0) {
      issues.push({
        code: 'SYLLABUS_BILINGUAL_INCOMPLETE',
        category: 'BILINGUAL_CONTENT',
        severity: 'BLOCKER',
        entityType: 'EXAM_SYLLABUS',
        entityId: currentSyllabus.id,
        message: `${nodeSummary.incompleteNodes} active syllabus node(s) missing English or Kannada translations`,
        suggestedAction: 'Edit incomplete nodes to add both English and Kannada titles',
        destinationRoute: `/exams/${exam.id}/syllabus`,
        blocking: true,
        createdFromRule: 'SYLLABUS_BILINGUAL_COMPLETE',
      });
    }
  }

  // Publication Checks
  const pubChecks: ExamReadinessCheck[] = [];
  const isApprovedOrPublished = exam.status === 'APPROVED' || exam.status === 'PUBLISHED';
  const patternPublished = currentPattern?.status === 'PUBLISHED';
  const syllabusPublished = currentSyllabus?.status === 'PUBLISHED';

  pubChecks.push({
    code: 'CYCLE_WORKFLOW_APPROVED',
    name: 'Exam Cycle Approved/Published',
    category: 'WORKFLOW',
    status: isApprovedOrPublished ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: isApprovedOrPublished ? `Exam status is ${exam.status}` : `Exam cycle status is ${exam.status}`,
  });

  pubChecks.push({
    code: 'PATTERN_WORKFLOW_PUBLISHED',
    name: 'Current Pattern Published',
    category: 'PATTERN',
    status: patternPublished ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: patternPublished ? 'Current pattern is published' : `Current pattern status is ${currentPattern?.status || 'NONE'}`,
  });

  pubChecks.push({
    code: 'SYLLABUS_WORKFLOW_PUBLISHED',
    name: 'Current Syllabus Published',
    category: 'SYLLABUS',
    status: syllabusPublished ? 'PASSED' : 'FAILED',
    isBlocking: true,
    message: syllabusPublished ? 'Current syllabus is published' : `Current syllabus status is ${currentSyllabus?.status || 'NONE'}`,
  });

  const publicationBlockers = issues.filter((i) => i.blocking || i.severity === 'BLOCKER');
  const isEligibleForPublication = publicationBlockers.length === 0 && currentPattern && currentSyllabus;
  const isEligibleForPublicApi =
    exam.status === 'PUBLISHED' &&
    (exam.visibility === 'PUBLIC' || exam.visibility === 'UNLISTED') &&
    patternPublished &&
    syllabusPublished;

  const allChecks = [...examRecordChecks, ...patternChecks, ...syllabusChecks, ...pubChecks];
  const completionPercentage = calculateCompletionPercentage(allChecks);

  const overallStatus = evaluateOverallReadiness(
    exam.status,
    exam.visibility,
    !!currentPattern,
    !!currentSyllabus,
    patternPublished,
    syllabusPublished,
    issues,
    exam.archivedAt
  );

  let nextRequiredAction = 'No immediate action required';
  if (overallStatus === 'NOT_STARTED') {
    if (!currentPattern) nextRequiredAction = 'Build Exam Pattern';
    else if (!currentSyllabus) nextRequiredAction = 'Build Exam Syllabus';
  } else if (overallStatus === 'BLOCKED') {
    nextRequiredAction = 'Resolve blocking readiness issues';
  } else if (overallStatus === 'IN_PROGRESS') {
    if (exam.status === 'DRAFT') nextRequiredAction = 'Submit Exam Cycle for Editorial Review';
    else if (exam.status === 'REVIEW_PENDING') nextRequiredAction = 'Review and Approve/Request Changes';
    else if (exam.status === 'CHANGES_REQUESTED') nextRequiredAction = 'Update Exam details per Review Feedback';
    else if (currentPattern?.status === 'DRAFT') nextRequiredAction = 'Submit Pattern for Review';
    else if (currentSyllabus?.status === 'DRAFT') nextRequiredAction = 'Submit Syllabus for Review';
    else if (currentPattern?.status === 'APPROVED') nextRequiredAction = 'Publish Pattern Revision';
    else if (currentSyllabus?.status === 'APPROVED') nextRequiredAction = 'Publish Syllabus Revision';
  } else if (overallStatus === 'READY') {
    nextRequiredAction = 'Publish Exam Cycle';
  } else if (overallStatus === 'LIVE') {
    nextRequiredAction = 'Publicly accessible';
  }

  const blockerCount = issues.filter((i) => i.severity === 'BLOCKER').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const informationCount = issues.filter((i) => i.severity === 'INFORMATION').length;

  return {
    summary: {
      completionPercentage,
      overallStatus,
      blockerCount,
      warningCount,
      informationCount,
      issues,
      nextRequiredAction,
    },
    examRecordSection: {
      title: 'Exam Record Checks',
      category: 'BASIC_DETAILS',
      checks: examRecordChecks,
      passedCount: examRecordChecks.filter((c) => c.status === 'PASSED').length,
      totalCount: examRecordChecks.length,
      blockerCount: examRecordChecks.filter((c) => c.isBlocking && c.status === 'FAILED').length,
      warningCount: examRecordChecks.filter((c) => c.status === 'WARNING').length,
    },
    patternSection: {
      title: 'Exam Pattern Checks',
      category: 'PATTERN',
      checks: patternChecks,
      passedCount: patternChecks.filter((c) => c.status === 'PASSED').length,
      totalCount: patternChecks.length,
      blockerCount: patternChecks.filter((c) => c.isBlocking && c.status === 'FAILED').length,
      warningCount: patternChecks.filter((c) => c.status === 'WARNING').length,
      currentRevision: currentPattern?.revisionNumber || null,
      status: currentPattern?.status || null,
      ...patternTotals,
      validationIssues: patternValidationIssues,
    },
    syllabusSection: {
      title: 'Exam Syllabus Tree Checks',
      category: 'SYLLABUS',
      checks: syllabusChecks,
      passedCount: syllabusChecks.filter((c) => c.status === 'PASSED').length,
      totalCount: syllabusChecks.length,
      blockerCount: syllabusChecks.filter((c) => c.isBlocking && c.status === 'FAILED').length,
      warningCount: syllabusChecks.filter((c) => c.status === 'WARNING').length,
      currentRevision: currentSyllabus?.revisionNumber || null,
      linkedPatternRevision: currentPattern?.revisionNumber || null,
      status: currentSyllabus?.status || null,
      ...nodeSummary,
      validationIssues: syllabusValidationIssues,
    },
    publicationSection: {
      title: 'Publication Eligibility Checks',
      category: 'PUBLICATION',
      checks: pubChecks,
      passedCount: pubChecks.filter((c) => c.status === 'PASSED').length,
      totalCount: pubChecks.length,
      blockerCount: pubChecks.filter((c) => c.isBlocking && c.status === 'FAILED').length,
      warningCount: pubChecks.filter((c) => c.status === 'WARNING').length,
      isEligibleForPublication: !!isEligibleForPublication,
      isEligibleForPublicApi: !!isEligibleForPublicApi,
      publicationBlockers,
    },
    issues,
  };
}
