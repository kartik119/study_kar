import { describe, it, expect } from 'vitest';
import { IndianMobileNumberSchema, PaginationQuerySchema, UUIDSchema } from '../index';

describe('Common Validation Schemas', () => {
  it('should validate valid 10-digit Indian mobile numbers starting with 6-9', () => {
    expect(IndianMobileNumberSchema.parse('9876543210')).toBe('9876543210');
    expect(IndianMobileNumberSchema.parse('6361234567')).toBe('6361234567');
  });

  it('should reject invalid Indian mobile numbers', () => {
    expect(() => IndianMobileNumberSchema.parse('5876543210')).toThrow();
    expect(() => IndianMobileNumberSchema.parse('987654321')).toThrow();
    expect(() => IndianMobileNumberSchema.parse('98765432100')).toThrow();
  });

  it('should parse and transform pagination query strings', () => {
    const parsed = PaginationQuerySchema.parse({ page: '2', limit: '20' });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
  });

  it('should validate valid UUIDs', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(UUIDSchema.parse(validUuid)).toBe(validUuid);
  });
});
