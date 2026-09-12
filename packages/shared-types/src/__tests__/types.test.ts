import { describe, it, expect } from 'vitest';
import { PreparationLanguage, SystemRole } from '../index';

describe('Shared Types Export Integrity', () => {
  it('should export correct enum values for preparation languages', () => {
    expect(PreparationLanguage.ENGLISH).toBe('en');
    expect(PreparationLanguage.KANNADA).toBe('kn');
  });

  it('should export required system roles', () => {
    expect(SystemRole.SUPER_ADMIN).toBe('Super Admin');
    expect(SystemRole.CONTENT_MANAGER).toBe('Content Manager');
    expect(SystemRole.CONTENT_REVIEWER).toBe('Content Reviewer');
    expect(SystemRole.SUPPORT_EXECUTIVE).toBe('Support Executive');
  });
});
