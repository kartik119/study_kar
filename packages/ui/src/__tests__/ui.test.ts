import { describe, it, expect } from 'vitest';
import { Button } from '../index';

describe('Shared UI Package', () => {
  it('should export Button component function', () => {
    expect(typeof Button).toBe('function');
  });
});
