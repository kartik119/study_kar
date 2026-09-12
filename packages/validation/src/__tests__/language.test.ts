import { describe, it, expect } from 'vitest';
import {
  PreparationLanguageSchema,
  canUpdatePreparationLanguage,
  validateLanguageUpdate,
} from '../index';
import { PreparationLanguage } from '@study-karnataka/shared-types';

describe('Language Architecture Validation', () => {
  it('should validate valid preparation languages (English & Kannada)', () => {
    expect(PreparationLanguageSchema.parse('en')).toBe(PreparationLanguage.ENGLISH);
    expect(PreparationLanguageSchema.parse('kn')).toBe(PreparationLanguage.KANNADA);
  });

  it('should reject invalid preparation languages', () => {
    expect(() => PreparationLanguageSchema.parse('fr')).toThrow();
  });

  it('should allow changing preparation language when not locked', () => {
    expect(canUpdatePreparationLanguage(false)).toBe(true);
    const result = validateLanguageUpdate(
      PreparationLanguage.ENGLISH,
      PreparationLanguage.KANNADA,
      false
    );
    expect(result.allowed).toBe(true);
  });

  it('should prevent changing preparation language when locked', () => {
    expect(canUpdatePreparationLanguage(true)).toBe(false);
    const result = validateLanguageUpdate(
      PreparationLanguage.ENGLISH,
      PreparationLanguage.KANNADA,
      true
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Preparation language is locked');
  });
});
