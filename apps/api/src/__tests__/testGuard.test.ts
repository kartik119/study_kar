import { describe, it, expect, afterEach } from 'vitest';
import { assertTestDatabase } from './testGuard';

describe('Test Database Safety Guard (assertTestDatabase)', () => {
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  it('accepts valid test database URLs containing test', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/study_karnataka_test?schema=public';
    expect(() => assertTestDatabase()).not.toThrow();
  });

  it('rejects development database study_karnataka', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/study_karnataka?schema=public';
    expect(() => assertTestDatabase()).toThrow(/UNSAFE_TEST_DATABASE/);
  });

  it('rejects database URLs without test designation', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/production_db?schema=public';
    expect(() => assertTestDatabase()).toThrow(/UNSAFE_TEST_DATABASE/);
  });
});
