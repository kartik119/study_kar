/**
 * Test Database Safety Guard
 * Ensures integration tests execute ONLY against an isolated test database (e.g., study_karnataka_test)
 * and never against development or production database instances.
 */
export function assertTestDatabase(): void {
  const dbUrl = process.env.DATABASE_URL || '';

  if (!dbUrl.includes('_test') && !dbUrl.includes('test')) {
    throw new Error(
      `UNSAFE_TEST_DATABASE: Integration tests must run against a dedicated test database containing 'test' (e.g., study_karnataka_test). Current DATABASE_URL: '${dbUrl}'`
    );
  }

  // Explicit check against standard development/production DB names
  if (
    dbUrl.includes('/study_karnataka?') ||
    dbUrl.includes('/study_karnataka_dev') ||
    dbUrl.endsWith('/study_karnataka')
  ) {
    throw new Error(
      `UNSAFE_TEST_DATABASE: Refusing to execute integration tests against non-test database '${dbUrl}'.`
    );
  }
}
