import { describe, it, expect } from 'vitest';
import {
  calculateCompletionPercentage,
  evaluateOverallReadiness,
  evaluateExamCycleReadiness,
  isRecordStale,
} from '../exam-analytics';
import { ExamReadinessCheck, ExamReadinessIssue } from '@study-karnataka/shared-types';

describe('Development Prompt 6 — Exam Analytics & Readiness Unit Tests', () => {
  describe('1. Completion Percentage & Status Determination', () => {
    it('calculates completion percentage correctly', () => {
      const checks: ExamReadinessCheck[] = [
        { code: 'C1', name: 'Check 1', category: 'BASIC_DETAILS', status: 'PASSED', isBlocking: true },
        { code: 'C2', name: 'Check 2', category: 'BASIC_DETAILS', status: 'PASSED', isBlocking: true },
        { code: 'C3', name: 'Check 3', category: 'BASIC_DETAILS', status: 'FAILED', isBlocking: false },
        { code: 'C4', name: 'Check 4', category: 'BASIC_DETAILS', status: 'NOT_APPLICABLE', isBlocking: false },
      ];
      // 2 passed out of 3 applicable = 67%
      expect(calculateCompletionPercentage(checks)).toBe(67);
    });

    it('handles zero applicable checks gracefully', () => {
      const checks: ExamReadinessCheck[] = [
        { code: 'C1', name: 'Check 1', category: 'BASIC_DETAILS', status: 'NOT_APPLICABLE', isBlocking: false },
      ];
      expect(calculateCompletionPercentage(checks)).toBe(0);
    });

    it('evaluates ARCHIVED status when exam status is ARCHIVED or archivedAt is set', () => {
      const status = evaluateOverallReadiness('ARCHIVED', 'PUBLIC', true, true, true, true, []);
      expect(status).toBe('ARCHIVED');

      const statusWithDate = evaluateOverallReadiness('DRAFT', 'PUBLIC', true, true, true, true, [], new Date());
      expect(statusWithDate).toBe('ARCHIVED');
    });

    it('evaluates NOT_STARTED when pattern or syllabus does not exist', () => {
      const noPattern = evaluateOverallReadiness('DRAFT', 'PRIVATE', false, true, false, false, []);
      expect(noPattern).toBe('NOT_STARTED');

      const noSyllabus = evaluateOverallReadiness('DRAFT', 'PRIVATE', true, false, false, false, []);
      expect(noSyllabus).toBe('NOT_STARTED');
    });

    it('evaluates BLOCKED when any blocker issue exists', () => {
      const blockerIssue: ExamReadinessIssue = {
        code: 'MISSING_SEO',
        category: 'SEO',
        severity: 'BLOCKER',
        entityType: 'EXAM_SEO',
        message: 'Missing SEO slug',
        blocking: true,
        createdFromRule: 'SEO_SLUG',
      };
      const status = evaluateOverallReadiness('APPROVED', 'PUBLIC', true, true, true, true, [blockerIssue]);
      expect(status).toBe('BLOCKED');
    });

    it('evaluates LIVE status when published, public/unlisted, and pattern & syllabus are published without blockers', () => {
      const statusPublic = evaluateOverallReadiness('PUBLISHED', 'PUBLIC', true, true, true, true, []);
      expect(statusPublic).toBe('LIVE');

      const statusUnlisted = evaluateOverallReadiness('PUBLISHED', 'UNLISTED', true, true, true, true, []);
      expect(statusUnlisted).toBe('LIVE');
    });

    it('evaluates READY status when approved and pattern & syllabus are published without blockers', () => {
      const status = evaluateOverallReadiness('APPROVED', 'PRIVATE', true, true, true, true, []);
      expect(status).toBe('READY');
    });

    it('evaluates IN_PROGRESS status when draft or incomplete', () => {
      const status = evaluateOverallReadiness('DRAFT', 'PRIVATE', true, true, false, false, []);
      expect(status).toBe('IN_PROGRESS');
    });
  });

  describe('2. Stale Work Calculation', () => {
    it('detects stale draft records older than configured days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);

      expect(isRecordStale(oldDate, 'DRAFT', 14)).toBe(true);
      expect(isRecordStale(oldDate, 'CHANGES_REQUESTED', 14)).toBe(true);
      expect(isRecordStale(oldDate, 'APPROVED', 14)).toBe(false);
      expect(isRecordStale(oldDate, 'PUBLISHED', 14)).toBe(false);
    });

    it('identifies fresh records under threshold as not stale', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      expect(isRecordStale(recentDate, 'DRAFT', 14)).toBe(false);
    });
  });

  describe('3. Exam Cycle Readiness Evaluator', () => {
    it('returns comprehensive readiness analysis for a complete valid exam cycle', () => {
      const validExam = {
        id: 'exam-1',
        cycleCode: 'KAS_2026',
        cycleYear: 2026,
        titleEn: 'KAS Officer Exam 2026',
        titleKn: 'ಕೆಎಎಸ್ ಅಧಿಕಾರಿ ಪರೀಕ್ಷೆ ೨೦೨೬',
        descriptionEn: 'Official KAS Exam',
        descriptionKn: 'ಅಧಿಕೃತ ಕೆಎಎಸ್ ಪರೀಕ್ಷೆ',
        notificationNumber: 'KPSC/2026/01',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        programme: {
          id: 'prog-1',
          nameEn: 'Karnataka Administrative Service',
          nameKn: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ',
          isActive: true,
          authority: {
            id: 'auth-1',
            nameEn: 'Karnataka Public Service Commission',
            nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ',
            isActive: true,
          },
        },
        eligibility: {
          minimumAge: 21,
          maximumAge: 38,
          minimumEducationEn: 'Bachelor Degree',
          minimumEducationKn: 'ಪದವಿ',
        },
        importantDates: [],
        officialResources: [
          { id: 'res-1', resourceType: 'OFFICIAL_NOTIFICATION', url: 'https://kpsc.kar.nic.in/notif.pdf', isActive: true },
        ],
        seo: {
          id: 'seo-1',
          slugEn: 'kas-2026-exam',
          slugKn: 'kas-2026-parikshe',
        },
        patterns: [
          {
            id: 'pat-1',
            revisionNumber: 1,
            isCurrent: true,
            status: 'PUBLISHED',
            titleEn: 'KAS 2026 Pattern',
            titleKn: 'ಕೆಎಎಸ್ ೨೦೨೬ ಮಾದರಿ',
            descriptionEn: 'Pattern details',
            descriptionKn: 'ಮಾದರಿ ವಿವರಣೆ',
            stages: [
              {
                code: 'PRELIMS',
                nameEn: 'Prelims',
                nameKn: 'ಪೂರ್ವಭಾವಿ',
                displayOrder: 1,
                papers: [
                  {
                    code: 'PAPER_1',
                    nameEn: 'Paper 1',
                    nameKn: 'ಪತ್ರಿಕೆ ೧',
                    totalMarks: 200,
                    displayOrder: 1,
                    defaultNegativeMarkingType: 'NONE',
                  },
                ],
              },
            ],
          },
        ],
        syllabi: [
          {
            id: 'syl-1',
            examPatternId: 'pat-1',
            revisionNumber: 1,
            isCurrent: true,
            status: 'PUBLISHED',
            titleEn: 'Syllabus Title',
            titleKn: 'ಪಠ್ಯಕ್ರಮ ಶೀರ್ಷಿಕೆ',
            descriptionEn: 'Syllabus details',
            descriptionKn: 'ಪಠ್ಯಕ್ರಮ ವಿವರಣೆ',
            nodes: [
              {
                id: 'node-1',
                code: 'GS_1',
                nodeType: 'SUBJECT',
                scopeType: 'GLOBAL',
                nameEn: 'General Studies I',
                nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ೧',
                displayOrder: 1,
                depth: 1,
                isActive: true,
              },
            ],
          },
        ],
      };

      const result = evaluateExamCycleReadiness(validExam);
      expect(result.summary.overallStatus).toBe('LIVE');
      expect(result.summary.blockerCount).toBe(0);
      expect(result.summary.completionPercentage).toBe(100);
      expect(result.publicationSection.isEligibleForPublicApi).toBe(true);
    });

    it('detects missing pattern and syllabus and marks as NOT_STARTED with blockers', () => {
      const incompleteExam = {
        id: 'exam-2',
        cycleCode: 'PSI_2026',
        cycleYear: 2026,
        titleEn: 'Police Sub Inspector 2026',
        titleKn: 'ಪೊಲೀಸ್ ಸಬ್ ಇನ್ಸ್ಪೆಕ್ಟರ್ ೨೦೨೬',
        status: 'DRAFT',
        visibility: 'PRIVATE',
        programme: {
          id: 'prog-2',
          isActive: true,
          authority: { id: 'auth-2', isActive: true },
        },
        patterns: [],
        syllabi: [],
      };

      const result = evaluateExamCycleReadiness(incompleteExam);
      expect(result.summary.overallStatus).toBe('NOT_STARTED');
      expect(result.summary.blockerCount).toBeGreaterThan(0);
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain('MISSING_EXAM_PATTERN');
      expect(codes).toContain('MISSING_EXAM_SYLLABUS');
    });

    it('detects invalid date range as a blocker', () => {
      const invalidDateExam = {
        id: 'exam-3',
        cycleCode: 'FDA_2026',
        cycleYear: 2026,
        titleEn: 'FDA Exam 2026',
        titleKn: 'ಎಫ್‌ಡಿಎ ಪರೀಕ್ಷೆ ೨೦೨೬',
        status: 'DRAFT',
        applicationStartDate: new Date('2026-09-10'),
        applicationEndDate: new Date('2026-09-01'), // invalid: end before start
        programme: { isActive: true, authority: { isActive: true } },
        seo: { slugEn: 'fda-2026', slugKn: 'fda-2026-kn' },
        patterns: [],
        syllabi: [],
      };

      const result = evaluateExamCycleReadiness(invalidDateExam);
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain('INVALID_APPLICATION_DATE_RANGE');
    });
  });
});
