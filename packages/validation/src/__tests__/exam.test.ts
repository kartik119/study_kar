import { describe, it, expect } from 'vitest';
import {
  calculateExamReadiness,
  sanitizeSlug,
  normalizeCode,
  CreateExamAuthoritySchema,
  CreateExamProgrammeSchema,
  CreateExamCycleSchema,
} from '../exam';

describe('Exam Domain Validation & Readiness Helpers', () => {
  it('normalizes authority and programme codes to uppercase with underscores', () => {
    expect(normalizeCode(' kpsc ')).toBe('KPSC');
    expect(normalizeCode('kas-2026')).toBe('KAS_2026');
    expect(normalizeCode('upsc cse')).toBe('UPSC_CSE');
  });

  it('sanitizes English and Kannada slugs safely', () => {
    expect(sanitizeSlug(' KAS Exam 2026! ')).toBe('kas-exam-2026');
    expect(sanitizeSlug(' ಕೆಎಎಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬ ')).toBe('ಕೆಎಎಸ್-ಪರೀಕ್ಷೆ-೨೦೨೬');
  });

  it('calculates language readiness correctly across English and Kannada content', () => {
    const bothComplete = calculateExamReadiness({
      titleEn: 'KAS 2026',
      titleKn: 'ಕೆಎಎಸ್ ೨೦೨೬',
      descriptionEn: 'Detailed description',
      descriptionKn: 'ವಿವರವಾದ ವಿವರಣೆ',
      seo: { slugEn: 'kas-2026', slugKn: 'kas-kn-2026' },
    });
    expect(bothComplete.state).toBe('BOTH_COMPLETE');
    expect(bothComplete.isEnglishComplete).toBe(true);
    expect(bothComplete.isKannadaComplete).toBe(true);

    const englishOnly = calculateExamReadiness({
      titleEn: 'KAS 2026',
      titleKn: '',
      descriptionEn: 'Detailed description',
      descriptionKn: '',
      seo: { slugEn: 'kas-2026', slugKn: '' },
    });
    expect(englishOnly.state).toBe('ENGLISH_COMPLETE');
    expect(englishOnly.isEnglishComplete).toBe(true);
    expect(englishOnly.isKannadaComplete).toBe(false);
    expect(englishOnly.missingKannadaFields).toContain('titleKn');

    const incomplete = calculateExamReadiness({
      titleEn: '',
      titleKn: '',
      descriptionEn: '',
      descriptionKn: '',
    });
    expect(incomplete.state).toBe('INCOMPLETE');
    expect(incomplete.isEnglishComplete).toBe(false);
    expect(incomplete.isKannadaComplete).toBe(false);
  });

  it('validates CreateExamAuthoritySchema input', () => {
    const valid = CreateExamAuthoritySchema.safeParse({
      code: 'kpsc',
      nameEn: 'Karnataka Public Service Commission',
      nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.code).toBe('KPSC');
    }

    const invalid = CreateExamAuthoritySchema.safeParse({
      code: '',
      nameEn: '',
      nameKn: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates CreateExamCycleSchema input', () => {
    const valid = CreateExamCycleSchema.safeParse({
      programmeId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      cycleCode: 'kas_2026',
      cycleYear: 2026,
      titleEn: 'KAS 2026',
      titleKn: 'ಕೆಎಎಸ್ ೨೦೨೬',
      visibility: 'PUBLIC',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.cycleCode).toBe('KAS_2026');
    }
  });
});
