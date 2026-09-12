import { describe, it, expect, vi } from 'vitest';
import { calculateAge, isMinor, StudentRegistrationSchema } from '../index';

describe('Age Calculation & Boundary Tests', () => {
  it('should accurately calculate age when birthday has passed this year', () => {
    vi.setSystemTime(new Date('2026-08-04'));
    const dob = new Date('2000-01-15');
    expect(calculateAge(dob)).toBe(26);
    expect(isMinor(dob)).toBe(false);
  });

  it('should accurately calculate age when birthday is tomorrow', () => {
    vi.setSystemTime(new Date('2026-08-04'));
    const dob = new Date('2008-08-05'); // Turns 18 tomorrow
    expect(calculateAge(dob)).toBe(17);
    expect(isMinor(dob)).toBe(true);
  });

  it('should accurately calculate age when user turns 18 today', () => {
    vi.setSystemTime(new Date('2026-08-04'));
    const dob = new Date('2008-08-04'); // Turns 18 today
    expect(calculateAge(dob)).toBe(18);
    expect(isMinor(dob)).toBe(false);
  });

  it('should handle leap year birthdays correctly', () => {
    vi.setSystemTime(new Date('2026-03-01'));
    const dob = new Date('2008-02-29'); // Leap year birthday
    expect(calculateAge(dob)).toBe(18);
    expect(isMinor(dob)).toBe(false);
  });

  it('should enforce guardian details when registering a minor (<18)', () => {
    vi.setSystemTime(new Date('2026-08-04'));
    const minorData = {
      mobile: '9876543210',
      fullName: 'Minor Student',
      dateOfBirth: '2010-05-10', // 16 years old
      preparationLanguage: 'kn',
    };

    expect(() => StudentRegistrationSchema.parse(minorData)).toThrow('Guardian details are required');
  });

  it('should pass registration for adult (>=18) without guardian details', () => {
    vi.setSystemTime(new Date('2026-08-04'));
    const adultData = {
      mobile: '9876543210',
      fullName: 'Adult Student',
      dateOfBirth: '2005-05-10', // 21 years old
      preparationLanguage: 'en',
    };

    const parsed = StudentRegistrationSchema.parse(adultData);
    expect(parsed.fullName).toBe('Adult Student');
  });
});
