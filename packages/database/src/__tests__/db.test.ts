import { describe, it, expect } from 'vitest';
import { INITIAL_ROLES } from '../seedData';

describe('Database System Schema & Roles Foundation', () => {
  it('should define the exact initial roles required', () => {
    const roleNames = INITIAL_ROLES.map((r) => r.name);
    expect(roleNames).toContain('Super Admin');
    expect(roleNames).toContain('Content Manager');
    expect(roleNames).toContain('Content Reviewer');
    expect(roleNames).toContain('Support Executive');
    expect(roleNames).not.toContain('Test Manager');
  });
});
