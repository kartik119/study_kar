import { describe, it, expect } from 'vitest';
import {
  calculateExamPatternTotals,
  calculateExamPatternReadiness,
  validateNegativeMarking,
  validateExamPatternStructure,
} from '../exam-pattern';

describe('Exam Pattern Validation & Calculator Unit Tests', () => {
  describe('Negative Marking Rules', () => {
    it('validates NONE negative marking', () => {
      const res = validateNegativeMarking('NONE');
      expect(res.isValid).toBe(true);
    });

    it('validates FIXED_MARKS correctly', () => {
      expect(validateNegativeMarking('FIXED_MARKS', 0.25, null, null, 1).isValid).toBe(true);
      expect(validateNegativeMarking('FIXED_MARKS', 0, null, null, 1).isValid).toBe(false);
      expect(validateNegativeMarking('FIXED_MARKS', 2, null, null, 1).isValid).toBe(false);
    });

    it('validates PERCENTAGE_OF_QUESTION_MARKS correctly', () => {
      expect(validateNegativeMarking('PERCENTAGE_OF_QUESTION_MARKS', 25).isValid).toBe(true);
      expect(validateNegativeMarking('PERCENTAGE_OF_QUESTION_MARKS', 0).isValid).toBe(false);
      expect(validateNegativeMarking('PERCENTAGE_OF_QUESTION_MARKS', 110).isValid).toBe(false);
    });

    it('validates FRACTION_OF_QUESTION_MARKS correctly', () => {
      expect(validateNegativeMarking('FRACTION_OF_QUESTION_MARKS', null, 1, 3).isValid).toBe(true);
      expect(validateNegativeMarking('FRACTION_OF_QUESTION_MARKS', null, 4, 3).isValid).toBe(false);
      expect(validateNegativeMarking('FRACTION_OF_QUESTION_MARKS', null, 1, 0).isValid).toBe(false);
    });
  });

  describe('Calculator Rollups', () => {
    it('rolls up section marks to paper marks and pattern total', () => {
      const samplePattern = {
        titleEn: 'KAS 2026 Pattern',
        titleKn: 'ಕೆಎಎಸ್ 2026 ಪರೀಕ್ಷಾ ವಿಧಾನ',
        stages: [
          {
            code: 'PRELIMS',
            nameEn: 'Preliminary Examination',
            nameKn: 'ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ',
            displayOrder: 1,
            contributesToFinalMerit: false,
            isQualifying: true,
            papers: [
              {
                code: 'GS_PAPER_1',
                nameEn: 'General Studies I',
                nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ I',
                displayOrder: 1,
                totalMarks: 200,
                questionsToAnswer: 100,
                durationMinutes: 120,
                contributesToStageMerit: true,
                sections: [
                  {
                    code: 'SEC_A',
                    nameEn: 'Current Affairs',
                    nameKn: 'ಪ್ರಸ್ತುತ ಘಟನೆಗಳು',
                    displayOrder: 1,
                    totalQuestions: 50,
                    questionsToAnswer: 50,
                    marksPerQuestion: 2,
                    durationMinutes: 60,
                  },
                  {
                    code: 'SEC_B',
                    nameEn: 'History & Polity',
                    nameKn: 'ಇತಿಹಾಸ ಮತ್ತು ರಾಜ್ಯಶಾಸ್ತ್ರ',
                    displayOrder: 2,
                    totalQuestions: 50,
                    questionsToAnswer: 50,
                    marksPerQuestion: 2,
                    durationMinutes: 60,
                  },
                ],
              },
            ],
          },
        ],
      };

      const totals = calculateExamPatternTotals(samplePattern);
      expect(totals.stageCount).toBe(1);
      expect(totals.paperCount).toBe(1);
      expect(totals.sectionCount).toBe(2);
      expect(totals.totalMarks).toBe(200);
      expect(totals.totalQualifyingMarks).toBe(200);
      expect(totals.totalMeritMarks).toBe(0);
      expect(totals.totalQuestions).toBe(100);
      expect(totals.approximateDurationMinutes).toBe(120);
    });
  });

  describe('Readiness & Structure Validation', () => {
    it('detects missing bilingual fields', () => {
      const incompletePattern = {
        titleEn: 'KAS 2026',
        titleKn: '',
        stages: [],
      };
      const readiness = calculateExamPatternReadiness(incompletePattern);
      expect(readiness.state).toBe('INCOMPLETE');
      expect(readiness.missingKannadaFields).toContain('Pattern Kannada Title');
    });

    it('validates complete pattern structure successfully', () => {
      const validPattern = {
        titleEn: 'KAS 2026 Pattern',
        titleKn: 'ಕೆಎಎಸ್ 2026 ಪರೀಕ್ಷಾ ವಿಧಾನ',
        descriptionEn: 'Official Pattern Description',
        descriptionKn: 'ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ವಿಧಾನ ವಿವರಣೆ',
        stages: [
          {
            code: 'PRELIMS',
            displayOrder: 1,
            nameEn: 'Preliminary Exam',
            nameKn: 'ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ',
            papers: [
              {
                code: 'GS1',
                displayOrder: 1,
                nameEn: 'General Studies I',
                nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ I',
                totalMarks: 200,
                defaultNegativeMarkingType: 'FIXED_MARKS',
                defaultNegativeMarkingValue: 0.25,
                sections: [],
              },
            ],
          },
        ],
      };

      const res = validateExamPatternStructure(validPattern);
      expect(res.isValid).toBe(true);
      expect(res.issues).toHaveLength(0);
    });
  });
});
